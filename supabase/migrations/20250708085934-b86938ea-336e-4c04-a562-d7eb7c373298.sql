-- Add authenticator_app field to profiles table to store the selected authenticator app
ALTER TABLE public.profiles 
ADD COLUMN authenticator_app TEXT DEFAULT NULL;