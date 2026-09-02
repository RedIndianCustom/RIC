-- ============================================================================
-- FIND THE CORRECT WAREHOUSE RECORD
-- ============================================================================

-- 1. The racks are looking for this warehouse_id:
-- b1eff6be-b968-4861-94c2-f220e4eeffed

-- Let's find it in warehouse_locations
SELECT 
  id,
  name,
  code,
  zone,
  aisle,
  rack,
  shelf,
  section,
  status
FROM warehouse_locations
WHERE id = 'b1eff6be-b968-4861-94c2-f220e4eeffed';

-- 2. Check what this record actually is
SELECT * FROM warehouse_locations WHERE id = 'b1eff6be-b968-4861-94c2-f220e4eeffed';

-- 3. Show ALL unique "parent" warehouse records (those without zone/aisle details)
SELECT DISTINCT
  id,
  name,
  code,
  status
FROM warehouse_locations
WHERE zone IS NULL OR zone = '' OR rack IS NULL
ORDER BY name;

-- 4. If no parent records exist, find the first record per code
SELECT DISTINCT ON (code)
  id,
  name,
  code,
  zone,
  aisle,
  status
FROM warehouse_locations
WHERE status = 'active'
ORDER BY code, zone NULLS FIRST, aisle NULLS FIRST;
