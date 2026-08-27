-- ============================================================================
-- CHECK BARCODE WAREHOUSE LOCATION DATA
-- ============================================================================
-- Verify that barcodes generated from batches with assigned positions
-- properly store warehouse location data in inventory_units
-- ============================================================================

-- Check latest barcodes with their warehouse location data
SELECT 
  b.barcode_value,
  b.created_at,
  bat.batch_number,
  bat.metadata->>'warehouse_code' as batch_warehouse_code,
  iu.warehouse_id,
  iu.rack,
  iu.shelf_number,
  iu.section_number,
  iu.subsection_number,
  iu.position_code,
  w.code as warehouse_code,
  w.name as warehouse_name
FROM barcodes b
INNER JOIN inventory_units iu ON b.inventory_unit_id = iu.id
INNER JOIN batches bat ON b.batch_id = bat.id
LEFT JOIN warehouses w ON iu.warehouse_id = w.id
ORDER BY b.created_at DESC
LIMIT 20;

-- Count barcodes with vs without warehouse location
SELECT 
  'Barcodes WITH warehouse location' as category,
  COUNT(*) as count
FROM barcodes b
INNER JOIN inventory_units iu ON b.inventory_unit_id = iu.id
WHERE iu.warehouse_id IS NOT NULL AND iu.rack IS NOT NULL

UNION ALL

SELECT 
  'Barcodes WITHOUT warehouse location' as category,
  COUNT(*) as count
FROM barcodes b
INNER JOIN inventory_units iu ON b.inventory_unit_id = iu.id
WHERE iu.warehouse_id IS NULL AND iu.rack IS NULL;

-- Check batches with assigned positions metadata
SELECT 
  batch_number,
  created_at,
  metadata->>'warehouse_code' as warehouse_code,
  jsonb_array_length(metadata->'products_with_positions') as num_products,
  (
    SELECT COUNT(*) 
    FROM barcodes 
    WHERE batch_id = batches.id
  ) as barcode_count
FROM batches
WHERE metadata->'products_with_positions' IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Find a specific barcode by value (if it exists)
SELECT 
  b.*,
  iu.warehouse_id,
  iu.rack,
  iu.position_code,
  bat.batch_number,
  bat.metadata->>'warehouse_code' as batch_warehouse
FROM barcodes b
LEFT JOIN inventory_units iu ON b.inventory_unit_id = iu.id
LEFT JOIN batches bat ON b.batch_id = bat.id
WHERE b.barcode_value = 'RIC000000003182';
