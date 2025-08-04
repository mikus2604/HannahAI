import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseKey);

export function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function getApiKey(userId: string, keyName: string): Promise<string | null> {
  try {
    // Try to get user's personal API key first
    const { data: userApiKey, error: userKeyError } = await supabase
      .from('api_keys')
      .select('key_value')
      .eq('user_id', userId)
      .eq('key_name', keyName)
      .maybeSingle();

    if (userApiKey && !userKeyError) {
      return userApiKey.key_value;
    }

    // Fall back to environment variable
    return Deno.env.get(keyName);
  } catch (error) {
    console.error('Error getting API key:', error);
    return Deno.env.get(keyName);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { callId, userId } = await req.json();
    
    console.log('Sending notification for call:', callId, 'to user:', userId);

    // Get user preferences for email notifications
    const { data: userPrefs, error: prefsError } = await supabase
      .from('user_preferences')
      .select('notification_email, email_notifications, notification_frequency')
      .eq('user_id', userId)
      .maybeSingle();

    if (prefsError) {
      console.error('Error fetching user preferences:', prefsError);
      return new Response(
        JSON.stringify({ error: 'Failed to get user preferences' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if email notifications are enabled
    if (!userPrefs?.email_notifications) {
      console.log('Email notifications disabled for user:', userId);
      return new Response(
        JSON.stringify({ success: true, message: 'Email notifications disabled' }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get notification email (prefer custom email, fallback to user's auth email)
    let notificationEmail = userPrefs.notification_email;
    if (!notificationEmail) {
      // Get user's primary email from auth
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
      if (userError || !userData.user?.email) {
        console.error('No email address found for user:', userId);
        return new Response(
          JSON.stringify({ error: 'No email address configured' }), 
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      notificationEmail = userData.user.email;
    }

    const notificationFrequency = userPrefs.notification_frequency || 'immediate';
    console.log(`Notification settings - Email: ${notificationEmail}, Frequency: ${notificationFrequency}`);

    // Get user's Resend API key
    const resendApiKey = await getApiKey(userId, 'RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured for user:', userId);
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get call details with transcript and collected data
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select(`
        *,
        transcripts (*),
        call_sessions (
          collected_data,
          current_state
        )
      `)
      .eq('id', callId)
      .single();

    if (callError || !call) {
      console.error('Error fetching call:', callError);
      return new Response(
        JSON.stringify({ error: 'Call not found' }), 
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Use the notification email from user preferences
    if (!notificationEmail) {
      throw new Error('No notification email configured');
    }

    // Format call duration
    const formatDuration = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Create transcript HTML
    const transcriptHtml = call.transcripts && call.transcripts.length > 0
      ? call.transcripts.map((t: any) =>
          `<p><strong>${escapeHtml(t.speaker)}:</strong> ${escapeHtml(t.message)}</p>`
        ).join('')
      : '<p>No transcript available</p>';

    // Create recording download button if available
    const recordingButton = call.recording_url
      ? `<a href="${escapeHtml(call.recording_url)}"
           style="background-color: #007bff; color: white; padding: 10px 20px;
                  text-decoration: none; border-radius: 5px; display: inline-block;
                  margin: 10px 0;">
           Download Recording
         </a>`
      : '<p>No recording available</p>';

    // Get collected data from call session
    const collectedData = call.call_sessions?.[0]?.collected_data || {};
    console.log('Collected data for email:', collectedData);
    
    // Create collected data HTML section
    const collectedDataHtml = Object.keys(collectedData).length > 0
      ? `<div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
           <h3>📋 Collected Information</h3>
           <div style="background-color: white; padding: 15px; border-radius: 4px;">
             ${collectedData.reason_for_call ? `<p><strong>Reason for Call:</strong> ${escapeHtml(collectedData.reason_for_call)}</p>` : ''}
             ${collectedData.caller_name ? `<p><strong>Caller Name:</strong> ${escapeHtml(collectedData.caller_name)}</p>` : ''}
             ${collectedData.caller_phone ? `<p><strong>Phone Number:</strong> ${escapeHtml(collectedData.caller_phone)}</p>` : ''}
             ${collectedData.caller_email ? `<p><strong>Email:</strong> ${escapeHtml(collectedData.caller_email)}</p>` : ''}
             ${collectedData.looking_for ? `<p><strong>Looking For:</strong> ${escapeHtml(collectedData.looking_for)}</p>` : ''}
             ${collectedData.message ? `<p><strong>Message:</strong> ${escapeHtml(collectedData.message)}</p>` : ''}
             ${collectedData.additional_info ? `<p><strong>Additional Info:</strong> ${escapeHtml(collectedData.additional_info)}</p>` : ''}
           </div>
         </div>`
      : '';

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>📞 Call Notification</h2>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Call Details</h3>
          <p><strong>From:</strong> ${escapeHtml(call.from_number)}</p>
          <p><strong>To:</strong> ${escapeHtml(call.to_number)}</p>
          <p><strong>Date:</strong> ${new Date(call.started_at).toLocaleString()}</p>
          <p><strong>Duration:</strong> ${call.call_duration ? formatDuration(call.call_duration) : 'N/A'}</p>
          <p><strong>Status:</strong> ${escapeHtml(call.call_status)}</p>
        </div>

        ${collectedDataHtml}

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>📝 Call Transcript</h3>
          <div style="background-color: white; padding: 15px; border-radius: 4px;">
            ${transcriptHtml}
          </div>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          ${recordingButton}
        </div>

        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          You're receiving this email because you have call notifications enabled. 
          To modify your notification preferences, visit your settings page.
        </p>
      </div>
    `;

    // Send email using Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Hannah AI <notifications@arielonline.co.uk>',
        to: [notificationEmail],
        subject: `New Call from ${call.from_number}`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      console.error('Error sending email:', error);
      throw new Error('Failed to send email');
    }

    const emailResult = await emailResponse.json();
    console.log(`Email sent successfully to ${notificationEmail}:`, emailResult);

    // Log the notification
    await supabase
      .from('email_notifications')
      .insert({
        user_id: userId,
        notification_type: notificationFrequency,
        call_ids: [callId],
        email_subject: `New Call from ${call.from_number}`,
        email_content: emailHtml,
        status: 'sent'
      });

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.id }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in send-call-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});