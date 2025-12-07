-- ⚠️ SAFE MIGRATION TEMPLATE
-- ⚠️ This migration does NOT delete any data
-- 
-- Migration Name: [DESCRIPTION]
-- Date: [DATE]
-- Purpose: [WHAT THIS MIGRATION DOES]
--
-- SAFETY CHECKLIST:
-- ✅ No DELETE FROM statements
-- ✅ No TRUNCATE statements  
-- ✅ No DROP TABLE statements (except IF EXISTS for temp tables)
-- ✅ No DROP COLUMN statements
-- ✅ All DROP operations use IF EXISTS
-- ✅ Only adds/modifies structures (columns, indexes, policies)
-- ✅ Only updates data when necessary (and reversible)
--
-- See README_SAFE_MIGRATIONS.md for guidelines

-- =====================================================
-- YOUR MIGRATION CODE HERE
-- =====================================================

-- Example: Add a new column (safe)
-- ALTER TABLE table_name 
-- ADD COLUMN IF NOT EXISTS new_column TYPE;

-- Example: Create an index (safe)
-- CREATE INDEX IF NOT EXISTS idx_name ON table_name(column);

-- Example: Update a policy (safe - no data loss)
-- DROP POLICY IF EXISTS "old_policy" ON table_name;
-- CREATE POLICY "new_policy" ON table_name ...;

-- Example: Update data (safe if reversible)
-- UPDATE table_name SET column = value WHERE condition;

-- ⚠️ NEVER include:
-- DELETE FROM table_name;
-- TRUNCATE table_name;
-- DROP TABLE table_name;
-- DROP COLUMN column_name;

