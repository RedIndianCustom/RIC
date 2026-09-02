-- ============================================================================
-- DIAGNOSTIC: Check Barcode-Product Linkage
-- ============================================================================
-- This script checks what product is linked to the scanned barcode
-- and verifies the product dimensions

-- 1. Find the barcode that was scanned
SELECT 
  b.id as barcode_id,
  b.barcode_value,
  b.product_id,
  b.batch_id,
  b.status,
  b.created_at
FROM barcodes b
WHERE b.barcode_value LIKE '%060%'  -- Adjust this based on the actual barcode
   OR b.barcode_value LIKE '%080%'
ORDER BY b.created_at DESC
LIMIT 10;

-- 2. Check what product this barcode is linked to
SELECT 
  b.barcode_value,
  p.id as product_id,
  p.sku,
  p.brand,
  p.model,
  p.name,
  p.dimensions,
  p.category,
  bat.batch_number
FROM barcodes b
LEFT JOIN products p ON b.product_id = p.id
LEFT JOIN batches bat ON b.batch_id = bat.id
WHERE b.barcode_value LIKE '%060%'
   OR b.barcode_value LIKE '%080%'
ORDER BY b.created_at DESC
LIMIT 10;

-- 3. Check ALL products with 120/80-18 size
SELECT 
  id,
  sku,
  brand,
  model,
  name,
  dimensions,
  category,
  status
FROM products
WHERE dimensions ILIKE '%120/80-18%'
   OR dimensions ILIKE '%120/80%18%'
   OR dimensions ILIKE '%1208018%';

-- 4. Check if there are any barcodes for the CORRECT product (120/80-18)
SELECT 
  b.barcode_value,
  p.dimensions,
  p.sku,
  p.brand,
  p.model,
  bat.batch_number,
  COUNT(*) OVER() as total_barcodes_for_this_size
FROM barcodes b
LEFT JOIN products p ON b.product_id = p.id
LEFT JOIN batches bat ON b.batch_id = bat.id
WHERE p.dimensions ILIKE '%120/80-18%'
ORDER BY b.created_at DESC
LIMIT 20;

-- 5. Check the most recent barcodes generated
SELECT 
  b.barcode_value,
  p.dimensions as product_size,
  p.sku,
  p.brand || ' ' || p.model as product_name,
  bat.batch_number,
  b.created_at
FROM barcodes b
LEFT JOIN products p ON b.product_id = p.id
LEFT JOIN batches bat ON b.batch_id = bat.id
ORDER BY b.created_at DESC
LIMIT 30;
