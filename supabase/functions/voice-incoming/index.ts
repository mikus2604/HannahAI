import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Dialogue states
const DIALOGUE_STATES = {
  GREETING: 'greeting',
  COLLECTING_INFO: 'collecting_info',
  CONFIRMING: 'confirming',
  ENDING: 'ending'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const formData = await req.formData();
    const callSid = formData.get('CallSid') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callStatus = formData.get('CallStatus') as string;
    const speechResult = formData.get('SpeechResult') as string || '';
    const digits = formData.get('Digits') as string || '';
    const recordingUrl = formData.get('RecordingUrl') as string;
    const recordingSid = formData.get('RecordingSid') as string;

    console.log('=== VOICE WEBHOOK CALLED ===', { callSid, from, to, callStatus, speechResult, digits, recordingUrl });
    
    // Handle recording URL callback
    if (recordingUrl && recordingSid) {
      console.log('Recording callback received:', { recordingUrl, recordingSid });
      
      // Update call with recording URL and set expiration (7 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      await supabase
        .from('calls')
        .update({ 
          recording_url: recordingUrl,
          recording_expires_at: expiresAt.toISOString()
        })
        .eq('twilio_call_sid', callSid);
        
      return new Response('Recording processed', {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    }

    // Handle call status updates (when call ends)
    if (callStatus === 'completed' || callStatus === 'busy' || callStatus === 'failed' || callStatus === 'no-answer') {
      const { data: existingCall } = await supabase
        .from('calls')
        .select('*')
        .eq('twilio_call_sid', callSid)
        .single();

      if (existingCall) {
        // Determine final status based on call progress
        let finalStatus = 'failed'; // Default for premature hangups
        if (callStatus === 'completed') {
          const { data: session } = await supabase
            .from('call_sessions')
            .select('current_state, collected_data')
            .eq('call_id', existingCall.id)
            .single();

          if (session) {
            if (session.current_state === 'ending') {
              finalStatus = 'completed'; // Proper completion
            } else if (session.current_state === 'confirming' || session.current_state === 'collecting_info') {
              finalStatus = 'partial_completed'; // Some data collected
            }
          }
        }

        await supabase
          .from('calls')
          .update({ 
            call_status: finalStatus,
            ended_at: new Date().toISOString()
          })
          .eq('twilio_call_sid', callSid);
      }

      // Return empty response for status webhooks
      return new Response('', {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    }
    console.log('Request method:', req.method);
    console.log('Content-Type:', req.headers.get('content-type'));

    // Find the user who owns this phone number
    const { data: phoneAssignment } = await supabase
      .from('phone_assignments')
      .select('user_id')
      .eq('phone_number', to)
      .eq('is_active', true)
      .single();

    if (!phoneAssignment) {
      console.error('No user found for phone number:', to);
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna" prosodyRate="medium">This number is not configured. Please contact support.</Say>
    <Hangup/>
</Response>`;
      return new Response(errorTwiml, {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      });
    }

    // Get or create call record
    let { data: call, error: callError } = await supabase
      .from('calls')
      .select('*')
      .eq('twilio_call_sid', callSid)
      .single();

    if (callError && callError.code === 'PGRST116') {
      // Call doesn't exist, create it
      const { data: newCall, error: createError } = await supabase
        .from('calls')
        .insert({
          twilio_call_sid: callSid,
          from_number: from,
          to_number: to,
          call_status: 'in-progress',
          user_id: phoneAssignment.user_id
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating call:', createError);
        throw createError;
      }
      call = newCall;
    }

    // Get or create call session
    let { data: session, error: sessionError } = await supabase
      .from('call_sessions')
      .select('*')
      .eq('call_id', call.id)
      .single();

    if (sessionError && sessionError.code === 'PGRST116') {
      // Session doesn't exist, create it
      const { data: newSession, error: createSessionError } = await supabase
        .from('call_sessions')
        .insert({
          call_id: call.id,
          current_state: DIALOGUE_STATES.GREETING,
          collected_data: {},
          context: {}
        })
        .select()
        .single();

      if (createSessionError) {
        console.error('Error creating session:', createSessionError);
        throw createSessionError;
      }
      session = newSession;
    }

    // Get user's assistant settings, greeting messages and system prompt
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('assistant_name, opening_message, contact_phone, contact_email, website, office_address, assistant_services')
      .eq('user_id', phoneAssignment.user_id)
      .single();

    const { data: greetings } = await supabase
      .from('greeting_messages')
      .select('*')
      .eq('user_id', phoneAssignment.user_id)
      .eq('is_active', true)
      .limit(1);

    const { data: systemPrompts } = await supabase
      .from('system_prompts')
      .select('*')
      .eq('user_id', phoneAssignment.user_id)
      .eq('is_active', true)
      .limit(1);

    const activeGreeting = greetings?.[0];
    const activeSystemPrompt = systemPrompts?.[0];
    const assistantName = userProfile?.assistant_name || 'Assistant';
    const openingMessage = userProfile?.opening_message || 'Hello! Thank you for calling. How may I help you today?';
    const assistantServices = userProfile?.assistant_services || {
      takeContactInfo: true,
      provideContactDetails: false,
      sayMessage: true,
      bookMeeting: false
    };

    // Process speech input with ChatGPT if provided
    let response = '';
    let nextState = session.current_state;

    if (speechResult) {
      // Save user's speech to transcripts
      await supabase
        .from('transcripts')
        .insert({
          call_id: call.id,
          speaker: 'caller',
          message: speechResult
        });

      // Create system prompt with user's custom instructions and assistant name
      const contactInfo = userProfile ? `
Contact Information (you can share this if asked):
- Phone: ${userProfile.contact_phone || 'Not provided'}
- Email: ${userProfile.contact_email || 'Not provided'} 
- Website: ${userProfile.website || 'Not provided'}
- Address: ${userProfile.office_address || 'Not provided'}` : '';

      const serviceRules = `
Available Services (only provide these if enabled):
- ${assistantServices.takeContactInfo ? 'CAN' : 'CANNOT'} collect name and contact information for callbacks
- ${assistantServices.provideContactDetails ? 'CAN' : 'CANNOT'} share business contact information  
- ${assistantServices.sayMessage ? 'CAN' : 'CANNOT'} deliver messages to callers
- ${assistantServices.bookMeeting ? 'CAN' : 'CANNOT'} schedule meetings`;

      const systemPrompt = activeSystemPrompt?.prompt || `You are ${assistantName}, a professional AI receptionist for this business. Current state: ${session.current_state}. 
              Collected data: ${JSON.stringify(session.collected_data)}.
              ${contactInfo}
              ${serviceRules}
              
              Rules:
              - Be natural, conversational and professional
              - ONLY provide services that are enabled above
              - Keep responses under 50 words
              - If greeting state, welcome them and ask how you can help
              - If collecting info, gather missing details
              - If confirming, summarize and confirm details
              - If ending, provide closure and next steps
              - Speak naturally without robotic phrases`;

      // Get ChatGPT response with improved settings for natural conversation
      const chatGptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: speechResult
            }
          ],
          max_tokens: 200,
          temperature: 0.8,
          presence_penalty: 0.3,
          frequency_penalty: 0.2
        }),
      });

      const chatData = await chatGptResponse.json();
      response = chatData.choices[0].message.content;

      // Determine next state and call status based on content and context
      let callStatus = call.call_status;
      const lowerResponse = response.toLowerCase();
      const lowerSpeech = speechResult.toLowerCase();
      
      if (session.current_state === DIALOGUE_STATES.GREETING && speechResult.length > 0) {
        nextState = DIALOGUE_STATES.COLLECTING_INFO;
        callStatus = 'in-progress';
      } else if (session.current_state === DIALOGUE_STATES.COLLECTING_INFO) {
        if (lowerSpeech.includes('confirm') || lowerSpeech.includes('yes') || 
            lowerSpeech.includes('correct') || lowerSpeech.includes('right')) {
          nextState = DIALOGUE_STATES.CONFIRMING;
          callStatus = 'partial_completed'; // Data was collected
        }
      } else if (session.current_state === DIALOGUE_STATES.CONFIRMING) {
        nextState = DIALOGUE_STATES.ENDING;
        if (lowerResponse.includes('goodbye') || lowerResponse.includes('thank you') || 
            lowerResponse.includes('have a') || lowerResponse.includes('take care')) {
          callStatus = 'completed'; // Proper goodbye
        }
      }
      
      // Update call status and set ended_at timestamp when call completes
      const updateData: any = { call_status: callStatus };
      if (callStatus === 'completed' || callStatus === 'partial_completed') {
        updateData.ended_at = new Date().toISOString();
      }
      
      await supabase
        .from('calls')
        .update(updateData)
        .eq('id', call.id);
        
      // Send email notification if call is completed and user has notifications enabled  
      if ((callStatus === 'completed' || callStatus === 'partial_completed')) {
        try {
          // Get user email from auth.users
          const { data: { user: authUser }, error: authError } = await supabase.auth.admin.getUserById(phoneAssignment.user_id);
          
          if (!authError && authUser?.email) {
            await supabase.functions.invoke('send-call-notification', {
              body: { 
                callId: call.id, 
                userId: phoneAssignment.user_id,
                userEmail: authUser.email
              }
            });
          }
        } catch (notificationError) {
          console.error('Error sending notification:', notificationError);
        }
      }

      // Save AI response to transcripts
      await supabase
        .from('transcripts')
        .insert({
          call_id: call.id,
          speaker: 'agent',
          message: response
        });

      // Update session state
      await supabase
        .from('call_sessions')
        .update({
          current_state: nextState,
          context: { ...session.context, last_response: response }
        })
        .eq('id', session.id);

    } else {
      // Use custom opening message from user's assistant settings
      response = openingMessage;
      
      await supabase
        .from('transcripts')
        .insert({
          call_id: call.id,
          speaker: 'agent',
          message: response
        });
    }

    // Handle call ending scenarios
    if (call.call_status === 'completed' || call.call_status === 'partial_completed' || nextState === DIALOGUE_STATES.ENDING) {
      // End the call properly
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna" prosodyRate="medium">${response}</Say>
    <Hangup/>
</Response>`;
      return new Response(twiml, {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      });
    }

    // Generate TwiML response with recording enabled and natural conversation flow
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna" prosodyRate="medium">${response}</Say>
    <Gather input="speech" action="https://idupowkqzcwrjslcixsp.supabase.co/functions/v1/voice-incoming" method="POST" speechTimeout="2" timeout="8">
    </Gather>
    <Say voice="Polly.Joanna" prosodyRate="medium">I didn't hear anything. Thank you for calling. Goodbye!</Say>
    <Record action="https://idupowkqzcwrjslcixsp.supabase.co/functions/v1/voice-incoming" method="POST" transcribe="true" recordingStatusCallback="https://idupowkqzcwrjslcixsp.supabase.co/functions/v1/voice-incoming" maxLength="300" />
    <Hangup/>
</Response>`;

    return new Response(twiml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml',
      },
    });

  } catch (error) {
    console.error('Error in voice-incoming function:', error);
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna" prosodyRate="medium">I'm sorry, I'm experiencing technical difficulties. Please try again later.</Say>
    <Hangup/>
</Response>`;

    return new Response(errorTwiml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml',
      },
    });
  }
});