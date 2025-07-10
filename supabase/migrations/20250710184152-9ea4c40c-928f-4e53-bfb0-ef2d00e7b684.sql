-- Create a function to handle call completion notifications
CREATE OR REPLACE FUNCTION public.handle_call_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_prefs record;
BEGIN
  -- Only process when call status changes to 'completed'
  IF NEW.call_status = 'completed' AND (OLD.call_status IS NULL OR OLD.call_status != 'completed') THEN
    
    -- Get user preferences to check if notifications are enabled
    SELECT notification_email, email_notifications, notification_frequency
    INTO user_prefs
    FROM public.user_preferences
    WHERE user_id = NEW.user_id;
    
    -- Only send notification if user has email notifications enabled
    IF user_prefs.email_notifications = true THEN
      -- For immediate notifications, trigger the notification function
      IF user_prefs.notification_frequency = 'immediate' THEN
        -- Use pg_net to call the edge function asynchronously
        PERFORM net.http_post(
          url := 'https://idupowkqzcwrjslcixsp.supabase.co/functions/v1/send-call-notification',
          headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
          body := json_build_object(
            'callId', NEW.id,
            'userId', NEW.user_id
          )::jsonb
        );
      END IF;
      -- Note: For digest notifications (daily/weekly/monthly), we'll use cron jobs
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically send notifications when calls are completed
CREATE TRIGGER on_call_completed
  AFTER UPDATE ON public.calls
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_call_completion();