-- ============================================================================
-- FIX BARCODE PRODUCT MISMATCH
-- ============================================================================
-- This script helps identify and fix barcodes linked to wrong products

-- STEP 1: IDENTIFY THE PROBLEM
-- ============================================================================

-- A. Find all barcodes with unexpected sizes
SELECT 
  b.id as barcode_id,
  b.barcode_value,
  p.id as current_product_id,
  p.sku,
  p.dimensions as current_size,
  p.brand,
  p.model,
  bat.batch_number,
  b.created_at
FROM barcodes b
LEFT JOIN products p ON b.product_id = p.id
LEFT JOIN batches bat ON b.batch_id = bat.id
WHERE p.dimensions NOT LIKE '%120/80-18%'  -- Adjust this to your expected size
ORDER BY b.created_at DESC;

-- B. Find the CORRECT product that should be used
SELECT 
  id as correct_product_id,
  sku,
  brand,
  model,
  name,
  dimensions as correct_size,
  category
FROM products
WHERE dimensions ILIKE '%120/80-18%'  -- Your expected size
LIMIT 5;

-- STEP 2: VERIFY BATCH CONFIGURATION
-- ============================================================================

-- Check if batches are linked to correct products
SELECT 
  bat.id,
  bat.batch_number,
  bat.product_id as batch_product_id,
  p.dimensions as batch_product_size,
  p.sku,
  COUNT(b.id) as barcode_count
FROM batches bat
LEFT JOIN products p ON bat.product_id = p.id
LEFT JOIN barcodes b ON b.batch_id = bat.id
WHERE bat.status = 'ACTIVE'
GROUP BY bat.id, bat.batch_number, bat.product_id, p.dimensions, p.sku
ORDER BY bat.created_at DESC;

-- STEP 3: FIX OPTIONS
-- ============================================================================

-- OPTION A: Delete incorrect barcodes (RECOMMENDED)
-- Then regenerate them with the correct product in the UI

/*
-- ⚠️ UNCOMMENT AND RUN THIS TO DELETE BARCODES WITH WRONG PRODUCT
DELETE FROM barcodes
WHERE product_id IN (
  SELECT id FROM products 
  WHERE dimensions LIKE '%060/80-80%'  -- Adjust to the WRONG size
)
RETURNING barcode_value, product_id;
*/

-- OPTION B: Update barcodes to link to correct product (USE WITH CAUTION)
-- This keeps the same barcode numbers but changes the product link

/*
-- ⚠️ STEP 1: Find the correct product ID first!
-- Replace 'CORRECT_PRODUCT_ID_HERE' with actual UUID from STEP 1B query

UPDATE barcodes
SET product_id = 'CORRECT_PRODUCT_ID_HERE'  -- ← Replace this!
WHERE product_id IN (
  SELECT id FROM products 
  WHERE dimensions LIKE '%060/80-80%'  -- The WRONG size to fix
)
RETURNING barcode_value, product_id;
*/

-- OPTION C: Fix batch metadata if using batch positions
-- If your batch has metadata.products_with_positions with wrong product IDs

/*
-- Example: Update batch metadata to correct product
UPDATE batches
SET metadata = jsonb_set(
  metadata,
  '{products_with_positions,0,product_id}',
  '"CORRECT_PRODUCT_ID_HERE"'::jsonb
)
WHERE id = 'BATCH_ID_HERE';
*/

-- STEP 4: VERIFICATION
-- ============================================================================

-- After fixing, verify all barcodes have correct product linkage
SELECT 
  b.barcode_value,
  p.dimensions as size,
  p.sku,
  p.brand || ' ' || p.model as product_name,
  bat.batch_number,
  CASE 
    WHEN p.dimensions ILIKE '%120/80-18%' THEN '✅ CORRECT'
    ELSE '❌ WRONG SIZE: ' || p.dimensions
  END as status
FROM barcodes b
LEFT JOIN products p ON b.product_id = p.id
LEFT JOIN batches bat ON b.batch_id = bat.id
WHERE b.created_at > NOW() - INTERVAL '7 days'  -- Recent barcodes
ORDER BY b.created_at DESC
LIMIT 50;

-- STEP 5: VALIDATE SCANNING LOGIC
-- ============================================================================

-- Test the exact validation logic used by the backend
-- This simulates what happens when you scan a barcode

SELECT 
  b.barcode_value,
  p.dimensions as actual_size,
  CASE 
    WHEN LOWER(TRIM(REPLACE(p.dimensions, ' ', ''))) = LOWER(TRIM(REPLACE('120/80-18', ' ', '')))
    THEN '✅ MATCH - Scan will succeed'
    ELSE '❌ MISMATCH - Scan will fail with: Expected 120/80-18, Got ' || p.dimensions
  END as validation_result,
  p.sku,
  p.brand,
  p.model
FROM barcodes b
LEFT JOIN products p ON b.product_id = p.id
WHERE b.created_at > NOW() - INTERVAL '7 days'
ORDER BY b.created_at DESC
LIMIT 30;

-- ============================================================================
-- PREVENTION: Check product catalog
-- ============================================================================

-- Make sure you have the correct products defined
SELECT 
  id,
  sku,
  brand,
  model,
  name,
  dimensions,
  category,
  status,
  'Product ID: ' || id as copy_this_id
FROM products
WHERE status = 'active'
  AND (
    dimensions ILIKE '%120/80-18%'
    OR sku ILIKE '%1208018%'
    OR sku ILIKE '%120/80-18%'
  )
ORDER BY brand, model;

-- List ALL active products to see what's available
SELECT 
  id,
  sku,
  brand,
  model,
  dimensions,
  category
FROM products
WHERE status = 'active'
ORDER BY brand, model, dimensions;
