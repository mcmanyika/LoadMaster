# ⚠️ CRITICAL: Safe Migration Guidelines

## 🚫 NEVER DELETE DATA

**All migration scripts must follow these rules:**

### ❌ FORBIDDEN Operations:
- `DELETE FROM table_name` - Never delete rows
- `TRUNCATE table_name` - Never truncate tables
- `DROP TABLE table_name` - Never drop tables (use `DROP TABLE IF EXISTS` only for temporary/test tables)
- `DROP COLUMN` - Never drop columns (data loss!)
- `UPDATE ... SET column = NULL` on required fields - Never nullify required data

### ✅ SAFE Operations:
- `DROP POLICY IF EXISTS` - Safe, only removes policies
- `DROP INDEX IF EXISTS` - Safe, only removes indexes
- `ALTER TABLE ADD COLUMN IF NOT EXISTS` - Safe, adds new columns
- `CREATE INDEX IF NOT EXISTS` - Safe, adds indexes
- `CREATE POLICY IF NOT EXISTS` - Safe, adds policies
- `UPDATE ... SET column = value WHERE condition` - Safe if updating existing data (not deleting)

### ✅ SAFE Foreign Key Patterns:
- `ON DELETE SET NULL` - Safe, preserves rows, just nullifies foreign key
- `ON DELETE CASCADE` - ⚠️ Use with caution - only for child records that should be deleted with parent
- `ON DELETE RESTRICT` - Safe, prevents deletion if references exist

## Migration File Naming Convention:

- `FIX_*` - Fixes policies, indexes, constraints (NO data changes)
- `CREATE_*` - Creates new tables/columns (NO data deletion)
- `ADD_*` - Adds columns/indexes (NO data deletion)
- `UPDATE_*` - Updates data (should be reversible)

## Before Running Any Migration:

1. **Check for DELETE/TRUNCATE/DROP TABLE** - Search the file
2. **Check for DROP COLUMN** - This deletes data!
3. **Verify IF EXISTS clauses** - All DROP operations should use `IF EXISTS`
4. **Test on staging first** - Never run untested migrations on production

## Safe Migration Template:

```sql
-- Safe migration template
-- ⚠️ This migration does NOT delete any data

-- 1. Add columns (safe)
ALTER TABLE table_name 
ADD COLUMN IF NOT EXISTS new_column TYPE;

-- 2. Create indexes (safe)
CREATE INDEX IF NOT EXISTS idx_name ON table_name(column);

-- 3. Update policies (safe - only affects access, not data)
DROP POLICY IF EXISTS "old_policy" ON table_name;
CREATE POLICY "new_policy" ON table_name ...;

-- 4. Update data (safe - only if necessary and reversible)
-- UPDATE table_name SET column = value WHERE condition;

-- ⚠️ NEVER include:
-- DELETE FROM table_name;
-- TRUNCATE table_name;
-- DROP TABLE table_name;
-- DROP COLUMN column_name;
```

## Current Safe Migrations:

All current migration files follow these rules:
- ✅ `FIX_*` files - Only modify policies/indexes
- ✅ `CREATE_*` files - Only create new structures
- ✅ `ADD_*` files - Only add columns/indexes

## Foreign Key Constraints (ON DELETE):

The `ON DELETE CASCADE` and `ON DELETE SET NULL` clauses are **SAFE** - they are foreign key constraints that only define what happens when a referenced row is deleted. They do NOT delete data when the migration runs.

- `ON DELETE SET NULL` - Safe, preserves child rows, just nullifies the foreign key
- `ON DELETE CASCADE` - ⚠️ Use with caution - only for child records that should be deleted with parent (e.g., dispatchers should be deleted if company is deleted)
- `ON DELETE RESTRICT` - Safe, prevents deletion if references exist

**Example:**
```sql
-- ✅ SAFE: This doesn't delete data when migration runs
-- It only defines what happens IF a company is deleted later
company_id UUID REFERENCES companies(id) ON DELETE CASCADE
```

## If You Need to Delete Data:

1. **Create a separate migration** with a clear name like `REMOVE_*` or `CLEANUP_*`
2. **Add explicit confirmation** in the migration comments with ⚠️ warnings
3. **Make it reversible** - Consider soft deletes instead (add `deleted_at` column)
4. **Get explicit approval** before running
5. **Test on staging first** - Never run data deletion migrations on production without testing

## Migration Template:

Use `MIGRATION_TEMPLATE.sql` as a starting point for all new migrations. It includes the safety checklist.

## Last Updated:
2025-12-06 - Created safe migration guidelines

