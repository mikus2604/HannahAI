-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  phone_number TEXT,
  plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'premium')),
  plan_expires_at TIMESTAMP WITH TIME ZONE,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update user_preferences to link to profiles
ALTER TABLE public.user_preferences 
ADD CONSTRAINT user_preferences_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update calls table to include user association for multi-tenant support
ALTER TABLE public.calls 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update RLS policies for calls to be user-specific
DROP POLICY IF EXISTS "Allow public access to calls" ON public.calls;

CREATE POLICY "Users can view their own calls" 
ON public.calls 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calls" 
ON public.calls 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calls" 
ON public.calls 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Update call_sessions RLS
DROP POLICY IF EXISTS "Allow public access to call_sessions" ON public.call_sessions;

CREATE POLICY "Users can access their own call sessions" 
ON public.call_sessions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.calls 
    WHERE calls.id = call_sessions.call_id 
    AND calls.user_id = auth.uid()
  )
);

-- Update transcripts RLS  
DROP POLICY IF EXISTS "Allow public access to transcripts" ON public.transcripts;

CREATE POLICY "Users can access their own transcripts" 
ON public.transcripts 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.calls 
    WHERE calls.id = transcripts.call_id 
    AND calls.user_id = auth.uid()
  )
);