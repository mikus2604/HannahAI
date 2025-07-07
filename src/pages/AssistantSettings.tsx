import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

const AssistantSettings = () => {
  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Assistant Settings</h1>
        <p className="text-muted-foreground">Configure your AI receptionist behavior and responses</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              AI Behavior
            </CardTitle>
            <CardDescription>
              Customize how your AI assistant responds to calls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Assistant settings configuration coming soon...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Voice & Language</CardTitle>
            <CardDescription>
              Configure voice settings and language preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Voice configuration coming soon...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business Hours</CardTitle>
            <CardDescription>
              Set when your AI assistant should be active
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Business hours configuration coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AssistantSettings;