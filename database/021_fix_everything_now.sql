-- ============================================================================
-- 021: FIX EVERYTHING NOW - COMPLETE WAREHOUSE SETUP
-- ============================================================================
-- This script does everything in one go:
-- 1. Removes old test data from warehouse_locations
-- 2. Removes WH1/WH2 from warehouse_locations (they don't belong there)
-- 3. Adds WH1/WH2 to the warehouses table (correct location)
-- ============================================================================

-- Step 1: Clean up old test data from warehouse_locations
DELETE FROM warehouse_locations
WHERE code IN (
  'A-01-01-01',
  'A-01-01-02', 
  'A-01-02-01',
  'B-02-01-01',
  'B-02-01-02',
  'B-02-02-01',
  'C-03-01-01',
  'C-03-01-02',
  'D-04-01-01',
  'WH1',  -- These should be in warehouses table
  'WH2'   -- These should be in warehouses table
);

-- Step 2: Add WH1 and WH2 to the proper warehouses table
INSERT INTO warehouses (code, name, location, total_slots, occupied_slots, status, levels_data)
VALUES
  ('WH1', 'Main Warehouse', 'Building 1 - North Zone', 1000, 0, 'active', '[]'::jsonb),
  ('WH2', 'Second Warehouse', 'Building 2 - South Zone', 1000, 0, 'active', '[]'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  location = EXCLUDED.location,
  total_slots = EXCLUDED.total_slots,
  status = EXCLUDED.status;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show warehouses (should have WH1 and WH2)
SELECT 
  '✅ WAREHOUSES TABLE' as table_name,
  id,
  code,
  name,
  location,
  total_slots,
  status
FROM warehouses
ORDER BY code;

-- Show warehouse locations (should NOT have WH1 or WH2)
SELECT 
  '✅ WAREHOUSE_LOCATIONS TABLE' as table_name,
  id,
  code,
  name,
  zone,
  capacity,
  status
FROM warehouse_locations
ORDER BY created_at DESC;

-- ============================================================================
-- DONE!
-- ✅ WH1 and WH2 are now in the warehouses table
-- ✅ Old test data removed from warehouse_locations
-- ✅ Refresh your browser and both warehouses should appear in dropdown
-- ============================================================================
