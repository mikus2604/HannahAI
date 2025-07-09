import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MANAGE-USER-PLAN] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Use service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { 
        auth: { 
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        } 
      }
    );

    // Verify admin user authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const adminUser = userData.user;
    if (!adminUser) throw new Error("User not authenticated");
    
    // Check if user has super_user role using the RPC function
    const { data: hasRole, error: roleError } = await supabaseAdmin.rpc('has_role', {
      _user_id: adminUser.id,
      _role: 'super_user'
    });
    
    if (roleError || !hasRole) {
      throw new Error("Access denied: Super user privileges required");
    }
    
    logStep("Admin user verified", { adminUserId: adminUser.id });

    const { action, email, newPlan, userId } = await req.json();
    
    if (action === 'search') {
      // Search for user by email
      if (!email) throw new Error("Email is required for search");
      
      logStep("Searching for user", { email });
      
      // Get user from auth.users (using admin client)
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      if (authError) throw new Error(`Failed to search users: ${authError.message}`);
      
      const targetUser = authUsers.users.find(u => u.email === email);
      if (!targetUser) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        });
      }
      
      // Get profile and subscription info
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('user_id', targetUser.id)
        .single();
      
      const { data: subscription } = await supabaseAdmin
        .from('subscribers')
        .select('*')
        .eq('user_id', targetUser.id)
        .single();
      
      logStep("User found", { userId: targetUser.id, currentPlan: profile?.plan_type });
      
      return new Response(JSON.stringify({
        user: {
          id: targetUser.id,
          email: targetUser.email,
          display_name: profile?.display_name,
          plan_type: profile?.plan_type || 'free',
          plan_expires_at: profile?.plan_expires_at,
          subscribed: subscription?.subscribed || false,
          subscription_tier: subscription?.subscription_tier
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    if (action === 'update') {
      // Update user's plan
      if (!userId || !newPlan) throw new Error("User ID and new plan are required");
      
      logStep("Updating user plan", { userId, newPlan });
      
      const now = new Date().toISOString();
      const planExpiresAt = newPlan === 'free' ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year from now
      
      // Update profiles table using RPC to avoid RLS issues
      const { data: updateResult, error: profileError } = await supabaseAdmin
        .rpc('admin_update_user_profile', {
          target_user_id: userId,
          new_plan_type: newPlan,
          new_plan_expires_at: planExpiresAt
        });
      
      if (profileError) {
        logStep("Profile update error", profileError);
        
        // Fallback: Try direct update with service role
        const { error: directUpdateError } = await supabaseAdmin
          .from('profiles')
          .update({
            plan_type: newPlan,
            plan_expires_at: planExpiresAt,
            updated_at: now
          })
          .eq('user_id', userId);
        
        if (directUpdateError) {
          logStep("Direct update also failed", directUpdateError);
          throw new Error(`Failed to update profile: ${directUpdateError.message}`);
        }
        
        logStep("Fallback direct update succeeded");
      } else {
        logStep("RPC update succeeded", updateResult);
      }
      
      // Update or insert subscribers table
      const subscriptionTier = newPlan === 'free' ? null : 
                             newPlan === 'premium' ? 'Premium' :
                             newPlan === 'premium_plus' ? 'Premium+' : 
                             newPlan === 'enterprise' ? 'Enterprise' : null;
      
      const { data: existingSubscription } = await supabaseAdmin
        .from('subscribers')
        .select('id')
        .eq('user_id', userId)
        .single();
      
      if (existingSubscription) {
        // Update existing subscription
        const { error: subError } = await supabaseAdmin
          .from('subscribers')
          .update({
            subscribed: newPlan !== 'free',
            subscription_tier: subscriptionTier,
            subscription_end: planExpiresAt,
            updated_at: now
          })
          .eq('user_id', userId);
        
        if (subError) throw new Error(`Failed to update subscription: ${subError.message}`);
      } else {
        // Get user email for new subscription record
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (authError || !authUser.user?.email) throw new Error("Failed to get user email");
        
        // Create new subscription record
        const { error: subError } = await supabaseAdmin
          .from('subscribers')
          .insert({
            user_id: userId,
            email: authUser.user.email,
            subscribed: newPlan !== 'free',
            subscription_tier: subscriptionTier,
            subscription_end: planExpiresAt,
            created_at: now,
            updated_at: now
          });
        
        if (subError) throw new Error(`Failed to create subscription: ${subError.message}`);
      }
      
      logStep("Plan updated successfully", { userId, newPlan, subscriptionTier });
      
      return new Response(JSON.stringify({
        success: true,
        message: `User plan updated to ${newPlan}`,
        plan_type: newPlan,
        plan_expires_at: planExpiresAt
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    throw new Error("Invalid action. Must be 'search' or 'update'");
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});