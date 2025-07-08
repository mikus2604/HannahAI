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

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audio, callId, speaker = 'caller', language = 'en' } = await req.json();
    
    console.log('Transcription request:', { callId, speaker, language });

    if (!audio) {
      throw new Error('No audio data provided');
    }

    // Process audio in chunks to prevent memory issues
    const binaryAudio = processBase64Chunks(audio);
    
    // Prepare form data for Whisper API
    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', language);
    formData.append('response_format', 'verbose_json');

    // Send to OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI Whisper API error: ${errorText}`);
    }

    const result = await response.json();
    const transcriptText = result.text;
    const confidence = result.segments ? 
      result.segments.reduce((avg: number, seg: any) => avg + seg.avg_logprob, 0) / result.segments.length 
      : 0.8;

    console.log('Transcription completed:', { text: transcriptText, confidence });

    // Store transcription in database
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { error: insertError } = await supabase
      .from('transcripts')
      .insert({
        call_id: callId,
        speaker: speaker,
        message: transcriptText,
        confidence: Math.abs(confidence), // Convert log prob to positive
        timestamp: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Error storing transcript:', insertError);
    }

    // Update call session with latest transcript
    await supabase
      .from('call_sessions')
      .upsert({
        call_id: callId,
        current_state: 'transcribing',
        context: {
          latest_transcript: transcriptText,
          speaker: speaker,
          confidence: confidence,
          language: language,
          timestamp: new Date().toISOString()
        }
      }, { onConflict: 'call_id' });

    return new Response(
      JSON.stringify({ 
        text: transcriptText,
        confidence: Math.abs(confidence),
        speaker: speaker,
        language: language,
        timestamp: new Date().toISOString(),
        success: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in transcribe-audio:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});