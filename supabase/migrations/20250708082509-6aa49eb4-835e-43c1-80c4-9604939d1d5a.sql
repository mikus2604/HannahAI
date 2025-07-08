-- Create user preferences table for email notifications and recording settings
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  notification_frequency TEXT NOT NULL DEFAULT 'immediate' CHECK (notification_frequency IN ('immediate', 'daily', 'weekly', 'monthly', 'disabled')),
  recording_storage_duration TEXT NOT NULL DEFAULT '1_week' CHECK (recording_storage_duration IN ('disabled', '1_week', '1_month', '6_months')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for user preferences
CREATE POLICY "Users can view their own preferences" 
ON public.user_preferences 
FOR SELECT 
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create their own preferences" 
ON public.user_preferences 
FOR INSERT 
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own preferences" 
ON public.user_preferences 
FOR UPDATE 
USING (auth.uid()::text = user_id::text);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create email notifications log table
CREATE TABLE public.email_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('immediate', 'daily', 'weekly', 'monthly')),
  call_ids UUID[] NOT NULL DEFAULT '{}',
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  email_subject TEXT NOT NULL,
  email_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending'))
);

-- Enable RLS for email notifications
ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;

-- Create policy for email notifications
CREATE POLICY "Users can view their own email notifications" 
ON public.email_notifications 
FOR SELECT 
USING (auth.uid()::text = user_id::text);

-- Add recording deletion date to calls table
ALTER TABLE public.calls 
ADD COLUMN recording_expires_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient cleanup queries
CREATE INDEX idx_calls_recording_expires_at ON public.calls(recording_expires_at) WHERE recording_expires_at IS NOT NULL;