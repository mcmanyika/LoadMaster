-- Quick test queries to check Supabase connection and RLS
-- Run this in Supabase SQL Editor to diagnose the issue

-- Test 1: Check if we can query profiles
SELECT id, email, role, company_id 
FROM profiles 
LIMIT 5;

-- Test 2: Check if we can query companies
SELECT id, name, owner_id 
FROM companies 
LIMIT 5;

-- Test 3: Check if can_view_company_by_association function works
-- Replace 'YOUR_USER_ID' with an actual user ID from profiles table
SELECT can_view_company_by_association('YOUR_COMPANY_ID'::uuid);

-- Test 4: Check dispatcher_company_associations
SELECT id, dispatcher_id, company_id, status, invite_code
FROM dispatcher_company_associations
LIMIT 5;

-- Test 5: Check function search_path setting
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'can_view_company_by_association',
    'can_view_profile',
    'validate_dispatcher_company_association'
  );

