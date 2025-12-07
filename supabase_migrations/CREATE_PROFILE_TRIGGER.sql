-- Create a trigger to automatically create a profile when a user signs up
-- This is a backup in case the frontend profile creation fails

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a profile for the new user with default status 'active'
  INSERT INTO public.profiles (id, email, name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::text, 'owner'),
    'active' -- Default status for new users
  )
  ON CONFLICT (id) DO NOTHING; -- Don't error if profile already exists
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires after a user is inserted into auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Note: This trigger will only work if you have the necessary permissions
-- In Supabase, you may need to enable this in the Database > Functions section
-- or run it with appropriate permissions

