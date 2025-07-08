import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BarChart, Crown, AlertTriangle, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { NavLink } from "react-router-dom";

interface Usage {
  calls_count: number;
  greeting_messages_count: number;
  api_requests_count: number;
}

const UsageOverview = () => {
  const { user, profile } = useAuth();
  const [usage, setUsage] = useState<Usage>({ calls_count: 0, greeting_messages_count: 0, api_requests_count: 0 });
  const [loading, setLoading] = useState(true);

  const isPremium = profile?.plan_type === 'premium';
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

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

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
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

  const getUsageColor = (current: number, limit: number) => {
    const percentage = (current / limit) * 100;
    if (percentage >= 90) return "text-red-600";
    if (percentage >= 75) return "text-orange-600";
    return "text-green-600";
  };

  const getProgressColor = (current: number, limit: number) => {
    const percentage = (current / limit) * 100;
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 75) return "bg-orange-500";
    return "bg-green-500";
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-2 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const limits = {
    calls: isPremium ? Infinity : 100,
    greetings: isPremium ? Infinity : 1,
    api: isPremium ? 10000 : 100
  };

  const callsPercentage = isPremium ? 0 : Math.min((usage.calls_count / limits.calls) * 100, 100);
  const isNearCallLimit = !isPremium && usage.calls_count >= 80;
  const isAtCallLimit = !isPremium && usage.calls_count >= 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart className="h-5 w-5" />
          Usage Overview
          {isPremium && (
            <Badge className="bg-yellow-100 text-yellow-800 ml-auto">
              <Crown className="h-3 w-3 mr-1" />
              Premium
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Your current usage for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Calls Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Monthly Calls</span>
            <span className={`text-sm font-semibold ${getUsageColor(usage.calls_count, limits.calls)}`}>
              {usage.calls_count} {isPremium ? '' : `/ ${limits.calls}`}
            </span>
          </div>
          {!isPremium && (
            <div className="space-y-1">
              <Progress 
                value={callsPercentage} 
                className="h-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Free Plan Limit</span>
                <span>{Math.round(callsPercentage)}% used</span>
              </div>
            </div>
          )}
          {isPremium && (
            <div className="text-sm text-green-600 font-medium">
              ✓ Unlimited calls
            </div>
          )}
        </div>

        {/* Warning for near limit */}
        {isNearCallLimit && !isAtCallLimit && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              You're approaching your monthly call limit. Consider upgrading to Premium for unlimited calls.
            </AlertDescription>
          </Alert>
        )}

        {/* At limit warning */}
        {isAtCallLimit && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              You've reached your monthly call limit. Upgrade to Premium to continue making calls.
            </AlertDescription>
          </Alert>
        )}

        {/* Greeting Messages */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Custom Greetings</span>
            <span className={`text-sm font-semibold ${getUsageColor(usage.greeting_messages_count, limits.greetings)}`}>
              {usage.greeting_messages_count} {isPremium ? '' : `/ ${limits.greetings}`}
            </span>
          </div>
          {!isPremium && usage.greeting_messages_count >= limits.greetings && (
            <div className="text-xs text-orange-600">
              Upgrade to Premium for unlimited custom greetings
            </div>
          )}
          {isPremium && (
            <div className="text-sm text-green-600 font-medium">
              ✓ Unlimited custom greetings
            </div>
          )}
        </div>

        {/* API Requests */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">API Requests</span>
            <span className={`text-sm font-semibold ${getUsageColor(usage.api_requests_count, limits.api)}`}>
              {usage.api_requests_count} {isPremium ? '/ 10,000' : `/ ${limits.api}`}
            </span>
          </div>
          {!isPremium && (
            <div className="text-xs text-muted-foreground">
              Limited API access on free plan
            </div>
          )}
          {isPremium && (
            <div className="text-sm text-green-600 font-medium">
              ✓ Full API access (10,000 requests/month)
            </div>
          )}
        </div>

        {/* Upgrade CTA for free users */}
        {!isPremium && (
          <div className="pt-4 border-t">
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-600" />
                Unlock More with Premium
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Unlimited calls per month</li>
                <li>• Unlimited custom greetings</li>
                <li>• 6 months recording storage</li>
                <li>• Advanced AI features</li>
                <li>• Priority support</li>
              </ul>
              <NavLink to="/upgrade">
                <Button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600">
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Premium
                </Button>
              </NavLink>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UsageOverview;