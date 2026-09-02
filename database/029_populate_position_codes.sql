-- ============================================================================
-- Migration 029: Populate Missing Position Codes
-- ============================================================================
-- This migration populates the position_code field for existing inventory_units
-- that have hierarchical location data but missing position_code.
-- 
-- Position code format: RACK-SHELF-SECTION-SUBSECTION
-- Example: WH1-R06-RK06-S02-SH01-SUB01
-- ============================================================================

BEGIN;

-- Display current state
DO $$
DECLARE
  total_units INTEGER;
  units_with_position_code INTEGER;
  units_with_location_data INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_units FROM inventory_units;
  SELECT COUNT(*) INTO units_with_position_code FROM inventory_units WHERE position_code IS NOT NULL;
  SELECT COUNT(*) INTO units_with_location_data 
    FROM inventory_units 
    WHERE rack IS NOT NULL 
      AND shelf_number IS NOT NULL 
      AND section_number IS NOT NULL 
      AND subsection_number IS NOT NULL;
  
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'CURRENT STATE';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Total inventory units: %', total_units;
  RAISE NOTICE 'Units with position_code: %', units_with_position_code;
  RAISE NOTICE 'Units with complete location data: %', units_with_location_data;
  RAISE NOTICE 'Units needing position_code: %', units_with_location_data - units_with_position_code;
  RAISE NOTICE '============================================================================';
END $$;

-- Update position_code for units that have complete hierarchical data but no position_code
UPDATE inventory_units
SET position_code = rack || '-S' || LPAD(shelf_number::TEXT, 2, '0') || '-SH' || LPAD(section_number::TEXT, 2, '0') || '-SUB' || LPAD(subsection_number::TEXT, 2, '0')
WHERE rack IS NOT NULL
  AND shelf_number IS NOT NULL
  AND section_number IS NOT NULL
  AND subsection_number IS NOT NULL
  AND position_code IS NULL;

-- Display results
DO $$
DECLARE
  total_units INTEGER;
  units_with_position_code INTEGER;
  units_without_location INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_units FROM inventory_units;
  SELECT COUNT(*) INTO units_with_position_code FROM inventory_units WHERE position_code IS NOT NULL;
  SELECT COUNT(*) INTO units_without_location 
    FROM inventory_units 
    WHERE position_code IS NULL;
  
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'AFTER UPDATE';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Total inventory units: %', total_units;
  RAISE NOTICE 'Units with position_code: %', units_with_position_code;
  RAISE NOTICE 'Units still without position_code: %', units_without_location;
  RAISE NOTICE '============================================================================';
  
  IF units_without_location > 0 THEN
    RAISE NOTICE 'Note: % units do not have complete location data assigned yet.', units_without_location;
  END IF;
END $$;

-- Show sample of updated records
DO $$
DECLARE
  rec RECORD;
  counter INTEGER := 0;
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'SAMPLE UPDATED RECORDS (First 5)';
  RAISE NOTICE '============================================================================';
  
  FOR rec IN 
    SELECT 
      id,
      inventory_unit_code,
      rack,
      shelf_number,
      section_number,
      subsection_number,
      position_code
    FROM inventory_units
    WHERE position_code IS NOT NULL
    ORDER BY updated_at DESC
    LIMIT 5
  LOOP
    counter := counter + 1;
    RAISE NOTICE '% | Unit: % | Rack: % | Shelf: % | Section: % | Subsection: % | Position: %',
      counter,
      rec.inventory_unit_code,
      rec.rack,
      rec.shelf_number,
      rec.section_number,
      rec.subsection_number,
      rec.position_code;
  END LOOP;
  
  RAISE NOTICE '============================================================================';
END $$;

COMMIT;

RAISE NOTICE '✅ Migration 029 completed successfully!';
