-- Backfill drivers table from active driver_company_associations
-- so that invited drivers have a drivers.id for FK loads.driver_id
--
-- This is SAFE: it only INSERTs missing rows, does not delete or update anything.
--
-- Scenario:
-- - driver_company_associations.driver_id points to profiles.id (driver profile)
-- - Some drivers do not yet have a row in drivers with profile_id = that profile
-- - Our app now requires loads.driver_id to reference drivers.id
--
-- This script creates driver rows for any active association that doesn't yet
-- have a matching drivers row.

-- Insert missing drivers for active associations
INSERT INTO drivers (
  name,
  phone,
  email,
  transporter_id,
  company_id,
  pay_type,
  pay_percentage,
  profile_id
)
SELECT
  COALESCE(p.name, 'Unknown Driver'),
  NULL::text AS phone,
  p.email,
  NULL::uuid AS transporter_id,
  dca.company_id,
  'percentage_of_net'::text AS pay_type,
  50::integer AS pay_percentage,
  dca.driver_id AS profile_id
FROM driver_company_associations dca
JOIN profiles p
  ON p.id = dca.driver_id
WHERE
  dca.status = 'active'
  AND dca.driver_id IS NOT NULL
  -- Only where there is no existing drivers row for this profile + company
  AND NOT EXISTS (
    SELECT 1
    FROM drivers d
    WHERE d.profile_id = dca.driver_id
      AND d.company_id = dca.company_id
  );

-- Optional: log how many rows were inserted (visible as NOTICE in Supabase SQL editor)
DO $$
DECLARE
  inserted_count integer;
BEGIN
  SELECT COUNT(*) INTO inserted_count
  FROM drivers d
  WHERE d.created_at >= NOW() - INTERVAL '1 minute';

  RAISE NOTICE 'Backfill complete. Inserted % driver rows in the last minute (approx).', inserted_count;
END $$;


