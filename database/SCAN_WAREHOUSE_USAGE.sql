-- ============================================================================
-- SCAN WAREHOUSE_LOCATIONS USAGE BEFORE REMOVAL
-- ============================================================================
-- This scans what's currently using the old warehouse_locations system
-- So we know what will break if we remove/change it
-- ============================================================================

-- 1. CHECK: What tables reference warehouse_locations?
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'warehouse_locations';

-- 2. CHECK: Does inventory_units reference warehouse_locations?
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'inventory_units'
  AND column_name LIKE '%warehouse%'
ORDER BY column_name;

-- 3. CHECK: Current warehouse_locations structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'warehouse_locations'
ORDER BY ordinal_position;

-- 4. CHECK: Sample data from warehouse_locations (using only existing columns)
SELECT * FROM warehouse_locations LIMIT 10;

-- 5. CHECK: Are any inventory_units using warehouse_locations?
SELECT 
  COUNT(*) as units_with_rack_location
FROM inventory_units
WHERE rack_location_id IS NOT NULL;

-- 6. CHECK: rack_configurations current state
SELECT 
  id,
  warehouse_id,
  rack_code,
  rack_number,
  size_category,
  status
FROM rack_configurations;

-- 7. CHECK: Does rack_configurations.warehouse_id point to warehouse_locations?
SELECT 
  rc.rack_code,
  rc.warehouse_id as rack_warehouse_id,
  wl.id as warehouse_location_id,
  wl.name as warehouse_name,
  wl.zone,
  wl.aisle,
  CASE 
    WHEN rc.warehouse_id = wl.id THEN '✅ LINKED'
    ELSE '❌ NOT LINKED'
  END as link_status
FROM rack_configurations rc
LEFT JOIN warehouse_locations wl ON wl.id = rc.warehouse_id;

-- 8. SUMMARY: What needs to be done?
DO $$
DECLARE
  v_warehouse_count INTEGER;
  v_rack_count INTEGER;
  v_units_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_warehouse_count FROM warehouse_locations;
  SELECT COUNT(*) INTO v_rack_count FROM rack_configurations;
  SELECT COUNT(*) INTO v_units_count FROM inventory_units 
    WHERE rack_location_id IS NOT NULL;
  
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'WAREHOUSE SYSTEM SCAN RESULTS:';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'warehouse_locations records: %', v_warehouse_count;
  RAISE NOTICE 'rack_configurations records: %', v_rack_count;
  RAISE NOTICE 'inventory_units with location: %', v_units_count;
  RAISE NOTICE '==========================================';
  
  IF v_warehouse_count > 100 THEN
    RAISE NOTICE '⚠️ WARNING: warehouse_locations has % records (position-level data)', v_warehouse_count;
    RAISE NOTICE '💡 These are specific positions, not warehouses';
  END IF;
  
  IF v_rack_count = 0 THEN
    RAISE NOTICE '❌ rack_configurations is EMPTY!';
  ELSE
    RAISE NOTICE '✅ rack_configurations has % racks', v_rack_count;
  END IF;
  
  IF v_units_count > 0 THEN
    RAISE NOTICE '⚠️ WARNING: % inventory units reference warehouse_locations', v_units_count;
    RAISE NOTICE '💡 Need to preserve this data or migrate it';
  END IF;
END $$;
