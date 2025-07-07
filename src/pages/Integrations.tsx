import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "lucide-react";

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
            <CardTitle>Third-party Services</CardTitle>
            <CardDescription>
              Connect with CRM, calendar, and other business tools
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