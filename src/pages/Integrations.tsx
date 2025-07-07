import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Database, Calendar } from "lucide-react";

const Integrations = () => {
  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">Connect your AI receptionist with external services</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Twilio Configuration
            </CardTitle>
            <CardDescription>
              Your Twilio phone service integration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Voice Webhook URL</h4>
                <code className="bg-muted px-3 py-2 rounded block text-sm">
                  https://idupowkqzcwrjslcixsp.supabase.co/functions/v1/voice-incoming
                </code>
                <p className="text-sm text-muted-foreground mt-1">
                  Set this as your Twilio phone number's voice webhook URL
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">SMS Webhook URL</h4>
                <code className="bg-muted px-3 py-2 rounded block text-sm">
                  https://idupowkqzcwrjslcixsp.supabase.co/functions/v1/sms-webhook
                </code>
                <p className="text-sm text-muted-foreground mt-1">
                  Set this as your Twilio phone number's SMS webhook URL
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>OpenAI Integration</CardTitle>
            <CardDescription>
              AI language model configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">OpenAI settings configured and active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Cal.com Integration
            </CardTitle>
            <CardDescription>
              Connect your Cal.com account for meeting booking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Cal.com Setup</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  To enable meeting booking through your AI assistant, you'll need to configure your Cal.com integration.
                </p>
                <div className="bg-muted p-4 rounded-lg">
                  <h5 className="font-medium mb-2">Setup Instructions:</h5>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Create or sign into your Cal.com account</li>
                    <li>Go to Settings → Developer → API Keys</li>
                    <li>Generate a new API key</li>
                    <li>Add your Cal.com username and API key below</li>
                  </ol>
                </div>
              </div>
              
              <div className="grid gap-4">
                <div>
                  <label className="text-sm font-medium">Cal.com Username</label>
                  <Input placeholder="your-username" className="mt-1" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Your Cal.com username (e.g., if your booking link is cal.com/john, enter "john")
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium">API Key</label>
                  <Input type="password" placeholder="cal_live_..." className="mt-1" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Your Cal.com API key from Developer settings
                  </p>
                </div>
                
                <Button className="w-fit">
                  Save Cal.com Settings
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Third-party Services</CardTitle>
            <CardDescription>
              Connect with CRM and other business tools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Additional integrations coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Integrations;