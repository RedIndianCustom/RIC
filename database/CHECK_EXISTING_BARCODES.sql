-- ============================================================================
-- CHECK WHAT BARCODES EXIST IN DATABASE
-- ============================================================================

-- 1. Check total count
SELECT COUNT(*) as total_barcodes FROM barcodes;

-- 2. Check recent barcodes (last 10)
SELECT 
  id,
  barcode_value,
  product_id,
  batch_id,
  status,
  created_at
FROM barcodes
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check if specific barcode exists
SELECT 
  id,
  barcode_value,
  product_id,
  batch_id,
  shipment_id,
  inventory_unit_id,
  status,
  created_at
FROM barcodes
WHERE barcode_value = 'RIC000000002154';

-- 4. Check barcode sequence current value
SELECT last_value FROM barcode_sequence;

-- 5. Check if RPC function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'create_inventory_barcodes';

-- 6. Check inventory_units table
SELECT COUNT(*) as total_inventory_units FROM inventory_units;

-- 7. Recent inventory units
SELECT 
  id,
  inventory_unit_code,
  product_id,
  batch_id,
  status,
  created_at
FROM inventory_units
ORDER BY created_at DESC
LIMIT 5;
