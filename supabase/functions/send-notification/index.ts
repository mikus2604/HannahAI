import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface NotificationRequest {
  userId: string;
  type: 'sms' | 'email';
  recipient: string;
  subject?: string;
  message: string;
  callId?: string;
  brandingConfig?: {
    companyName?: string;
    fromName?: string;
    customSignature?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      userId, 
      type, 
      recipient, 
      subject, 
      message, 
      callId,
      brandingConfig 
    }: NotificationRequest = await req.json();

    console.log('Notification request:', { userId, type, recipient, callId });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's profile and preferences
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!profile) {
      throw new Error('User profile not found');
    }

    // Check if user has Premium+ for white-label features
    const isPremiumPlus = profile.plan_type === 'premium_plus' || profile.plan_type === 'enterprise';
    
    // Apply white-label branding if available
    const companyName = isPremiumPlus && brandingConfig?.companyName ? 
      brandingConfig.companyName : 'Voice Assistant';
    const fromName = isPremiumPlus && brandingConfig?.fromName ? 
      brandingConfig.fromName : 'Voice Assistant';
    const signature = isPremiumPlus && brandingConfig?.customSignature ? 
      brandingConfig.customSignature : 'Best regards,\nThe Voice Assistant Team';

    let notificationResult;

    if (type === 'sms') {
      // Send white-label SMS via Twilio
      const smsBody = isPremiumPlus ? 
        `${message}\n\n- ${companyName}` : 
        `${message}\n\n- Voice Assistant`;

      const twilioResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: recipient,
            From: '+1234567890', // Your Twilio phone number
            Body: smsBody,
          }).toString(),
        }
      );

      if (!twilioResponse.ok) {
        const errorText = await twilioResponse.text();
        throw new Error(`Twilio SMS error: ${errorText}`);
      }

      notificationResult = await twilioResponse.json();
      console.log('SMS sent successfully:', notificationResult.sid);

    } else if (type === 'email') {
      // For now, store email notification request (would integrate with Resend when available)
      const emailContent = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
              .content { padding: 20px; }
              .footer { background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>${companyName}</h2>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>${message}</p>
              <br>
              <p>${signature}</p>
            </div>
            <div class="footer">
              <p>This is an automated message from ${companyName}</p>
            </div>
          </body>
        </html>
      `;

      // Store email notification (would be sent via Resend in production)
      const { data: emailRecord, error: emailError } = await supabase
        .from('email_notifications')
        .insert({
          user_id: userId,
          email_subject: subject || `Message from ${companyName}`,
          email_content: emailContent,
          notification_type: 'white_label',
          status: 'pending',
          call_ids: callId ? [callId] : []
        });

      if (emailError) {
        throw new Error(`Error storing email notification: ${emailError.message}`);
      }

      notificationResult = { 
        status: 'queued', 
        message: 'Email notification queued for delivery',
        emailId: emailRecord?.[0]?.id 
      };
      
      console.log('Email notification queued:', emailRecord);
    }

    // Log the notification
    await supabase
      .from('call_sessions')
      .upsert({
        call_id: callId || `notification_${Date.now()}`,
        current_state: 'notification_sent',
        context: {
          notification_type: type,
          recipient: recipient,
          white_label_enabled: isPremiumPlus,
          company_name: companyName,
          timestamp: new Date().toISOString()
        }
      }, { onConflict: 'call_id' });

    return new Response(
      JSON.stringify({ 
        success: true,
        type: type,
        recipient: recipient,
        whiteLabelEnabled: isPremiumPlus,
        result: notificationResult
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in send-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});