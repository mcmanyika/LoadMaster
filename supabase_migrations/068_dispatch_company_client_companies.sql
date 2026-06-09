-- Allow dispatch companies to create multiple client carrier companies (not just join via invite)

ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_owner_id_key;

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS is_dispatch_hq BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_companies_is_dispatch_hq ON companies(is_dispatch_hq)
WHERE is_dispatch_hq = true;

UPDATE companies c
SET is_dispatch_hq = true
FROM profiles p
WHERE p.company_id = c.id
  AND p.role = 'dispatch_company'
  AND c.owner_id = p.id
  AND c.is_dispatch_hq = false;

COMMENT ON COLUMN companies.is_dispatch_hq IS
  'True for a dispatch company internal HQ; false for client carriers they create or owner companies.';
