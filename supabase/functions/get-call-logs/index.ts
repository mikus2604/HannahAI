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

    const url = new URL(req.url);
    const callId = url.searchParams.get('callId');

    if (callId) {
      // Get specific call with transcripts
      const { data: call, error: callError } = await supabase
        .from('calls')
        .select('*')
        .eq('id', callId)
        .single();

      if (callError) {
        throw callError;
      }

      const { data: transcripts, error: transcriptError } = await supabase
        .from('transcripts')
        .select('*')
        .eq('call_id', callId)
        .order('timestamp', { ascending: true });

      if (transcriptError) {
        throw transcriptError;
      }

      const { data: session, error: sessionError } = await supabase
        .from('call_sessions')
        .select('*')
        .eq('call_id', callId)
        .single();

      return new Response(
        JSON.stringify({
          call,
          transcripts,
          session
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    } else {
      // Get all calls with basic info
      const { data: calls, error } = await supabase
        .from('calls')
        .select(`
          *,
          transcripts:transcripts(count),
          call_sessions:call_sessions(current_state, collected_data)
        `)
        .order('started_at', { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({ calls }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

  } catch (error) {
    console.error('Error in get-call-logs function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});