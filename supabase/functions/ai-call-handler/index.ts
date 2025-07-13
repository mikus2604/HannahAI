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

    // Get current call session to retrieve existing context and collected data
    const { data: existingSession } = await supabase
      .from('call_sessions')
      .select('*')
      .eq('call_id', callId)
      .single();

    const existingCollectedData = existingSession?.collected_data || {};
    const conversationHistory = existingSession?.context?.conversation_history || [];

    // Get user's greeting messages and preferences
    const { data: greetings } = await supabase
      .from('greeting_messages')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1);

    const activeGreeting = greetings?.[0];

    // Get user profile for business context
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Extract contact information and messages from the user query
    const extractionPrompt = `Extract structured information from this caller message: "${userQuery}"

    Look for and extract the following specific information:
    1. REASON FOR CALL - What is the caller calling about? (e.g., "appointment", "complaint", "inquiry", "support")
    2. CALLER NAME - Full name of the person calling
    3. CALLER PHONE NUMBER - Phone number (format properly)
    4. CALLER EMAIL - Email address if provided
    5. PERSON THEY WANT TO SPEAK TO - Who specifically they're looking for (e.g., "Dr. Smith", "Manager", "Sarah from sales")
    6. MESSAGE - Any specific message they want to leave
    7. ADDITIONAL INFO - Any other important details

    Current collected data: ${JSON.stringify(existingCollectedData)}

    Return ONLY a JSON object with extracted information. If no new information is found, return empty object {}.
    Use exactly these field names:
    {
      "reason_for_call": "Brief description of why they're calling",
      "caller_name": "Full name",
      "caller_phone": "+1 (555) 123-4567", 
      "caller_email": "email@example.com",
      "looking_for": "Person or department they want to speak to",
      "message": "Any specific message they want to leave",
      "additional_info": "Other relevant details"
    }`;

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
          { role: 'system', content: extractionPrompt },
          { role: 'user', content: userQuery }
        ],
        max_tokens: 300,
        temperature: 0.1,
      }),
    });

    let extractedData = {};
    if (extractionResponse.ok) {
      const extractionResult = await extractionResponse.json();
      try {
        extractedData = JSON.parse(extractionResult.choices[0].message.content.trim());
      } catch (e) {
        console.warn('Could not parse extracted data:', e);
      }
    }

    // Merge with existing collected data
    const updatedCollectedData = { ...existingCollectedData, ...extractedData };

    // Generate AI response based on context
    const systemPrompt = `You are ${profile?.assistant_name || 'an AI receptionist'} for ${profile?.display_name || 'this business'}.
    ${activeGreeting ? `Business greeting: "${activeGreeting.message}"` : 'Use a professional business greeting.'}
    
    Business contact info:
    ${profile?.contact_phone ? `Phone: ${profile.contact_phone}` : ''}
    ${profile?.contact_email ? `Email: ${profile.contact_email}` : ''}
    ${profile?.office_address ? `Address: ${profile.office_address}` : ''}
    ${profile?.website ? `Website: ${profile.website}` : ''}
    
    Instructions:
    - Respond in ${language === 'en' ? 'English' : `the language code: ${language}`}
    - Be helpful, professional, and concise
    - Always ask for caller's name and contact information if taking a message
    - If someone asks you to pass along a message, collect their name, phone number, and the complete message
    - For appointments, either schedule them or take detailed contact information
    - Keep responses under 100 words
    - Speak naturally as if on a phone call
    - If you've collected contact information, acknowledge it by name
    
    Current collected data: ${JSON.stringify(updatedCollectedData)}
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

    // Update conversation history
    const newConversationEntry = {
      timestamp: new Date().toISOString(),
      caller_query: userQuery,
      ai_response: aiResponse
    };
    
    const updatedConversationHistory = [...conversationHistory, newConversationEntry];

    // Store the AI interaction with collected data
    await supabase
      .from('call_sessions')
      .upsert({
        call_id: callId,
        current_state: 'ai_handled',
        collected_data: updatedCollectedData,
        context: {
          caller_id: callerId,
          language: language,
          conversation_history: updatedConversationHistory,
          last_interaction: new Date().toISOString()
        }
      }, { onConflict: 'call_id' });

    console.log('AI Response generated:', aiResponse);
    console.log('Collected data updated:', updatedCollectedData);

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