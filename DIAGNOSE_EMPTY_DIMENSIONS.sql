-- ============================================================================
-- DIAGNOSE BARCODES WITH EMPTY OR INVALID DIMENSIONS
-- ============================================================================
-- This checks for barcodes that have no product or products with empty dimensions

-- ISSUE: Error shows "Expected: 90/90-17 Scanned: 000/00-00"
-- This means the barcode has either:
--   1. No product linked (product_id is NULL)
--   2. Product exists but dimensions field is empty or "000/00-00"

-- ============================================================================
-- STEP 1: Find barcodes with NULL product_id
-- ============================================================================

SELECT 
  '🔍 BARCODES WITH NO PRODUCT LINKED' as check_type,
  COUNT(*) as count
FROM barcodes
WHERE product_id IS NULL;

SELECT 
  b.id,
  b.barcode_value,
  b.product_id,
  b.batch_id,
  b.shipment_id,
  b.created_at,
  'NO PRODUCT LINKED' as issue
FROM barcodes b
WHERE b.product_id IS NULL
ORDER BY b.created_at DESC
LIMIT 20;

-- ============================================================================
-- STEP 2: Find products with empty or invalid dimensions
-- ============================================================================

SELECT 
  '🔍 PRODUCTS WITH EMPTY DIMENSIONS' as check_type,
  COUNT(*) as count
FROM products
WHERE dimensions IS NULL 
   OR dimensions = '' 
   OR dimensions = '000/00-00'
   OR TRIM(dimensions) = '';

SELECT 
  p.id,
  p.sku,
  p.brand,
  p.model,
  p.name,
  p.dimensions,
  p.category,
  'EMPTY OR INVALID DIMENSIONS' as issue
FROM products p
WHERE p.dimensions IS NULL 
   OR p.dimensions = '' 
   OR p.dimensions = '000/00-00'
   OR TRIM(p.dimensions) = ''
ORDER BY p.created_at DESC;

-- ============================================================================
-- STEP 3: Find barcodes linked to products with empty dimensions
-- ============================================================================

SELECT 
  '🔍 BARCODES LINKED TO PRODUCTS WITH EMPTY DIMENSIONS' as check_type,
  COUNT(*) as count
FROM barcodes b
JOIN products p ON b.product_id = p.id
WHERE p.dimensions IS NULL 
   OR p.dimensions = '' 
   OR p.dimensions = '000/00-00'
   OR TRIM(p.dimensions) = '';

SELECT 
  b.barcode_value,
  b.product_id,
  p.sku,
  p.brand,
  p.model,
  p.dimensions,
  bat.batch_number,
  s.shipment_number,
  'PRODUCT HAS EMPTY DIMENSIONS' as issue
FROM barcodes b
JOIN products p ON b.product_id = p.id
LEFT JOIN batches bat ON b.batch_id = bat.id
LEFT JOIN shipments s ON b.shipment_id = s.id
WHERE p.dimensions IS NULL 
   OR p.dimensions = '' 
   OR p.dimensions = '000/00-00'
   OR TRIM(p.dimensions) = ''
ORDER BY b.created_at DESC
LIMIT 30;

-- ============================================================================
-- STEP 4: Check recent barcodes and their product info
-- ============================================================================

SELECT 
  '📊 RECENT BARCODES - PRODUCT CHECK' as section;

SELECT 
  b.barcode_value,
  b.product_id,
  CASE 
    WHEN b.product_id IS NULL THEN '❌ NO PRODUCT'
    ELSE '✓ Has Product'
  END as has_product,
  p.sku,
  p.brand,
  p.model,
  COALESCE(p.dimensions, 'NULL') as dimensions,
  CASE 
    WHEN b.product_id IS NULL THEN '❌ BARCODE HAS NO PRODUCT'
    WHEN p.dimensions IS NULL OR p.dimensions = '' THEN '❌ PRODUCT HAS EMPTY DIMENSIONS'
    WHEN p.dimensions = '000/00-00' THEN '❌ PRODUCT HAS INVALID DIMENSIONS (000/00-00)'
    ELSE '✅ OK'
  END as status
FROM barcodes b
LEFT JOIN products p ON b.product_id = p.id
ORDER BY b.created_at DESC
LIMIT 50;

-- ============================================================================
-- STEP 5: Check if products exist for expected size (90/90-17)
-- ============================================================================

SELECT 
  '🔍 PRODUCTS FOR SIZE 90/90-17' as check_type;

SELECT 
  id,
  sku,
  brand,
  model,
  name,
  dimensions,
  category,
  status,
  'This is the correct product to use' as note
FROM products
WHERE dimensions ILIKE '%90/90-17%'
   OR dimensions ILIKE '%90/90%17%'
   OR sku ILIKE '%90%90%17%';

-- ============================================================================
-- STEP 6: Check batch metadata for product assignments
-- ============================================================================

SELECT 
  '🔍 RECENT BATCHES - CHECK METADATA' as section;

SELECT 
  bat.id,
  bat.batch_number,
  bat.product_id as batch_product_id,
  p.dimensions as batch_product_dimensions,
  bat.metadata -> 'products_with_positions' as products_with_positions,
  CASE 
    WHEN bat.product_id IS NULL THEN '⚠️  Batch has no product_id'
    WHEN p.dimensions IS NULL OR p.dimensions = '' THEN '❌ Batch product has empty dimensions'
    ELSE '✅ Batch product OK'
  END as batch_status
FROM batches bat
LEFT JOIN products p ON bat.product_id = p.id
ORDER BY bat.created_at DESC
LIMIT 10;

-- ============================================================================
-- SOLUTION QUERIES
-- ============================================================================

SELECT 
  '' as blank,
  '🔧 SOLUTIONS' as section;

-- Solution 1: If products have empty dimensions, update them
SELECT '
-- If products exist but have empty dimensions, update them:

UPDATE products
SET dimensions = ''90/90-17'',  -- Replace with actual size
    updated_at = NOW()
WHERE sku = ''YOUR_SKU_HERE''  -- Replace with actual SKU
  AND (dimensions IS NULL OR dimensions = '''' OR dimensions = ''000/00-00'');

' as solution_1_fix_product_dimensions;

-- Solution 2: If barcodes have no product, link them to correct product
SELECT '
-- If barcodes have no product_id, link them to correct product:

-- First, find the correct product ID:
SELECT id FROM products WHERE dimensions ILIKE ''%90/90-17%'';

-- Then update barcodes:
UPDATE barcodes
SET product_id = ''PASTE_PRODUCT_ID_HERE'',
    updated_at = NOW()
WHERE product_id IS NULL
   OR product_id IN (
     SELECT id FROM products 
     WHERE dimensions IS NULL OR dimensions = '''' OR dimensions = ''000/00-00''
   );

' as solution_2_link_barcodes_to_product;

-- Solution 3: Delete bad barcodes and regenerate
SELECT '
-- If barcodes are fundamentally wrong, delete and regenerate:

-- Delete barcodes with no product or empty dimensions:
DELETE FROM barcodes
WHERE product_id IS NULL
   OR product_id IN (
     SELECT id FROM products 
     WHERE dimensions IS NULL OR dimensions = '''' OR dimensions = ''000/00-00''
   );

-- Then go to Barcode Generation page and regenerate with correct product!

' as solution_3_delete_and_regenerate;
