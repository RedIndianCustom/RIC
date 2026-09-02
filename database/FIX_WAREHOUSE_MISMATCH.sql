-- ============================================================================
-- FIX WAREHOUSE ID MISMATCH
-- ============================================================================
-- Your racks point to a warehouse_id that doesn't appear in the dropdown
-- We need to update them to point to an actual warehouse_locations record
-- ============================================================================

-- STEP 1: Find which warehouse_locations records are shown in dropdown
-- (These should be the "parent" warehouse records, not specific positions)
SELECT 
  id,
  name,
  code,
  zone,
  aisle,
  rack,
  status
FROM warehouse_locations
WHERE status = 'active'
  AND name = 'Main Warehouse'
ORDER BY zone NULLS FIRST, aisle NULLS FIRST, rack NULLS FIRST
LIMIT 1;

-- STEP 2: Update rack_configurations to use the correct warehouse_id
-- This will use the FIRST matching "Main Warehouse" record
DO $$
DECLARE
  v_correct_warehouse_id UUID;
BEGIN
  -- Get the correct warehouse ID (first Main Warehouse record)
  SELECT id INTO v_correct_warehouse_id
  FROM warehouse_locations
  WHERE status = 'active'
    AND name = 'Main Warehouse'
  ORDER BY zone NULLS FIRST, aisle NULLS FIRST, rack NULLS FIRST
  LIMIT 1;
  
  IF v_correct_warehouse_id IS NULL THEN
    RAISE EXCEPTION 'Could not find Main Warehouse in warehouse_locations';
  END IF;
  
  RAISE NOTICE 'Correct warehouse ID: %', v_correct_warehouse_id;
  
  -- Update all racks to use this warehouse_id
  UPDATE rack_configurations
  SET 
    warehouse_id = v_correct_warehouse_id,
    updated_at = NOW()
  WHERE warehouse_id != v_correct_warehouse_id;
  
  RAISE NOTICE '✅ Updated rack_configurations to use correct warehouse_id';
END $$;

-- STEP 3: Verify the fix
SELECT 
  rc.id,
  rc.rack_code,
  rc.rack_number,
  rc.warehouse_id,
  wl.name as warehouse_name,
  wl.code as warehouse_code
FROM rack_configurations rc
LEFT JOIN warehouse_locations wl ON wl.id = rc.warehouse_id
ORDER BY rc.rack_number;

-- STEP 4: Test if they match now
SELECT 
  'Warehouse in dropdown' as source,
  id,
  name,
  code
FROM warehouse_locations
WHERE status = 'active' AND name = 'Main Warehouse'
LIMIT 1

UNION ALL

SELECT 
  'Warehouse used by racks' as source,
  wl.id,
  wl.name,
  wl.code
FROM rack_configurations rc
JOIN warehouse_locations wl ON wl.id = rc.warehouse_id
LIMIT 1;

-- Success!
DO $$
BEGIN
  RAISE NOTICE '✅ Warehouse ID mismatch fixed!';
  RAISE NOTICE '📦 Racks now point to the warehouse shown in dropdown';
  RAISE NOTICE '🔄 Refresh your browser and try selecting warehouse again';
END $$;
