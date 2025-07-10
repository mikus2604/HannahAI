import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, MessageSquare, Clock, Download, ArrowLeft, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Call {
  id: string;
  twilio_call_sid: string;
  from_number: string;
  to_number: string;
  call_status: string;
  started_at: string;
  ended_at?: string;
  call_duration?: number;
  recording_url?: string;
}

interface Transcript {
  id: string;
  speaker: string;
  message: string;
  timestamp: string;
  confidence?: number;
  intent?: string;
}

interface CallSession {
  id: string;
  current_state: string;
  collected_data: any;
  context: any;
}

const SpecificCallDetails = () => {
  const { callId } = useParams<{ callId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [call, setCall] = useState<Call | null>(null);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [session, setSession] = useState<CallSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (callId) {
      fetchCallDetails();
    }
  }, [callId]);

  const fetchCallDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch call details
      const { data: callData, error: callError } = await supabase
        .from('calls')
        .select('*')
        .eq('id', callId)
        .single();

      if (callError) throw callError;

      // Fetch transcripts
      const { data: transcriptData, error: transcriptError } = await supabase
        .from('transcripts')
        .select('*')
        .eq('call_id', callId)
        .order('timestamp', { ascending: true });

      if (transcriptError) throw transcriptError;

      // Fetch call session
      const { data: sessionData, error: sessionError } = await supabase
        .from('call_sessions')
        .select('*')
        .eq('call_id', callId)
        .single();

      // Session might not exist, so don't throw error
      if (sessionError && sessionError.code !== 'PGRST116') {
        console.warn('Session fetch error:', sessionError);
      }

      setCall(callData);
      setTranscripts(transcriptData || []);
      setSession(sessionData || null);
      
    } catch (error) {
      console.error('Error fetching call details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch call details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'completed': return 'default';
      case 'in-progress': return 'secondary';
      case 'sms_completed': return 'outline';
      case 'failed': return 'destructive';
      case 'cancelled': return 'outline';
      default: return 'outline';
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

  const handleDownloadRecording = () => {
    if (call?.recording_url) {
      window.open(call.recording_url, '_blank', 'noopener,noreferrer');
    } else {
      toast({
        title: "No Recording",
        description: "No recording available for this call",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading call details...</p>
        </div>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Call Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested call could not be found.</p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Call Details
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Call Details</h1>
          <p className="text-muted-foreground">Detailed information about the selected call</p>
        </div>
      </div>

      {/* Call Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Call Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Caller</p>
              <p className="text-lg font-semibold">{formatPhoneNumber(call.from_number)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">To Number</p>
              <p className="text-lg font-semibold">{formatPhoneNumber(call.to_number)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge variant={getStatusVariant(call.call_status)}>
                {call.call_status.replace('_', ' ')}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Duration</p>
              <p className="text-lg font-semibold">
                {call.call_duration ? `${call.call_duration}s` : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Started At</p>
              <p className="text-sm">{formatDate(call.started_at)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ended At</p>
              <p className="text-sm">{call.ended_at ? formatDate(call.ended_at) : 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Call SID</p>
              <p className="text-sm font-mono">{call.twilio_call_sid}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Recording</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDownloadRecording}
                disabled={!call.recording_url}
              >
                <Download className="h-3 w-3 mr-2" />
                {call.recording_url ? 'Download' : 'Not Available'}
              </Button>
            </div>
            {/* Collected Data Section - Always show if session exists */}
            {session && (
              <div className="md:col-span-2 lg:col-span-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">Collected Data</p>
                {session.collected_data && Object.keys(session.collected_data).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(session.collected_data).map(([key, value]) => (
                      <div key={key} className="bg-muted/50 p-3 rounded-md">
                        <p className="text-xs font-medium text-muted-foreground mb-1 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </p>
                        <p className="text-sm">{typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-muted/30 p-3 rounded-md">
                    <p className="text-sm text-muted-foreground">No data collected during this call</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>


      {/* Call Transcript */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Call Transcript
          </CardTitle>
          <CardDescription>
            {transcripts.length > 0 
              ? `${transcripts.length} transcript entries`
              : 'No transcript available'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transcripts.length > 0 ? (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {transcripts.map((transcript) => (
                <div 
                  key={transcript.id} 
                  className={`p-3 rounded-lg ${
                    transcript.speaker === 'assistant' 
                      ? 'bg-blue-50 border-l-4 border-blue-200' 
                      : 'bg-gray-50 border-l-4 border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={transcript.speaker === 'assistant' ? 'default' : 'secondary'}>
                        {transcript.speaker}
                      </Badge>
                      {transcript.confidence && (
                        <span className="text-xs text-muted-foreground">
                          {Math.round(transcript.confidence * 100)}% confidence
                        </span>
                      )}
                      {transcript.intent && (
                        <Badge variant="outline" className="text-xs">
                          {transcript.intent}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(transcript.timestamp)}
                    </div>
                  </div>
                  <p className="text-sm">{transcript.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No transcript available for this call</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SpecificCallDetails;