import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Shield, Smartphone, Key, Copy, Check, AlertTriangle, Eye, EyeOff, ShieldCheck, ShieldOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Security = () => {
  const { user, profile, enable2FA, verify2FA, disable2FA, updateProfile } = useAuth();
  const { toast } = useToast();
  
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [step2FA, setStep2FA] = useState<'setup' | 'verify'>('setup');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [selectedAuthApp, setSelectedAuthApp] = useState('');

  const authenticatorApps = [
    { value: 'google', label: 'Google Authenticator', description: 'Free app by Google' },
    { value: 'microsoft', label: 'Microsoft Authenticator', description: 'Free app by Microsoft' },
    { value: 'authy', label: 'Authy', description: 'Multi-device support' },
    { value: '1password', label: '1Password', description: 'Password manager with 2FA' },
    { value: 'other', label: 'Other TOTP App', description: 'Any compatible authenticator' },
  ];

  const handle2FASetup = async () => {
    setIsLoading(true);
    try {
      const { qrCode, secret, error } = await enable2FA();
      
      if (error) {
        toast({
          title: "2FA Setup Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setQrCode(qrCode);
      setSecret(secret);
      setStep2FA('setup');
      setShow2FASetup(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to set up 2FA",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!verificationCode.trim()) {
      toast({
        title: "Verification Required",
        description: "Please enter the verification code",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await verify2FA(verificationCode, secret);
      
      if (error) {
        toast({
          title: "Verification Failed",
          description: "Invalid verification code. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Store the selected authenticator app in the profile
      const selectedApp = authenticatorApps.find(app => app.value === selectedAuthApp);
      if (selectedApp) {
        await updateProfile({ 
          two_factor_enabled: true,
          authenticator_app: selectedApp.label 
        });
      }

      toast({
        title: "2FA Enabled",
        description: "Two-factor authentication has been successfully enabled.",
      });
      
      setShow2FASetup(false);
      setVerificationCode('');
      setSelectedAuthApp('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify 2FA code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    setIsLoading(true);
    try {
      const { error } = await disable2FA();
      
      if (error) {
        toast({
          title: "2FA Disable Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "2FA Disabled",
        description: "Two-factor authentication has been disabled.",
      });
      
      setShowDisable2FA(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disable 2FA",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setSecretCopied(true);
      toast({
        title: "Copied!",
        description: "Secret key copied to clipboard",
      });
      
      setTimeout(() => setSecretCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy secret key",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Security Settings</h1>
        <p className="text-muted-foreground">Manage your account security and privacy settings</p>
      </div>

      {/* Account Security Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Account Security Status
          </CardTitle>
          <CardDescription>
            Your current security configuration and recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-green-100 p-2">
                  <Shield className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <div className="font-medium">Password Protection</div>
                  <div className="text-sm text-muted-foreground">Account secured with password</div>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`rounded-full p-2 ${profile?.two_factor_enabled ? 'bg-green-100' : 'bg-orange-100'}`}>
                  <Smartphone className={`h-4 w-4 ${profile?.two_factor_enabled ? 'text-green-600' : 'text-orange-600'}`} />
                </div>
                <div>
                  <div className="font-medium">Two-Factor Authentication</div>
                  <div className="text-sm text-muted-foreground">
                    {profile?.two_factor_enabled ? 'Extra security layer enabled' : 'Recommended for enhanced security'}
                  </div>
                </div>
              </div>
              <Badge className={profile?.two_factor_enabled ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>
                {profile?.two_factor_enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blue-100 p-2">
                  <Key className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium">Data Encryption</div>
                  <div className="text-sm text-muted-foreground">All data encrypted at rest and in transit</div>
                </div>
              </div>
              <Badge className="bg-blue-100 text-blue-800">Active</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Two-Factor Authentication (2FA)
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account using an authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!profile?.two_factor_enabled ? (
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    We strongly recommend enabling 2FA to protect your account and call data. 
                    This adds an extra security layer that requires both your password and a code from your phone.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Supported Authenticator Apps:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Google Authenticator</li>
                    <li>• Microsoft Authenticator</li>
                    <li>• Authy</li>
                    <li>• 1Password</li>
                  </ul>
                </div>

                <Button onClick={handle2FASetup} disabled={isLoading}>
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Setting up...
                    </div>
                  ) : (
                    <>
                      <Smartphone className="h-4 w-4 mr-2" />
                      Enable 2FA
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Two-factor authentication is enabled and protecting your account. 
                    You'll need your authenticator app to sign in.
                  </AlertDescription>
                </Alert>

                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-green-100 p-2">
                      <ShieldCheck className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-green-900 mb-1">2FA Active</h4>
                      <p className="text-sm text-green-800 mb-2">
                        Your account is secured with TOTP (Time-based One-Time Password) authentication.
                      </p>
                      <div className="text-xs text-green-700 space-y-1">
                        <div><strong>Authentication Method:</strong> TOTP (Time-based One-Time Password)</div>
                        {profile?.authenticator_app && (
                          <div><strong>Authenticator App:</strong> {profile.authenticator_app}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Security Benefits</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Protects against password-only attacks</li>
                    <li>• Prevents unauthorized access even if password is compromised</li>
                    <li>• Secures your call recordings and sensitive data</li>
                    <li>• Industry-standard security practice</li>
                  </ul>
                </div>
                
                <Button 
                  variant="destructive" 
                  onClick={() => setShowDisable2FA(true)}
                  disabled={isLoading}
                >
                  <ShieldOff className="h-4 w-4 mr-2" />
                  Disable 2FA
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Data Protection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Privacy & Data Protection
          </CardTitle>
          <CardDescription>
            Information about how your data is protected
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">End-to-End Encryption</h4>
                <p className="text-sm text-blue-800">
                  All call recordings, transcripts, and personal data are encrypted using AES-256 encryption 
                  before being stored. Only you can access your data.
                </p>
              </div>
              
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Secure Data Storage</h4>
                <p className="text-sm text-green-800">
                  Your data is stored in secure, SOC 2 compliant data centers with automatic backups 
                  and redundancy to ensure availability while maintaining security.
                </p>
              </div>
              
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <h4 className="font-medium text-purple-900 mb-2">Privacy Compliance</h4>
                <p className="text-sm text-purple-800">
                  We comply with GDPR, CCPA, and other privacy regulations. You have full control 
                  over your data and can request deletion at any time.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2FA Setup Modal */}
      <Dialog open={show2FASetup} onOpenChange={setShow2FASetup}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Follow these steps to secure your account with 2FA
            </DialogDescription>
          </DialogHeader>
          
          {step2FA === 'setup' ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Step 1: Choose Your Authenticator App</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select the authenticator app you want to use
                </p>
                
                <div className="space-y-2">
                  <Label htmlFor="auth-app">Authenticator App</Label>
                  <Select value={selectedAuthApp} onValueChange={setSelectedAuthApp}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose an authenticator app" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border shadow-lg z-50">
                      {authenticatorApps.map((app) => (
                        <SelectItem key={app.value} value={app.value} className="cursor-pointer hover:bg-muted">
                          <div className="flex flex-col">
                            <span className="font-medium">{app.label}</span>
                            <span className="text-xs text-muted-foreground">{app.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="text-center">
                <h3 className="font-medium mb-2">Step 2: Scan QR Code</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Use your {selectedAuthApp ? authenticatorApps.find(a => a.value === selectedAuthApp)?.label : 'authenticator app'} to scan this QR code
                </p>
                
                {qrCode && (
                  <div className="flex justify-center mb-4">
                    <img src={qrCode} alt="2FA QR Code" className="border rounded-lg" />
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <h3 className="font-medium mb-2">Step 3: Save Recovery Code</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Save this code in a secure location. You can use it to recover your account.
                </p>
                
                <div className="flex gap-2">
                  <Input
                    type={showSecret ? "text" : "password"}
                    value={secret}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSecret(!showSecret)}
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copySecret}
                    disabled={secretCopied}
                  >
                    {secretCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button 
                onClick={() => setStep2FA('verify')} 
                className="w-full"
                disabled={!selectedAuthApp}
              >
                Continue to Verification
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Step 3: Verify Setup</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Enter the 6-digit code from your authenticator app
                </p>
                
                <div className="space-y-2">
                  <Label htmlFor="verification-code">Verification Code</Label>
                  <Input
                    id="verification-code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                    className="text-center font-mono text-lg tracking-widest"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep2FA('setup')}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleVerify2FA}
                  disabled={isLoading || verificationCode.length !== 6}
                  className="flex-1"
                >
                  {isLoading ? "Verifying..." : "Verify & Enable"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Disable 2FA Modal */}
      <Dialog open={showDisable2FA} onOpenChange={setShowDisable2FA}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Are you sure you want to disable 2FA? This will make your account less secure.
            </DialogDescription>
          </DialogHeader>
          
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Disabling 2FA will remove the extra security layer from your account. 
              We strongly recommend keeping it enabled to protect your call data.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDisable2FA(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisable2FA}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? "Disabling..." : "Disable 2FA"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Security;