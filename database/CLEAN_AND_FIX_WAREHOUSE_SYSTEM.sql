-- ============================================================================
-- CLEAN AND FIX WAREHOUSE SYSTEM
-- ============================================================================
-- ⚠️ IMPORTANT: Run SCAN_WAREHOUSE_USAGE.sql FIRST to see what will be affected!
-- ============================================================================
-- This will:
-- 1. Back up old warehouse_locations data
-- 2. Clear warehouse_locations table
-- 3. Insert ONE clean "Main Warehouse" record
-- 4. Update rack_configurations to use the new warehouse
-- 5. Verify everything works
-- ============================================================================

-- STEP 1: Create backup of old warehouse_locations
CREATE TABLE IF NOT EXISTS warehouse_locations_backup AS
SELECT * FROM warehouse_locations;

SELECT COUNT(*) as backed_up_records FROM warehouse_locations_backup;

-- STEP 2: Clear old warehouse_locations data
-- (Keep table structure, just remove the position-level records)
DELETE FROM warehouse_locations;

-- STEP 3: Insert ONE clean Main Warehouse record
INSERT INTO warehouse_locations (
  name,
  code,
  zone,
  aisle,
  rack,
  shelf,
  section,
  capacity,
  current_stock,
  available_space,
  status
) VALUES (
  'Main Warehouse',
  'WH1',
  'Main',
  '1',
  '1',
  '1',
  '1',
  3600,  -- Total capacity from 5 racks × 720 positions
  0,
  3600,
  'active'
) RETURNING id, name, code;

-- STEP 4: Update rack_configurations to use the new warehouse
UPDATE rack_configurations
SET 
  warehouse_id = (SELECT id FROM warehouse_locations WHERE code = 'WH1'),
  updated_at = NOW();

-- STEP 5: Verify the fix
SELECT 
  'After cleanup' as stage,
  (SELECT COUNT(*) FROM warehouse_locations) as warehouse_count,
  (SELECT COUNT(*) FROM rack_configurations) as rack_count,
  (SELECT COUNT(*) FROM rack_locations) as location_count;

-- STEP 6: Show the new warehouse record
SELECT 
  id,
  name,
  code,
  zone,
  aisle,
  status
FROM warehouse_locations;

-- STEP 7: Show racks now linked to clean warehouse
SELECT 
  rc.rack_code,
  rc.rack_number,
  rc.size_category,
  rc.warehouse_id,
  wl.name as warehouse_name,
  wl.code as warehouse_code
FROM rack_configurations rc
JOIN warehouse_locations wl ON wl.id = rc.warehouse_id
ORDER BY rc.rack_number;

-- STEP 8: Final verification
WITH warehouse_check AS (
  SELECT id FROM warehouse_locations WHERE code = 'WH1'
),
rack_check AS (
  SELECT DISTINCT warehouse_id FROM rack_configurations
)
SELECT 
  w.id as warehouse_id_in_table,
  r.warehouse_id as warehouse_id_used_by_racks,
  CASE 
    WHEN w.id = r.warehouse_id THEN '✅ PERFECT MATCH!'
    ELSE '❌ STILL BROKEN'
  END as status
FROM warehouse_check w, rack_check r;

-- Success message
DO $$
DECLARE
  v_warehouse_id UUID;
  v_rack_count INTEGER;
BEGIN
  SELECT id INTO v_warehouse_id FROM warehouse_locations WHERE code = 'WH1';
  SELECT COUNT(*) INTO v_rack_count FROM rack_configurations WHERE warehouse_id = v_warehouse_id;
  
  RAISE NOTICE '==========================================';
  RAISE NOTICE '✅ WAREHOUSE SYSTEM CLEANED AND FIXED!';
  RAISE NOTICE '==========================================';
  RAISE NOTICE '📦 New warehouse ID: %', v_warehouse_id;
  RAISE NOTICE '📦 Racks linked to warehouse: %', v_rack_count;
  RAISE NOTICE '📦 Old data backed up to: warehouse_locations_backup';
  RAISE NOTICE '==========================================';
  RAISE NOTICE '🔄 NOW: Refresh browser and select warehouse!';
  RAISE NOTICE 'Racks should appear in dropdown!';
  RAISE NOTICE '==========================================';
END $$;

-- Optional: If you want to restore old data later
-- INSERT INTO warehouse_locations SELECT * FROM warehouse_locations_backup;
