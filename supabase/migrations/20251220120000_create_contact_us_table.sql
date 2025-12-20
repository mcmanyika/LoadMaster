-- Create contact_us table for storing contact form submissions from landing page
-- This table stores inquiries from visitors who want to get in touch

CREATE TABLE IF NOT EXISTS contact_us (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE contact_us IS 'Stores contact form submissions from the landing page';
COMMENT ON COLUMN contact_us.status IS 'Status of the inquiry: new, read, replied, archived';
COMMENT ON COLUMN contact_us.name IS 'Contact person name';
COMMENT ON COLUMN contact_us.email IS 'Contact email address';
COMMENT ON COLUMN contact_us.company IS 'Company name (optional)';
COMMENT ON COLUMN contact_us.phone IS 'Phone number (optional)';
COMMENT ON COLUMN contact_us.message IS 'Message content from the contact form';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contact_us_status ON contact_us(status);
CREATE INDEX IF NOT EXISTS idx_contact_us_created_at ON contact_us(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_us_email ON contact_us(email);

-- Enable Row Level Security (RLS)
ALTER TABLE contact_us ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public inserts (for contact form submissions)
CREATE POLICY "Allow public to insert contact submissions"
  ON contact_us
  FOR INSERT
  TO anon, authenticated
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

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_contact_us_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on row update
CREATE TRIGGER update_contact_us_updated_at
  BEFORE UPDATE ON contact_us
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_us_updated_at();

