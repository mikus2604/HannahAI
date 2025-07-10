import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GetApiKeyRequest {
  keyName: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    const { keyName }: GetApiKeyRequest = await req.json();

    // First try to get from user's stored keys
    const { data: userApiKey, error: userKeyError } = await supabaseClient
      .from('api_keys')
      .select('key_value')
      .eq('user_id', user.id)
      .eq('key_name', keyName)
      .single();

    if (userApiKey && !userKeyError) {
      return new Response(JSON.stringify({ 
        success: true, 
        keyValue: userApiKey.key_value,
        source: 'user'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Fallback to environment variables for system-wide keys
    const envValue = Deno.env.get(keyName);
    if (envValue) {
      return new Response(JSON.stringify({ 
        success: true, 
        keyValue: envValue,
        source: 'system'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ 
      success: false, 
      error: `API key ${keyName} not found`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 404,
    });

  } catch (error) {
    console.error('Error in get-api-key function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});