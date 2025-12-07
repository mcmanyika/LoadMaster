-- Create missing profile for user who exists in auth.users but not in profiles
-- Replace the user_id and email below with your actual values

-- First, check what data we have in auth.users
-- Run this to see your user data:
-- SELECT id, email, raw_user_meta_data FROM auth.users WHERE id = '47c2b433-595b-4608-8afd-f56941a05c9f';

-- Create profile for the owner
-- Replace 'Your Name' with your actual name, or it will use email prefix
INSERT INTO profiles (id, email, name, role, company_id)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', SPLIT_PART(au.email, '@', 1)) as name,
  COALESCE(au.raw_user_meta_data->>'role', 'owner')::text as role,
  c.id as company_id
FROM auth.users au
LEFT JOIN companies c ON c.owner_id = au.id
WHERE au.id = '47c2b433-595b-4608-8afd-f56941a05c9f'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = au.id
  )
RETURNING *;

-- If the above doesn't work (maybe company doesn't exist yet), use this simpler version:
-- INSERT INTO profiles (id, email, name, role)
-- SELECT 
--   id,
--   email,
--   COALESCE(raw_user_meta_data->>'name', SPLIT_PART(email, '@', 1)),
--   COALESCE(raw_user_meta_data->>'role', 'owner')::text
-- FROM auth.users
-- WHERE id = '47c2b433-595b-4608-8afd-f56941a05c9f'::uuid
--   AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.users.id);

-- After creating the profile, link it to the company:
UPDATE profiles
SET company_id = (
  SELECT id FROM companies WHERE owner_id = '47c2b433-595b-4608-8afd-f56941a05c9f'::uuid LIMIT 1
)
WHERE id = '47c2b433-595b-4608-8afd-f56941a05c9f'::uuid
  AND company_id IS NULL;

