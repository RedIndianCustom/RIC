-- ============================================================================
-- USE EXISTING WAREHOUSE SYSTEM (Option 1)
-- ============================================================================
-- Your warehouse_locations table already has Zone/Aisle/Rack/Shelf structure
-- This is MORE DETAILED than the new rack system we tried to add
-- Let's use the existing system instead!
-- ============================================================================

-- 1. Check existing warehouse locations (these are actual positions, not warehouses!)
SELECT 
  id,
  name,
  code,
  zone,
  aisle,
  level,
  rack,
  shelf,
  section,
  status
FROM warehouse_locations
ORDER BY zone, aisle, rack, shelf;

-- 2. Count existing locations
SELECT 
  zone,
  COUNT(*) as location_count
FROM warehouse_locations
GROUP BY zone
ORDER BY zone;

-- These ARE your storage positions!
-- Each row is a specific location like "Zone A - Aisle 1 - Rack 1 - Shelf 1"

-- ============================================================================
-- DECISION: Keep existing system or use new rack system?
-- ============================================================================

-- OPTION A: Use existing warehouse_locations (RECOMMENDED - already has data)
-- - Each row = specific storage position
-- - Very detailed: Zone → Aisle → Rack → Shelf → Section
-- - Already integrated with your current system

-- OPTION B: Migrate to new rack_configurations system
-- - More organized for tire warehouses
-- - Easier capacity tracking
-- - Requires data migration

-- ============================================================================
-- If you want to keep existing system, run this:
-- ============================================================================

-- Add warehouse selector (top-level only)
-- Create a simple lookup view for dropdowns
CREATE OR REPLACE VIEW warehouse_zones AS
SELECT DISTINCT
  zone as warehouse_name,
  zone as warehouse_code,
  COUNT(*) as total_positions
FROM warehouse_locations
WHERE status = 'active'
GROUP BY zone
ORDER BY zone;

-- View all positions grouped
CREATE OR REPLACE VIEW warehouse_positions_grouped AS
SELECT 
  zone,
  aisle,
  rack,
  shelf,
  COUNT(*) as position_count,
  ARRAY_AGG(id) as position_ids
FROM warehouse_locations
WHERE status = 'active'
GROUP BY zone, aisle, rack, shelf
ORDER BY zone, aisle, rack, shelf;

-- Check the views
SELECT * FROM warehouse_zones;
SELECT * FROM warehouse_positions_grouped;
