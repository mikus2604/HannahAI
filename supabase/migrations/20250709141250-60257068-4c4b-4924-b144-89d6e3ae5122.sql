-- Create a phone_assignments table to map phone numbers to users
CREATE TABLE IF NOT EXISTS public.phone_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  phone_number TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.phone_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own phone assignments" 
ON public.phone_assignments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own phone assignments" 
ON public.phone_assignments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own phone assignments" 
ON public.phone_assignments 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Super users can manage all phone assignments
CREATE POLICY "Super users can manage all phone assignments" 
ON public.phone_assignments 
FOR ALL 
USING (has_role(auth.uid(), 'super_user'::app_role));

-- Assign the phone number to ariel.mikulski@gmail.com
INSERT INTO public.phone_assignments (user_id, phone_number) 
VALUES ('f7b1b8bf-7c26-4008-8747-b5b3dd23e4c1', '+441917433210')
ON CONFLICT (phone_number) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  is_active = true,
  updated_at = now();

-- Create trigger for timestamps
CREATE TRIGGER update_phone_assignments_updated_at
BEFORE UPDATE ON public.phone_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();