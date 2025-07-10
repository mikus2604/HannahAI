-- Add notification email field to user_preferences table
ALTER TABLE public.user_preferences 
ADD COLUMN notification_email TEXT;

-- Update the existing user preferences to use their contact email if available
UPDATE public.user_preferences 
SET notification_email = (
  SELECT contact_email 
  FROM public.profiles 
  WHERE profiles.user_id = user_preferences.user_id 
  AND profiles.contact_email IS NOT NULL
)
WHERE notification_email IS NULL;