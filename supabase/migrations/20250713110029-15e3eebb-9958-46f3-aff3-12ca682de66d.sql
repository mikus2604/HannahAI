-- Fix the handle_call_completion trigger to remove network dependency
CREATE OR REPLACE FUNCTION public.handle_call_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
    
    -- Log that a call completed for future notification processing
    -- Note: Email notifications will be handled by background tasks
    IF user_prefs.email_notifications = true AND NEW.user_id IS NOT NULL THEN
      INSERT INTO email_notifications (
        user_id,
        call_ids,
        notification_type,
        email_subject,
        email_content,
        status
      ) VALUES (
        NEW.user_id,
        ARRAY[NEW.id],
        'call_completed',
        'Call Completed',
        'A call has been completed and is ready for review.',
        'pending'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$