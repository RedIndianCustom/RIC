-- ============================================================================
-- CHECK EXISTING WAREHOUSE_LOCATIONS TABLE AND FIX IF NEEDED
-- ============================================================================
-- Run this first to see what structure exists
-- ============================================================================

-- Check current structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'warehouse_locations'
ORDER BY ordinal_position;

-- Check existing data
SELECT * FROM warehouse_locations;

-- Add missing columns if table exists but lacks them
DO $$
BEGIN
  -- Add address column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warehouse_locations' AND column_name = 'address'
  ) THEN
    ALTER TABLE warehouse_locations ADD COLUMN address TEXT;
    RAISE NOTICE '✅ Added address column to warehouse_locations';
  END IF;
  
  -- Add total_racks column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warehouse_locations' AND column_name = 'total_racks'
  ) THEN
    ALTER TABLE warehouse_locations ADD COLUMN total_racks INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added total_racks column to warehouse_locations';
  END IF;
  
  -- Add status column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'warehouse_locations' AND column_name = 'status'
  ) THEN
    ALTER TABLE warehouse_locations ADD COLUMN status TEXT DEFAULT 'active';
    RAISE NOTICE '✅ Added status column to warehouse_locations';
  END IF;
END $$;
