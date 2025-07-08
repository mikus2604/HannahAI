-- Clean up any existing MFA factors for debugging
DELETE FROM auth.mfa_factors 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email = 'ariel.mikulski@gmail.com'
);