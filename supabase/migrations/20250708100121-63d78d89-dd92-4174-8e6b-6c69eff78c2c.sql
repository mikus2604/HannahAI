-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('super_user', 'admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE (user_id, role)
);

-- Enable Row Level Security
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user roles
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS app_role[]
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT ARRAY_AGG(role)
  FROM public.user_roles
  WHERE user_id = _user_id
$$;

-- RLS Policies for user_roles table
CREATE POLICY "Super users can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_user'));

-- Policy for users to view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create admin analytics function (since views can't have RLS)
CREATE OR REPLACE FUNCTION public.get_admin_analytics()
RETURNS TABLE (
  total_users BIGINT,
  free_users BIGINT,
  premium_users BIGINT,
  premium_plus_users BIGINT,
  enterprise_users BIGINT,
  subscribed_users BIGINT,
  users_with_calls BIGINT,
  total_calls BIGINT,
  total_call_duration_seconds BIGINT,
  active_users_30d BIGINT,
  active_users_7d BIGINT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    COUNT(DISTINCT p.user_id) as total_users,
    COUNT(DISTINCT CASE WHEN p.plan_type = 'free' THEN p.user_id END) as free_users,
    COUNT(DISTINCT CASE WHEN p.plan_type = 'premium' THEN p.user_id END) as premium_users,
    COUNT(DISTINCT CASE WHEN p.plan_type = 'premium_plus' THEN p.user_id END) as premium_plus_users,
    COUNT(DISTINCT CASE WHEN p.plan_type = 'enterprise' THEN p.user_id END) as enterprise_users,
    COUNT(DISTINCT s.user_id) as subscribed_users,
    COUNT(DISTINCT c.user_id) as users_with_calls,
    COUNT(*) as total_calls,
    COALESCE(SUM(c.call_duration), 0) as total_call_duration_seconds,
    COUNT(DISTINCT CASE WHEN c.created_at >= NOW() - INTERVAL '30 days' THEN c.user_id END) as active_users_30d,
    COUNT(DISTINCT CASE WHEN c.created_at >= NOW() - INTERVAL '7 days' THEN c.user_id END) as active_users_7d
  FROM profiles p
  LEFT JOIN subscribers s ON p.user_id = s.user_id AND s.subscribed = true
  LEFT JOIN calls c ON p.user_id = c.user_id;
$$;