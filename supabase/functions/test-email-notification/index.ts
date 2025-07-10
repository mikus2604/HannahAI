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

async function getApiKey(authHeader: string, keyName: string): Promise<string | null> {
  console.log(`[getApiKey] Starting API key lookup for: ${keyName}`);
  
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const token = authHeader.replace("Bearer ", "");
    console.log(`[getApiKey] Attempting to authenticate user with token length: ${token.length}`);
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      console.log(`[getApiKey] User authentication failed:`, userError);
      const envKey = Deno.env.get(keyName);
      console.log(`[getApiKey] Falling back to env variable, found: ${envKey ? 'YES' : 'NO'}`);
      return envKey;
    }

    console.log(`[getApiKey] User authenticated successfully: ${userData.user.id}`);

    const { data: userApiKey, error: userKeyError } = await supabaseClient
      .from('api_keys')
      .select('key_value')
      .eq('user_id', userData.user.id)
      .eq('key_name', keyName)
      .maybeSingle();

    console.log(`[getApiKey] Database query result:`, { 
      data: userApiKey ? 'FOUND' : 'NOT_FOUND', 
      error: userKeyError,
      keyExists: !!userApiKey?.key_value
    });

    if (userApiKey && !userKeyError) {
      console.log(`[getApiKey] Retrieved user API key successfully`);
      return userApiKey.key_value;
    }

    const envKey = Deno.env.get(keyName);
    console.log(`[getApiKey] No user key found, falling back to env variable: ${envKey ? 'FOUND' : 'NOT_FOUND'}`);
    return envKey;
  } catch (error) {
    console.error('[getApiKey] Error getting API key:', error);
    const envKey = Deno.env.get(keyName);
    console.log(`[getApiKey] Exception fallback to env variable: ${envKey ? 'FOUND' : 'NOT_FOUND'}`);
    return envKey;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    console.log(`[main] Auth header length: ${authHeader.length}`);
    
    const resendApiKey = await getApiKey(authHeader, 'RESEND_API_KEY');
    console.log(`[main] Retrieved API key: ${resendApiKey ? 'FOUND' : 'NOT_FOUND'}`);

    if (!resendApiKey) {
      console.error('[main] RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Resend API key is not configured. Please set it up in APIs Management.' 
        }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { userEmail } = await req.json().catch(() => ({ userEmail: null }));
    
    // Get user email from auth if not provided
    let targetEmail = userEmail;
    if (!targetEmail) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabase.auth.getUser(token);
      targetEmail = userData.user?.email;
      
      if (!targetEmail) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'No email address available for sending test notification' 
          }), 
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    console.log(`Sending test email to: ${targetEmail}`);

    const testEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Email Notification Test</h2>
        <p>This is a test email to verify that your notification settings are working correctly.</p>
        
        <div style="border: 1px solid #ddd; margin: 15px 0; padding: 15px; border-radius: 8px;">
          <h4>Test Call from +1 (555) 123-4567</h4>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Duration:</strong> 2:34</p>
          <p><strong>Status:</strong> completed</p>
          
          <details style="margin-top: 10px;">
            <summary style="cursor: pointer; font-weight: bold;">View Transcript</summary>
            <div style="background-color: #f8f9fa; padding: 10px; margin-top: 10px; border-radius: 4px;">
              <p><strong>Assistant:</strong> Hi, I'm Hannah. Thank you for calling. How may I help you today?</p>
              <p><strong>Caller:</strong> Hi, I'm looking for information about your services.</p>
              <p><strong>Assistant:</strong> I'd be happy to help you with that. Let me connect you with someone who can provide detailed information.</p>
            </div>
          </details>
        </div>
        
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          This is a test notification. Your email notification system is working correctly!
        </p>
      </div>
    `;

    // Send test email
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Hannah AI <notifications@resend.dev>',
        to: [targetEmail],
        subject: 'Test Email Notification - Hannah AI',
        html: testEmailHtml,
      }),
    });

    if (emailResponse.ok) {
      const result = await emailResponse.json();
      console.log(`Test email sent successfully to ${targetEmail}:`, result);
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Test email sent successfully',
          emailId: result.id
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      const errorText = await emailResponse.text();
      console.error(`Failed to send test email to ${targetEmail}:`, errorText);
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to send test email',
          details: errorText
        }), 
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Error in test-email-notification:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});