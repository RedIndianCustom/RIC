-- ============================================================================
-- 020: FIX WAREHOUSES PROPERLY
-- ============================================================================
-- This script:
-- 1. Removes WH1 and WH2 from warehouse_locations (they don't belong there)
-- 2. Adds WH1 and WH2 to the warehouses table (correct location)
-- 3. Keeps all valid warehouse locations created through the form
-- ============================================================================

-- Step 1: Remove WH1 and WH2 from warehouse_locations table
DELETE FROM warehouse_locations
WHERE code IN ('WH1', 'WH2');

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

-- Step 3: Verify warehouses are in the correct table
SELECT 
  id,
  code,
  name,
  location,
  total_slots,
  occupied_slots,
  status,
  created_at
FROM warehouses
ORDER BY code;

-- Step 4: Show remaining warehouse locations (should NOT include WH1 or WH2)
SELECT 
  id,
  code,
  name,
  zone,
  aisle,
  rack,
  shelf,
  capacity,
  current_stock,
  status,
  created_at
FROM warehouse_locations
ORDER BY created_at DESC;

-- ============================================================================
-- DONE!
-- - WH1 and WH2 are now in the warehouses table
-- - They will appear in the warehouse dropdown
-- - warehouse_locations will only contain actual storage locations
-- ============================================================================
