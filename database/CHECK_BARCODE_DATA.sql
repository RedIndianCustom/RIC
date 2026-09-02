-- ============================================================================
-- CHECK BARCODE DATA WITH RELATIONSHIPS
-- ============================================================================

-- 1. Check raw barcode data
SELECT 
  barcode_value,
  product_id,
  batch_id,
  inventory_unit_id,
  status,
  created_at
FROM barcodes
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check if products exist
SELECT 
  COUNT(*) as total_products,
  COUNT(DISTINCT id) as unique_products
FROM products;

-- 3. Check if batches exist
SELECT 
  COUNT(*) as total_batches,
  COUNT(DISTINCT id) as unique_batches
FROM batches;

-- 4. Check barcode with full join to see what's missing
SELECT 
  b.barcode_value,
  b.product_id as barcode_product_id,
  p.id as product_exists,
  p.sku as product_sku,
  p.brand as product_brand,
  p.model as product_model,
  bat.id as batch_exists,
  bat.batch_number
FROM barcodes b
LEFT JOIN products p ON b.product_id = p.id
LEFT JOIN batches bat ON b.batch_id = bat.id
ORDER BY b.created_at DESC
LIMIT 5;

-- 5. Test the RPC function directly
SELECT * FROM get_barcodes_with_traceability(5);
