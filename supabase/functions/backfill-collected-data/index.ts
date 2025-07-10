import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { callId } = await req.json();

    if (!callId) {
      throw new Error('Call ID is required');
    }

    console.log('Backfilling collected data for call:', callId);

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all transcripts for this call
    const { data: transcripts, error: transcriptError } = await supabase
      .from('transcripts')
      .select('*')
      .eq('call_id', callId)
      .order('timestamp', { ascending: true });

    if (transcriptError) {
      throw transcriptError;
    }

    if (!transcripts || transcripts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No transcripts found for this call' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      );
    }

    // Combine all caller messages into one text for analysis
    const callerMessages = transcripts
      .filter(t => t.speaker === 'caller')
      .map(t => t.message)
      .join('\n');

    const agentMessages = transcripts
      .filter(t => t.speaker === 'agent' || t.speaker === 'assistant')
      .map(t => t.message)
      .join('\n');

    // Extract contact information and messages from the full conversation
    const extractionPrompt = `Analyze this complete phone conversation and extract all important contact information and messages.

    CALLER SAID:
    ${callerMessages}

    AGENT/ASSISTANT SAID:
    ${agentMessages}

    Extract and structure this information:
    - Caller's name
    - Phone numbers (format them properly)
    - Email addresses 
    - Messages for specific people (who is the message for and what is the message)
    - Appointment requests or scheduling needs
    - Any other important contact information or details

    Return ONLY a JSON object with the extracted information. Use clear field names.
    Example format:
    {
      "caller_name": "Thomas",
      "phone_number": "0121 881 8181", 
      "message_for": "Aaron",
      "message": "Call me back as soon as possible",
      "email": "email@example.com",
      "appointment_request": "Next Tuesday at 2pm"
    }

    If no information is found, return empty object {}.`;

    // Get data extraction from OpenAI
    const extractionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: extractionPrompt }
        ],
        max_tokens: 500,
        temperature: 0.1,
      }),
    });

    if (!extractionResponse.ok) {
      throw new Error(`OpenAI API error: ${extractionResponse.status}`);
    }

    const extractionResult = await extractionResponse.json();
    let extractedData = {};
    
    try {
      const rawContent = extractionResult.choices[0].message.content.trim();
      console.log('Raw extracted content:', rawContent);
      extractedData = JSON.parse(rawContent);
    } catch (e) {
      console.warn('Could not parse extracted data:', e);
      return new Response(
        JSON.stringify({ error: 'Failed to parse extracted data', raw: extractionResult.choices[0].message.content }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    console.log('Extracted data:', extractedData);

    // Update the call session with the extracted data
    const { error: updateError } = await supabase
      .from('call_sessions')
      .upsert({
        call_id: callId,
        collected_data: extractedData,
        current_state: 'backfilled',
        context: {
          backfilled_at: new Date().toISOString(),
          total_transcripts: transcripts.length
        }
      }, { onConflict: 'call_id' });

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        callId,
        extractedData,
        transcriptCount: transcripts.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in backfill-collected-data:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});