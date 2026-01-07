-- Add Affiliate/Referral Program Support
-- This migration adds referral tracking to enable users to refer others and earn commissions

-- Add referral code to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Add referrer tracking to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by);

-- Create referrals tracking table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
  reward_amount DECIMAL(10, 2) DEFAULT 0,
  reward_type TEXT DEFAULT 'commission' CHECK (reward_type IN ('credit', 'commission', 'discount')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  rewarded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(referred_user_id) -- Prevent multiple referrals for same user
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_referral_code ON referrals(referral_code);

-- RLS Policies for referrals
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own referrals" ON referrals;
DROP POLICY IF EXISTS "Users can insert their own referrals" ON referrals;

-- Users can view referrals where they are the referrer or the referred user
CREATE POLICY "Users can view their own referrals"
  ON referrals FOR SELECT
  TO authenticated
  USING (referrer_id = auth.uid() OR referred_user_id = auth.uid());

-- Users can insert referrals (system will handle this, but allow authenticated users)
CREATE POLICY "Users can insert their own referrals"
  ON referrals FOR INSERT
  TO authenticated
  WITH CHECK (referrer_id = auth.uid() OR referred_user_id = auth.uid());

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
  counter INTEGER := 0;
BEGIN
  LOOP
    -- Generate a code: 7 characters from MD5 hash
    code := UPPER(SUBSTRING(MD5(user_id::TEXT || NOW()::TEXT || counter::TEXT), 1, 7));
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = code) INTO exists_check;
    EXIT WHEN NOT exists_check;
    counter := counter + 1;
    -- Safety: prevent infinite loop
    IF counter > 100 THEN
      -- Fallback: use UUID substring if we can't find unique code
      code := UPPER(SUBSTRING(REPLACE(user_id::TEXT, '-', ''), 1, 7));
      EXIT;
    END IF;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate referral code for new users
CREATE OR REPLACE FUNCTION set_referral_code()
RETURNS TRIGGER AS $$
DECLARE
  code TEXT;
BEGIN
  -- Only try to set referral_code if the column exists
  -- Check by attempting to access it (will throw if column doesn't exist)
  BEGIN
    -- If referral_code is NULL or empty, generate one
    IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
      -- Try to generate referral code
      BEGIN
        code := generate_referral_code(NEW.id);
        NEW.referral_code := code;
      EXCEPTION
        WHEN undefined_function THEN
          -- Function doesn't exist yet - migration not run
          -- Just skip setting the code
          RAISE WARNING 'generate_referral_code function not found. Please run migration 062_add_affiliate_program.sql';
        WHEN OTHERS THEN
          -- Any other error - log but don't fail
          RAISE WARNING 'Could not generate referral code: %', SQLERRM;
      END;
    END IF;
  EXCEPTION
    WHEN undefined_column THEN
      -- Column doesn't exist yet - migration not run
      -- Just return NEW without setting referral_code
      RAISE WARNING 'referral_code column not found. Please run migration 062_add_affiliate_program.sql';
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_referral_code_trigger ON profiles;
CREATE TRIGGER set_referral_code_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  WHEN (NEW.referral_code IS NULL OR NEW.referral_code = '')
  EXECUTE FUNCTION set_referral_code();

-- Backfill referral codes for existing users
UPDATE profiles 
SET referral_code = generate_referral_code(id)
WHERE referral_code IS NULL OR referral_code = '';

-- Verify the migration
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'referrals'
  ) THEN
    RAISE NOTICE 'Affiliate program migration completed successfully';
  ELSE
    RAISE WARNING 'Referrals table may not have been created';
  END IF;
END $$;

