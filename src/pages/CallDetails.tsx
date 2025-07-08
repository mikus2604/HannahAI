import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Phone, MessageSquare, Clock, User, RefreshCw, BarChart3, Shield } from "lucide-react";
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
  const navigate = useNavigate();
  const [calls, setCalls] = useState<Call[]>([]);
  const [currentCall, setCurrentCall] = useState<Call | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [timePeriod, setTimePeriod] = useState<string>("day");
  const [chartFrequency, setChartFrequency] = useState<string>("hourly");
  const [historyTimePeriod, setHistoryTimePeriod] = useState<string>("day");
  const [filteredCalls, setFilteredCalls] = useState<Call[]>([]);
  const [selectedPeriodData, setSelectedPeriodData] = useState<any>(null);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("overview");
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

  useEffect(() => {
    fetchChartData();
  }, [timePeriod, chartFrequency]);

  useEffect(() => {
    filterCallsByPeriod();
  }, [historyTimePeriod, calls]);

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

  const generateChartData = () => {
    const now = new Date();
    const data = [];
    
    // Determine the number of periods and date calculation based on frequency
    let periods = 0;
    let dateFormatter: (date: Date) => string;
    let dateIncrement: (date: Date, amount: number) => Date;
    
    switch (chartFrequency) {
      case 'hourly':
        periods = timePeriod === 'day' ? 24 : timePeriod === 'week' ? 168 : 24;
        dateFormatter = (date) => date.getHours() + ':00';
        dateIncrement = (date, hours) => new Date(date.getTime() - hours * 60 * 60 * 1000);
        break;
      case 'daily':
        periods = timePeriod === 'week' ? 7 : timePeriod === 'month' ? 30 : timePeriod === 'quarter' ? 90 : timePeriod === 'year' ? 365 : 30;
        dateFormatter = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dateIncrement = (date, days) => new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        periods = timePeriod === 'month' ? 4 : timePeriod === 'quarter' ? 12 : timePeriod === 'year' ? 52 : 12;
        dateFormatter = (date) => `Week ${Math.ceil(date.getDate() / 7)}`;
        dateIncrement = (date, weeks) => new Date(date.getTime() - weeks * 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        periods = timePeriod === 'quarter' ? 3 : timePeriod === 'year' ? 12 : 12;
        dateFormatter = (date) => date.toLocaleDateString('en-US', { month: 'short' });
        dateIncrement = (date, months) => {
          const newDate = new Date(date);
          newDate.setMonth(newDate.getMonth() - months);
          return newDate;
        };
        break;
      case 'quarterly':
        periods = timePeriod === 'year' ? 4 : 4;
        dateFormatter = (date) => `Q${Math.ceil((date.getMonth() + 1) / 3)}`;
        dateIncrement = (date, quarters) => {
          const newDate = new Date(date);
          newDate.setMonth(newDate.getMonth() - quarters * 3);
          return newDate;
        };
        break;
      default:
        periods = 24;
        dateFormatter = (date) => date.getHours() + ':00';
        dateIncrement = (date, hours) => new Date(date.getTime() - hours * 60 * 60 * 1000);
    }
    
    // Generate mock data for each period
    for (let i = periods - 1; i >= 0; i--) {
      const periodDate = dateIncrement(now, i);
      const baseCalls = Math.floor(Math.random() * 20) + 5; // 5-25 calls
      const completed = Math.floor(baseCalls * (0.6 + Math.random() * 0.3)); // 60-90% completion
      const partial = Math.floor((baseCalls - completed) * (0.4 + Math.random() * 0.4)); // 40-80% of remaining
      const notCompleted = baseCalls - completed - partial;
      
      data.push({
        period: dateFormatter(periodDate),
        calls: baseCalls,
        completed,
        partial,
        notCompleted
      });
    }
    
    return data;
  };

  const fetchChartData = async () => {
    try {
      // Generate data based on current filter selections
      const generatedData = generateChartData();
      setChartData(generatedData);
    } catch (error) {
      console.error('Error fetching chart data:', error);
    }
  };

  const filterCallsByPeriod = () => {
    const now = new Date();
    let startDate = new Date();

    switch (historyTimePeriod) {
      case 'hour':
        startDate.setHours(now.getHours() - 1);
        break;
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    const filtered = calls.filter(call => new Date(call.started_at) >= startDate);
    setFilteredCalls(filtered);
  };

  const getHistoryStats = () => {
    return {
      completed: filteredCalls.filter(call => call.call_status === 'completed').length,
      partial: filteredCalls.filter(call => call.call_status.includes('partial')).length,
      notCompleted: filteredCalls.filter(call => call.call_status === 'failed' || call.call_status === 'cancelled').length
    };
  };

  const handleBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const clickedData = data.activePayload[0].payload;
      setSelectedPeriodData({
        ...clickedData,
        periodDetails: `${chartFrequency} - ${clickedData.period}`,
        totalCalls: clickedData.calls,
        completionRate: Math.round((clickedData.completed / clickedData.calls) * 100),
        partialRate: Math.round((clickedData.partial / clickedData.calls) * 100),
        failureRate: Math.round((clickedData.notCompleted / clickedData.calls) * 100)
      });
      setShowPeriodModal(true);
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

  const historyStats = getHistoryStats();

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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">Call History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
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

          {/* Recording Storage Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Call Recording Storage
              </CardTitle>
              <CardDescription>
                Information about call recording storage policy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-900">Recording Retention Policy</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Call recordings are automatically stored and managed based on your plan:
                      </p>
                      <ul className="text-sm text-blue-700 mt-2 space-y-1">
                        <li>• <strong>1 week storage:</strong> Included with your plan (Free)</li>
                        <li>• <strong>1 month storage:</strong> Premium Plan required</li>
                        <li>• <strong>6 months storage:</strong> Premium Plan required</li>
                      </ul>
                      <p className="text-xs text-blue-600 mt-3">
                        Recordings are automatically deleted after the selected retention period. 
                        You can modify your storage preferences in the Settings page.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 border rounded-lg">
                    <div className="text-sm font-medium text-gray-600">Current Plan</div>
                    <div className="text-lg font-semibold">1 Week Storage</div>
                    <div className="text-xs text-green-600">✓ Active</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-sm font-medium text-gray-600">Next Cleanup</div>
                    <div className="text-lg font-semibold">Automated</div>
                    <div className="text-xs text-gray-500">Daily at 2:00 AM UTC</div>
                  </div>
                </div>
              </div>
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
                  <BarChart data={chartData} onClick={handleBarClick}>
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
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {/* Time Period Filter */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Call History</CardTitle>
                <Select value={historyTimePeriod} onValueChange={setHistoryTimePeriod}>
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
              </div>
            </CardHeader>
          </Card>

          {/* History Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                    <div className="h-3 w-3 bg-green-600 rounded-full" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold">{historyStats.completed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <div className="h-3 w-3 bg-yellow-600 rounded-full" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Partial</p>
                    <p className="text-2xl font-bold">{historyStats.partial}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                    <div className="h-3 w-3 bg-red-600 rounded-full" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Not Completed</p>
                    <p className="text-2xl font-bold">{historyStats.notCompleted}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Calls Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Calls</CardTitle>
              <CardDescription>Complete list of calls for the selected time period</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Called ID</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCalls.map((call) => (
                    <TableRow key={call.id}>
                      <TableCell>
                        <Button 
                          variant="link" 
                          className="p-0 h-auto font-normal text-blue-600 hover:text-blue-800"
                          onClick={() => navigate(`/call/${call.id}`)}
                        >
                          {formatDate(call.started_at)}
                        </Button>
                      </TableCell>
                      <TableCell>{formatPhoneNumber(call.from_number)}</TableCell>
                      <TableCell>{call.call_duration ? `${call.call_duration}s` : 'N/A'}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(call.call_status)}>
                          {call.call_status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredCalls.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No calls found for the selected time period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Period Details Modal */}
      <Dialog open={showPeriodModal} onOpenChange={setShowPeriodModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Period Details
            </DialogTitle>
            <DialogDescription>
              {selectedPeriodData?.periodDetails}
            </DialogDescription>
          </DialogHeader>
          
          {selectedPeriodData && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {selectedPeriodData.totalCalls}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Calls</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {selectedPeriodData.completionRate}%
                  </div>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                </div>
              </div>

              {/* Breakdown */}
              <div className="space-y-3">
                <h4 className="font-semibold">Call Breakdown:</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                    <span className="text-sm font-medium">Completed</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-green-600">
                        {selectedPeriodData.completed}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {selectedPeriodData.completionRate}%
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                    <span className="text-sm font-medium">Partial</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-yellow-600">
                        {selectedPeriodData.partial}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {selectedPeriodData.partialRate}%
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                    <span className="text-sm font-medium">Not Completed</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-red-600">
                        {selectedPeriodData.notCompleted}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {selectedPeriodData.failureRate}%
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setShowPeriodModal(false);
                    setActiveTab("history");
                  }}
                >
                  View Call History
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowPeriodModal(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CallDetails;