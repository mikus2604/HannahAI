-- Add assistant services settings to profiles table
ALTER TABLE public.profiles
ADD COLUMN assistant_services JSONB DEFAULT '{
  "takeContactInfo": true,
  "provideContactDetails": false,
  "sayMessage": true,
  "bookMeeting": false
}'::jsonb;