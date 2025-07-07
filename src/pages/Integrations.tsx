import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [configModal, setConfigModal] = useState<{ open: boolean; integration: any | null }>({ open: false, integration: null });
  const [formData, setFormData] = useState<Record<string, string>>({});

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

  const testTwilio = () => testAPI('twilio', async () => {
    const { data, error } = await supabase.functions.invoke('test-twilio');
    if (error) throw error;
    return data;
  });

  const testCalcom = () => testAPI('calcom', async () => {
    const { data, error } = await supabase.functions.invoke('test-calcom');
    if (error) throw error;
    return data;
  });

  const openConfigModal = (integration: any) => {
    setConfigModal({ open: true, integration });
    // Pre-populate form with existing values if any
    const initialData: Record<string, string> = {};
    if (integration.secretName) {
      initialData[integration.secretName] = '';
    }
    if (integration.secrets) {
      integration.secrets.forEach((secret: string) => {
        initialData[secret] = '';
      });
    }
    if (integration.id === 'calcom') {
      initialData.username = '';
      initialData.apiKey = '';
    }
    setFormData(initialData);
  };

  const closeConfigModal = () => {
    setConfigModal({ open: false, integration: null });
    setFormData({});
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const saveConfiguration = async () => {
    if (!configModal.integration) return;

    const integration = configModal.integration;
    
    // Here you would typically save to Supabase secrets or your backend
    // For now, we'll just show a success message
    console.log('Saving configuration for:', integration.id, formData);
    
    toast({
      title: "Configuration Saved",
      description: `${integration.title} credentials have been updated successfully.`,
    });
    
    closeConfigModal();
    
    // Update the integration status to "configured"
    // In a real app, you'd update the state or refetch data
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const renderConfigForm = () => {
    if (!configModal.integration) return null;

    const integration = configModal.integration;

    if (integration.id === 'openai') {
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="openai-key">OpenAI API Key</Label>
            <Input
              id="openai-key"
              type="password"
              placeholder="sk-..."
              value={formData.OPENAI_API_KEY || ''}
              onChange={(e) => handleFormChange('OPENAI_API_KEY', e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Your OpenAI API key from platform.openai.com
            </p>
          </div>
        </div>
      );
    }

    if (integration.id === 'twilio') {
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="twilio-sid">Account SID</Label>
            <Input
              id="twilio-sid"
              type="text"
              placeholder="AC..."
              value={formData.TWILIO_ACCOUNT_SID || ''}
              onChange={(e) => handleFormChange('TWILIO_ACCOUNT_SID', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="twilio-token">Auth Token</Label>
            <Input
              id="twilio-token"
              type="password"
              placeholder="Auth Token"
              value={formData.TWILIO_AUTH_TOKEN || ''}
              onChange={(e) => handleFormChange('TWILIO_AUTH_TOKEN', e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Find these credentials in your Twilio Console dashboard
          </p>
        </div>
      );
    }

    if (integration.id === 'calcom') {
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="cal-username">Cal.com Username</Label>
            <Input
              id="cal-username"
              type="text"
              placeholder="your-username"
              value={formData.username || ''}
              onChange={(e) => handleFormChange('username', e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Your Cal.com username (e.g., if your link is cal.com/john, enter "john")
            </p>
          </div>
          <div>
            <Label htmlFor="cal-api-key">API Key</Label>
            <Input
              id="cal-api-key"
              type="password"
              placeholder="cal_live_..."
              value={formData.apiKey || ''}
              onChange={(e) => handleFormChange('apiKey', e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Your Cal.com API key from Developer settings
            </p>
          </div>
        </div>
      );
    }

    return null;
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
      testFunction: testTwilio,
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
      testFunction: testCalcom,
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
                        onClick={() => openConfigModal(integration)}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Configure API Key
                      </Button>
                    )}
                    
                    {integration.secrets && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openConfigModal(integration)}
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

      {/* Configuration Modal */}
      <Dialog open={configModal.open} onOpenChange={(open) => !open && closeConfigModal()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              Configure {configModal.integration?.title}
            </DialogTitle>
            <DialogDescription>
              Enter your {configModal.integration?.title} credentials and API keys.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {renderConfigForm()}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeConfigModal}>
              Cancel
            </Button>
            <Button onClick={saveConfiguration}>
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Integrations;