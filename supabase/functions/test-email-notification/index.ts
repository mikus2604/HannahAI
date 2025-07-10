import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { userEmail } = await req.json();
    
    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: 'userEmail is required' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Sending test email to: ${userEmail}`);

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
        to: [userEmail],
        subject: 'Test Email Notification - Hannah AI',
        html: testEmailHtml,
      }),
    });

    if (emailResponse.ok) {
      const result = await emailResponse.json();
      console.log(`Test email sent successfully to ${userEmail}:`, result);
      
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
      console.error(`Failed to send test email to ${userEmail}:`, errorText);
      
      return new Response(
        JSON.stringify({ 
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
      JSON.stringify({ error: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});