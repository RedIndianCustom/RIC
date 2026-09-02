-- ============================================================================
-- INSERT 5 RACKS - SIMPLE VERSION (Fixed for generated column)
-- ============================================================================
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Delete existing racks
DELETE FROM rack_configurations;

-- Step 2: Insert 5 racks (total_capacity is auto-calculated)
DO $$
DECLARE
  v_warehouse_id UUID;
BEGIN
  -- Get Main Warehouse ID
  SELECT id INTO v_warehouse_id 
  FROM warehouse_locations 
  WHERE name = 'Main Warehouse' 
  LIMIT 1;
  
  IF v_warehouse_id IS NULL THEN
    RAISE EXCEPTION 'Main Warehouse not found! Please create it first.';
  END IF;
  
  RAISE NOTICE 'Using warehouse_id: %', v_warehouse_id;
  
  -- Insert 5 racks (NOTE: total_capacity is NOT in the INSERT because it's auto-calculated)
  INSERT INTO rack_configurations (
    warehouse_id,
    rack_number,
    rack_code,
    designated_size,
    size_category,
    total_shelves,
    sections_per_shelf,
    subsections_per_section,
    capacity_per_subsection,
    current_count,
    status
  ) VALUES
  (v_warehouse_id, 1, 'WH1-RACK-1', 'Sawtooth 130/90-15, 170/80-15', 'Sawtooth', 4, 6, 2, 15, 0, 'active'),
  (v_warehouse_id, 2, 'WH1-RACK-2', 'Sawtooth 130/90-15, 170/80-15', 'Sawtooth', 4, 6, 2, 15, 0, 'active'),
  (v_warehouse_id, 3, 'WH1-RACK-3', 'Enduro 70/90-17, 80/100-18', 'Enduro', 4, 6, 2, 15, 0, 'active'),
  (v_warehouse_id, 4, 'WH1-RACK-4', 'Dual Sport 90/90-17, 110/80-17', 'Dual Sport', 4, 6, 2, 15, 0, 'active'),
  (v_warehouse_id, 5, 'WH1-RACK-5', 'Motocross 80/100-18, 100/90-19', 'Motocross', 4, 6, 2, 15, 0, 'active');
  
  RAISE NOTICE '✅ Successfully inserted 5 racks';
END $$;

-- Step 3: Disable RLS to allow backend access
ALTER TABLE rack_configurations DISABLE ROW LEVEL SECURITY;

-- Step 4: Grant permissions
GRANT ALL ON rack_configurations TO authenticated;
GRANT ALL ON rack_configurations TO service_role;
GRANT ALL ON rack_configurations TO anon;

-- Step 5: Verify the racks were created
SELECT 
  rack_code,
  size_category,
  total_capacity,  -- This should now be 720 (auto-calculated)
  current_count,
  status
FROM rack_configurations
ORDER BY rack_number;

-- Success message
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM rack_configurations;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '✅ SUCCESS: Created % racks in rack_configurations', v_count;
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  
  IF v_count = 5 THEN
    RAISE NOTICE '✓ WH1-RACK-1: Sawtooth';
    RAISE NOTICE '✓ WH1-RACK-2: Sawtooth';
    RAISE NOTICE '✓ WH1-RACK-3: Enduro';
    RAISE NOTICE '✓ WH1-RACK-4: Dual Sport';
    RAISE NOTICE '✓ WH1-RACK-5: Motocross';
    RAISE NOTICE '';
    RAISE NOTICE '💡 Next steps:';
    RAISE NOTICE '   1. Hard refresh browser (Ctrl+Shift+R)';
    RAISE NOTICE '   2. Select warehouse in barcode generation';
    RAISE NOTICE '   3. Racks should now appear!';
  ELSE
    RAISE WARNING '⚠️  Expected 5 racks but found %', v_count;
  END IF;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;
