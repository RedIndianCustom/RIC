-- ============================================================================
-- ADD INITIAL WAREHOUSES
-- ============================================================================
-- This script adds 2 initial warehouses to the system
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Check if warehouses already exist
DO $$
BEGIN
  -- Add Main Warehouse (WH1)
  IF NOT EXISTS (
    SELECT 1 FROM warehouse_locations 
    WHERE code = 'WH1' AND name = 'Main Warehouse'
  ) THEN
    INSERT INTO warehouse_locations (
      code, 
      name, 
      zone, 
      aisle, 
      rack, 
      shelf, 
      capacity, 
      current_stock, 
      status
    )
    VALUES (
      'WH1',
      'Main Warehouse',
      'A',
      '01',
      '01',
      '01',
      5000,
      0,
      'active'
    );
    RAISE NOTICE 'Created Main Warehouse (WH1)';
  ELSE
    RAISE NOTICE 'Main Warehouse (WH1) already exists';
  END IF;

  -- Add Second Warehouse (WH2)
  IF NOT EXISTS (
    SELECT 1 FROM warehouse_locations 
    WHERE code = 'WH2' AND name = 'Second Warehouse'
  ) THEN
    INSERT INTO warehouse_locations (
      code, 
      name, 
      zone, 
      aisle, 
      rack, 
      shelf, 
      capacity, 
      current_stock, 
      status
    )
    VALUES (
      'WH2',
      'Second Warehouse',
      'B',
      '01',
      '01',
      '01',
      5000,
      0,
      'active'
    );
    RAISE NOTICE 'Created Second Warehouse (WH2)';
  ELSE
    RAISE NOTICE 'Second Warehouse (WH2) already exists';
  END IF;
END $$;

-- Verify warehouses
SELECT 
  id,
  code,
  name,
  zone,
  capacity,
  current_stock,
  status,
  created_at
FROM warehouse_locations
WHERE code IN ('WH1', 'WH2')
ORDER BY code;

-- ============================================================================
-- DONE! You should see 2 warehouses:
-- - WH1: Main Warehouse (Capacity: 5000)
-- - WH2: Second Warehouse (Capacity: 5000)
-- ============================================================================
