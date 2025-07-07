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

    console.log('=== WEBHOOK CALLED ===', { callSid, from, to, callStatus, speechResult, digits });
    console.log('Request method:', req.method);
    console.log('Content-Type:', req.headers.get('content-type'));

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
          call_status: callStatus
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

      // Get ChatGPT response
      const chatGptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are Lucy, a professional AI receptionist. Current state: ${session.current_state}. 
              Collected data: ${JSON.stringify(session.collected_data)}.
              
              Rules:
              - Be concise and professional
              - Ask for name, reason for calling, and callback number if needed
              - Confirm information before ending
              - Keep responses under 50 words
              - If greeting state, welcome them and ask how you can help
              - If collecting info, gather missing details
              - If confirming, summarize and confirm details
              - If ending, provide closure and next steps`
            },
            {
              role: 'user',
              content: speechResult
            }
          ],
          max_tokens: 150,
          temperature: 0.7
        }),
      });

      const chatData = await chatGptResponse.json();
      response = chatData.choices[0].message.content;

      // Determine next state based on content
      if (session.current_state === DIALOGUE_STATES.GREETING && speechResult.length > 0) {
        nextState = DIALOGUE_STATES.COLLECTING_INFO;
      } else if (session.current_state === DIALOGUE_STATES.COLLECTING_INFO && 
                 speechResult.toLowerCase().includes('confirm') || 
                 speechResult.toLowerCase().includes('yes')) {
        nextState = DIALOGUE_STATES.CONFIRMING;
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
      // Initial greeting
      response = "Hello! Thank you for calling. I'm Lucy, your AI assistant. How may I help you today?";
      
      await supabase
        .from('transcripts')
        .insert({
          call_id: call.id,
          speaker: 'agent',
          message: response
        });
    }

    // Generate TwiML response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">${response}</Say>
    <Gather input="speech" action="https://idupowkqzcwrjslcixsp.supabase.co/functions/v1/voice-incoming" method="POST" speechTimeout="3" timeout="10">
        <Say voice="alice">Please speak after the tone.</Say>
    </Gather>
    <Say voice="alice">Thank you for calling. Goodbye!</Say>
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
    <Say voice="alice">I'm sorry, I'm experiencing technical difficulties. Please try again later.</Say>
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