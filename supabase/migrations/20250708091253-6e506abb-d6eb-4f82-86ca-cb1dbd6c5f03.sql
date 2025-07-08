-- Add totp_secret field to profiles table for custom 2FA implementation
ALTER TABLE public.profiles 
ADD COLUMN totp_secret TEXT DEFAULT NULL;