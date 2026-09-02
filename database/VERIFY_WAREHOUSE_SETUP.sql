-- ============================================================================
-- VERIFY WAREHOUSE RACK SYSTEM SETUP
-- ============================================================================
-- Run this in Supabase to confirm everything was created correctly
-- ============================================================================

-- 1. Check warehouses
SELECT 
  code,
  name,
  zone,
  aisle,
  total_racks,
  status
FROM warehouse_locations
ORDER BY code;

-- 2. Check racks
SELECT 
  rack_code,
  rack_number,
  designated_size,
  size_category,
  total_shelves,
  sections_per_shelf,
  subsections_per_section,
  capacity_per_subsection,
  total_capacity,
  current_count,
  status
FROM rack_configurations
ORDER BY rack_number;

-- 3. Count rack locations
SELECT 
  rc.rack_code,
  COUNT(*) as total_positions,
  SUM(rl.capacity) as total_capacity,
  SUM(rl.current_count) as total_used,
  SUM(rl.available_space) as total_available
FROM rack_locations rl
JOIN rack_configurations rc ON rc.id = rl.rack_id
GROUP BY rc.rack_code
ORDER BY rc.rack_code;

-- 4. Sample positions from RACK-1
SELECT 
  position_code,
  shelf_number,
  section_number,
  subsection_number,
  capacity,
  current_count,
  available_space,
  status
FROM rack_locations rl
JOIN rack_configurations rc ON rc.id = rl.rack_id
WHERE rc.rack_code = 'WH1-RACK-1'
ORDER BY shelf_number, section_number, subsection_number
LIMIT 10;

-- 5. Total system capacity
SELECT 
  COUNT(DISTINCT wl.id) as total_warehouses,
  COUNT(DISTINCT rc.id) as total_racks,
  COUNT(rl.id) as total_positions,
  SUM(rl.capacity) as total_capacity
FROM warehouse_locations wl
LEFT JOIN rack_configurations rc ON rc.warehouse_id = wl.id
LEFT JOIN rack_locations rl ON rl.rack_id = rc.id;
