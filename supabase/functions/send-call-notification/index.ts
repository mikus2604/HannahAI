import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { callId, userId, notificationType = 'immediate' } = await req.json();
    
    console.log('Sending notification for call:', callId, 'to user:', userId);

    // Get call details with transcript
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select(`
        *,
        transcripts (*)
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

    // Get user email (in a real app, you'd have user profiles)
    // For now, we'll assume the email is passed in the request
    const userEmail = 'user@example.com'; // This should come from user profile

    // Format call duration
    const formatDuration = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Create transcript HTML
    const transcriptHtml = call.transcripts && call.transcripts.length > 0
      ? call.transcripts.map((t: any) => 
          `<p><strong>${t.speaker}:</strong> ${t.message}</p>`
        ).join('')
      : '<p>No transcript available</p>';

    // Create recording download button if available
    const recordingButton = call.recording_url 
      ? `<a href="${call.recording_url}" 
           style="background-color: #007bff; color: white; padding: 10px 20px; 
                  text-decoration: none; border-radius: 5px; display: inline-block; 
                  margin: 10px 0;">
           Download Recording
         </a>`
      : '<p>No recording available</p>';

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Call Notification</h2>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Call Details</h3>
          <p><strong>From:</strong> ${call.from_number}</p>
          <p><strong>To:</strong> ${call.to_number}</p>
          <p><strong>Date:</strong> ${new Date(call.started_at).toLocaleString()}</p>
          <p><strong>Duration:</strong> ${call.call_duration ? formatDuration(call.call_duration) : 'N/A'}</p>
          <p><strong>Status:</strong> ${call.call_status}</p>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Call Transcript</h3>
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
        from: 'Hannah AI <notifications@resend.dev>',
        to: [userEmail],
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
    console.log('Email sent successfully:', emailResult);

    // Log the notification
    await supabase
      .from('email_notifications')
      .insert({
        user_id: userId,
        notification_type: notificationType,
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