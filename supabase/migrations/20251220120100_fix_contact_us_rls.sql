-- Fix RLS policy for contact_us table to allow public inserts
-- The previous policy might not be working correctly for anonymous users

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public to insert contact submissions" ON contact_us;
DROP POLICY IF EXISTS "Allow authenticated users to view contact submissions" ON contact_us;
DROP POLICY IF EXISTS "Allow authenticated users to update contact submissions" ON contact_us;

-- Create policy to allow public inserts (for contact form submissions from landing page)
-- This allows anonymous users (visitors) to submit the contact form
CREATE POLICY "Allow public to insert contact submissions"
  ON contact_us
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create policy to allow authenticated users (owners/admins) to view all submissions
CREATE POLICY "Allow authenticated users to view contact submissions"
  ON contact_us
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy to allow authenticated users to update submissions (for status changes)
CREATE POLICY "Allow authenticated users to update contact submissions"
  ON contact_us
  FOR UPDATE
  TO authenticated
  USING (true);

-- Also allow authenticated users to delete (for cleanup)
CREATE POLICY "Allow authenticated users to delete contact submissions"
  ON contact_us
  FOR DELETE
  TO authenticated
  USING (true);

