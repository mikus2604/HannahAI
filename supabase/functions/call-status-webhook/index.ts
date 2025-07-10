import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const formData = await req.formData();
    const callSid = formData.get('CallSid') as string;
    const callStatus = formData.get('CallStatus') as string;
    const callDuration = formData.get('CallDuration') as string;
    const recordingUrl = formData.get('RecordingUrl') as string;
    const recordingSid = formData.get('RecordingSid') as string;

    console.log('=== CALL STATUS WEBHOOK ===', { 
      callSid, 
      callStatus, 
      callDuration, 
      recordingUrl,
      recordingSid 
    });

    // Handle recording URL callback first
    if (recordingUrl && recordingSid) {
      console.log('Recording callback received:', { recordingUrl, recordingSid });
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      await supabase
        .from('calls')
        .update({ 
          recording_url: recordingUrl,
          recording_expires_at: expiresAt.toISOString()
        })
        .eq('twilio_call_sid', callSid);
        
      console.log('Recording URL updated for call:', callSid);
      return new Response('Recording processed', {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    }

    // Handle call status updates
    if (!callStatus) {
      console.log('No call status in webhook, skipping');
      return new Response('No status to process', {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    }

    // Find the call record
    const { data: existingCall } = await supabase
      .from('calls')
      .select('*')
      .eq('twilio_call_sid', callSid)
      .single();

    if (!existingCall) {
      console.log('Call not found for status update:', callSid);
      return new Response('Call not found', {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    }

    // Map Twilio status to our status with reliable logic
    let finalStatus = 'failed';
    let endedAt = null;

    switch (callStatus) {
      case 'completed':
        finalStatus = 'completed';
        endedAt = new Date().toISOString();
        break;
      case 'busy':
      case 'no-answer':
      case 'failed':
      case 'canceled':
        finalStatus = 'failed';
        endedAt = new Date().toISOString();
        break;
      case 'in-progress':
      case 'ringing':
        // Keep as in-progress, don't update ended_at
        finalStatus = 'in-progress';
        break;
      default:
        console.log('Unknown call status:', callStatus);
        finalStatus = existingCall.call_status; // Keep current status
    }

    // Update call record
    const updateData: any = { 
      call_status: finalStatus,
    };
    
    if (endedAt) {
      updateData.ended_at = endedAt;
    }
    
    if (callDuration && parseInt(callDuration) > 0) {
      updateData.call_duration = parseInt(callDuration);
    }

    await supabase
      .from('calls')
      .update(updateData)
      .eq('twilio_call_sid', callSid);

    console.log('Call status updated:', { callSid, finalStatus, callDuration });

    // Trigger email notification for completed calls
    if (finalStatus === 'completed' && existingCall.user_id) {
      const backgroundEmailTask = async () => {
        try {
          const { data: { user: authUser }, error: authError } = await supabase.auth.admin.getUserById(existingCall.user_id);
          
          if (!authError && authUser?.email) {
            await supabase.functions.invoke('send-call-notification', {
              body: { 
                callId: existingCall.id, 
                userId: existingCall.user_id,
                userEmail: authUser.email
              }
            });
            console.log('Email notification triggered for completed call');
          }
        } catch (error) {
          console.error('Background email notification failed:', error);
        }
      };
      
      EdgeRuntime.waitUntil(backgroundEmailTask());
    }

    return new Response('Status updated', {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
    });

  } catch (error) {
    console.error('Error in call-status-webhook:', error);
    
    return new Response('Webhook error', {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
    });
  }
});
