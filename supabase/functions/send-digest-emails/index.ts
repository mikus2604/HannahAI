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

async function getApiKey(userId: string, keyName: string): Promise<string | null> {
  try {
    // Try to get user's personal API key first
    const { data: userApiKey, error: userKeyError } = await supabase
      .from('api_keys')
      .select('key_value')
      .eq('user_id', userId)
      .eq('key_name', keyName)
      .maybeSingle();

    if (userApiKey && !userKeyError) {
      return userApiKey.key_value;
    }

    // Fall back to environment variable
    return Deno.env.get(keyName);
  } catch (error) {
    console.error('Error getting API key:', error);
    return Deno.env.get(keyName);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { digestType } = await req.json(); // 'daily', 'weekly', 'monthly'
    
    console.log(`Processing ${digestType} digest emails...`);

    // Calculate date range based on digest type
    const now = new Date();
    let startDate = new Date();
    
    switch (digestType) {
      case 'daily':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'weekly':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    // Get users who want this type of digest
    const { data: users, error: usersError } = await supabase
      .from('user_preferences')
      .select('user_id, notification_email')
      .eq('notification_frequency', digestType)
      .eq('email_notifications', true);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    if (!users || users.length === 0) {
      console.log(`No users found for ${digestType} digest`);
      return new Response(
        JSON.stringify({ message: `No users for ${digestType} digest`, sent: 0 }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    let sentCount = 0;

    for (const user of users) {
      try {
        // Get user's Resend API key
        const resendApiKey = await getApiKey(user.user_id, 'RESEND_API_KEY');
        if (!resendApiKey) {
          console.log(`No Resend API key configured for user ${user.user_id}, skipping`);
          continue;
        }

        // Get user profile for fallback email
        const { data: profile } = await supabase
          .from('profiles')
          .select('contact_email')
          .eq('user_id', user.user_id)
          .single();

        // Get calls for this user in the date range
        const { data: calls, error: callsError } = await supabase
          .from('calls')
          .select(`
            *,
            transcripts (*)
          `)
          .eq('user_id', user.user_id)
          .gte('started_at', startDate.toISOString())
          .lt('started_at', now.toISOString())
          .order('started_at', { ascending: false });

        if (callsError) {
          console.error(`Error fetching calls for user ${user.user_id}:`, callsError);
          continue;
        }

        if (!calls || calls.length === 0) {
          console.log(`No calls found for user ${user.user_id} in ${digestType} period`);
          continue;
        }

        // Create digest email HTML
        const formatDuration = (seconds: number) => {
          const mins = Math.floor(seconds / 60);
          const secs = seconds % 60;
          return `${mins}:${secs.toString().padStart(2, '0')}`;
        };

        const callsHtml = calls.map(call => `
          <div style="border: 1px solid #ddd; margin: 15px 0; padding: 15px; border-radius: 8px;">
            <h4>Call from ${call.from_number}</h4>
            <p><strong>Date:</strong> ${new Date(call.started_at).toLocaleString()}</p>
            <p><strong>Duration:</strong> ${call.call_duration ? formatDuration(call.call_duration) : 'N/A'}</p>
            <p><strong>Status:</strong> ${call.call_status}</p>
            
            ${call.transcripts && call.transcripts.length > 0 ? `
              <details style="margin-top: 10px;">
                <summary style="cursor: pointer; font-weight: bold;">View Transcript</summary>
                <div style="background-color: #f8f9fa; padding: 10px; margin-top: 10px; border-radius: 4px;">
                  ${call.transcripts.map((t: any) => 
                    `<p><strong>${t.speaker}:</strong> ${t.message}</p>`
                  ).join('')}
                </div>
              </details>
            ` : '<p>No transcript available</p>'}
            
            ${call.recording_url ? `
              <a href="${call.recording_url}" 
                 style="background-color: #007bff; color: white; padding: 8px 16px; 
                        text-decoration: none; border-radius: 4px; display: inline-block; 
                        margin-top: 10px; font-size: 14px;">
                Download Recording
              </a>
            ` : ''}
          </div>
        `).join('');

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>${digestType.charAt(0).toUpperCase() + digestType.slice(1)} Call Summary</h2>
            <p>Here's your ${digestType} summary of ${calls.length} call${calls.length > 1 ? 's' : ''} from ${startDate.toLocaleDateString()} to ${now.toLocaleDateString()}.</p>
            
            ${callsHtml}
            
            <hr style="margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">
              You're receiving this ${digestType} digest because you have it enabled in your notification preferences. 
              To modify your settings, visit your settings page.
            </p>
          </div>
        `;

        // Send digest email
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Hannah AI <notifications@arielonline.co.uk>',
            to: [user.notification_email || profile?.contact_email || 'user@example.com'],
            subject: `${digestType.charAt(0).toUpperCase() + digestType.slice(1)} Call Summary - ${calls.length} call${calls.length > 1 ? 's' : ''}`,
            html: emailHtml,
          }),
        });

        if (emailResponse.ok) {
          sentCount++;
          
          // Log the digest notification
          await supabase
            .from('email_notifications')
            .insert({
              user_id: user.user_id,
              notification_type: digestType,
              call_ids: calls.map(c => c.id),
              email_subject: `${digestType.charAt(0).toUpperCase() + digestType.slice(1)} Call Summary`,
              email_content: emailHtml,
              status: 'sent'
            });
            
          console.log(`Sent ${digestType} digest to user ${user.user_id}`);
        } else {
          console.error(`Failed to send ${digestType} digest to user ${user.user_id}`);
        }

      } catch (userError) {
        console.error(`Error processing ${digestType} digest for user ${user.user_id}:`, userError);
        continue;
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `${digestType} digest processing completed`, 
        sent: sentCount,
        totalUsers: users.length
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in send-digest-emails:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});