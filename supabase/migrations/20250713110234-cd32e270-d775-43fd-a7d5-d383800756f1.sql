-- Fix email notifications constraint to allow call_completed type
ALTER TABLE email_notifications DROP CONSTRAINT IF EXISTS email_notifications_notification_type_check;

-- Add proper constraint that allows call_completed
ALTER TABLE email_notifications 
ADD CONSTRAINT email_notifications_notification_type_check 
CHECK (notification_type IN ('call_completed', 'daily_digest', 'weekly_digest', 'monthly_digest'));

-- Set all calls to completed status
UPDATE calls 
SET call_status = 'completed',
    ended_at = COALESCE(ended_at, started_at + INTERVAL '1 minute'),
    call_duration = COALESCE(call_duration, 60),
    updated_at = NOW()
WHERE call_status != 'completed';