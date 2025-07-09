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
    const { fromNumber, toNumber } = await req.json();
    
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    
    if (!twilioAccountSid || !twilioAuthToken) {
      console.error('Missing Twilio credentials');
      return new Response(
        JSON.stringify({ error: 'Twilio credentials not configured' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Make a test call using Twilio's API
    const callData = new URLSearchParams({
      From: fromNumber || '+441917433210',
      To: toNumber,
      Url: 'https://idupowkqzcwrjslcixsp.supabase.co/functions/v1/voice-incoming',
      Method: 'POST'
    });

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: callData.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to make test call:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to make test call', details: error }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    const result = await response.json();
    console.log('Test call initiated successfully:', result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Test call initiated successfully',
        callSid: result.sid,
        status: result.status
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error making test call:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});