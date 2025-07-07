import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { 
  Database, 
  Calendar, 
  Bot, 
  Phone, 
  MessageSquare, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Settings, 
  Key,
  ExternalLink,
  Copy,
  Link
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Integrations = () => {
  const { toast } = useToast();
  const [testingStates, setTestingStates] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  const testAPI = async (apiName: string, testFunction: () => Promise<any>) => {
    setTestingStates(prev => ({ ...prev, [apiName]: true }));
    
    try {
      const result = await testFunction();
      setTestResults(prev => ({ 
        ...prev, 
        [apiName]: { 
          success: result.success, 
          message: result.message || result.error 
        } 
      }));
      
      toast({
        title: result.success ? "Test Successful" : "Test Failed",
        description: result.message || result.error,
        variant: result.success ? "default" : "destructive",
      });
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        [apiName]: { 
          success: false, 
          message: "Connection test failed" 
        } 
      }));
      
      toast({
        title: "Test Failed",
        description: "Could not connect to test the API",
        variant: "destructive",
      });
    } finally {
      setTestingStates(prev => ({ ...prev, [apiName]: false }));
    }
  };

  const testOpenAI = () => testAPI('openai', async () => {
    const { data, error } = await supabase.functions.invoke('test-openai');
    if (error) throw error;
    return data;
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const integrations = [
    {
      id: 'openai',
      title: 'OpenAI API',
      description: 'Powers Hannah, your AI receptionist',
      icon: Bot,
      status: 'configured', // This would be dynamic in a real app
      secretName: 'OPENAI_API_KEY',
      testFunction: testOpenAI,
      links: [
        { label: 'Get API Key', url: 'https://platform.openai.com/api-keys' },
        { label: 'Documentation', url: 'https://platform.openai.com/docs' }
      ]
    },
    {
      id: 'twilio',
      title: 'Twilio',
      description: 'Voice and SMS communication service',
      icon: Phone,
      status: 'configured',
      secrets: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'],
      links: [
        { label: 'Twilio Console', url: 'https://console.twilio.com' },
        { label: 'API Keys', url: 'https://console.twilio.com/project/api-keys' }
      ]
    },
    {
      id: 'calcom',
      title: 'Cal.com',
      description: 'Meeting scheduling integration',
      icon: Calendar,
      status: 'not-configured',
      secretName: 'CALCOM_API_KEY',
      links: [
        { label: 'Cal.com Settings', url: 'https://cal.com/settings/developer' },
        { label: 'API Documentation', url: 'https://developer.cal.com' }
      ]
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'configured':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Configured</Badge>;
      case 'not-configured':
        return <Badge variant="outline" className="border-orange-300 text-orange-700">Not Configured</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getTestResult = (id: string) => {
    const result = testResults[id];
    if (!result) return null;
    
    return (
      <div className={`flex items-center gap-2 mt-2 ${result.success ? 'text-green-600' : 'text-red-600'}`}>
        {result.success ? (
          <CheckCircle className="h-4 w-4" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
        <span className="text-sm">{result.message}</span>
      </div>
    );
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">Manage API keys and external service connections</p>
      </div>

      {/* API Keys & Credentials Section */}
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Keys & Credentials
            </CardTitle>
            <CardDescription>
              Configure your service credentials and API keys
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              {integrations.map((integration) => (
                <div key={integration.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <integration.icon className="h-6 w-6 mt-1" />
                      <div>
                        <h3 className="font-semibold">{integration.title}</h3>
                        <p className="text-sm text-muted-foreground">{integration.description}</p>
                      </div>
                    </div>
                    {getStatusBadge(integration.status)}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {integration.secretName && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          // This would trigger the lov-secret-form
                          toast({
                            title: "Configure API Key",
                            description: `Use the actions below to set up your ${integration.title} API key`,
                          });
                        }}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Configure API Key
                      </Button>
                    )}
                    
                    {integration.secrets && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          toast({
                            title: "Configure Credentials",
                            description: `Use the actions below to set up your ${integration.title} credentials`,
                          });
                        }}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Configure Credentials
                      </Button>
                    )}

                    {integration.testFunction && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={integration.testFunction}
                        disabled={testingStates[integration.id]}
                      >
                        <TestTube className="h-4 w-4 mr-1" />
                        {testingStates[integration.id] ? 'Testing...' : 'Test Connection'}
                      </Button>
                    )}

                    {integration.links.map((link) => (
                      <Button 
                        key={link.label}
                        variant="ghost" 
                        size="sm"
                        asChild
                      >
                        <a href={link.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          {link.label}
                        </a>
                      </Button>
                    ))}
                  </div>

                  {getTestResult(integration.id)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Webhook URLs Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
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
                    onClick={() => copyToClipboard(
                      'https://idupowkqzcwrjslcixsp.supabase.co/functions/v1/voice-incoming',
                      'Voice webhook URL'
                    )}
                  >
                    <Copy className="h-4 w-4" />
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
                    onClick={() => copyToClipboard(
                      'https://idupowkqzcwrjslcixsp.supabase.co/functions/v1/sms-webhook',
                      'SMS webhook URL'
                    )}
                  >
                    <Copy className="h-4 w-4" />
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

        {/* Additional Services Section */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Services</CardTitle>
            <CardDescription>
              Future integrations and custom webhooks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">More Integrations Coming Soon</h3>
              <p className="text-sm text-muted-foreground mb-4">
                We're working on adding more service integrations like CRM systems, 
                email platforms, and business tools.
              </p>
              <Button variant="outline" asChild>
                <a href="mailto:support@example.com">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Request Integration
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Integrations;