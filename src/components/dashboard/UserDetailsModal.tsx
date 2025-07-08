import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  User, 
  Crown, 
  Zap, 
  Building2, 
  Phone, 
  Mail, 
  Calendar, 
  DollarSign,
  Activity,
  MapPin,
  Briefcase
} from "lucide-react";

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

interface UserDetails {
  id: string;
  email: string;
  display_name: string | null;
  plan_type: string;
  plan_expires_at: string | null;
  subscribed: boolean;
  subscription_tier: string | null;
  created_at: string;
  phone_number: string | null;
  total_calls: number;
  total_spent: number;
  last_call_date: string | null;
}

export const UserDetailsModal = ({ isOpen, onClose, userId }: UserDetailsModalProps) => {
  const { toast } = useToast();
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const plans = [
    { id: 'free', name: 'Free', icon: Phone, color: 'text-gray-500' },
    { id: 'premium', name: 'Premium', icon: Crown, color: 'text-yellow-500' },
    { id: 'premium_plus', name: 'Premium+', icon: Zap, color: 'text-purple-500' },
    { id: 'enterprise', name: 'Enterprise', icon: Building2, color: 'text-amber-500' }
  ];

  const fetchUserDetails = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      // Get subscription info
      const { data: subscription } = await supabase
        .from('subscribers')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Get user auth data
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
      if (authError) throw authError;

      // Get call statistics
      const { data: calls } = await supabase
        .from('calls')
        .select('call_duration, created_at')
        .eq('user_id', userId);

      const totalCalls = calls?.length || 0;
      const lastCallDate = calls?.length ? calls[0]?.created_at : null;
      
      // Calculate total spent (would need Stripe integration for real data)
      const totalSpent = subscription?.subscribed ? 50.00 : 0; // Mock data

      setUserDetails({
        id: userId,
        email: authUser.user?.email || '',
        display_name: profile?.display_name,
        plan_type: profile?.plan_type,
        plan_expires_at: profile?.plan_expires_at,
        subscribed: subscription?.subscribed || false,
        subscription_tier: subscription?.subscription_tier,
        created_at: profile?.created_at,
        phone_number: profile?.phone_number,
        total_calls: totalCalls,
        total_spent: totalSpent,
        last_call_date: lastCallDate
      });

      setSelectedPlan(profile?.plan_type || 'free');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch user details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserPlan = async () => {
    if (!userDetails || !selectedPlan) return;

    if (selectedPlan === userDetails.plan_type) {
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
          userId: userDetails.id,
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
      setUserDetails({
        ...userDetails,
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
        description: `Successfully updated user's plan to ${plans.find(p => p.id === selectedPlan)?.name}`,
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

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserDetails();
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Details
          </DialogTitle>
          <DialogDescription>
            View and manage user information and subscription details
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : userDetails ? (
          <div className="space-y-6">
            {/* User Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label className="text-sm font-medium">Email</Label>
                      <p className="text-sm text-muted-foreground">{userDetails.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label className="text-sm font-medium">Display Name</Label>
                      <p className="text-sm text-muted-foreground">{userDetails.display_name || 'Not set'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label className="text-sm font-medium">Phone Number</Label>
                      <p className="text-sm text-muted-foreground">{userDetails.phone_number || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label className="text-sm font-medium">Joined</Label>
                      <p className="text-sm text-muted-foreground">{formatDate(userDetails.created_at)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Plan */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {(() => {
                    const IconComponent = getPlanIcon(userDetails.plan_type);
                    return <IconComponent className={`h-5 w-5 ${getPlanColor(userDetails.plan_type)}`} />;
                  })()}
                  Current Subscription
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Badge variant={userDetails.plan_type === 'free' ? 'secondary' : 'default'}>
                      {plans.find(p => p.id === userDetails.plan_type)?.name || userDetails.plan_type}
                    </Badge>
                    {userDetails.subscribed && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Active
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {userDetails.plan_type !== 'free' ? 'Expires' : 'Since'}
                    </p>
                    <p className="text-sm font-medium">
                      {formatDate(userDetails.plan_expires_at)}
                    </p>
                  </div>
                </div>

                {/* Plan Change */}
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
                              {plan.id === userDetails.plan_type && (
                                <Badge variant="secondary" className="ml-2">Current</Badge>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  <Button 
                    onClick={updateUserPlan}
                    disabled={isUpdating || selectedPlan === userDetails.plan_type || !selectedPlan}
                    className="w-full"
                  >
                    {isUpdating ? 'Updating Plan...' : 'Update User Plan'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Usage & Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Usage & Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{userDetails.total_calls}</div>
                    <p className="text-sm text-muted-foreground">Total Calls</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">${userDetails.total_spent.toFixed(2)}</div>
                    <p className="text-sm text-muted-foreground">Total Spent</p>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium">{formatDate(userDetails.last_call_date)}</div>
                    <p className="text-sm text-muted-foreground">Last Call</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Failed to load user details</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};