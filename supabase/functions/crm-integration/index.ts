import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface CrmIntegrationRequest {
  userId: string;
  callData: {
    callId: string;
    callerId: string;
    duration?: number;
    transcript?: string;
    summary?: string;
    timestamp: string;
  };
  webhookUrl?: string;
  integrationSettings?: {
    includeTranscript: boolean;
    includeSummary: boolean;
    includeRecording: boolean;
    customFields?: Record<string, any>;
  };
}

interface CrmWebhookPayload {
  event: 'call_completed';
  timestamp: string;
  data: {
    call_id: string;
    caller_phone: string;
    duration_seconds?: number;
    transcript?: string;
    summary?: string;
    recording_url?: string;
    custom_fields?: Record<string, any>;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      userId, 
      callData, 
      webhookUrl,
      integrationSettings = {
        includeTranscript: true,
        includeSummary: true,
        includeRecording: false
      }
    }: CrmIntegrationRequest = await req.json();

    console.log('CRM Integration request:', { userId, callId: callData.callId });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's profile to check plan level
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!profile) {
      throw new Error('User profile not found');
    }

    // Check if user has Premium+ for CRM integration
    const hasCrmAccess = profile.plan_type === 'premium_plus' || profile.plan_type === 'enterprise';
    
    if (!hasCrmAccess) {
      throw new Error('CRM integration requires Premium+ or Enterprise plan');
    }

    // Get call recording URL if requested
    let recordingUrl = null;
    if (integrationSettings.includeRecording) {
      const { data: callRecord } = await supabase
        .from('calls')
        .select('recording_url')
        .eq('id', callData.callId)
        .single();
      
      recordingUrl = callRecord?.recording_url;
    }

    // Get full transcript if requested
    let fullTranscript = callData.transcript;
    if (integrationSettings.includeTranscript && !fullTranscript) {
      const { data: transcripts } = await supabase
        .from('transcripts')
        .select('message, speaker, timestamp')
        .eq('call_id', callData.callId)
        .order('timestamp');
      
      if (transcripts && transcripts.length > 0) {
        fullTranscript = transcripts
          .map(t => `[${t.speaker}]: ${t.message}`)
          .join('\n');
      }
    }

    // Prepare webhook payload
    const webhookPayload: CrmWebhookPayload = {
      event: 'call_completed',
      timestamp: callData.timestamp,
      data: {
        call_id: callData.callId,
        caller_phone: callData.callerId,
        duration_seconds: callData.duration,
        ...(integrationSettings.includeTranscript && fullTranscript && { transcript: fullTranscript }),
        ...(integrationSettings.includeSummary && callData.summary && { summary: callData.summary }),
        ...(integrationSettings.includeRecording && recordingUrl && { recording_url: recordingUrl }),
        ...(integrationSettings.customFields && { custom_fields: integrationSettings.customFields })
      }
    };

    // Send to webhook URL (Zapier, Make.com, or custom CRM)
    const webhookResults = [];
    
    if (webhookUrl) {
      try {
        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Voice-Assistant-CRM-Integration/1.0'
          },
          body: JSON.stringify(webhookPayload)
        });

        const webhookResult = {
          url: webhookUrl,
          status: webhookResponse.status,
          success: webhookResponse.ok,
          response: webhookResponse.ok ? 'sent' : await webhookResponse.text()
        };

        webhookResults.push(webhookResult);
        console.log('Webhook sent:', webhookResult);

      } catch (error) {
        console.error('Webhook error:', error);
        webhookResults.push({
          url: webhookUrl,
          status: 0,
          success: false,
          error: error.message
        });
      }
    }

    // Store integration log
    await supabase
      .from('call_sessions')
      .upsert({
        call_id: callData.callId,
        current_state: 'crm_integrated',
        context: {
          crm_integration: {
            webhook_url: webhookUrl,
            webhook_results: webhookResults,
            settings: integrationSettings,
            timestamp: new Date().toISOString()
          }
        }
      }, { onConflict: 'call_id' });

    return new Response(
      JSON.stringify({
        success: true,
        callId: callData.callId,
        integrationResults: webhookResults,
        settings: integrationSettings
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in crm-integration:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});