import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import {
  Calendar,
  TestTube,
  CheckCircle,
  XCircle,
  Settings,
  ExternalLink,
  MessageSquare
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Integrations = () => {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [testingStates, setTestingStates] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [configModal, setConfigModal] = useState<{ open: boolean; integration: any | null }>({ open: false, integration: null });
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) setUserId(data.user.id);
    });
  }, []);

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

  const testCalcom = () => testAPI('calcom', async () => {
    if (!userId) throw new Error("User not loaded");

    const { data, error } = await supabase.functions.invoke('test-calcom', {
      body: JSON.stringify({ user_id: userId })
    });

    if (error) throw error;
    return data;
  });

  const loadCalcomCredentials = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('api_keys')
      .select('key_name, key_value')
      .eq('user_id', userId)
      .in('key_name', ['calcom_username', 'calcom_api_key']);

    if (!error && data?.length) {
      const creds: Record<string, string> = {};
      for (const item of data) {
        if (item.key_name === 'calcom_username') creds.username = item.key_value;
        if (item.key_name === 'calcom_api_key') creds.apiKey = item.key_value;
      }
      setFormData({
        username: creds.username || '',
        apiKey: creds.apiKey ? creds.apiKey.slice(0, 8) + '***' : ''
      });
    }
  };

  const saveConfiguration = async () => {
    if (!configModal.integration || !userId) return;

    const updates = [
      { key_name: 'calcom_username', key_value: formData.username },
      { key_name: 'calcom_api_key', key_value: formData.apiKey }
    ];

    for (const entry of updates) {
      const { error } = await supabase
        .from('api_keys')
        .upsert({
          user_id: userId,
          key_name: entry.key_name,
          key_value: entry.key_value,
        }, { onConflict: ['user_id', 'key_name'] });

      if (error) {
        toast({
          title: 'Save Failed',
          description: `Could not save ${entry.key_name}`,
          variant: 'destructive'
        });
        return;
      }
    }

    toast({
      title: "Saved",
      description: "Cal.com configuration saved successfully.",
    });
    closeConfigModal();
  };

  const openConfigModal = (integration: any) => {
    setConfigModal({ open: true, integration });
    setFormData({ username: '', apiKey: '' });
    loadCalcomCredentials();
  };

  const closeConfigModal = () => {
    setConfigModal({ open: false, integration: null });
    setFormData({});
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const renderConfigForm = () => {
    if (!configModal.integration) return null;

    const integration = configModal.integration;

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
      id: 'calcom',
      title: 'Cal.com',
      description: 'Meeting scheduling integration for appointment booking',
      icon: Calendar,
      status: 'not-configured',
      secretName: 'CALCOM_API_KEY',
      testFunction: testCalcom,
      links: [
        { label: 'Cal.com Settings', url: 'https://app.cal.com/settings' },
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
        <p className="text-muted-foreground">Connect external services to enhance your assistant's capabilities</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Scheduling Integration
            </CardTitle>
            <CardDescription>
              Connect your Cal.com account to enable appointment scheduling
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openConfigModal(integration)}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Configure API Key
                    </Button>

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
      </div>

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
