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

interface CallContext {
  callerId: string;
  language?: string;
  userQuery: string;
  callId: string;
  userId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { callerId, language = 'en', userQuery, callId, userId }: CallContext = await req.json();

    console.log('AI Call Handler - Processing:', { callerId, language, userQuery, callId });

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's greeting messages and preferences
    const { data: greetings } = await supabase
      .from('greeting_messages')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1);

    const activeGreeting = greetings?.[0];

    // Generate AI response based on context
    const systemPrompt = `You are an AI receptionist for a business. 
    ${activeGreeting ? `Business greeting: "${activeGreeting.message}"` : 'Use a professional business greeting.'}
    
    Instructions:
    - Respond in ${language === 'en' ? 'English' : `the language code: ${language}`}
    - Be helpful, professional, and concise
    - If asked about appointments, suggest calling back or scheduling online
    - For urgent matters, offer to take a message
    - Keep responses under 100 words
    - Speak naturally as if on a phone call
    
    Caller query: "${userQuery}"`;

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
          { role: 'user', content: userQuery }
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const aiResponse = aiData.choices[0].message.content;

    // Store the AI interaction
    await supabase
      .from('call_sessions')
      .upsert({
        call_id: callId,
        current_state: 'ai_handled',
        context: {
          caller_id: callerId,
          language: language,
          user_query: userQuery,
          ai_response: aiResponse,
          timestamp: new Date().toISOString()
        }
      }, { onConflict: 'call_id' });

    console.log('AI Response generated:', aiResponse);

    return new Response(
      JSON.stringify({ 
        aiResponse,
        language,
        status: 'success'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in ai-call-handler:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});