import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Check, 
  Crown, 
  Star, 
  Building2, 
  Phone, 
  MessageSquare, 
  Shield, 
  Headphones,
  Zap,
  Users,
  Mail,
  RefreshCw
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionInfo {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
}

const PlanManagement = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo>({
    subscribed: false,
    subscription_tier: null,
    subscription_end: null
  });

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for getting started',
      features: [
        '100 calls per month',
        '1 custom greeting message',
        'Basic call recordings',
        'Email support',
        'Standard security'
      ],
      limitations: [
        'Limited call volume',
        'Basic features only',
        'Standard support'
      ],
      buttonText: 'Current Plan',
      popular: false,
      stripePrice: null,
      color: 'border-gray-200'
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '$24.95',
      period: 'per month',
      description: 'Great for small businesses',
      features: [
        'Unlimited calls',
        'Unlimited custom greetings',
        'Advanced call recordings',
        'Priority email support',
        'Advanced security features',
        'Call analytics dashboard',
        'Custom hold music'
      ],
      buttonText: 'Upgrade to Premium',
      popular: true,
      stripePrice: 2495, // $24.95 in cents
      color: 'border-primary'
    },
    {
      id: 'premium_plus',
      name: 'Premium+',
      price: '$49.95',
      period: 'per month', 
      description: 'Perfect for growing businesses',
      features: [
        'Everything in Premium',
        'Multi-language support',
        'Advanced AI responses',
        'Call forwarding & routing',
        'Integration with CRM systems',
        'Real-time transcription',
        'Custom API access',
        'Phone support'
      ],
      buttonText: 'Upgrade to Premium+',
      popular: false,
      stripePrice: 4995, // $49.95 in cents
      color: 'border-purple-500'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Custom',
      period: 'pricing',
      description: 'Tailored for large organizations',
      features: [
        'Everything in Premium+',
        'Dedicated account manager',
        'Custom integrations',
        'On-premise deployment options',
        'Advanced compliance features',
        'SLA guarantees',
        '24/7 priority support',
        'Custom training & onboarding'
      ],
      buttonText: 'Contact Sales',
      popular: false,
      stripePrice: null,
      color: 'border-amber-500'
    }
  ];

  const checkSubscription = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        console.error('Subscription check error:', error);
        toast({
          title: "Error",
          description: "Failed to check subscription status",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        setSubscriptionInfo({
          subscribed: data.subscribed || false,
          subscription_tier: data.subscription_tier || null,
          subscription_end: data.subscription_end || null
        });
      }
    } catch (error) {
      console.error('Subscription check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async (plan: typeof plans[0]) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to upgrade your plan",
        variant: "destructive",
      });
      return;
    }

    if (plan.id === 'enterprise') {
      // Handle enterprise contact
      window.open('mailto:sales@voiceassistant.com?subject=Enterprise Plan Inquiry', '_blank');
      return;
    }

    if (!plan.stripePrice) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          priceAmount: plan.stripePrice,
          planName: plan.name
        }
      });

      if (error) {
        toast({
          title: "Checkout Error",
          description: error.message || "Failed to create checkout session",
          variant: "destructive",
        });
        return;
      }

      if (data?.url) {
        // Open Stripe checkout in new tab
        window.open(data.url, '_blank');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start checkout process",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) {
        toast({
          title: "Portal Error", 
          description: error.message || "Failed to open customer portal",
          variant: "destructive",
        });
        return;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open subscription management",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentPlan = () => {
    if (!subscriptionInfo.subscribed) return 'free';
    
    switch (subscriptionInfo.subscription_tier) {
      case 'Premium':
        return 'premium';
      case 'Premium+':
        return 'premium_plus';
      case 'Enterprise':
        return 'enterprise';
      default:
        return 'free';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  useEffect(() => {
    if (user) {
      checkSubscription();
    }
  }, [user]);

  const currentPlan = getCurrentPlan();

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Plan Management</h1>
        <p className="text-muted-foreground">Choose the perfect plan for your business needs</p>
      </div>

      {/* Current Plan Status */}
      {user && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Current Plan Status
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={checkSubscription}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={currentPlan === 'free' ? 'secondary' : 'default'}>
                    {plans.find(p => p.id === currentPlan)?.name || 'Free'}
                  </Badge>
                  {subscriptionInfo.subscribed && (
                    <Badge variant="outline" className="text-green-600">
                      Active
                    </Badge>
                  )}
                </div>
                {subscriptionInfo.subscription_end && (
                  <p className="text-sm text-muted-foreground">
                    Renews on {formatDate(subscriptionInfo.subscription_end)}
                  </p>
                )}
              </div>
              {subscriptionInfo.subscribed && (
                <Button 
                  variant="outline" 
                  onClick={handleManageSubscription}
                  disabled={isLoading}
                >
                  Manage Subscription
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const isCurrentPlan = currentPlan === plan.id;
          const isPlanActive = subscriptionInfo.subscribed && isCurrentPlan;
          
          return (
            <Card 
              key={plan.id} 
              className={`relative ${plan.color} ${plan.popular ? 'ring-2 ring-primary' : ''} ${isCurrentPlan ? 'bg-primary/5' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    <Star className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              {isCurrentPlan && (
                <div className="absolute -top-3 right-4">
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                    <Check className="h-3 w-3 mr-1" />
                    Current
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-2">
                  {plan.id === 'free' && <Phone className="h-8 w-8 text-gray-500" />}
                  {plan.id === 'premium' && <Star className="h-8 w-8 text-primary" />}
                  {plan.id === 'premium_plus' && <Zap className="h-8 w-8 text-purple-500" />}
                  {plan.id === 'enterprise' && <Building2 className="h-8 w-8 text-amber-500" />}
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="space-y-1">
                  <div className="text-3xl font-bold">
                    {plan.price}
                    {plan.period !== 'forever' && plan.period !== 'pricing' && (
                      <span className="text-sm font-normal text-muted-foreground">/{plan.period.split(' ')[1]}</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Separator />

                <Button 
                  className="w-full" 
                  variant={isCurrentPlan ? "outline" : plan.popular ? "default" : "outline"}
                  onClick={() => handleUpgrade(plan)}
                  disabled={isLoading || isPlanActive}
                >
                  {isPlanActive ? 'Active Plan' : plan.buttonText}
                </Button>

                {plan.id === 'enterprise' && (
                  <p className="text-xs text-center text-muted-foreground">
                    Custom pricing based on your needs
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Feature Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Comparison</CardTitle>
          <CardDescription>
            Compare features across all plans
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Feature</th>
                  <th className="text-center p-2 font-medium">Free</th>
                  <th className="text-center p-2 font-medium">Premium</th>
                  <th className="text-center p-2 font-medium">Premium+</th>
                  <th className="text-center p-2 font-medium">Enterprise</th>
                </tr>
              </thead>
              <tbody className="space-y-1">
                <tr className="border-b">
                  <td className="p-2">Monthly Calls</td>
                  <td className="text-center p-2">100</td>
                  <td className="text-center p-2">Unlimited</td>
                  <td className="text-center p-2">Unlimited</td>
                  <td className="text-center p-2">Unlimited</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Custom Greetings</td>
                  <td className="text-center p-2">1</td>
                  <td className="text-center p-2">Unlimited</td>
                  <td className="text-center p-2">Unlimited</td>
                  <td className="text-center p-2">Unlimited</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Multi-language Support</td>
                  <td className="text-center p-2">-</td>
                  <td className="text-center p-2">-</td>
                  <td className="text-center p-2">✓</td>
                  <td className="text-center p-2">✓</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">API Access</td>
                  <td className="text-center p-2">-</td>
                  <td className="text-center p-2">-</td>
                  <td className="text-center p-2">✓</td>
                  <td className="text-center p-2">✓</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Priority Support</td>
                  <td className="text-center p-2">-</td>
                  <td className="text-center p-2">Email</td>
                  <td className="text-center p-2">Phone</td>
                  <td className="text-center p-2">24/7</td>
                </tr>
                <tr>
                  <td className="p-2">SLA</td>
                  <td className="text-center p-2">-</td>
                  <td className="text-center p-2">-</td>
                  <td className="text-center p-2">-</td>
                  <td className="text-center p-2">99.9%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Alert>
        <Headphones className="h-4 w-4" />
        <AlertDescription>
          Need help choosing the right plan? <Button variant="link" className="p-0 h-auto">Contact our sales team</Button> for personalized recommendations.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default PlanManagement;