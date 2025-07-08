import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface CallRoutingRule {
  priority: number;
  condition: string; // 'time_based' | 'caller_id' | 'keyword' | 'default'
  action: string; // 'forward' | 'voicemail' | 'ai_handle' | 'busy'
  target?: string; // phone number for forwarding
  timeRange?: { start: string; end: string; timezone: string };
  keywords?: string[];
  callerIds?: string[];
}

interface CallRoutingRequest {
  callSid: string;
  from: string;
  to: string;
  userId: string;
  userInput?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { callSid, from, to, userId, userInput }: CallRoutingRequest = await req.json();

    console.log('Call routing request:', { callSid, from, to, userId, userInput });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's routing rules (simulate for now - would be stored in database)
    const defaultRules: CallRoutingRule[] = [
      {
        priority: 1,
        condition: 'time_based',
        action: 'ai_handle',
        timeRange: { start: '09:00', end: '17:00', timezone: 'America/New_York' }
      },
      {
        priority: 2,
        condition: 'keyword',
        action: 'forward',
        keywords: ['emergency', 'urgent'],
        target: '+1234567890' // Would be user's emergency contact
      },
      {
        priority: 3,
        condition: 'default',
        action: 'ai_handle'
      }
    ];

    // Evaluate routing rules
    let selectedRule: CallRoutingRule | null = null;
    
    for (const rule of defaultRules.sort((a, b) => a.priority - b.priority)) {
      if (rule.condition === 'time_based' && rule.timeRange) {
        const now = new Date();
        const currentTime = now.toLocaleTimeString('en-US', { 
          hour12: false, 
          timeZone: rule.timeRange.timezone 
        });
        
        if (currentTime >= rule.timeRange.start && currentTime <= rule.timeRange.end) {
          selectedRule = rule;
          break;
        }
      } else if (rule.condition === 'keyword' && rule.keywords && userInput) {
        const hasKeyword = rule.keywords.some(keyword => 
          userInput.toLowerCase().includes(keyword.toLowerCase())
        );
        if (hasKeyword) {
          selectedRule = rule;
          break;
        }
      } else if (rule.condition === 'caller_id' && rule.callerIds) {
        if (rule.callerIds.includes(from)) {
          selectedRule = rule;
          break;
        }
      } else if (rule.condition === 'default') {
        selectedRule = rule;
        break;
      }
    }

    if (!selectedRule) {
      selectedRule = { priority: 999, condition: 'default', action: 'ai_handle' };
    }

    console.log('Selected routing rule:', selectedRule);

    // Execute routing action
    let twimlResponse = '';
    
    switch (selectedRule.action) {
      case 'forward':
        if (selectedRule.target) {
          twimlResponse = `
            <Response>
              <Say voice="alice">Connecting your call, please hold.</Say>
              <Dial>
                <Number>${selectedRule.target}</Number>
              </Dial>
            </Response>
          `;
        } else {
          twimlResponse = `
            <Response>
              <Say voice="alice">I'm sorry, call forwarding is not configured. Please try again later.</Say>
              <Hangup/>
            </Response>
          `;
        }
        break;
        
      case 'voicemail':
        twimlResponse = `
          <Response>
            <Say voice="alice">Please leave a message after the tone, and we'll get back to you soon.</Say>
            <Record maxLength="120" action="/api/voicemail/${callSid}" />
            <Say voice="alice">Thank you for your message. Goodbye!</Say>
            <Hangup/>
          </Response>
        `;
        break;
        
      case 'busy':
        twimlResponse = `
          <Response>
            <Say voice="alice">We're currently busy helping other customers. Please call back later.</Say>
            <Hangup/>
          </Response>
        `;
        break;
        
      case 'ai_handle':
      default:
        twimlResponse = `
          <Response>
            <Gather input="speech" action="/api/ai-response/${callSid}" speechTimeout="3" speechModel="phone_call">
              <Say voice="alice">Hello! I'm your AI assistant. How can I help you today?</Say>
            </Gather>
            <Say voice="alice">I didn't catch that. Please try calling again.</Say>
            <Hangup/>
          </Response>
        `;
        break;
    }

    // Log the routing decision
    await supabase
      .from('call_sessions')
      .upsert({
        call_id: callSid,
        current_state: 'routed',
        context: {
          routing_rule: selectedRule,
          from: from,
          to: to,
          user_input: userInput,
          timestamp: new Date().toISOString()
        }
      }, { onConflict: 'call_id' });

    console.log('Call routing completed:', { rule: selectedRule.action, callSid });

    return new Response(twimlResponse, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/xml'
      },
      status: 200
    });

  } catch (error) {
    console.error('Error in call-routing:', error);
    
    // Fallback TwiML response
    const fallbackResponse = `
      <Response>
        <Say voice="alice">I'm sorry, there's a technical issue. Please try calling again later.</Say>
        <Hangup/>
      </Response>
    `;
    
    return new Response(fallbackResponse, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/xml'
      },
      status: 200
    });
  }
});