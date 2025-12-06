-- Add rate_confirmation_pdf_url column to loads table
ALTER TABLE loads 
ADD COLUMN IF NOT EXISTS rate_confirmation_pdf_url TEXT;

-- Add comment
COMMENT ON COLUMN loads.rate_confirmation_pdf_url IS 'URL to the Rate Confirmation PDF stored in Supabase Storage';

