import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber } = await req.json();

    if (!twilioAccountSid || !twilioAuthToken) {
      throw new Error('Twilio credentials not configured');
    }

    // Update the phone number to enable recording
    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/IncomingPhoneNumbers.json`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
        },
      }
    );

    if (!twilioResponse.ok) {
      throw new Error('Failed to fetch phone numbers from Twilio');
    }

    const data = await twilioResponse.json();
    const phoneNumberRecord = data.incoming_phone_numbers.find(
      (number: any) => number.phone_number === phoneNumber
    );

    if (!phoneNumberRecord) {
      throw new Error('Phone number not found in Twilio account');
    }

    // Update the phone number with recording enabled
    const updateResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/IncomingPhoneNumbers/${phoneNumberRecord.sid}.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          VoiceUrl: 'https://idupowkqzcwrjslcixsp.supabase.co/functions/v1/voice-incoming',
          VoiceMethod: 'POST',
          StatusCallback: 'https://idupowkqzcwrjslcixsp.supabase.co/functions/v1/call-status-webhook',
          StatusCallbackMethod: 'POST',
          StatusCallbackEvent: 'initiated,ringing,answered,completed',
          Record: 'record-from-ringing-dual',
          RecordingStatusCallback: 'https://idupowkqzcwrjslcixsp.supabase.co/functions/v1/call-status-webhook',
          RecordingStatusCallbackMethod: 'POST'
        }).toString(),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to update phone number: ${errorText}`);
    }

    const updatedNumber = await updateResponse.json();

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Recording enabled for phone number',
        phoneNumber: updatedNumber.phone_number
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error configuring recording:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});