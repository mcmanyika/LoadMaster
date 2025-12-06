-- Add driver_payout_status column to loads table
ALTER TABLE loads 
ADD COLUMN IF NOT EXISTS driver_payout_status TEXT CHECK (driver_payout_status IN ('pending', 'paid', 'partial'));

-- Add comment
COMMENT ON COLUMN loads.driver_payout_status IS 'Status of driver payout: pending, paid, or partial';

-- Set default value for existing rows
UPDATE loads 
SET driver_payout_status = 'pending' 
WHERE driver_payout_status IS NULL;

