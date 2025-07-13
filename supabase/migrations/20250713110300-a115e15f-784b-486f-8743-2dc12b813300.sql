-- Fix email notifications constraint to include existing types
ALTER TABLE email_notifications DROP CONSTRAINT IF EXISTS email_notifications_notification_type_check;

-- Add proper constraint that allows existing and new types
ALTER TABLE email_notifications 
ADD CONSTRAINT email_notifications_notification_type_check 
CHECK (notification_type IN ('immediate', 'call_completed', 'daily_digest', 'weekly_digest', 'monthly_digest'));

-- Set all calls to completed status
UPDATE calls 
SET call_status = 'completed',
    ended_at = COALESCE(ended_at, started_at + INTERVAL '1 minute'),
    call_duration = COALESCE(call_duration, 60),
    updated_at = NOW()
WHERE call_status != 'completed';

-- Update the cleanup function to run automatically in the call status webhook
CREATE OR REPLACE FUNCTION public.cleanup_stale_calls()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE calls 
  SET call_status = 'completed', 
      ended_at = COALESCE(ended_at, started_at + INTERVAL '60 seconds'),
      call_duration = COALESCE(call_duration, 60),
      updated_at = NOW()
  WHERE call_status = 'in-progress' 
    AND created_at < NOW() - INTERVAL '10 minutes';
END;
$function$;