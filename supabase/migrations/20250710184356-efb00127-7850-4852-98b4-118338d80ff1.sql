-- Update the function to use the correct service role key from environment
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
    
    -- Only send notification if user has email notifications enabled and user_id is not null
    IF user_prefs.email_notifications = true AND NEW.user_id IS NOT NULL THEN
      -- For immediate notifications, trigger the notification function
      IF user_prefs.notification_frequency = 'immediate' THEN
        -- Use pg_net to call the edge function asynchronously
        -- Note: The function will use the service role key from its environment
        PERFORM net.http_post(
          url := 'https://idupowkqzcwrjslcixsp.supabase.co/functions/v1/send-call-notification',
          headers := '{"Content-Type": "application/json"}'::jsonb,
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