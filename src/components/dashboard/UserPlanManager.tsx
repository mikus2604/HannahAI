import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, User, Crown, Zap, Building2, Phone, Check, AlertTriangle } from "lucide-react";

interface UserData {
  id: string;
  email: string;
  display_name: string | null;
  plan_type: string;
  plan_expires_at: string | null;
  subscribed: boolean;
  subscription_tier: string | null;
}

export const UserPlanManager = () => {
  const { toast } = useToast();
  const [searchEmail, setSearchEmail] = useState("");
  const [userData, setUserData] = useState<UserData | null>(null);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const plans = [
    { id: 'free', name: 'Free', icon: Phone, color: 'text-gray-500' },
    { id: 'premium', name: 'Premium', icon: Crown, color: 'text-yellow-500' },
    { id: 'premium_plus', name: 'Premium+', icon: Zap, color: 'text-purple-500' },
    { id: 'enterprise', name: 'Enterprise', icon: Building2, color: 'text-amber-500' }
  ];

  const searchUser = async () => {
    if (!searchEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter a user email to search",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-user-plan', {
        body: {
          action: 'search',
          email: searchEmail.trim()
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to search user');
      }

      if (data?.error) {
        toast({
          title: "User Not Found",
          description: data.error,
          variant: "destructive",
        });
        setUserData(null);
        return;
      }

      setUserData(data.user);
      setSelectedPlan(data.user.plan_type);
      toast({
        title: "User Found",
        description: `Found user: ${data.user.email}`,
      });
    } catch (error) {
      toast({
        title: "Search Failed",
        description: error instanceof Error ? error.message : "Failed to search user",
        variant: "destructive",
      });
      setUserData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserPlan = async () => {
    if (!userData || !selectedPlan) return;

    if (selectedPlan === userData.plan_type) {
      toast({
        title: "No Changes",
        description: "The selected plan is the same as the current plan",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-user-plan', {
        body: {
          action: 'update',
          userId: userData.id,
          newPlan: selectedPlan
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to update user plan');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Update local state
      setUserData({
        ...userData,
        plan_type: selectedPlan,
        plan_expires_at: data.plan_expires_at,
        subscribed: selectedPlan !== 'free',
        subscription_tier: selectedPlan === 'free' ? null : 
                          selectedPlan === 'premium' ? 'Premium' :
                          selectedPlan === 'premium_plus' ? 'Premium+' : 
                          selectedPlan === 'enterprise' ? 'Enterprise' : null
      });

      toast({
        title: "Plan Updated",
        description: `Successfully updated ${userData.email}'s plan to ${plans.find(p => p.id === selectedPlan)?.name}`,
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update user plan",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPlanIcon = (planType: string) => {
    const plan = plans.find(p => p.id === planType);
    if (!plan) return Phone;
    return plan.icon;
  };

  const getPlanColor = (planType: string) => {
    const plan = plans.find(p => p.id === planType);
    return plan?.color || 'text-gray-500';
  };

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search User
          </CardTitle>
          <CardDescription>
            Enter a user's email address to view and modify their plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search-email">User Email</Label>
              <Input
                id="search-email"
                type="email"
                placeholder="user@example.com"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchUser()}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={searchUser} 
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                {isLoading ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Details & Plan Management */}
      {userData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Details & Plan Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* User Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-sm font-medium">Email</Label>
                <p className="text-sm text-muted-foreground">{userData.email}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Display Name</Label>
                <p className="text-sm text-muted-foreground">{userData.display_name || 'Not set'}</p>
              </div>
            </div>

            {/* Current Plan Status */}
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(() => {
                    const IconComponent = getPlanIcon(userData.plan_type);
                    return <IconComponent className={`h-6 w-6 ${getPlanColor(userData.plan_type)}`} />;
                  })()}
                  <div>
                    <h4 className="font-medium">Current Plan</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={userData.plan_type === 'free' ? 'secondary' : 'default'}>
                        {plans.find(p => p.id === userData.plan_type)?.name || userData.plan_type}
                      </Badge>
                      {userData.subscribed && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <Check className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    {userData.plan_type !== 'free' ? 'Expires' : 'Since'}
                  </p>
                  <p className="text-sm font-medium">
                    {formatDate(userData.plan_expires_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Plan Selection */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Change Plan</Label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => {
                    const IconComponent = plan.icon;
                    return (
                      <SelectItem key={plan.id} value={plan.id}>
                        <div className="flex items-center gap-2">
                          <IconComponent className={`h-4 w-4 ${plan.color}`} />
                          <span>{plan.name}</span>
                          {plan.id === userData.plan_type && (
                            <Badge variant="secondary" className="ml-2">Current</Badge>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {selectedPlan && selectedPlan !== userData.plan_type && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This will immediately change the user's plan to <strong>{plans.find(p => p.id === selectedPlan)?.name}</strong>.
                    {selectedPlan !== 'free' && ' The plan will be set to expire in 1 year.'}
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={updateUserPlan}
                disabled={isUpdating || selectedPlan === userData.plan_type || !selectedPlan}
                className="w-full"
              >
                {isUpdating ? 'Updating Plan...' : 'Update User Plan'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};