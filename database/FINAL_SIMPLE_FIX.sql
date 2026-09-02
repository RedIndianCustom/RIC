-- ============================================================================
-- FINAL SIMPLE FIX - Just verify and test
-- ============================================================================
-- The scan shows racks ARE linked to warehouse b1eff6be-b968-4861-94c2-f220e4eeffed
-- Let's verify this warehouse exists and is selectable
-- ============================================================================

-- 1. Check if this warehouse ID exists
SELECT 
  id,
  name,
  code,
  zone,
  aisle,
  rack,
  shelf,
  status
FROM warehouse_locations
WHERE id = 'b1eff6be-b968-4861-94c2-f220e4eeffed';

-- 2. Verify racks are linked
SELECT 
  rc.rack_code,
  rc.warehouse_id,
  wl.name as warehouse_name
FROM rack_configurations rc
JOIN warehouse_locations wl ON wl.id = rc.warehouse_id;

-- 3. Test the API query (what the backend runs)
SELECT 
  rc.*
FROM rack_configurations rc
WHERE rc.warehouse_id = 'b1eff6be-b968-4861-94c2-f220e4eeffed'
  AND rc.status IN ('active', 'full')
ORDER BY rc.rack_number;

-- 4. If step 3 returns 5 racks, the database is correct!
-- The problem is the frontend is sending the wrong warehouse_id

-- 5. Let's see what the frontend dropdown SHOULD show
SELECT 
  id as value_frontend_sends,
  name as label_frontend_shows,
  code,
  zone,
  aisle
FROM warehouse_locations
WHERE status = 'active'
ORDER BY name, zone, aisle
LIMIT 20;

DO $$
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'DIAGNOSIS:';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'If step 3 shows 5 racks: Database is CORRECT';
  RAISE NOTICE 'If step 5 shows warehouse with ID b1eff6be...: Dropdown is CORRECT';
  RAISE NOTICE 'Problem is likely: Frontend caching or wrong ID selected';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'FIX: Clear browser cache and hard refresh (Ctrl+Shift+R)';
  RAISE NOTICE '==========================================';
END $$;
