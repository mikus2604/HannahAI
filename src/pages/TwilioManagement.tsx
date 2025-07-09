import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Phone, Settings, TestTube } from "lucide-react";

const TwilioManagement = () => {
  const [phoneNumber, setPhoneNumber] = useState('+441917433210');
  const [testNumber, setTestNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const configureWebhook = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('configure-twilio-webhook', {
        body: { phoneNumber }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Twilio webhook configured successfully",
      });
    } catch (error) {
      console.error('Error configuring webhook:', error);
      toast({
        title: "Error",
        description: "Failed to configure webhook",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testCall = async () => {
    if (!testNumber) {
      toast({
        title: "Error",
        description: "Please enter a test phone number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-twilio-call', {
        body: { 
          fromNumber: phoneNumber,
          toNumber: testNumber 
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Test call initiated successfully",
      });
    } catch (error) {
      console.error('Error making test call:', error);
      toast({
        title: "Error",
        description: "Failed to make test call",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Phone className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Twilio Management</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Webhook Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+441917433210"
              />
            </div>
            <Button 
              onClick={configureWebhook}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Configuring..." : "Configure Webhook"}
            </Button>
            <div className="text-sm text-muted-foreground">
              <p>This will configure the Twilio phone number to use our voice webhook.</p>
              <p className="mt-2">Webhook URL: https://idupowkqzcwrjslcixsp.supabase.co/functions/v1/voice-incoming</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Test Call
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="testNumber">Test Phone Number</Label>
              <Input
                id="testNumber"
                value={testNumber}
                onChange={(e) => setTestNumber(e.target.value)}
                placeholder="+1234567890"
              />
            </div>
            <Button 
              onClick={testCall}
              disabled={loading || !testNumber}
              className="w-full"
            >
              {loading ? "Calling..." : "Make Test Call"}
            </Button>
            <div className="text-sm text-muted-foreground">
              <p>This will make a test call from {phoneNumber} to the specified number.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Phone Number Assignment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Assigned Number:</strong> +441917433210</p>
            <p><strong>Assigned to:</strong> ariel.mikulski@gmail.com</p>
            <p><strong>Status:</strong> Active</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TwilioManagement;