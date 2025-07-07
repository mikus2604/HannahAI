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
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    
    if (!twilioAccountSid || !twilioAuthToken) {
      console.error('Twilio credentials are not set');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Twilio credentials are not configured in Supabase secrets' 
        }), 
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Testing Twilio API connection...');

    // Test the Twilio API by fetching account information
    const authString = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}.json`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Twilio API error:', response.status, errorData);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Twilio API returned ${response.status}: Invalid credentials or API access denied`,
          status: response.status
        }), 
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();
    console.log('Twilio API test successful:', data);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Twilio API connection test successful!',
        accountInfo: {
          friendlyName: data.friendly_name,
          status: data.status,
          type: data.type,
          dateCreated: data.date_created
        }
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error testing Twilio API:', error);
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