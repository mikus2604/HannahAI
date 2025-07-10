import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Copy, ExternalLink } from "lucide-react";

interface ApiKeySetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiType: 'openai' | 'twilio' | 'stripe' | null;
}

export const ApiKeySetupModal = ({ isOpen, onClose, apiType }: ApiKeySetupModalProps) => {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [loading, setLoading] = useState(false);

  const apiConfigs = {
    openai: {
      title: "Setup OpenAI API Key",
      description: "Enter your OpenAI API key to enable AI-powered features",
      docsUrl: "https://platform.openai.com/api-keys",
      fields: [
        { key: "OPENAI_API_KEY", label: "API Key", value: apiKey, setter: setApiKey, placeholder: "sk-..." }
      ]
    },
    twilio: {
      title: "Setup Twilio Credentials",
      description: "Enter your Twilio Account SID and Auth Token for voice/SMS features",
      docsUrl: "https://console.twilio.com/project/api-keys",
      fields: [
        { key: "TWILIO_ACCOUNT_SID", label: "Account SID", value: accountSid, setter: setAccountSid, placeholder: "AC..." },
        { key: "TWILIO_AUTH_TOKEN", label: "Auth Token", value: authToken, setter: setAuthToken, placeholder: "Your auth token" }
      ]
    },
    stripe: {
      title: "Setup Stripe API Key",
      description: "Enter your Stripe secret key for payment processing",
      docsUrl: "https://dashboard.stripe.com/apikeys",
      fields: [
        { key: "STRIPE_SECRET_KEY", label: "Secret Key", value: apiKey, setter: setApiKey, placeholder: "sk_..." }
      ]
    }
  };

  const currentConfig = apiType ? apiConfigs[apiType] : null;

  const handleSubmit = async () => {
    if (!currentConfig || !apiType) return;

    setLoading(true);
    try {
      // For now, we'll show instructions to manually add to Supabase
      // In a real implementation, you'd need a secure way to update secrets
      toast({
        title: "API Key Configuration",
        description: "Please add these secrets manually in the Supabase dashboard for security.",
      });
      
      // Copy the configuration to clipboard
      const configText = currentConfig.fields.map(field => 
        `${field.key}=${field.value}`
      ).join('\n');
      
      await navigator.clipboard.writeText(configText);
      toast({
        title: "Copied to Clipboard",
        description: "API key configuration copied. Add these to Supabase secrets.",
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process API key configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDocs = () => {
    if (currentConfig) {
      window.open(currentConfig.docsUrl, '_blank');
    }
  };

  const handleOpenSupabase = () => {
    window.open('https://supabase.com/dashboard/project/6250130c-ddd3-4b20-9034-aa32fa6ee0be/settings/functions', '_blank');
  };

  const resetForm = () => {
    setApiKey("");
    setAccountSid("");
    setAuthToken("");
  };

  if (!currentConfig) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
        resetForm();
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{currentConfig.title}</DialogTitle>
          <DialogDescription>
            {currentConfig.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {currentConfig.fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key}>{field.label}</Label>
              <Input
                id={field.key}
                type="password"
                placeholder={field.placeholder}
                value={field.value}
                onChange={(e) => field.setter(e.target.value)}
              />
            </div>
          ))}
          
          <div className="flex flex-col gap-2 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={loading || currentConfig.fields.some(field => !field.value)}
              className="w-full"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Configuration
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleOpenDocs}
                className="flex-1"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Get API Keys
              </Button>
              
              <Button
                variant="outline"
                onClick={handleOpenSupabase}
                className="flex-1"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Supabase Secrets
              </Button>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground p-3 bg-muted rounded">
            <p className="font-medium mb-1">Security Note:</p>
            <p>For security, API keys must be added manually to Supabase secrets. This tool helps you format and copy the configuration.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};