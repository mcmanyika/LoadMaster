-- Fix RLS policy for contact_us table - more explicit approach
-- Ensure anonymous users can insert contact form submissions

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public to insert contact submissions" ON contact_us;

-- Create explicit policy for anonymous users (visitors to landing page)
-- This is the most permissive policy for public inserts
CREATE POLICY "Allow anonymous users to insert contact submissions"
  ON contact_us
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Also allow authenticated users to insert (in case they want to submit from dashboard)
CREATE POLICY "Allow authenticated users to insert contact submissions"
  ON contact_us
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

