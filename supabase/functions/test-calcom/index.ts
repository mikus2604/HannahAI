import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const calcomApiKey = Deno.env.get('CALCOM_API_KEY');
    
    if (!calcomApiKey) {
      console.error('Cal.com API key is not set');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Cal.com API key is not configured in Supabase secrets' 
        }), 
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Testing Cal.com API connection...');

    // Test the Cal.com API by fetching user profile
    const response = await fetch('https://api.cal.com/v1/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${calcomApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Cal.com API error:', response.status, errorData);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Cal.com API returned ${response.status}: Invalid API key or access denied`,
          status: response.status
        }), 
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();
    console.log('Cal.com API test successful:', data);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Cal.com API connection test successful!',
        userInfo: {
          username: data.username,
          name: data.name,
          email: data.email,
          timeZone: data.timeZone
        }
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error testing Cal.com API:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Connection test failed: ${error.message}` 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});