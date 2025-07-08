import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Crown, Check, Star, Shield, Phone, Database, Headphones, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const Upgrade = () => {
  const { profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    
    try {
      // In a real application, this would integrate with Stripe or another payment processor
      // For now, we'll simulate the upgrade process
      
      toast({
        title: "Redirecting to Payment",
        description: "You will be redirected to our secure payment page...",
      });
      
      // Simulate payment processing
      setTimeout(async () => {
        const expirationDate = new Date();
        expirationDate.setMonth(expirationDate.getMonth() + 1);
        
        const { error } = await updateProfile({ 
          plan_type: 'premium',
          plan_expires_at: expirationDate.toISOString()
        });
        
        if (!error) {
          toast({
            title: "Welcome to Premium!",
            description: "Your account has been upgraded successfully. Enjoy all premium features!",
          });
        }
      }, 2000);
      
    } catch (error) {
      toast({
        title: "Upgrade Failed",
        description: "There was an error processing your upgrade. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  const features = [
    {
      category: "Call Management",
      items: [
        { name: "Unlimited calls per month", free: "100 calls/month", premium: true },
        { name: "Advanced call analytics", free: false, premium: true },
        { name: "Call scheduling", free: false, premium: true },
        { name: "Custom greeting messages", free: "1 message", premium: "Unlimited" },
      ]
    },
    {
      category: "Recording & Storage", 
      items: [
        { name: "Call recording storage", free: "1 week", premium: "6 months" },
        { name: "HD audio recording", free: false, premium: true },
        { name: "Transcript export (PDF/CSV)", free: false, premium: true },
        { name: "Cloud backup & sync", free: false, premium: true },
      ]
    },
    {
      category: "AI & Automation",
      items: [
        { name: "AI call summary", free: "Basic", premium: "Advanced with insights" },
        { name: "Sentiment analysis", free: false, premium: true },
        { name: "Auto-categorization", free: false, premium: true },
        { name: "Smart follow-up suggestions", free: false, premium: true },
      ]
    },
    {
      category: "Integrations",
      items: [
        { name: "Calendar integration", free: false, premium: true },
        { name: "CRM sync", free: false, premium: true },
        { name: "Webhook support", free: false, premium: true },
        { name: "API access", free: "Limited", premium: "Full access" },
      ]
    },
    {
      category: "Support & Security",
      items: [
        { name: "Email support", free: "Community", premium: "Priority support" },
        { name: "Advanced 2FA options", free: false, premium: true },
        { name: "Compliance reports", free: false, premium: true },
        { name: "Data retention controls", free: false, premium: true },
      ]
    }
  ];

  const isPremium = profile?.plan_type === 'premium';
  const planExpiry = profile?.plan_expires_at ? new Date(profile.plan_expires_at) : null;
  const isExpired = planExpiry && planExpiry < new Date();

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Choose Your Plan</h1>
        <p className="text-muted-foreground mt-2">
          Unlock advanced features and scale your communication with Premium
        </p>
      </div>

      {/* Current Plan Status */}
      {isPremium && !isExpired && (
        <Card className="border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Crown className="h-6 w-6 text-yellow-600" />
              <div>
                <h3 className="font-semibold text-yellow-900">Premium Plan Active</h3>
                <p className="text-sm text-yellow-700">
                  Your premium features are active until {planExpiry?.toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Comparison */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Free Plan */}
        <Card className={`relative ${!isPremium || isExpired ? 'border-primary' : 'border-muted'}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  Free Plan
                </CardTitle>
                <CardDescription>Perfect for getting started</CardDescription>
              </div>
              {(!isPremium || isExpired) && (
                <Badge className="bg-blue-100 text-blue-800">Current</Badge>
              )}
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold">$0</div>
              <div className="text-sm text-muted-foreground">Forever free</div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">100 calls per month</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">1 week recording storage</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">Basic AI transcription</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">Email notifications</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">Standard support</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Premium Plan */}
        <Card className={`relative ${isPremium && !isExpired ? 'border-yellow-500 ring-2 ring-yellow-200' : 'border-muted'}`}>
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-1">
              <Star className="h-3 w-3 mr-1" />
              Most Popular
            </Badge>
          </div>
          
          <CardHeader className="pt-8">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-600" />
                  Premium Plan
                </CardTitle>
                <CardDescription>Everything you need to scale</CardDescription>
              </div>
              {isPremium && !isExpired && (
                <Badge className="bg-yellow-100 text-yellow-800">Current</Badge>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">$19</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
              <div className="text-sm text-muted-foreground">Billed monthly, cancel anytime</div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">Everything in Free, plus:</span>
              </div>
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium">Unlimited calls</span>
              </div>
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium">6 months recording storage</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium">Advanced AI features</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium">Priority support</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium">Advanced security</span>
              </div>
            </div>

            {(!isPremium || isExpired) && (
              <Button 
                onClick={handleUpgrade} 
                disabled={isUpgrading}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
              >
                {isUpgrading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </div>
                ) : (
                  <>
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Premium
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Feature Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Comparison</CardTitle>
          <CardDescription>
            Detailed breakdown of features available in each plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {features.map((category, categoryIndex) => (
              <div key={categoryIndex} className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  {category.category === "Call Management" && <Phone className="h-5 w-5" />}
                  {category.category === "Recording & Storage" && <Database className="h-5 w-5" />}
                  {category.category === "AI & Automation" && <Zap className="h-5 w-5" />}
                  {category.category === "Integrations" && <Headphones className="h-5 w-5" />}
                  {category.category === "Support & Security" && <Shield className="h-5 w-5" />}
                  {category.category}
                </h3>
                <Separator />
                
                <div className="grid gap-3">
                  {category.items.map((feature, featureIndex) => (
                    <div key={featureIndex} className="grid grid-cols-3 gap-4 py-2">
                      <div className="font-medium">{feature.name}</div>
                      <div className="text-center">
                        {feature.free === true ? (
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        ) : feature.free === false ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">{feature.free}</span>
                        )}
                      </div>
                      <div className="text-center">
                        {feature.premium === true ? (
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        ) : typeof feature.premium === 'string' ? (
                          <span className="text-sm font-medium">{feature.premium}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Can I cancel my premium subscription anytime?</h4>
              <p className="text-sm text-muted-foreground">
                Yes, you can cancel your premium subscription at any time. You'll continue to have access 
                to premium features until the end of your billing period.
              </p>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-medium mb-2">What happens to my data if I downgrade?</h4>
              <p className="text-sm text-muted-foreground">
                Your call recordings beyond the free plan's 1-week limit will be archived but not deleted. 
                You can always upgrade again to access your full history.
              </p>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-medium mb-2">Is my payment information secure?</h4>
              <p className="text-sm text-muted-foreground">
                Yes, all payments are processed through industry-standard secure payment processors. 
                We never store your payment information on our servers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Upgrade;