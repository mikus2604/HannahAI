import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  DollarSign,
  TrendingUp,
  Activity,
  Shield,
  Database,
  Phone,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  UserCheck,
  Crown,
  Building2,
  Calendar,
  BarChart3,
  PieChart,
  Zap
} from "lucide-react";

interface AdminAnalytics {
  analytics: {
    total_users: number;
    free_users: number;
    premium_users: number;
    premium_plus_users: number;
    enterprise_users: number;
    subscribed_users: number;
    users_with_calls: number;
    total_calls: number;
    total_call_duration_seconds: number;
    active_users_30d: number;
    active_users_7d: number;
  };
  stripe: {
    totalCustomers: number;
    activeSubscriptions: number;
    subscriptionTiers: Record<string, number>;
    totalRevenue: number;
    monthlyRevenue: number;
    averageRevenuePerUser: number;
    churnRate: number;
    lastUpdated: string;
  } | null;
  recentUsers: Array<{
    user_id: string;
    display_name: string;
    plan_type: string;
    created_at: string;
  }>;
  recentCalls: Array<{
    id: string;
    call_status: string;
    call_duration: number;
    created_at: string;
    from_number: string;
    to_number: string;
  }>;
  systemHealth: {
    callStatusDistribution: Record<string, number>;
    totalCalls24h: number;
    successRate: string;
  };
  timestamp: string;
}

const SuperUserDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  const fetchAnalytics = async () => {
    if (!user) return;

    console.log('Fetching analytics for user:', user.id);
    setLoading(true);
    try {
      const { data: analyticsData, error } = await supabase.functions.invoke('admin-analytics');
      
      console.log('Analytics response:', { analyticsData, error });
      
      if (error) {
        console.error('Analytics error details:', error);
        if (error.message?.includes('Access denied')) {
          setHasAccess(false);
          toast({
            title: "Access Denied",
            description: "You don't have super user privileges to access this page.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      setHasAccess(true);
      setData(analyticsData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: `Failed to load admin analytics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <Alert className="border-red-200 bg-red-50">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Access denied. This page is restricted to super users only.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No data available. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { analytics, stripe, recentUsers, recentCalls, systemHealth } = data;

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-red-600" />
            Super User Dashboard
          </h1>
          <p className="text-muted-foreground">Backend management and analytics</p>
        </div>
        <Button onClick={fetchAnalytics} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_users}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.active_users_7d} active this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stripe ? formatCurrency(stripe.totalRevenue) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stripe ? formatCurrency(stripe.monthlyRevenue) : 'N/A'} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscriptions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.subscribed_users}</div>
            <p className="text-xs text-muted-foreground">
              {stripe ? stripe.activeSubscriptions : 0} active in Stripe
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemHealth.successRate}%</div>
            <p className="text-xs text-muted-foreground">
              {systemHealth.totalCalls24h} calls in 24h
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="calls">Calls</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Plan Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Plan Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-400 rounded"></div>
                      <span>Free</span>
                    </div>
                    <Badge variant="secondary">{analytics.free_users}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Crown className="w-3 h-3 text-yellow-500" />
                      <span>Premium</span>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800">{analytics.premium_users}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-3 h-3 text-purple-500" />
                      <span>Premium+</span>
                    </div>
                    <Badge className="bg-purple-100 text-purple-800">{analytics.premium_plus_users}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3 h-3 text-amber-500" />
                      <span>Enterprise</span>
                    </div>
                    <Badge className="bg-amber-100 text-amber-800">{analytics.enterprise_users}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Call Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Call Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Total Calls</span>
                    <Badge variant="outline">{analytics.total_calls}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Total Duration</span>
                    <Badge variant="outline">{formatDuration(Number(analytics.total_call_duration_seconds))}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Users with Calls</span>
                    <Badge variant="outline">{analytics.users_with_calls}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Avg per User</span>
                    <Badge variant="outline">
                      {analytics.users_with_calls > 0 ? 
                        Math.round(analytics.total_calls / analytics.users_with_calls) : 0}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent User Signups</CardTitle>
              <CardDescription>Latest users who joined the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentUsers.map((user) => (
                  <div key={user.user_id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{user.display_name || 'Anonymous'}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(user.created_at)}</p>
                    </div>
                    <Badge variant={user.plan_type === 'free' ? 'secondary' : 'default'}>
                      {user.plan_type}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          {stripe ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Total Revenue</span>
                      <span className="font-bold">{formatCurrency(stripe.totalRevenue)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Monthly Revenue</span>
                      <span className="font-bold">{formatCurrency(stripe.monthlyRevenue)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>ARPU</span>
                      <span className="font-bold">{formatCurrency(stripe.averageRevenuePerUser)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Active Subscriptions</span>
                      <span className="font-bold">{stripe.activeSubscriptions}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Subscription Tiers (Stripe)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(stripe.subscriptionTiers).map(([tier, count]) => (
                      <div key={tier} className="flex items-center justify-between">
                        <span className="capitalize">{tier}</span>
                        <Badge>{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Stripe integration not available or API key not configured.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="calls" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Calls</CardTitle>
              <CardDescription>Latest call activity across the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentCalls.map((call) => (
                  <div key={call.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{call.from_number} → {call.to_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(call.created_at)} • Duration: {call.call_duration || 0}s
                      </p>
                    </div>
                    <Badge 
                      variant={
                        call.call_status === 'completed' ? 'default' :
                        call.call_status === 'failed' ? 'destructive' : 'secondary'
                      }
                    >
                      {call.call_status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Call Status Distribution (24h)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(systemHealth.callStatusDistribution).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                        {status === 'initiated' && <Clock className="h-4 w-4 text-blue-500" />}
                        <span className="capitalize">{status}</span>
                      </div>
                      <Badge>{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Success Rate</span>
                    <Badge 
                      variant={Number(systemHealth.successRate) > 95 ? 'default' : 'destructive'}
                    >
                      {systemHealth.successRate}%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Calls (24h)</span>
                    <Badge variant="outline">{systemHealth.totalCalls24h}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Last Updated</span>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(data.timestamp)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid gap-4">
            {/* API Keys Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  API Keys & Credentials
                </CardTitle>
                <CardDescription>
                  Configure your service credentials and API keys
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  {/* OpenAI */}
                  <div className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Activity className="h-6 w-6 mt-1" />
                        <div>
                          <h3 className="font-semibold">OpenAI API</h3>
                          <p className="text-sm text-muted-foreground">Powers Hannah, your AI receptionist</p>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Configured</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">
                          View API Keys
                        </a>
                      </Button>
                    </div>
                  </div>

                  {/* Twilio */}
                  <div className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Phone className="h-6 w-6 mt-1" />
                        <div>
                          <h3 className="font-semibold">Twilio</h3>
                          <p className="text-sm text-muted-foreground">Voice and SMS communication service</p>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Configured</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href="https://console.twilio.com/project/api-keys" target="_blank" rel="noopener noreferrer">
                          Twilio Console
                        </a>
                      </Button>
                    </div>
                  </div>

                  {/* Stripe */}
                  <div className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <CreditCard className="h-6 w-6 mt-1" />
                        <div>
                          <h3 className="font-semibold">Stripe</h3>
                          <p className="text-sm text-muted-foreground">Payment processing service</p>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Configured</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer">
                          Stripe Dashboard
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Webhook URLs Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  Webhook URLs
                </CardTitle>
                <CardDescription>
                  Configure these URLs in your external services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Twilio Voice Webhook URL</h4>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText('https://idupowkqzcwrjslcixsp.supabase.co/functions/v1/voice-incoming');
                          toast({
                            title: "Copied!",
                            description: "Voice webhook URL copied to clipboard",
                          });
                        }}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </div>
                    <code className="bg-muted px-3 py-2 rounded block text-sm break-all">
                      https://idupowkqzcwrjslcixsp.supabase.co/functions/v1/voice-incoming
                    </code>
                    <p className="text-sm text-muted-foreground mt-1">
                      Set this as your Twilio phone number's voice webhook URL
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Twilio SMS Webhook URL</h4>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText('https://idupowkqzcwrjslcixsp.supabase.co/functions/v1/sms-webhook');
                          toast({
                            title: "Copied!",
                            description: "SMS webhook URL copied to clipboard",
                          });
                        }}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </div>
                    <code className="bg-muted px-3 py-2 rounded block text-sm break-all">
                      https://idupowkqzcwrjslcixsp.supabase.co/functions/v1/sms-webhook
                    </code>
                    <p className="text-sm text-muted-foreground mt-1">
                      Set this as your Twilio phone number's SMS webhook URL
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SuperUserDashboard;