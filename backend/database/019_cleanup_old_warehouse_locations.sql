-- ============================================================================
-- 019: CLEANUP OLD WAREHOUSE LOCATIONS TEST DATA
-- ============================================================================
-- This script removes old test/sample data from warehouse_locations table
-- Run this BEFORE running 020_fix_warehouses_properly.sql
-- ============================================================================

-- Remove all old test/sample data
DELETE FROM warehouse_locations
WHERE code IN (
  'A-01-01-01',
  'A-01-01-02', 
  'A-01-02-01',
  'B-02-01-01',
  'B-02-01-02',
  'B-02-02-01',
  'C-03-01-01',
  'C-03-01-02',
  'D-04-01-01'
);

-- Show what remains
SELECT 
  id,
  code,
  name,
  zone,
  aisle,
  rack,
  shelf,
  capacity,
  current_stock,
  status,
  created_at
FROM warehouse_locations
ORDER BY created_at DESC;

-- ============================================================================
-- DONE! 
-- Old test data removed.
-- Now run 020_fix_warehouses_properly.sql to move WH1/WH2 to correct table
-- ============================================================================
