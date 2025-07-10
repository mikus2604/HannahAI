-- Create api_keys table to store API keys securely
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  key_name TEXT NOT NULL,
  key_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, key_name)
);

-- Enable Row Level Security
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Create policies for API keys
CREATE POLICY "Users can view their own API keys" 
ON public.api_keys 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own API keys" 
ON public.api_keys 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys" 
ON public.api_keys 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys" 
ON public.api_keys 
FOR DELETE 
USING (auth.uid() = user_id);

-- Super users can manage all API keys
CREATE POLICY "Super users can manage all API keys" 
ON public.api_keys 
FOR ALL 
USING (has_role(auth.uid(), 'super_user'::app_role));

-- Create function to update timestamps
CREATE TRIGGER update_api_keys_updated_at
BEFORE UPDATE ON public.api_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();