import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Globe, 
  Bot, 
  Mic, 
  Phone, 
  Mail, 
  MessageSquare, 
  Settings,
  Zap,
  Crown,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const PremiumFeatures = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Translation settings
  const [translationSettings, setTranslationSettings] = useState({
    enabled: false,
    defaultLanguage: 'en',
    autoDetect: true
  });

  // Call routing settings
  const [routingSettings, setRoutingSettings] = useState({
    businessHours: { start: '09:00', end: '17:00', timezone: 'America/New_York' },
    forwardingNumber: '',
    emergencyKeywords: ['emergency', 'urgent'],
    aiHandling: true
  });

  // Notification branding
  const [brandingSettings, setBrandingSettings] = useState({
    companyName: '',
    fromName: '',
    customSignature: '',
    smsEnabled: false,
    emailEnabled: false
  });

  // CRM integration
  const [crmSettings, setCrmSettings] = useState({
    webhookUrl: '',
    includeTranscript: true,
    includeSummary: true,
    includeRecording: false
  });

  const supportedLanguages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese' },
  ];

  const isPremiumPlus = profile?.plan_type === 'premium_plus' || profile?.plan_type === 'enterprise';

  const testTranslation = async () => {
    if (!isPremiumPlus) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('translate-text', {
        body: {
          text: 'Hello, how can I help you today?',
          targetLanguage: translationSettings.defaultLanguage
        }
      });

      if (error) throw error;

      toast({
        title: "Translation Test",
        description: `Translated: "${data.translatedText}"`,
      });
    } catch (error) {
      toast({
        title: "Translation Test Failed", 
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testNotification = async (type: 'sms' | 'email') => {
    if (!isPremiumPlus) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: {
          userId: user?.id,
          type: type,
          recipient: type === 'email' ? user?.email : '+1234567890', // Would use user's phone
          subject: 'Test Notification',
          message: 'This is a test of your white-label notification system.',
          brandingConfig: brandingSettings
        }
      });

      if (error) throw error;

      toast({
        title: `${type.toUpperCase()} Test Sent`,
        description: `Test ${type} notification sent successfully`,
      });
    } catch (error) {
      toast({
        title: "Notification Test Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testCrmIntegration = async () => {
    if (!isPremiumPlus || !crmSettings.webhookUrl) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('crm-integration', {
        body: {
          userId: user?.id,
          callData: {
            callId: `test_${Date.now()}`,
            callerId: '+1234567890',
            duration: 120,
            transcript: 'This is a test call transcript',
            summary: 'Test call for CRM integration',
            timestamp: new Date().toISOString()
          },
          webhookUrl: crmSettings.webhookUrl,
          integrationSettings: crmSettings
        }
      });

      if (error) throw error;

      toast({
        title: "CRM Integration Test",
        description: "Test data sent to your CRM webhook successfully",
      });
    } catch (error) {
      toast({
        title: "CRM Test Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isPremiumPlus) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold">Premium+ Features</h1>
          <p className="text-muted-foreground">Advanced features for growing businesses</p>
        </div>

        <Alert>
          <Crown className="h-4 w-4" />
          <AlertDescription>
            These features require a Premium+ or Enterprise plan. 
            <Button variant="link" className="p-0 h-auto ml-1">Upgrade your plan</Button> to access advanced AI, multi-language support, and CRM integrations.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Premium+ Features</h1>
          <p className="text-muted-foreground">Configure your advanced business features</p>
        </div>
        <Badge variant="default" className="bg-gradient-to-r from-purple-500 to-purple-600">
          <Crown className="h-3 w-3 mr-1" />
          Premium+ Active
        </Badge>
      </div>

      {/* Multi-language Support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Multi-language Support
          </CardTitle>
          <CardDescription>
            Automatically translate conversations and handle international callers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={translationSettings.enabled}
              onCheckedChange={(checked) => 
                setTranslationSettings(prev => ({ ...prev, enabled: checked }))
              }
            />
            <Label>Enable automatic translation</Label>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Default Language</Label>
              <Select
                value={translationSettings.defaultLanguage}
                onValueChange={(value) => 
                  setTranslationSettings(prev => ({ ...prev, defaultLanguage: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supportedLanguages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-center">
              <Button onClick={testTranslation} disabled={isLoading}>
                <Globe className="h-4 w-4 mr-2" />
                Test Translation
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Call Handling */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Advanced AI Responses
          </CardTitle>
          <CardDescription>
            Intelligent call handling with context-aware responses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                AI responses are automatically enabled for your calls. The system uses your greeting messages 
                and business context to provide intelligent, professional responses to callers.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Transcription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Real-time Transcription
          </CardTitle>
          <CardDescription>
            Live transcription of calls with high accuracy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Real-time transcription is automatically active for all calls. Transcripts are stored securely 
              and available in your call history with confidence scores.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Call Routing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Call Forwarding & Routing
          </CardTitle>
          <CardDescription>
            Smart call routing based on time, keywords, or caller ID
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Business Hours Start</Label>
              <Input
                type="time"
                value={routingSettings.businessHours.start}
                onChange={(e) => 
                  setRoutingSettings(prev => ({
                    ...prev,
                    businessHours: { ...prev.businessHours, start: e.target.value }
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Business Hours End</Label>
              <Input
                type="time"
                value={routingSettings.businessHours.end}
                onChange={(e) => 
                  setRoutingSettings(prev => ({
                    ...prev,
                    businessHours: { ...prev.businessHours, end: e.target.value }
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Forwarding Number (for urgent calls)</Label>
            <Input
              placeholder="+1234567890"
              value={routingSettings.forwardingNumber}
              onChange={(e) => 
                setRoutingSettings(prev => ({ ...prev, forwardingNumber: e.target.value }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* White-label Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            White-label Notifications
          </CardTitle>
          <CardDescription>
            Customize email and SMS notifications with your branding
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input
                placeholder="Your Company Inc."
                value={brandingSettings.companyName}
                onChange={(e) => 
                  setBrandingSettings(prev => ({ ...prev, companyName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>From Name</Label>
              <Input
                placeholder="Customer Service"
                value={brandingSettings.fromName}
                onChange={(e) => 
                  setBrandingSettings(prev => ({ ...prev, fromName: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Custom Signature</Label>
            <Textarea
              placeholder="Best regards,&#10;Your Customer Service Team"
              value={brandingSettings.customSignature}
              onChange={(e) => 
                setBrandingSettings(prev => ({ ...prev, customSignature: e.target.value }))
              }
            />
          </div>

          <div className="flex gap-4">
            <Button onClick={() => testNotification('email')} disabled={isLoading}>
              <Mail className="h-4 w-4 mr-2" />
              Test Email
            </Button>
            <Button onClick={() => testNotification('sms')} disabled={isLoading}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Test SMS
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* CRM Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            CRM Integration
          </CardTitle>
          <CardDescription>
            Connect with Zapier, Make.com, or send data directly to your CRM
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Webhook URL (Zapier, Make.com, or custom)</Label>
            <Input
              placeholder="https://hooks.zapier.com/hooks/catch/..."
              value={crmSettings.webhookUrl}
              onChange={(e) => 
                setCrmSettings(prev => ({ ...prev, webhookUrl: e.target.value }))
              }
            />
          </div>

          <div className="space-y-3">
            <Label>Data to include:</Label>
            <div className="flex items-center space-x-2">
              <Switch
                checked={crmSettings.includeTranscript}
                onCheckedChange={(checked) => 
                  setCrmSettings(prev => ({ ...prev, includeTranscript: checked }))
                }
              />
              <Label>Call transcripts</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={crmSettings.includeSummary}
                onCheckedChange={(checked) => 
                  setCrmSettings(prev => ({ ...prev, includeSummary: checked }))
                }
              />
              <Label>Call summaries</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={crmSettings.includeRecording}
                onCheckedChange={(checked) => 
                  setCrmSettings(prev => ({ ...prev, includeRecording: checked }))
                }
              />
              <Label>Recording URLs</Label>
            </div>
          </div>

          <Button 
            onClick={testCrmIntegration} 
            disabled={isLoading || !crmSettings.webhookUrl}
          >
            <Zap className="h-4 w-4 mr-2" />
            Test CRM Integration
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PremiumFeatures;