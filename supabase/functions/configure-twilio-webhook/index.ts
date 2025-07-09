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
    const { phoneNumber } = await req.json();
    
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

    const webhookUrl = 'https://idupowkqzcwrjslcixsp.supabase.co/functions/v1/voice-incoming';
    
    // Configure the phone number webhook
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/IncomingPhoneNumbers.json`;
    
    // First, get the phone number SID
    const listResponse = await fetch(twilioUrl, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
      },
    });

    if (!listResponse.ok) {
      const error = await listResponse.text();
      console.error('Failed to list phone numbers:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to list phone numbers' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    const phoneNumbers = await listResponse.json();
    const phoneNumberRecord = phoneNumbers.incoming_phone_numbers.find(
      (pn: any) => pn.phone_number === phoneNumber
    );

    if (!phoneNumberRecord) {
      console.error('Phone number not found in Twilio account:', phoneNumber);
      return new Response(
        JSON.stringify({ error: 'Phone number not found in Twilio account' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      );
    }

    // Update the phone number with the webhook URL
    const updateResponse = await fetch(`${twilioUrl}/${phoneNumberRecord.sid}`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `VoiceUrl=${encodeURIComponent(webhookUrl)}&VoiceMethod=POST&SmsUrl=${encodeURIComponent('https://idupowkqzcwrjslcixsp.supabase.co/functions/v1/sms-webhook')}&SmsMethod=POST`,
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      console.error('Failed to update phone number webhook:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to update webhook configuration' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    const result = await updateResponse.json();
    console.log('Webhook configured successfully:', result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook configured successfully',
        phoneNumber: phoneNumber,
        webhookUrl: webhookUrl
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error configuring Twilio webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});