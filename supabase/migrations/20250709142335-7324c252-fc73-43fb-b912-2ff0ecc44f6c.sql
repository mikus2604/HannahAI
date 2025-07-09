-- Create system_prompts table for customizable backend prompts
CREATE TABLE public.system_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.system_prompts ENABLE ROW LEVEL SECURITY;

-- Create policies for system prompts
CREATE POLICY "Users can manage their own system prompts" 
ON public.system_prompts 
FOR ALL 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_system_prompts_updated_at
BEFORE UPDATE ON public.system_prompts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();