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
      assistantName: "Hannah",
      openingMessage: "Hello! Thank you for calling. I'm Hannah, your AI assistant. How may I help you today?",
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

  const onSubmit = (data: FormData) => {
    console.log(data);
    toast({
      title: "Settings saved",
      description: "Your assistant settings have been updated successfully.",
    });
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
                Set up your assistant's identity and initial greeting
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