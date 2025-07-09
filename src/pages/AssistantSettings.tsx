import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Settings, Phone, MessageSquare, Calendar, Users, Mail, Clock, Shield, X, Crown, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlanEnforcement } from "@/hooks/usePlanEnforcement";
import { supabase } from "@/integrations/supabase/client";
import UsageOverview from "@/components/UsageOverview";

const formSchema = z.object({
  assistantName: z.string().min(1, "Assistant name is required"),
  openingMessage: z.string().min(1, "Opening message is required"),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  officeAddress: z.string().optional(),
  services: z.object({
    takeContactInfo: z.boolean(),
    provideContactDetails: z.boolean(),
    sayMessage: z.boolean(),
    bookMeeting: z.boolean(),
  }),
  notifications: z.object({
    emailEnabled: z.boolean(),
    frequency: z.enum(["immediate", "daily", "weekly", "monthly", "disabled"]),
  }),
  recording: z.object({
    storageDuration: z.enum(["disabled", "1_week", "1_month", "6_months"]),
  }),
});

type FormData = z.infer<typeof formSchema>;

interface GreetingMessage {
  id: string;
  title: string;
  message: string;
  is_active: boolean;
}

const AssistantSettings = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { planLimits, showUpgradePrompt, usage } = usePlanEnforcement();
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [pendingRecordingValue, setPendingRecordingValue] = useState<string>("");
  const [greetingMessages, setGreetingMessages] = useState<GreetingMessage[]>([]);
  const [showGreetingForm, setShowGreetingForm] = useState(false);
  const [newGreeting, setNewGreeting] = useState({ title: "", message: "" });
  const [loadingGreetings, setLoadingGreetings] = useState(true);
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      assistantName: "Assistant",
      openingMessage: "Hello! Thank you for calling. How may I help you today?",
      contactPhone: "",
      contactEmail: "",
      website: "",
      officeAddress: "",
      services: {
        takeContactInfo: true,
        provideContactDetails: false,
        sayMessage: true,
        bookMeeting: false,
      },
      notifications: {
        emailEnabled: true,
        frequency: "immediate",
      },
      recording: {
        storageDuration: "1_week",
      },
    },
  });

  // Load user's assistant settings
  useEffect(() => {
    if (!user) return;

    const loadAssistantSettings = async () => {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('assistant_name, opening_message, contact_phone, contact_email, website, office_address, assistant_services')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        if (profile) {
          form.setValue('assistantName', profile.assistant_name || 'Assistant');
          form.setValue('openingMessage', profile.opening_message || 'Hello! Thank you for calling. How may I help you today?');
          form.setValue('contactPhone', profile.contact_phone || '');
          form.setValue('contactEmail', profile.contact_email || '');
          form.setValue('website', profile.website || '');
          form.setValue('officeAddress', profile.office_address || '');
          
          // Load assistant services
          if (profile.assistant_services && typeof profile.assistant_services === 'object') {
            const services = profile.assistant_services as any;
            form.setValue('services.takeContactInfo', services.takeContactInfo ?? true);
            form.setValue('services.provideContactDetails', services.provideContactDetails ?? false);
            form.setValue('services.sayMessage', services.sayMessage ?? true);
            form.setValue('services.bookMeeting', services.bookMeeting ?? false);
          }
        }
      } catch (error) {
        console.error('Error loading assistant settings:', error);
      }
    };

    loadAssistantSettings();
  }, [user, form]);

  const onSubmit = async (data: FormData) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          assistant_name: data.assistantName,
          opening_message: data.openingMessage,
          contact_phone: data.contactPhone || null,
          contact_email: data.contactEmail || null,
          website: data.website || null,
          office_address: data.officeAddress || null,
          assistant_services: {
            takeContactInfo: data.services.takeContactInfo,
            provideContactDetails: data.services.provideContactDetails,
            sayMessage: data.services.sayMessage,
            bookMeeting: data.services.bookMeeting,
          },
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Your assistant settings have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error saving settings",
        description: "Failed to save your assistant settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRecordingChange = (value: string) => {
    // Check if the selected option requires premium plan
    if (value === "1_month" || value === "6_months") {
      setPendingRecordingValue(value);
      setShowPremiumModal(true);
    } else {
      form.setValue("recording.storageDuration", value as any);
    }
  };

  const handlePremiumModalClose = () => {
    setShowPremiumModal(false);
    setPendingRecordingValue("");
    // Revert to 1 week free option
    form.setValue("recording.storageDuration", "1_week");
  };

  const handleUpgradeToPremium = () => {
    // In a real app, this would redirect to payment/upgrade page
    toast({
      title: "Premium Plan Required",
      description: "Redirecting to upgrade page...",
      variant: "default",
    });
    setShowPremiumModal(false);
    setPendingRecordingValue("");
  };


  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Assistant Settings</h1>
        <p className="text-muted-foreground">Configure your AI receptionist behavior and responses</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Set up your assistant's identity, initial greeting, and contact information that can be disclosed to callers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="assistantName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assistant Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter assistant name (e.g., Hannah, Acme Corp Assistant)" {...field} />
                    </FormControl>
                    <FormDescription>
                      This can be a personal name or your company name
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="openingMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opening Message</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter the message your assistant will say when answering calls"
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      This is the first thing callers will hear when your assistant answers
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium text-sm text-muted-foreground">Contact Information (optional - can be disclosed to callers)</h4>
                
                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., +1 (555) 123-4567" {...field} />
                      </FormControl>
                      <FormDescription>
                        Phone number that can be shared with callers
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email Address</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., contact@yourcompany.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        Email address that can be shared with callers
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website URL</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., https://www.yourcompany.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        Website URL that can be shared with callers
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="officeAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Office Address</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="e.g., 123 Main St, Suite 100, City, State 12345"
                          className="min-h-[80px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Physical address that can be shared with callers
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Assistant Services
              </CardTitle>
              <CardDescription>
                Choose what services your AI assistant can provide to callers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="services.takeContactInfo"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Take name and contact number for callback
                      </FormLabel>
                      <FormDescription>
                        Collect caller information for follow-up
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="services.provideContactDetails"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Provide callers with contact details
                      </FormLabel>
                      <FormDescription>
                        Share your business contact information
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="services.sayMessage"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Say a message to the caller
                      </FormLabel>
                      <FormDescription>
                        Deliver custom messages or announcements
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="services.bookMeeting"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Book a meeting
                      </FormLabel>
                      <FormDescription>
                        Schedule appointments through Cal.com integration
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Notifications
              </CardTitle>
              <CardDescription>
                Configure when you receive email notifications about calls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="notifications.emailEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Enable email notifications</FormLabel>
                      <FormDescription>
                        Receive email notifications about incoming calls
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notifications.frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notification Frequency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="immediate">Immediate (after each call)</SelectItem>
                        <SelectItem value="daily">Daily digest</SelectItem>
                        <SelectItem value="weekly">Weekly digest</SelectItem>
                        <SelectItem value="monthly">Monthly digest</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose how often you want to receive call notifications
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Call Recording Storage
              </CardTitle>
              <CardDescription>
                Manage how long call recordings are stored
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="recording.storageDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Storage Duration</FormLabel>
                    <Select onValueChange={handleRecordingChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select storage duration" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="disabled">No recording</SelectItem>
                        <SelectItem value="1_week">1 week (Free)</SelectItem>
                        <SelectItem value="1_month">1 month (Premium Plan required)</SelectItem>
                        <SelectItem value="6_months">6 months (Premium Plan required)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      <div className="space-y-1">
                        <p>Choose how long call recordings are kept before automatic deletion.</p>
                        <p className="text-xs text-muted-foreground">
                          • 1 week storage is included with your plan<br/>
                          • 1 month and 6 months storage require a Premium Plan<br/>
                          • Recordings are automatically deleted after the selected period
                        </p>
                      </div>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Usage Overview */}
          <UsageOverview />

          <div className="flex justify-end">
            <Button type="submit" size="lg">
              Save Settings
            </Button>
          </div>
        </form>
      </Form>

      {/* Premium Plan Modal */}
      <Dialog open={showPremiumModal} onOpenChange={setShowPremiumModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader className="relative">
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-600" />
              Premium Plan Required
            </DialogTitle>
            <DialogDescription>
              Extended recording storage requires a Premium Plan subscription.
            </DialogDescription>
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-6 w-6 p-0"
              onClick={handlePremiumModalClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <Crown className="h-6 w-6 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-900">
                    {pendingRecordingValue === "1_month" ? "1 Month" : "6 Months"} Storage Plan
                  </h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    {pendingRecordingValue === "1_month" 
                      ? "Store call recordings for 30 days with automatic cleanup after expiration."
                      : "Store call recordings for 6 months with automatic cleanup after expiration."
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">Current Plan</div>
                  <div className="text-sm text-muted-foreground">1 Week Storage (Free)</div>
                </div>
                <div className="text-green-600 font-medium">Active</div>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50">
                <div>
                  <div className="font-medium">Premium Plan</div>
                  <div className="text-sm text-muted-foreground">
                    {pendingRecordingValue === "1_month" ? "1 Month" : "6 Months"} Storage + More Features
                  </div>
                </div>
                <div className="text-yellow-600 font-medium">$19/month</div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handlePremiumModalClose}
              className="flex-1"
            >
              Stay on Free Plan
            </Button>
            <Button 
              onClick={handleUpgradeToPremium}
              className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Premium
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssistantSettings;