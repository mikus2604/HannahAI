import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    if (recordingUrl && recordingSid) {
      return new Response('Recording handled by status webhook', {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    }

    if (["completed", "busy", "failed", "no-answer"].includes(callStatus)) {
      return new Response('Status handled by status webhook', {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    }

    const { data: phoneAssignment } = await supabase
      .from('phone_assignments')
      .select('user_id')
      .eq('phone_number', to)
      .eq('is_active', true)
      .single();

    if (!phoneAssignment) {
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna" prosodyRate="medium">This number is not configured. Please contact support.</Say>
    <Hangup/>
</Response>`;
      return new Response(errorTwiml, {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      });
    }

    const assistantResponse = "Let me check that for you...";

    // Immediately respond to caller while we process the AI logic in background
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna" prosodyRate="medium">${assistantResponse}</Say>
  <Gather input="speech" action="https://idupowkqzcwrjslcixsp.supabase.co/functions/v1/voice-incoming" method="POST" speechTimeout="1" timeout="3">
  </Gather>
  <Say voice="Polly.Joanna" prosodyRate="medium">I didn't catch that. Please try again.</Say>
  <Hangup/>
</Response>`;

    // Kick off background processing (no await)
    (async () => {
      const { data: call } = await supabase
        .from('calls')
        .select('id')
        .eq('twilio_call_sid', callSid)
        .single();

      if (!call) return;

      await supabase.from('transcripts').insert({
        call_id: call.id,
        speaker: 'caller',
        message: speechResult
      });

      const conversationMessages = [
        { role: 'system', content: 'You are an AI receptionist.' },
        { role: 'user', content: speechResult }
      ];

      const extractDataPromise = fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Extract structured info from user message.' },
            { role: 'user', content: speechResult }
          ],
          temperature: 0.1
        })
      });

      const responseGenPromise = fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: conversationMessages,
          max_tokens: 100,
          temperature: 0.3
        })
      });

      const [extractionResponse, chatGptResponse] = await Promise.all([
        extractDataPromise,
        responseGenPromise
      ]);

      const chatData = await chatGptResponse.json();
      const response = chatData.choices?.[0]?.message?.content || "";

      await supabase.from('transcripts').insert({
        call_id: call.id,
        speaker: 'agent',
        message: response
      });
    })();

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
