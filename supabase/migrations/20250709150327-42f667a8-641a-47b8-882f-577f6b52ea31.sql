-- Add assistant settings to profiles table
ALTER TABLE public.profiles
ADD COLUMN assistant_name TEXT DEFAULT 'Assistant',
ADD COLUMN opening_message TEXT DEFAULT 'Hello! Thank you for calling. How may I help you today?',
ADD COLUMN contact_phone TEXT,
ADD COLUMN contact_email TEXT,
ADD COLUMN website TEXT,
ADD COLUMN office_address TEXT;