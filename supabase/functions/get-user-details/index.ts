import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-USER-DETAILS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    logStep("User authenticated", { userId: user.id });

    // Check if user has super_user role
    const { data: hasRole, error: roleError } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'super_user'
    });

    if (roleError || !hasRole) {
      throw new Error("Access denied: Super user privileges required");
    }

    logStep("Super user access verified");

    const { userId } = await req.json();
    if (!userId) throw new Error("User ID is required");

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError) throw profileError;

    // Get subscription info
    const { data: subscription } = await supabaseClient
      .from('subscribers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // Get user auth data using service role
    const { data: authUser, error: authError } = await supabaseClient.auth.admin.getUserById(userId);
    if (authError) throw authError;

    // Get call statistics
    const { data: calls } = await supabaseClient
      .from('calls')
      .select('call_duration, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const totalCalls = calls?.length || 0;
    const lastCallDate = calls?.length ? calls[0]?.created_at : null;
    
    // Calculate total spent (mock data for now)
    const totalSpent = subscription?.subscribed ? 50.00 : 0;

    // Check if user has super_user role
    const { data: userHasSuperRole } = await supabaseClient.rpc('has_role', {
      _user_id: userId,
      _role: 'super_user'
    });

    const result = {
      id: userId,
      email: authUser.user?.email || '',
      display_name: profile?.display_name,
      plan_type: profile?.plan_type,
      plan_expires_at: profile?.plan_expires_at,
      subscribed: subscription?.subscribed || false,
      subscription_tier: subscription?.subscription_tier,
      created_at: profile?.created_at,
      phone_number: profile?.phone_number,
      total_calls: totalCalls,
      total_spent: totalSpent,
      last_call_date: lastCallDate,
      is_super_user: userHasSuperRole || false
    };

    logStep("User details retrieved successfully", { userId });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in get-user-details", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});