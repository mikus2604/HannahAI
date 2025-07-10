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
    
    // Redirect status and recording callbacks to dedicated webhook
    if (recordingUrl && recordingSid) {
      console.log('Recording callback received, handled by status webhook');
      return new Response('Recording handled by status webhook', {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    }

    // Redirect call status updates to dedicated webhook
    if (callStatus === 'completed' || callStatus === 'busy' || callStatus === 'failed' || callStatus === 'no-answer') {
      console.log('Status update received, handled by status webhook');
      return new Response('Status handled by status webhook', {
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

      // Get conversation history for context
      const { data: transcripts } = await supabase
        .from('transcripts')
        .select('speaker, message')
        .eq('call_id', call.id)
        .order('timestamp', { ascending: true });

      // Create system prompt with user's custom instructions and assistant name
      const contactInfo = userProfile ? `
Contact Information (share these ACTUAL details when asked):
- Phone: ${userProfile.contact_phone || 'Not available'}
- Email: ${userProfile.contact_email || 'Not available'} 
- Website: ${userProfile.website || 'Not available'}
- Address: ${userProfile.office_address || 'Not available'}` : '';

      const serviceRules = `
Available Services (only provide these if enabled):
- ${assistantServices.takeContactInfo ? 'CAN' : 'CANNOT'} collect name and contact information for callbacks
- ${assistantServices.provideContactDetails ? 'CAN' : 'CANNOT'} share business contact information from above
- ${assistantServices.sayMessage ? 'CAN' : 'CANNOT'} deliver messages to callers
- ${assistantServices.bookMeeting ? 'CAN' : 'CANNOT'} schedule meetings`;

      // Use active system prompt if available, otherwise default behavior
      let systemPrompt;
      if (activeSystemPrompt?.prompt) {
        // Custom system prompt with context injection
        systemPrompt = `${activeSystemPrompt.prompt}

IMPORTANT CONTEXT - ALWAYS USE THESE ACTUAL VALUES:
- You are ${assistantName}
- Current conversation state: ${session.current_state}
- Collected data so far: ${JSON.stringify(session.collected_data)}
${contactInfo}
${serviceRules}

CRITICAL: When sharing contact details, use the EXACT values listed above. Never say "insert contact number here" or similar placeholders. Use the actual phone numbers, emails, and addresses provided.`;
      } else {
        // Default system prompt with clear contact detail instructions
        systemPrompt = `You are ${assistantName}, a professional AI receptionist for this business. Current state: ${session.current_state}. 
              Collected data: ${JSON.stringify(session.collected_data)}.
              ${contactInfo}
              ${serviceRules}
              
              RULES:
              - Be natural, conversational and professional
              - ONLY provide services that are enabled above
              - Keep responses under 30 words
              - Remember what was discussed already - don't repeat questions
              - Build on the conversation naturally
              - When sharing contact details, use the EXACT values provided above
              - NEVER use placeholders like "insert contact number here"
              - If contact info is "Not available", say "I don't have that information available"
              - If greeting state, welcome them and ask how you can help
              - If collecting info, gather missing details
              - If confirming, summarize and confirm details
              - If ending, provide closure and next steps
              - Speak naturally without robotic phrases`;
      }

      // Build conversation history for ChatGPT context
      const conversationMessages = [
        {
          role: 'system',
          content: systemPrompt
        }
      ];

      // Add conversation history
      if (transcripts && transcripts.length > 0) {
        transcripts.slice(-10).forEach(transcript => { // Only last 10 exchanges
          conversationMessages.push({
            role: transcript.speaker === 'caller' ? 'user' : 'assistant',
            content: transcript.message
          });
        });
      }

      // Add current user input
      conversationMessages.push({
        role: 'user',
        content: speechResult
      });

      // Get ChatGPT response with conversation context
      const chatGptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: conversationMessages,
          max_tokens: 150,
          temperature: 0.7,
          presence_penalty: 0.2,
          frequency_penalty: 0.3
        }),
      });

      const chatData = await chatGptResponse.json();
      response = chatData.choices[0].message.content;

      // Update session state without changing call status (Twilio webhooks handle that)
      if (session.current_state === DIALOGUE_STATES.GREETING) {
        nextState = DIALOGUE_STATES.COLLECTING_INFO;
      } else if (session.current_state === DIALOGUE_STATES.COLLECTING_INFO) {
        // Check for conversation ending cues
        const lowerResponse = response.toLowerCase();
        const lowerSpeech = speechResult.toLowerCase();
        
        if (lowerSpeech.includes('thank') || lowerSpeech.includes('bye') || 
            lowerSpeech.includes('goodbye') || lowerSpeech.includes('done') ||
            lowerResponse.includes('goodbye') || lowerResponse.includes('thank you')) {
          nextState = DIALOGUE_STATES.ENDING;
        } else if (lowerSpeech.includes('confirm') || lowerSpeech.includes('yes') || 
                   lowerSpeech.includes('correct') || lowerSpeech.includes('right')) {
          nextState = DIALOGUE_STATES.CONFIRMING;
        }
      } else if (session.current_state === DIALOGUE_STATES.CONFIRMING) {
        nextState = DIALOGUE_STATES.ENDING;
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
    if (nextState === DIALOGUE_STATES.ENDING) {
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

    // Generate TwiML response for continuing conversation
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna" prosodyRate="medium">${response}</Say>
    <Gather input="speech" action="https://idupowkqzcwrjslcixsp.supabase.co/functions/v1/voice-incoming" method="POST" speechTimeout="1" timeout="4">
    </Gather>
    <Say voice="Polly.Joanna" prosodyRate="medium">I didn't hear anything. Thank you for calling. Goodbye!</Say>
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