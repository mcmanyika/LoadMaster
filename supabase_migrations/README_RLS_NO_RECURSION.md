# ⚠️ IMPORTANT: RLS Policies - No Recursion Rule

## Critical Fix Applied

The file `FIX_profiles_rls_no_recursion.sql` contains the **definitive fix** for infinite recursion in profiles RLS policies.

## ⚠️ DO NOT OVERWRITE THIS FIX

### The Problem:
When an RLS policy on the `profiles` table queries the `profiles` table itself, it causes infinite recursion:
```sql
-- ❌ NEVER DO THIS - Causes infinite recursion
CREATE POLICY "bad policy"
  ON profiles FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()  -- ❌ Recursion!
    )
  );
```

### The Solution:
1. **For SELECT policies**: Use `SECURITY DEFINER` functions that bypass RLS
2. **For INSERT/UPDATE policies**: Query `companies` table directly, NOT `profiles` table

### ✅ Correct Patterns:

#### SELECT Policy (Use SECURITY DEFINER function):
```sql
-- ✅ CORRECT: Use SECURITY DEFINER function
CREATE OR REPLACE FUNCTION can_view_profile(...)
RETURNS BOOLEAN AS $$
  -- Function can query profiles safely (bypasses RLS)
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Users can view profiles from their company"
  ON profiles FOR SELECT
  USING (can_view_profile(id, company_id));
```

#### INSERT/UPDATE Policies (Query companies directly):
```sql
-- ✅ CORRECT: Query companies table, not profiles
CREATE POLICY "Users can update profiles from their company"
  ON profiles FOR UPDATE
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()  -- ✅ No recursion!
    )
  );
```

## Files That Should NOT Be Modified:

- ✅ `FIX_profiles_rls_no_recursion.sql` - This is the definitive fix
- ❌ Do NOT create new policies that query `profiles` within `profiles` policies
- ❌ Do NOT modify existing policies to add `profiles` subqueries

## Before Creating New RLS Policies:

1. **Check if it queries `profiles` table**: If yes, use `SECURITY DEFINER` function or query `companies` instead
2. **Test for recursion**: If you see "infinite recursion detected", you're querying `profiles` within a `profiles` policy
3. **Use the patterns above**: Follow the correct patterns shown in `FIX_profiles_rls_no_recursion.sql`

## Current Working Policies:

- **SELECT**: Uses `can_view_profile()` SECURITY DEFINER function
- **INSERT**: Queries `companies` table directly
- **UPDATE**: Queries `companies` table directly

## Last Updated:
2025-12-06 - Applied `FIX_profiles_rls_no_recursion.sql`

