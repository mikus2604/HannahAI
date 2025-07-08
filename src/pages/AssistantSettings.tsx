import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Settings, Phone, MessageSquare, Calendar, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  assistantName: z.string().min(1, "Assistant name is required"),
  openingMessage: z.string().min(1, "Opening message is required"),
  services: z.object({
    takeContactInfo: z.boolean(),
    provideContactDetails: z.boolean(),
    sayMessage: z.boolean(),
    bookMeeting: z.boolean(),
  }),
});

type FormData = z.infer<typeof formSchema>;

const AssistantSettings = () => {
  const { toast } = useToast();
  
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
    },
  });

  const onSubmit = (data: FormData) => {
    console.log(data);
    toast({
      title: "Settings saved",
      description: "Your assistant settings have been updated successfully.",
    });
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


          <div className="flex justify-end">
            <Button type="submit" size="lg">
              Save Settings
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default AssistantSettings;