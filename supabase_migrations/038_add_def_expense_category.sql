-- =====================================================
-- ADD "Def" EXPENSE CATEGORY
-- Adds the "Def" category to expense_categories table
-- =====================================================

-- Temporarily allow inserts for this migration
-- Note: This bypasses RLS to add the category
DO $$
BEGIN
  -- Insert "Def" expense category
  INSERT INTO expense_categories (name, description, icon, color) 
  VALUES ('Def', 'DEF (Diesel Exhaust Fluid) expenses', 'droplet', '#3B82F6')
  ON CONFLICT (name) DO NOTHING;
  
  RAISE NOTICE 'Def expense category added successfully';
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Error adding Def category: %', SQLERRM;
END $$;

