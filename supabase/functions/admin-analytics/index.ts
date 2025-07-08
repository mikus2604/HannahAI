import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-ANALYTICS] ${step}${detailsStr}`);
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

    // Get Supabase analytics
    const { data: analytics, error: analyticsError } = await supabaseClient.rpc('get_admin_analytics');
    if (analyticsError) throw analyticsError;

    logStep("Supabase analytics retrieved", analytics);

    // Get Stripe data
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    let stripeData = null;
    
    if (stripeKey) {
      try {
        const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
        
        // Try to get basic Stripe data with limited permissions
        let subscriptions;
        let customers;
        let charges = { data: [] };
        
        try {
          subscriptions = await stripe.subscriptions.list({ 
            limit: 100,
            status: 'active'
          });
          logStep("Stripe subscriptions retrieved", { count: subscriptions.data.length });
        } catch (subError) {
          logStep("Stripe subscriptions error (continuing)", { error: subError });
          subscriptions = { data: [] };
        }

        try {
          customers = await stripe.customers.list({ limit: 100 });
          logStep("Stripe customers retrieved", { count: customers.data.length });
        } catch (custError) {
          logStep("Stripe customers error (continuing)", { error: custError });
          customers = { data: [] };
        }
        
        // Skip charges API if we don't have permissions - this is what was causing the error
        try {
          charges = await stripe.charges.list({ 
            limit: 100,
            created: {
              gte: Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000) // Last 30 days
            }
          });
          logStep("Stripe charges retrieved", { count: charges.data.length });
        } catch (chargeError) {
          logStep("Stripe charges error (API key lacks permissions - using fallback)", { error: chargeError });
          charges = { data: [] };
        }

        // Calculate revenue (will be 0 if charges API is not accessible)
        const totalRevenue = charges.data
          .filter(charge => charge.status === 'succeeded')
          .reduce((sum, charge) => sum + charge.amount, 0);

        const monthlyRevenue = charges.data
          .filter(charge => 
            charge.status === 'succeeded' && 
            charge.created > Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)
          )
          .reduce((sum, charge) => sum + charge.amount, 0);

        // Analyze subscription tiers
        const subscriptionTiers = subscriptions.data.reduce((acc: any, sub) => {
          const price = sub.items.data[0]?.price;
          if (price) {
            const amount = price.unit_amount || 0;
            let tier = 'unknown';
            
            if (amount <= 2500) tier = 'premium';
            else if (amount <= 5000) tier = 'premium_plus';
            else tier = 'enterprise';
            
            acc[tier] = (acc[tier] || 0) + 1;
          }
          return acc;
        }, {});

        stripeData = {
          totalCustomers: customers.data.length,
          activeSubscriptions: subscriptions.data.length,
          subscriptionTiers,
          totalRevenue: totalRevenue / 100, // Convert from cents
          monthlyRevenue: monthlyRevenue / 100,
          averageRevenuePerUser: customers.data.length > 0 ? (totalRevenue / 100) / customers.data.length : 0,
          churnRate: 0, // Would need historical data to calculate properly
          lastUpdated: new Date().toISOString(),
          hasChargePermissions: charges.data.length > 0 || charges.data === undefined
        };

        logStep("Stripe data compiled", stripeData);
        
      } catch (stripeError) {
        logStep("Stripe API error (continuing without Stripe data)", { error: stripeError });
        stripeData = null;
      }
    }

    // Get recent users and activity
    const { data: recentUsers } = await supabaseClient
      .from('profiles')
      .select('user_id, display_name, plan_type, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: recentCalls } = await supabaseClient
      .from('calls')
      .select('id, call_status, call_duration, created_at, from_number, to_number')
      .order('created_at', { ascending: false })
      .limit(20);

    const { data: systemHealth } = await supabaseClient
      .from('calls')
      .select('call_status')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const callStatusStats = systemHealth?.reduce((acc: any, call) => {
      acc[call.call_status] = (acc[call.call_status] || 0) + 1;
      return acc;
    }, {}) || {};

    const result = {
      analytics: analytics?.[0] || {},
      stripe: stripeData,
      recentUsers: recentUsers || [],
      recentCalls: recentCalls || [],
      systemHealth: {
        callStatusDistribution: callStatusStats,
        totalCalls24h: systemHealth?.length || 0,
        successRate: systemHealth?.length ? 
          ((systemHealth.filter(c => c.call_status === 'completed').length / systemHealth.length) * 100).toFixed(2) : 0
      },
      timestamp: new Date().toISOString()
    };

    logStep("Analytics compiled successfully");

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in admin-analytics", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});