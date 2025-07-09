-- Create admin function to update user profiles (bypasses RLS)
CREATE OR REPLACE FUNCTION admin_update_user_profile(
  target_user_id UUID,
  new_plan_type TEXT,
  new_plan_expires_at TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles 
  SET 
    plan_type = new_plan_type,
    plan_expires_at = new_plan_expires_at,
    updated_at = NOW()
  WHERE user_id = target_user_id;
  
  RETURN FOUND;
END;
$$;