import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    
    if (!elevenLabsApiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    const { text, voice, language } = await req.json();
    
    // Default voice for British English
    const voiceId = voice || 'EXAVITQu4vr4xnSDxMaL'; // Sarah - British accent
    
    console.log('Testing ElevenLabs TTS with:', { text: text?.substring(0, 50), voiceId, language });

    // Generate speech using ElevenLabs
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': elevenLabsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text || "Hello, this is a test of the ElevenLabs text-to-speech system.",
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
          style: 0.5,
          use_speaker_boost: true
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs TTS API error: ${response.status} - ${errorText}`);
    }

    // Get the audio data
    const audioArrayBuffer = await response.arrayBuffer();
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioArrayBuffer)));
    
    // Create a data URL for immediate playback
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;

    console.log('ElevenLabs TTS successful, audio length:', audioArrayBuffer.byteLength);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Text-to-speech generation successful',
        audioUrl: audioUrl,
        audioLength: audioArrayBuffer.byteLength
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('ElevenLabs TTS test error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: `ElevenLabs TTS test failed: ${error.message}`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});