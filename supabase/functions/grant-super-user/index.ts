import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { email } = await req.json();
    
    if (!email) {
      throw new Error("Email is required");
    }

    // Find user by email in auth.users (using service role)
    const { data: authUsers, error: authError } = await supabaseClient.auth.admin.listUsers();
    
    if (authError) {
      throw new Error(`Failed to list users: ${authError.message}`);
    }

    const user = authUsers.users.find(u => u.email === email);
    
    if (!user) {
      throw new Error(`User with email ${email} not found`);
    }

    // Insert super_user role
    const { error: roleError } = await supabaseClient
      .from('user_roles')
      .upsert({
        user_id: user.id,
        role: 'super_user',
        created_by: user.id // Self-granted for initial setup
      }, { 
        onConflict: 'user_id,role',
        ignoreDuplicates: true 
      });

    if (roleError) {
      throw new Error(`Failed to grant super_user role: ${roleError.message}`);
    }

    return new Response(JSON.stringify({ 
      message: `Super user role granted to ${email}`,
      user_id: user.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});