import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PlanLimits {
  canMakeCalls: boolean;
  canAddGreetings: boolean;
  hasAdvancedAI: boolean;
  hasCalendarIntegration: boolean;
  hasCRMSync: boolean;
  hasWebhookSupport: boolean;
  hasFullAPIAccess: boolean;
  hasPrioritySupport: boolean;
  recordingStorageDays: number;
  monthlyCallLimit: number;
  greetingLimit: number;
}

interface Usage {
  calls_count: number;
  greeting_messages_count: number;
  api_requests_count: number;
}

export const usePlanEnforcement = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [usage, setUsage] = useState<Usage>({ calls_count: 0, greeting_messages_count: 0, api_requests_count: 0 });
  const [loading, setLoading] = useState(true);

  const isPremium = profile?.plan_type === 'premium';
  const currentMonth = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    if (user) {
      fetchUsage();
    }
  }, [user]);

  const fetchUsage = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_usage')
        .select('calls_count, greeting_messages_count, api_requests_count')
        .eq('user_id', user.id)
        .eq('month_year', currentMonth)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching usage:', error);
        return;
      }

      setUsage(data || { calls_count: 0, greeting_messages_count: 0, api_requests_count: 0 });
    } catch (error) {
      console.error('Error fetching usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFeatureAccess = async (feature: string): Promise<boolean> => {
    if (!user) return false;

    try {
      switch (feature) {
        case 'calls':
          const { data: canCall } = await supabase.rpc('can_user_make_call', { user_uuid: user.id });
          return canCall;
        
        case 'greetings':
          const { data: canAddGreeting } = await supabase.rpc('can_user_add_greeting', { user_uuid: user.id });
          return canAddGreeting;
        
        default:
          return isPremium;
      }
    } catch (error) {
      console.error('Error checking feature access:', error);
      return false;
    }
  };

  const showUpgradePrompt = (feature: string) => {
    const featureNames: Record<string, string> = {
      calls: 'unlimited calls',
      greetings: 'unlimited custom greetings',
      ai: 'advanced AI features',
      calendar: 'calendar integration',
      crm: 'CRM sync',
      webhooks: 'webhook support',
      api: 'full API access',
      support: 'priority support'
    };

    toast({
      title: "Premium Feature",
      description: `Upgrade to Premium to unlock ${featureNames[feature] || feature}.`,
      action: (
        <button 
          onClick={() => window.location.href = '/upgrade'}
          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm"
        >
          Upgrade
        </button>
      ),
    });
  };

  const getPlanLimits = (): PlanLimits => {
    const baseFeatures = {
      canMakeCalls: usage.calls_count < 100,
      canAddGreetings: usage.greeting_messages_count < 1,
      hasAdvancedAI: false,
      hasCalendarIntegration: false,
      hasCRMSync: false,
      hasWebhookSupport: false,
      hasFullAPIAccess: false,
      hasPrioritySupport: false,
      recordingStorageDays: 7,
      monthlyCallLimit: 100,
      greetingLimit: 1,
    };

    if (isPremium) {
      return {
        ...baseFeatures,
        canMakeCalls: true,
        canAddGreetings: true,
        hasAdvancedAI: true,
        hasCalendarIntegration: true,
        hasCRMSync: true,
        hasWebhookSupport: true,
        hasFullAPIAccess: true,
        hasPrioritySupport: true,
        recordingStorageDays: 180, // 6 months
        monthlyCallLimit: Infinity,
        greetingLimit: Infinity,
      };
    }

    return baseFeatures;
  };

  return {
    usage,
    loading,
    isPremium,
    planLimits: getPlanLimits(),
    checkFeatureAccess,
    showUpgradePrompt,
    refreshUsage: fetchUsage,
  };
};