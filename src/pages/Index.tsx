import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, MessageSquare, Clock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

const Index = () => {
  const [calls, setCalls] = useState<Call[]>([]);
  const [selectedCall, setSelectedCall] = useState<CallDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCalls();
  }, []);

  const fetchCalls = async () => {
    try {
      // Call cleanup function first to remove stale calls
      await supabase.rpc('cleanup_stale_calls');
      
      const response = await supabase.functions.invoke('get-call-logs');
      if (response.error) throw response.error;
      
      setCalls(response.data.calls || []);
    } catch (error) {
      console.error('Error fetching calls:', error);
      toast({
        title: "Error",
        description: "Failed to fetch call logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCallDetails = async (callId: string) => {
    try {
      const response = await supabase.functions.invoke('get-call-logs', {
        body: { callId }
      });
      if (response.error) throw response.error;
      
      setSelectedCall(response.data);
    } catch (error) {
      console.error('Error fetching call details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch call details",
        variant: "destructive",
      });
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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">mAIreceptionist</h1>
          <p className="text-xl text-muted-foreground">AI-powered phone answering service</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Call Logs List */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Recent Calls
                </CardTitle>
                <CardDescription>
                  View all incoming calls and SMS interactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading calls...</div>
                ) : calls.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No calls yet</p>
                    <p className="text-sm mt-2">
                      Configure your Twilio webhook to point to:<br/>
                      <code className="bg-muted px-2 py-1 rounded text-xs">
                        https://idupowkqzcwrjslcixsp.supabase.co/functions/v1/voice-incoming
                      </code>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {calls.map((call) => (
                      <div
                        key={call.id}
                        className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => fetchCallDetails(call.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {call.call_status === 'sms_completed' ? (
                              <MessageSquare className="h-4 w-4" />
                            ) : (
                              <Phone className="h-4 w-4" />
                            )}
                            <span className="font-medium">
                              {formatPhoneNumber(call.from_number)}
                            </span>
                          </div>
                          <Badge className={getStatusColor(call.call_status)}>
                            {call.call_status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(call.started_at)}
                          </div>
                          {call.call_duration && (
                            <span>{call.call_duration}s</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Call Details */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Call Transcript
                </CardTitle>
                <CardDescription>
                  Detailed conversation history
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedCall ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <h3 className="font-semibold mb-2">Call Information</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><strong>From:</strong> {formatPhoneNumber(selectedCall.call.from_number)}</div>
                        <div><strong>To:</strong> {formatPhoneNumber(selectedCall.call.to_number)}</div>
                        <div><strong>Status:</strong> {selectedCall.call.call_status}</div>
                        <div><strong>Started:</strong> {formatDate(selectedCall.call.started_at)}</div>
                      </div>
                      {selectedCall.session && (
                        <div className="mt-2">
                          <strong>State:</strong> {selectedCall.session.current_state}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {selectedCall.transcripts && selectedCall.transcripts.length > 0 ? (
                        selectedCall.transcripts.map((transcript, index) => (
                          <div
                            key={transcript.id}
                            className={`p-3 rounded-lg ${
                              transcript.speaker === 'agent'
                                ? 'bg-blue-50 border-l-4 border-l-blue-500'
                                : 'bg-green-50 border-l-4 border-l-green-500'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <User className="h-3 w-3" />
                              <span className="text-xs font-medium uppercase">
                                {transcript.speaker === 'agent' ? 'Hannah (AI)' : 'Caller'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(transcript.timestamp)}
                              </span>
                            </div>
                            <p className="text-sm">{transcript.message}</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No transcript available</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a call to view transcript</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Setup Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
            <CardDescription>Configure Twilio to use your Hannah AI agent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">1. Voice Webhook URL</h4>
                <code className="bg-muted px-3 py-2 rounded block text-sm">
                  https://idupowkqzcwrjslcixsp.supabase.co/functions/v1/voice-incoming
                </code>
                <p className="text-sm text-muted-foreground mt-1">
                  Set this as your Twilio phone number's voice webhook URL
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">2. SMS Webhook URL</h4>
                <code className="bg-muted px-3 py-2 rounded block text-sm">
                  https://idupowkqzcwrjslcixsp.supabase.co/functions/v1/sms-webhook
                </code>
                <p className="text-sm text-muted-foreground mt-1">
                  Set this as your Twilio phone number's SMS webhook URL
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">3. Test Your Setup</h4>
                <p className="text-sm text-muted-foreground">
                  Call or text your Twilio number to test Hannah's AI responses. 
                  All interactions will appear in the call logs above.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
