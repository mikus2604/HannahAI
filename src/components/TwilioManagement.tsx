import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Phone, TestTube, Settings, ExternalLink, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface PhoneAssignment {
  id: string;
  phone_number: string;
  user_id: string;
  is_active: boolean;
  created_at: string;
}

export const TwilioManagement = () => {
  const { toast } = useToast();
  const [phoneAssignments, setPhoneAssignments] = useState<PhoneAssignment[]>([]);
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [newUserId, setNewUserId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchPhoneAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('phone_assignments')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPhoneAssignments(data || []);
    } catch (error) {
      console.error('Error fetching phone assignments:', error);
      toast({
        title: "Error",
        description: "Failed to load phone assignments",
        variant: "destructive"
      });
    }
  };

  const testTwilioConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('test-twilio');
      
      if (error) throw error;
      
      setTestResult({
        success: data.success,
        message: data.message || data.error || 'Unknown result'
      });
      
      toast({
        title: data.success ? "Test Successful" : "Test Failed",
        description: data.message || data.error,
        variant: data.success ? "default" : "destructive"
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: "Connection test failed"
      });
      
      toast({
        title: "Test Failed",
        description: "Could not connect to Twilio API",
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  const testTwilioCall = async () => {
    setIsTesting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('test-twilio-call');
      
      if (error) throw error;
      
      toast({
        title: data.success ? "Test Call Successful" : "Test Call Failed",
        description: data.message || data.error,
        variant: data.success ? "default" : "destructive"
      });
    } catch (error) {
      toast({
        title: "Test Call Failed",
        description: "Could not make test call",
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  const configureWebhook = async () => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('configure-twilio-webhook');
      
      if (error) throw error;
      
      toast({
        title: data.success ? "Webhook Configured" : "Webhook Configuration Failed",
        description: data.message || data.error,
        variant: data.success ? "default" : "destructive"
      });
    } catch (error) {
      toast({
        title: "Configuration Failed",
        description: "Could not configure Twilio webhook",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const assignPhoneNumber = async () => {
    if (!newPhoneNumber || !newUserId) {
      toast({
        title: "Error",
        description: "Please fill in both phone number and user ID",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('phone_assignments')
        .insert({
          phone_number: newPhoneNumber,
          user_id: newUserId,
          is_active: true
        });
      
      if (error) throw error;
      
      setNewPhoneNumber("");
      setNewUserId("");
      await fetchPhoneAssignments();
      
      toast({
        title: "Success",
        description: "Phone number assigned successfully"
      });
    } catch (error) {
      console.error('Error assigning phone number:', error);
      toast({
        title: "Error",
        description: "Failed to assign phone number",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePhoneAssignment = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('phone_assignments')
        .update({ is_active: !currentStatus })
        .eq('id', id);
      
      if (error) throw error;
      
      await fetchPhoneAssignments();
      
      toast({
        title: "Success",
        description: `Phone assignment ${!currentStatus ? 'activated' : 'deactivated'}`
      });
    } catch (error) {
      console.error('Error toggling phone assignment:', error);
      toast({
        title: "Error",
        description: "Failed to update phone assignment",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchPhoneAssignments();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Twilio Management
          </CardTitle>
          <CardDescription>
            Manage phone numbers, test connections, and configure webhooks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Testing */}
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <Phone className="h-6 w-6 mt-1" />
                <div>
                  <h3 className="font-semibold">Twilio API</h3>
                  <p className="text-sm text-muted-foreground">Voice calls and SMS messaging</p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Configured</Badge>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={testTwilioConnection}
                disabled={isTesting}
              >
                {isTesting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <TestTube className="h-4 w-4 mr-1" />}
                {isTesting ? 'Testing...' : 'Test Connection'}
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={testTwilioCall}
                disabled={isTesting}
              >
                <Phone className="h-4 w-4 mr-1" />
                Test Call
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={configureWebhook}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Settings className="h-4 w-4 mr-1" />}
                Configure Webhook
              </Button>
              
              <Button variant="outline" size="sm" asChild>
                <a href="https://console.twilio.com/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Twilio Console
                </a>
              </Button>
            </div>

            {testResult && (
              <div className={`flex items-center gap-2 ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                {testResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <span className="text-sm">{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Phone Number Assignment */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Assign Phone Number</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  placeholder="+1234567890"
                  value={newPhoneNumber}
                  onChange={(e) => setNewPhoneNumber(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  placeholder="User UUID"
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={assignPhoneNumber}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Assign Number
                </Button>
              </div>
            </div>
          </div>

          {/* Phone Assignments List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Current Phone Assignments</h3>
            {phoneAssignments.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No phone numbers assigned yet. Add one above to get started.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {phoneAssignments.map((assignment) => (
                  <div 
                    key={assignment.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{assignment.phone_number}</p>
                      <p className="text-sm text-muted-foreground">
                        User: {assignment.user_id}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={assignment.is_active ? "default" : "secondary"}
                      >
                        {assignment.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => togglePhoneAssignment(assignment.id, assignment.is_active)}
                      >
                        {assignment.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};