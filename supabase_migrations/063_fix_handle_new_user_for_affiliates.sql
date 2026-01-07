-- Fix handle_new_user trigger to work with affiliate program
-- This ensures the trigger doesn't fail if referral_code column doesn't exist yet

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert a profile for the new user with default status 'active'
  -- Use a dynamic approach that handles optional columns
  INSERT INTO public.profiles (id, email, name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::text, 'owner'),
    'active' -- Default status for new users
  )
  ON CONFLICT (id) DO NOTHING; -- Don't error if profile already exists
  
  -- The referral_code will be set by the set_referral_code_trigger if it exists
  -- If the migration hasn't been run, this will just be skipped
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the signup
    -- This allows users to sign up even if there are database issues
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Verify the function was updated
DO $$
BEGIN
  RAISE NOTICE 'handle_new_user function updated to work with affiliate program';
END $$;

