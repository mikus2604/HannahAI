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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting recording cleanup process...');

    // Find calls with expired recordings
    const { data: expiredCalls, error: selectError } = await supabase
      .from('calls')
      .select('id, recording_url, recording_expires_at')
      .not('recording_url', 'is', null)
      .not('recording_expires_at', 'is', null)
      .lt('recording_expires_at', new Date().toISOString());

    if (selectError) {
      console.error('Error fetching expired calls:', selectError);
      throw selectError;
    }

    if (!expiredCalls || expiredCalls.length === 0) {
      console.log('No expired recordings found');
      return new Response(
        JSON.stringify({ message: 'No expired recordings found', deleted: 0 }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Found ${expiredCalls.length} expired recordings to clean up`);

    // Clear recording URLs for expired calls
    const callIds = expiredCalls.map(call => call.id);
    
    const { error: updateError } = await supabase
      .from('calls')
      .update({ 
        recording_url: null, 
        recording_expires_at: null 
      })
      .in('id', callIds);

    if (updateError) {
      console.error('Error clearing recording URLs:', updateError);
      throw updateError;
    }

    console.log(`Successfully cleaned up ${callIds.length} expired recordings`);

    return new Response(
      JSON.stringify({ 
        message: 'Recording cleanup completed successfully', 
        deleted: callIds.length,
        deletedCallIds: callIds
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in cleanup-recordings:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});