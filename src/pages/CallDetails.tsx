import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, MessageSquare, Clock, User, RefreshCw, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";

interface Call {
  id: string;
  twilio_call_sid: string;
  from_number: string;
  to_number: string;
  call_status: string;
  started_at: string;
  call_duration?: number;
  transcripts?: Array<{
    id: string;
    speaker: string;
    message: string;
    timestamp: string;
  }>;
  call_sessions?: Array<{
    current_state: string;
    collected_data: any;
  }>;
}

interface CallDetails {
  call: Call;
  transcripts: Array<{
    id: string;
    speaker: string;
    message: string;
    timestamp: string;
  }>;
  session?: {
    current_state: string;
    collected_data: any;
  };
}

const CallDetails = () => {
  const [calls, setCalls] = useState<Call[]>([]);
  const [currentCall, setCurrentCall] = useState<Call | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [timePeriod, setTimePeriod] = useState<string>("day");
  const [chartFrequency, setChartFrequency] = useState<string>("hourly");
  const { toast } = useToast();

  // Stats state
  const [todayStats, setTodayStats] = useState({
    callsToday: 0,
    liveCalls: 0,
    otherCalls: 0
  });

  const [callStats, setCallStats] = useState({
    completed: 0,
    partial: 0,
    notCompleted: 0,
    contactInfo: 0
  });

  const [chartData, setChartData] = useState<Array<{
    period: string;
    calls: number;
    completed: number;
    partial: number;
    notCompleted: number;
  }>>([]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchCalls(),
      fetchStats(),
      fetchChartData()
    ]);
    setLastRefresh(new Date());
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  const fetchCalls = async () => {
    try {
      const response = await supabase.functions.invoke('get-call-logs');
      if (response.error) throw response.error;
      
      const callsData = response.data.calls || [];
      setCalls(callsData);
      
      // Find current active call or most recent call
      const activeCall = callsData.find((call: Call) => call.call_status === 'in-progress');
      const latestCall = callsData[0]; // Assuming calls are ordered by date
      setCurrentCall(activeCall || latestCall || null);
      
    } catch (error) {
      console.error('Error fetching calls:', error);
      toast({
        title: "Error",
        description: "Failed to fetch call logs",
        variant: "destructive",
      });
    }
  };

  const fetchStats = async () => {
    try {
      // Mock data - replace with actual API calls
      const today = new Date().toISOString().split('T')[0];
      
      setTodayStats({
        callsToday: calls.filter(call => call.started_at.startsWith(today)).length,
        liveCalls: calls.filter(call => call.call_status === 'in-progress').length,
        otherCalls: calls.filter(call => !['completed', 'in-progress'].includes(call.call_status)).length
      });

      setCallStats({
        completed: calls.filter(call => call.call_status === 'completed').length,
        partial: calls.filter(call => call.call_status.includes('partial')).length,
        notCompleted: calls.filter(call => call.call_status === 'failed' || call.call_status === 'cancelled').length,
        contactInfo: calls.filter(call => call.call_sessions?.[0]?.collected_data?.contact_info).length
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchChartData = async () => {
    try {
      // Mock chart data - replace with actual aggregated data
      const mockData = [
        { period: "9 AM", calls: 12, completed: 8, partial: 3, notCompleted: 1 },
        { period: "10 AM", calls: 18, completed: 14, partial: 2, notCompleted: 2 },
        { period: "11 AM", calls: 15, completed: 11, partial: 3, notCompleted: 1 },
        { period: "12 PM", calls: 22, completed: 16, partial: 4, notCompleted: 2 },
        { period: "1 PM", calls: 19, completed: 13, partial: 4, notCompleted: 2 },
        { period: "2 PM", calls: 16, completed: 12, partial: 2, notCompleted: 2 }
      ];
      setChartData(mockData);
    } catch (error) {
      console.error('Error fetching chart data:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'sms_completed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      const match = cleaned.match(/^1(\d{3})(\d{3})(\d{4})$/);
      return match ? `+1 (${match[1]}) ${match[2]}-${match[3]}` : phone;
    }
    return phone;
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header with Refresh Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Call Details</h1>
          <p className="text-muted-foreground">View and analyze call logs and analytics</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <Button 
            onClick={handleRefresh} 
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Current/Last Call */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            {currentCall?.call_status === 'in-progress' ? 'Current Call' : 'Last Call'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentCall ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {currentCall.call_status === 'sms_completed' ? (
                    <MessageSquare className="h-4 w-4" />
                  ) : (
                    <Phone className="h-4 w-4" />
                  )}
                  <span className="font-medium">{formatPhoneNumber(currentCall.from_number)}</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDate(currentCall.started_at)}
                </div>
                {currentCall.call_duration && (
                  <span className="text-sm text-muted-foreground">{currentCall.call_duration}s</span>
                )}
              </div>
              <Badge className={getStatusColor(currentCall.call_status)}>
                {currentCall.call_status.replace('_', ' ')}
              </Badge>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No calls yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Phone className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Calls Today</p>
                <p className="text-2xl font-bold">{todayStats.callsToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <div className="h-3 w-3 bg-green-600 rounded-full animate-pulse" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Live Calls</p>
                <p className="text-2xl font-bold">{todayStats.liveCalls}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Other Calls</p>
                <p className="text-2xl font-bold">{todayStats.otherCalls}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer Contact Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{callStats.contactInfo}</div>
            <p className="text-muted-foreground">Contacts collected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Call Completion Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Completed</span>
                <span className="text-sm font-bold text-green-600">{callStats.completed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Partial</span>
                <span className="text-sm font-bold text-yellow-600">{callStats.partial}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Not Completed</span>
                <span className="text-sm font-bold text-red-600">{callStats.notCompleted}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Call Analytics
              </CardTitle>
              <CardDescription>Call volume and completion rates over time</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={timePeriod} onValueChange={setTimePeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hour">Hour</SelectItem>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="quarter">Quarter</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                </SelectContent>
              </Select>
              <Select value={chartFrequency} onValueChange={setChartFrequency}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              calls: { label: "Total Calls", color: "hsl(var(--chart-1))" },
              completed: { label: "Completed", color: "hsl(var(--chart-2))" },
              partial: { label: "Partial", color: "hsl(var(--chart-3))" },
              notCompleted: { label: "Not Completed", color: "hsl(var(--chart-4))" }
            }}
            className="h-80"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="period" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="calls" fill="var(--color-calls)" name="Total Calls" />
                <Bar dataKey="completed" fill="var(--color-completed)" name="Completed" />
                <Bar dataKey="partial" fill="var(--color-partial)" name="Partial" />
                <Bar dataKey="notCompleted" fill="var(--color-notCompleted)" name="Not Completed" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default CallDetails;