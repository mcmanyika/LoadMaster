-- Verify contact_us RLS policies are correct
-- Run this in Supabase SQL Editor to check policy status

-- Check if RLS is enabled
SELECT 
  relname as table_name,
  relrowsecurity as rls_enabled
FROM pg_class
WHERE relname = 'contact_us';

-- List all policies on contact_us table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'contact_us'
ORDER BY policyname;

-- Check specifically for anon insert policy
SELECT 
  policyname,
  roles,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'contact_us'
  AND cmd = 'INSERT'
  AND 'anon' = ANY(roles::text[]);

