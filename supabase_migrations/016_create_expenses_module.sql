-- =====================================================
-- EXPENSE MODULE MIGRATION
-- Creates expense_categories and expenses tables
-- Includes storage bucket setup for receipts
-- =====================================================

-- =====================================================
-- STEP 1: Create Expense Categories Table
-- =====================================================
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default expense categories
INSERT INTO expense_categories (name, description, icon, color) VALUES
  ('Repairs & Maintenance', 'Vehicle repairs and maintenance', 'wrench', '#EF4444'),
  ('Tires', 'Tire purchases and replacements', 'circle', '#F59E0B'),
  ('Oil Changes', 'Regular oil changes', 'droplet', '#10B981'),
  ('Parts & Supplies', 'Vehicle parts and supplies', 'package', '#6366F1'),
  ('Towing', 'Towing and roadside assistance', 'truck', '#8B5CF6'),
  ('Inspection & Registration', 'Vehicle inspections and registration', 'file-check', '#06B6D4'),
  ('Equipment Upgrades', 'Vehicle equipment upgrades', 'arrow-up', '#EC4899'),
  ('Commercial Auto Insurance', 'Commercial vehicle insurance', 'shield', '#3B82F6'),
  ('Cargo Insurance', 'Cargo insurance coverage', 'shield-check', '#3B82F6'),
  ('Liability Insurance', 'Liability insurance', 'shield-alert', '#3B82F6'),
  ('Health Insurance', 'Health insurance for employees', 'heart', '#10B981'),
  ('Workers Compensation', 'Workers compensation insurance', 'users', '#6366F1'),
  ('Fuel', 'Fuel expenses (separate from load fuel)', 'fuel', '#F59E0B'),
  ('Tolls', 'Toll road fees', 'road', '#8B5CF6'),
  ('Parking', 'Parking fees', 'square', '#6366F1'),
  ('Permits & Licenses', 'Permits and licenses', 'file-text', '#06B6D4'),
  ('Compliance Fees', 'Compliance and regulatory fees', 'check-circle', '#10B981'),
  ('Office Rent', 'Office space rental', 'building', '#8B5CF6'),
  ('Utilities', 'Office utilities', 'zap', '#F59E0B'),
  ('Software/Subscriptions', 'Software and subscription services', 'monitor', '#6366F1'),
  ('Legal Fees', 'Legal services', 'scale', '#EC4899'),
  ('Accounting Fees', 'Accounting services', 'calculator', '#3B82F6'),
  ('Professional Services', 'Other professional services', 'briefcase', '#8B5CF6'),
  ('Per Diem', 'Driver per diem payments', 'dollar-sign', '#10B981'),
  ('Lodging', 'Driver lodging expenses', 'home', '#06B6D4'),
  ('Meals', 'Driver meal expenses', 'utensils', '#F59E0B'),
  ('Driver Bonuses', 'Driver bonus payments', 'gift', '#EC4899'),
  ('Taxes', 'Tax payments', 'receipt', '#EF4444'),
  ('Marketing/Advertising', 'Marketing and advertising expenses', 'megaphone', '#8B5CF6'),
  ('Training & Education', 'Training and education expenses', 'graduation-cap', '#6366F1'),
  ('Miscellaneous', 'Other expenses', 'more-horizontal', '#6B7280')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- STEP 2: Create Expenses Table
-- =====================================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES expense_categories(id),
  amount NUMERIC(10, 2) NOT NULL,
  description TEXT,
  expense_date DATE NOT NULL,
  vendor TEXT,
  receipt_url TEXT,
  vehicle_id UUID REFERENCES transporters(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  load_id UUID REFERENCES loads(id) ON DELETE SET NULL,
  payment_method TEXT CHECK (payment_method IN ('cash', 'check', 'credit_card', 'ach', 'other')),
  payment_status TEXT DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'recurring')),
  recurring_frequency TEXT CHECK (recurring_frequency IN ('monthly', 'quarterly', 'yearly')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_expenses_company_id ON expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_vehicle_id ON expenses(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_expenses_driver_id ON expenses(driver_id);
CREATE INDEX IF NOT EXISTS idx_expenses_load_id ON expenses(load_id);
CREATE INDEX IF NOT EXISTS idx_expenses_payment_status ON expenses(payment_status);

-- Add comments
COMMENT ON TABLE expense_categories IS 'Predefined categories for expense tracking';
COMMENT ON TABLE expenses IS 'Company expenses with links to vehicles, drivers, and loads';
COMMENT ON COLUMN expenses.vehicle_id IS 'Reference to transporter (vehicle) if expense is vehicle-specific';
COMMENT ON COLUMN expenses.recurring_frequency IS 'Frequency for recurring expenses: monthly, quarterly, or yearly';

-- =====================================================
-- STEP 3: Enable Row Level Security
-- =====================================================
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expense_categories (read-only for authenticated users)
DROP POLICY IF EXISTS "Anyone can view expense categories" ON expense_categories;
CREATE POLICY "Anyone can view expense categories"
  ON expense_categories FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for expenses
DROP POLICY IF EXISTS "Users can view expenses from their company" ON expenses;
DROP POLICY IF EXISTS "Users can insert expenses for their company" ON expenses;
DROP POLICY IF EXISTS "Users can update expenses from their company" ON expenses;
DROP POLICY IF EXISTS "Users can delete expenses from their company" ON expenses;

CREATE POLICY "Users can view expenses from their company"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
    OR
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert expenses for their company"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
    OR
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update expenses from their company"
  ON expenses FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
    OR
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
    OR
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete expenses from their company"
  ON expenses FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
    OR
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

-- =====================================================
-- STEP 4: Add Updated At Trigger
-- =====================================================
CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_expenses_updated_at();

-- =====================================================
-- STEP 5: Setup Storage Bucket Policies for Receipts
-- =====================================================
-- Note: The storage bucket 'expense-receipts' must be created manually in Supabase Dashboard
-- These policies will work once the bucket exists

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload expense receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can read expense receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete expense receipts" ON storage.objects;

-- Allow authenticated users to upload files to expense-receipts bucket
CREATE POLICY "Users can upload expense receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'expense-receipts');

-- Allow authenticated users to read files from expense-receipts bucket
CREATE POLICY "Users can read expense receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'expense-receipts');

-- Allow authenticated users to delete files from expense-receipts bucket
CREATE POLICY "Users can delete expense receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'expense-receipts');

