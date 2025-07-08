import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GRANT-SUPER-USER-WITH-PASSWORD] ${step}${detailsStr}`);
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
    const currentUser = userData.user;
    if (!currentUser) throw new Error("User not authenticated");

    logStep("Current user authenticated", { userId: currentUser.id });

    // Check if current user has super_user role
    const { data: hasRole, error: roleError } = await supabaseClient.rpc('has_role', {
      _user_id: currentUser.id,
      _role: 'super_user'
    });

    if (roleError || !hasRole) {
      throw new Error("Access denied: Super user privileges required");
    }

    logStep("Super user access verified");

    const { targetUserId, currentUserPassword } = await req.json();
    
    if (!targetUserId) {
      throw new Error("Target user ID is required");
    }

    if (!currentUserPassword) {
      throw new Error("Current user password is required for confirmation");
    }

    // Verify current user's password
    const { error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: currentUser.email!,
      password: currentUserPassword
    });

    if (signInError) {
      throw new Error("Invalid password. Password confirmation failed.");
    }

    logStep("Password verified successfully");

    // Check if target user exists
    const { data: targetUserAuth, error: targetUserError } = await supabaseClient.auth.admin.getUserById(targetUserId);
    if (targetUserError || !targetUserAuth.user) {
      throw new Error("Target user not found");
    }

    // Insert super_user role for target user
    const { error: roleInsertError } = await supabaseClient
      .from('user_roles')
      .upsert({
        user_id: targetUserId,
        role: 'super_user',
        created_by: currentUser.id
      }, { 
        onConflict: 'user_id,role',
        ignoreDuplicates: true 
      });

    if (roleInsertError) {
      throw new Error(`Failed to grant super_user role: ${roleInsertError.message}`);
    }

    logStep("Super user role granted successfully", { targetUserId, grantedBy: currentUser.id });

    return new Response(JSON.stringify({ 
      message: `Super user role granted to user ${targetUserAuth.user.email}`,
      target_user_id: targetUserId,
      granted_by: currentUser.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in grant-super-user-with-password", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});