-- Fix foreign key constraint on loads.driver_id to allow driver deletion
-- When a driver is deleted, set driver_id to NULL in loads instead of preventing deletion

-- Drop the existing foreign key constraint
ALTER TABLE loads 
DROP CONSTRAINT IF EXISTS loads_driver_id_fkey;

-- Recreate the foreign key constraint with ON DELETE SET NULL
ALTER TABLE loads
ADD CONSTRAINT loads_driver_id_fkey 
FOREIGN KEY (driver_id) 
REFERENCES drivers(id) 
ON DELETE SET NULL;

-- Add comment
COMMENT ON CONSTRAINT loads_driver_id_fkey ON loads IS 'Reference to driver. When driver is deleted, driver_id is set to NULL in loads.';

