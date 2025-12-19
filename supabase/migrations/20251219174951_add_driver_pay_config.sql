-- Add driver pay configuration columns to drivers table
-- Allows owners to configure different pay calculation methods per driver
-- pay_type: 'percentage_of_gross' or 'percentage_of_net'
-- pay_percentage: The percentage value (e.g., 30.00, 50.00)

ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS pay_type TEXT DEFAULT 'percentage_of_net' 
  CHECK (pay_type IN ('percentage_of_gross', 'percentage_of_net')),
ADD COLUMN IF NOT EXISTS pay_percentage NUMERIC(5,2) DEFAULT 50.00;

-- Add comment for documentation
COMMENT ON COLUMN drivers.pay_type IS 'Driver pay calculation method: percentage_of_gross (e.g., 30% of gross) or percentage_of_net (e.g., 50% of gross - dispatch fee)';
COMMENT ON COLUMN drivers.pay_percentage IS 'Percentage value for driver pay calculation (0-100)';

