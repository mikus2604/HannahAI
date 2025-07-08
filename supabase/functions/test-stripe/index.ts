import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Stripe secret key not configured' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Test Stripe API by listing customers (simpler endpoint that doesn't require special permissions)
    const response = await fetch('https://api.stripe.com/v1/customers?limit=1', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Stripe API error: ${response.status} - ${errorData}` 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const customersData = await response.json();
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Stripe connection successful! Found ${customersData.data.length} customers in your account.` 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Stripe test error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Connection failed: ${error.message}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});