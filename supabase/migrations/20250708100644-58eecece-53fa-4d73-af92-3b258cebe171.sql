-- Grant super user privileges to ariel.mikulski@gmail.com
-- This is a one-time setup for the initial super user

INSERT INTO public.user_roles (user_id, role, created_by) 
SELECT 
    id as user_id,
    'super_user'::app_role as role,
    id as created_by
FROM auth.users 
WHERE email = 'ariel.mikulski@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;