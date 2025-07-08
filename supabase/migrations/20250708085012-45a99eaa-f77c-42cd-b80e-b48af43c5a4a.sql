-- Remove the existing unverified 2FA factor that's causing conflicts
DELETE FROM auth.mfa_factors 
WHERE user_id = 'f7b1b8bf-7c26-4008-8747-b5b3dd23e4c1' 
AND id = '45bbd53b-a145-40f3-a5f1-58419e401d03';