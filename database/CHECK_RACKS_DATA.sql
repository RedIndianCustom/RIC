-- ============================================================================
-- CHECK RACKS DATA IN DATABASE
-- ============================================================================
-- Run this in Supabase to see if racks exist and what data they have
-- ============================================================================

-- 1. Check warehouses
SELECT id, name, code FROM warehouse_locations;

-- 2. Check all racks
SELECT 
  id,
  warehouse_id,
  rack_number,
  rack_code,
  designated_size,
  size_category,
  total_capacity,
  current_count,
  status
FROM rack_configurations
ORDER BY rack_number;

-- 3. Count rack locations
SELECT 
  rc.rack_code,
  COUNT(*) as position_count
FROM rack_locations rl
JOIN rack_configurations rc ON rc.id = rl.rack_id
GROUP BY rc.rack_code;

-- 4. Check for specific warehouse
-- Replace with your warehouse ID from step 1
SELECT 
  *
FROM rack_configurations
WHERE warehouse_id = (SELECT id FROM warehouse_locations WHERE code = 'WH1');
