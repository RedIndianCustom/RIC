-- ============================================================================
-- DEFINITIVE FIX - Make Racks Work with Current Warehouse System
-- ============================================================================

-- Your warehouse_locations table has POSITIONS (Zone A - Aisle 1 - Rack 1 - Shelf 1)
-- But you need to select ONE as the "main warehouse" for rack assignments

-- OPTION 1: Find the first "Main Warehouse" record and use it
SELECT 
  id,
  name,
  code,
  zone,
  aisle,
  rack,
  shelf
FROM warehouse_locations
WHERE name = 'Main Warehouse'
ORDER BY 
  COALESCE(zone, ''),
  COALESCE(aisle, ''),
  COALESCE(rack, ''),
  COALESCE(shelf, '')
LIMIT 1;

-- OPTION 2: Update rack_configurations to use the FIRST Main Warehouse record
UPDATE rack_configurations
SET warehouse_id = (
  SELECT id
  FROM warehouse_locations
  WHERE name = 'Main Warehouse'
  ORDER BY 
    COALESCE(zone, ''),
    COALESCE(aisle, ''),
    COALESCE(rack, ''),
    COALESCE(shelf, '')
  LIMIT 1
),
updated_at = NOW();

-- Verify the update
SELECT 
  rc.rack_code,
  rc.rack_number,
  rc.warehouse_id,
  wl.name,
  wl.code,
  wl.zone,
  wl.aisle
FROM rack_configurations rc
JOIN warehouse_locations wl ON wl.id = rc.warehouse_id
ORDER BY rc.rack_number;

-- Show what the dropdown will display
SELECT 
  id as warehouse_id,
  name,
  code,
  zone,
  aisle,
  rack,
  shelf,
  status
FROM warehouse_locations
WHERE status = 'active'
  AND name LIKE '%Main Warehouse%'
ORDER BY zone, aisle, rack, shelf
LIMIT 10;

DO $$
BEGIN
  RAISE NOTICE '✅ Racks updated to use first Main Warehouse record';
  RAISE NOTICE '🔄 Now checking if they match...';
END $$;

-- Final verification: Do the IDs match?
WITH first_warehouse AS (
  SELECT id
  FROM warehouse_locations
  WHERE name = 'Main Warehouse'
  ORDER BY zone, aisle, rack, shelf
  LIMIT 1
),
rack_warehouse AS (
  SELECT DISTINCT warehouse_id
  FROM rack_configurations
  LIMIT 1
)
SELECT 
  fw.id as warehouse_in_dropdown,
  rw.warehouse_id as warehouse_used_by_racks,
  CASE 
    WHEN fw.id = rw.warehouse_id THEN '✅ MATCH - Should work!'
    ELSE '❌ MISMATCH - Still broken'
  END as status
FROM first_warehouse fw, rack_warehouse rw;
