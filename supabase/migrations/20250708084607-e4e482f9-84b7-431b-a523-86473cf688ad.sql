-- Create usage tracking table for plan enforcement
CREATE TABLE public.user_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL, -- Format: YYYY-MM
  calls_count INTEGER NOT NULL DEFAULT 0,
  greeting_messages_count INTEGER NOT NULL DEFAULT 0,
  api_requests_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, month_year)
);

-- Enable RLS
ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;

-- Create policies for user_usage
CREATE POLICY "Users can view their own usage" 
ON public.user_usage 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage" 
ON public.user_usage 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage" 
ON public.user_usage 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_user_usage_updated_at
BEFORE UPDATE ON public.user_usage
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create greeting messages table
CREATE TABLE public.greeting_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.greeting_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for greeting_messages
CREATE POLICY "Users can manage their own greeting messages" 
ON public.greeting_messages 
FOR ALL 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_greeting_messages_updated_at
BEFORE UPDATE ON public.greeting_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create security definer functions to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_plan_type(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  plan_type TEXT;
  plan_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT p.plan_type, p.plan_expires_at
  INTO plan_type, plan_expires_at
  FROM public.profiles p
  WHERE p.user_id = user_uuid;
  
  -- Check if premium plan has expired
  IF plan_type = 'premium' AND plan_expires_at IS NOT NULL AND plan_expires_at < NOW() THEN
    -- Update to free plan if expired
    UPDATE public.profiles 
    SET plan_type = 'free', plan_expires_at = NULL 
    WHERE user_id = user_uuid;
    RETURN 'free';
  END IF;
  
  RETURN COALESCE(plan_type, 'free');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user can make a call (respects monthly limits)
CREATE OR REPLACE FUNCTION public.can_user_make_call(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_plan TEXT;
  current_month TEXT;
  calls_this_month INTEGER;
BEGIN
  -- Get user plan
  user_plan := public.get_user_plan_type(user_uuid);
  
  -- Premium users have unlimited calls
  IF user_plan = 'premium' THEN
    RETURN TRUE;
  END IF;
  
  -- Get current month in YYYY-MM format
  current_month := TO_CHAR(NOW(), 'YYYY-MM');
  
  -- Get calls count for current month
  SELECT COALESCE(calls_count, 0)
  INTO calls_this_month
  FROM public.user_usage
  WHERE user_id = user_uuid AND month_year = current_month;
  
  -- Free plan limit is 100 calls per month
  RETURN calls_this_month < 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to increment user call count
CREATE OR REPLACE FUNCTION public.increment_user_calls(user_uuid UUID)
RETURNS VOID AS $$
DECLARE
  current_month TEXT;
BEGIN
  current_month := TO_CHAR(NOW(), 'YYYY-MM');
  
  INSERT INTO public.user_usage (user_id, month_year, calls_count)
  VALUES (user_uuid, current_month, 1)
  ON CONFLICT (user_id, month_year)
  DO UPDATE SET 
    calls_count = user_usage.calls_count + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check greeting message limit
CREATE OR REPLACE FUNCTION public.can_user_add_greeting(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_plan TEXT;
  greeting_count INTEGER;
BEGIN
  user_plan := public.get_user_plan_type(user_uuid);
  
  -- Premium users have unlimited greetings
  IF user_plan = 'premium' THEN
    RETURN TRUE;
  END IF;
  
  -- Count existing greeting messages
  SELECT COUNT(*)
  INTO greeting_count
  FROM public.greeting_messages
  WHERE user_id = user_uuid;
  
  -- Free plan limit is 1 greeting message
  RETURN greeting_count < 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Add plan-based constraints to calls table
CREATE OR REPLACE FUNCTION public.check_call_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check for new calls
  IF TG_OP = 'INSERT' THEN
    -- Check if user can make a call
    IF NOT public.can_user_make_call(NEW.user_id) THEN
      RAISE EXCEPTION 'Monthly call limit exceeded. Upgrade to Premium for unlimited calls.'
        USING ERRCODE = 'check_violation';
    END IF;
    
    -- Increment call count
    PERFORM public.increment_user_calls(NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to enforce call limits
CREATE TRIGGER enforce_call_limits
  BEFORE INSERT ON public.calls
  FOR EACH ROW
  EXECUTE FUNCTION public.check_call_limit();

-- Add constraint to greeting messages
CREATE OR REPLACE FUNCTION public.check_greeting_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT public.can_user_add_greeting(NEW.user_id) THEN
      RAISE EXCEPTION 'Greeting message limit exceeded. Upgrade to Premium for unlimited custom greetings.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to enforce greeting limits
CREATE TRIGGER enforce_greeting_limits
  BEFORE INSERT ON public.greeting_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.check_greeting_limit();