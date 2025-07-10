import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Phone, 
  TestTube, 
  Settings, 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Mic,
  Volume2,
  Globe,
  Database,
  Wrench,
  Mail
} from "lucide-react";
import { TwilioManagement } from "@/components/TwilioManagement";

const APIsManagement = () => {
  const { toast } = useToast();
  const [isTestingElevenLabs, setIsTestingElevenLabs] = useState(false);
  const [elevenLabsTestResult, setElevenLabsTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [apiStatuses, setApiStatuses] = useState<Record<string, boolean>>({});

  const testElevenLabsConnection = async () => {
    setIsTestingElevenLabs(true);
    setElevenLabsTestResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('test-elevenlabs');
      
      if (error) throw error;
      
      setElevenLabsTestResult({
        success: data.success,
        message: data.message || data.error || 'Unknown result'
      });
      
      toast({
        title: data.success ? "Test Successful" : "Test Failed",
        description: data.message || data.error,
        variant: data.success ? "default" : "destructive"
      });
    } catch (error) {
      setElevenLabsTestResult({
        success: false,
        message: "Connection test failed - please check your API key"
      });
      
      toast({
        title: "Test Failed",
        description: "Could not connect to ElevenLabs API",
        variant: "destructive"
      });
    } finally {
      setIsTestingElevenLabs(false);
    }
  };

  const testTextToSpeech = async () => {
    setIsTestingElevenLabs(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('test-elevenlabs-tts', {
        body: {
          text: "Hello, this is a test of the ElevenLabs text-to-speech system for mAIreceptionist.",
          voice: "EXAVITQu4vr4xnSDxMaL", // Sarah voice
          language: "en"
        }
      });
      
      if (error) throw error;
      
      if (data.success && data.audioUrl) {
        // Play the generated audio
        const audio = new Audio(data.audioUrl);
        audio.play();
        
        toast({
          title: "TTS Test Successful",
          description: "Generated speech is now playing",
        });
      } else {
        throw new Error(data.error || "TTS test failed");
      }
    } catch (error) {
      toast({
        title: "TTS Test Failed",
        description: "Could not generate speech",
        variant: "destructive"
      });
    } finally {
      setIsTestingElevenLabs(false);
    }
  };

  const testEmailNotification = async () => {
    setIsTestingEmail(true);
    setEmailTestResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('test-email-notification');
      
      if (error) throw error;
      
      setEmailTestResult({
        success: data.success,
        message: data.message || data.error || 'Unknown result'
      });
      
      toast({
        title: data.success ? "Email Test Successful" : "Email Test Failed",
        description: data.message || data.error,
        variant: data.success ? "default" : "destructive"
      });
    } catch (error) {
      setEmailTestResult({
        success: false,
        message: "Email test failed - please check your Resend API key"
      });
      
      toast({
        title: "Email Test Failed",
        description: "Could not send test email",
        variant: "destructive"
      });
    } finally {
      setIsTestingEmail(false);
    }
  };

  const getStatusBadge = (apiName: string, testResult?: { success: boolean; message: string } | null) => {
    if (testResult !== null && testResult !== undefined) {
      return testResult.success ? (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Working</Badge>
      ) : (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Failed</Badge>
      );
    }
    return <Badge variant="outline" className="border-orange-300 text-orange-700">Untested</Badge>;
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Database className="h-8 w-8" />
          APIs Management
        </h1>
        <p className="text-muted-foreground">Configure and manage external API integrations</p>
      </div>

      <Tabs defaultValue="twilio" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="twilio" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Twilio
          </TabsTrigger>
          <TabsTrigger value="elevenlabs" className="flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            ElevenLabs
          </TabsTrigger>
          <TabsTrigger value="resend" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Resend
          </TabsTrigger>
        </TabsList>

        <TabsContent value="twilio" className="space-y-4">
          <TwilioManagement />
        </TabsContent>

        <TabsContent value="elevenlabs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-5 w-5" />
                ElevenLabs Text-to-Speech
              </CardTitle>
              <CardDescription>
                High-quality multilingual voice synthesis for British English and Polish
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* API Status */}
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Mic className="h-6 w-6 mt-1" />
                    <div>
                      <h3 className="font-semibold">ElevenLabs API</h3>
                      <p className="text-sm text-muted-foreground">Advanced text-to-speech with multilingual support</p>
                    </div>
                  </div>
                  {getStatusBadge('elevenlabs', elevenLabsTestResult)}
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={testElevenLabsConnection}
                    disabled={isTestingElevenLabs}
                  >
                    {isTestingElevenLabs ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <TestTube className="h-4 w-4 mr-1" />}
                    {isTestingElevenLabs ? 'Testing...' : 'Test Connection'}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={testTextToSpeech}
                    disabled={isTestingElevenLabs}
                  >
                    <Volume2 className="h-4 w-4 mr-1" />
                    Test Text-to-Speech
                  </Button>
                  
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://elevenlabs.io/app/speech-synthesis" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      ElevenLabs Console
                    </a>
                  </Button>
                </div>

                {elevenLabsTestResult && (
                  <div className={`flex items-center gap-2 ${elevenLabsTestResult.success ? 'text-green-600' : 'text-red-600'}`}>
                    {elevenLabsTestResult.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <span className="text-sm">{elevenLabsTestResult.message}</span>
                  </div>
                )}
              </div>

              {/* Language Support */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Supported Languages
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">🇬🇧 British English</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <div className="text-sm">
                          <strong>Voice:</strong> Sarah (Professional Female)
                        </div>
                        <div className="text-sm">
                          <strong>Model:</strong> Eleven Multilingual v2
                        </div>
                        <div className="text-sm text-muted-foreground">
                          High-quality British accent with natural intonation
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">🇵🇱 Polish</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <div className="text-sm">
                          <strong>Voice:</strong> Matilda (Professional Female)
                        </div>
                        <div className="text-sm">
                          <strong>Model:</strong> Eleven Multilingual v2
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Native Polish pronunciation and grammar
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Features
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Automatic Language Detection:</strong> Detects caller's language and responds appropriately
                    </AlertDescription>
                  </Alert>
                  
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Real-time Synthesis:</strong> Low-latency voice generation for natural conversations
                    </AlertDescription>
                  </Alert>
                  
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Concurrent Calls:</strong> Multiple simultaneous conversations in different languages
                    </AlertDescription>
                  </Alert>
                  
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Context Awareness:</strong> Maintains conversation context across language switches
                    </AlertDescription>
                  </Alert>
                </div>
              </div>

              {/* Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Configuration</h3>
                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertDescription>
                    Language preferences can be configured per assistant in the Assistant Settings page. 
                    The system will automatically use the appropriate voice and language model based on:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Detected caller language (automatic)</li>
                      <li>Assistant's default language setting</li>
                      <li>User's language preference (if available)</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resend" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Resend Email Service
              </CardTitle>
              <CardDescription>
                Email notifications and communication service for mAIreceptionist
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* API Status */}
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Mail className="h-6 w-6 mt-1" />
                    <div>
                      <h3 className="font-semibold">Resend API</h3>
                      <p className="text-sm text-muted-foreground">Reliable email delivery for notifications and alerts</p>
                    </div>
                  </div>
                  {getStatusBadge('resend', emailTestResult)}
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={testEmailNotification}
                    disabled={isTestingEmail}
                  >
                    {isTestingEmail ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <TestTube className="h-4 w-4 mr-1" />}
                    {isTestingEmail ? 'Testing...' : 'Test Email'}
                  </Button>
                  
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://resend.com/dashboard" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Resend Dashboard
                    </a>
                  </Button>

                  <Button variant="outline" size="sm" asChild>
                    <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer">
                      <Settings className="h-4 w-4 mr-1" />
                      API Keys
                    </a>
                  </Button>
                </div>

                {emailTestResult && (
                  <div className={`flex items-center gap-2 ${emailTestResult.success ? 'text-green-600' : 'text-red-600'}`}>
                    {emailTestResult.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <span className="text-sm">{emailTestResult.message}</span>
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Email Features
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Call Digest Emails:</strong> Automated daily/weekly/monthly summaries of call activity
                    </AlertDescription>
                  </Alert>
                  
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Real-time Notifications:</strong> Instant alerts for missed calls and important events
                    </AlertDescription>
                  </Alert>
                  
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Custom Recipients:</strong> Send notifications to specific email addresses
                    </AlertDescription>
                  </Alert>
                  
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Professional Templates:</strong> Clean, branded email templates for all communications
                    </AlertDescription>
                  </Alert>
                </div>
              </div>

              {/* Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Configuration</h3>
                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertDescription>
                    Email notification preferences can be configured in the Assistant Settings page:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Set notification frequency (immediate, daily, weekly, monthly)</li>
                      <li>Specify custom email address for notifications</li>
                      <li>Enable/disable email notifications globally</li>
                      <li>Configure digest email content and timing</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>

              {/* Setup Instructions */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Setup Instructions</h3>
                <Alert>
                  <ExternalLink className="h-4 w-4" />
                  <AlertDescription>
                    To configure Resend for email notifications:
                    <ol className="list-decimal list-inside mt-2 space-y-1">
                       <li>Create an account at <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">resend.com <ExternalLink className="h-3 w-3" /></a></li>
                       <li>Verify your sending domain at <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">resend.com/domains <ExternalLink className="h-3 w-3" /></a></li>
                       <li>Generate an API key at <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">resend.com/api-keys <ExternalLink className="h-3 w-3" /></a></li>
                      <li>Add the RESEND_API_KEY to your Supabase secrets</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default APIsManagement;