-- ============================================================================
-- FIX ORPHANED INVENTORY UNITS AND RACK COUNT
-- ============================================================================
-- Problem: Barcodes were deleted but inventory_units still have warehouse/rack assigned
-- This script clears those orphaned assignments and fixes rack counts
-- ============================================================================

BEGIN;

-- 1. Find and clear orphaned inventory_units (units with warehouse/rack but no barcode)
WITH orphaned_units AS (
  SELECT iu.id, iu.warehouse_id, iu.rack
  FROM inventory_units iu
  LEFT JOIN barcodes b ON b.inventory_unit_id = iu.id
  WHERE iu.warehouse_id IS NOT NULL 
    AND iu.rack IS NOT NULL
    AND b.id IS NULL
)
UPDATE inventory_units
SET warehouse_id = NULL,
    rack = NULL,
    assigned_at = NULL
WHERE id IN (SELECT id FROM orphaned_units);

-- 2. Reset all rack counts to 0 first
UPDATE rack_configurations
SET current_count = 0;

-- 3. Update rack counts based on ACTUAL active barcodes
WITH rack_counts AS (
  SELECT 
    iu.warehouse_id,
    iu.rack as rack_code,
    COUNT(*) as barcode_count
  FROM barcodes b
  INNER JOIN inventory_units iu ON b.inventory_unit_id = iu.id
  WHERE b.status = 'active'
    AND iu.warehouse_id IS NOT NULL
    AND iu.rack IS NOT NULL
  GROUP BY iu.warehouse_id, iu.rack
)
UPDATE rack_configurations rc
SET current_count = COALESCE(rack_counts.barcode_count, 0)
FROM rack_counts
WHERE rc.warehouse_id = rack_counts.warehouse_id
  AND rc.rack_code = rack_counts.rack_code;

-- 4. Show results
SELECT 
  rc.rack_code,
  rc.current_count as rack_count,
  COUNT(b.id) as actual_barcode_count
FROM rack_configurations rc
LEFT JOIN inventory_units iu ON iu.warehouse_id = rc.warehouse_id AND iu.rack = rc.rack_code
LEFT JOIN barcodes b ON b.inventory_unit_id = iu.id AND b.status = 'active'
WHERE rc.warehouse_id = 'b1eff6be-b968-4861-94c2-f220e4eeffed'
GROUP BY rc.rack_code, rc.current_count
ORDER BY rc.rack_code;

COMMIT;

-- Verification: Show any remaining orphaned units
SELECT 
  iu.id,
  iu.inventory_unit_code,
  iu.warehouse_id,
  iu.rack,
  b.id as barcode_id
FROM inventory_units iu
LEFT JOIN barcodes b ON b.inventory_unit_id = iu.id
WHERE iu.warehouse_id IS NOT NULL 
  AND iu.rack IS NOT NULL
  AND b.id IS NULL
LIMIT 10;
