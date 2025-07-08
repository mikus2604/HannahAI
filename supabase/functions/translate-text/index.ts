import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

interface TranslationRequest {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
}

// Supported languages for Premium+ multi-language support
const supportedLanguages = {
  'en': 'English',
  'es': 'Spanish', 
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'ru': 'Russian',
  'ja': 'Japanese',
  'ko': 'Korean',
  'zh': 'Chinese (Simplified)',
  'ar': 'Arabic',
  'hi': 'Hindi',
  'nl': 'Dutch',
  'sv': 'Swedish',
  'da': 'Danish',
  'no': 'Norwegian',
  'fi': 'Finnish',
  'pl': 'Polish',
  'tr': 'Turkish',
  'th': 'Thai',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, targetLanguage, sourceLanguage = 'auto' }: TranslationRequest = await req.json();

    console.log('Translation request:', { text, targetLanguage, sourceLanguage });

    if (!text || !targetLanguage) {
      throw new Error('Text and target language are required');
    }

    if (!supportedLanguages[targetLanguage as keyof typeof supportedLanguages]) {
      throw new Error(`Unsupported target language: ${targetLanguage}`);
    }

    const targetLanguageName = supportedLanguages[targetLanguage as keyof typeof supportedLanguages];
    
    const systemPrompt = `You are a professional translator. Translate the given text to ${targetLanguageName}.
    
    Rules:
    - Maintain the tone and context appropriate for business communication
    - If the text is already in the target language, return it unchanged
    - For phone/call-related content, use appropriate telephone etiquette
    - Keep formatting and structure intact
    - Return ONLY the translated text, no explanations
    
    ${sourceLanguage !== 'auto' ? `Source language: ${sourceLanguage}` : ''}
    Target language: ${targetLanguageName}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        max_tokens: Math.max(text.length * 2, 100),
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const translatedText = data.choices[0].message.content.trim();

    console.log('Translation completed:', { original: text, translated: translatedText });

    return new Response(
      JSON.stringify({ 
        translatedText,
        sourceLanguage,
        targetLanguage,
        targetLanguageName,
        success: true
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in translate-text:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});