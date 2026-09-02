-- ============================================================================
-- SIMPLE CHECK - What tables exist and what data is in them?
-- ============================================================================

-- 1. What tables exist?
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('warehouse_locations', 'warehouses', 'rack_configurations', 'rack_locations')
ORDER BY table_name;

-- 2. How many records in warehouse_locations?
SELECT COUNT(*) as count FROM warehouse_locations;

-- 3. How many records in rack_configurations? (might not exist)
SELECT COUNT(*) as count FROM rack_configurations;

-- 4. Show first 3 warehouse_locations
SELECT id, name, code, zone, aisle, rack, status 
FROM warehouse_locations 
LIMIT 3;

-- 5. Show first 3 rack_configurations (if exists)
SELECT id, warehouse_id, rack_code, rack_number, size_category, status
FROM rack_configurations
LIMIT 3;
