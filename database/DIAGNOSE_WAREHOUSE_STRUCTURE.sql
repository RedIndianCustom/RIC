-- ============================================================================
-- DIAGNOSE WAREHOUSE TABLE STRUCTURE
-- ============================================================================
-- Check what the actual warehouse_locations table looks like
-- ============================================================================

-- 1. Check table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'warehouse_locations'
ORDER BY ordinal_position;

-- 2. Check all data in warehouse_locations
SELECT * FROM warehouse_locations;

-- 3. Check if rack_configurations table exists
SELECT 
  table_name 
FROM information_schema.tables 
WHERE table_name IN ('rack_configurations', 'rack_locations', 'inventory_relocation_history');

-- 4. Check rack_configurations data (if exists)
SELECT * FROM rack_configurations;

-- 5. Count records
SELECT 
  (SELECT COUNT(*) FROM warehouse_locations) as warehouse_count,
  (SELECT COUNT(*) FROM rack_configurations) as rack_count,
  (SELECT COUNT(*) FROM rack_locations) as location_count;
