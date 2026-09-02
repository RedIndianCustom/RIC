-- ============================================================================
-- TEST SIZE VALIDATION MATCHING
-- ============================================================================
-- This script tests if the size normalization will work correctly

-- ============================================================================
-- STEP 1: Show actual data in database
-- ============================================================================

SELECT 
  '📊 ACTUAL DATA IN DATABASE' as section,
  '' as blank;

SELECT 
  b.barcode_value,
  p.dimensions as stored_dimension,
  p.sku,
  p.brand || ' ' || p.model as product_name,
  -- Show what it will normalize to
  LOWER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(p.dimensions, '\s+', '', 'g'), '[/-_]', '/', 'g'), '[^0-9/]', '', 'g'))) as normalized_dimension
FROM barcodes b
LEFT JOIN products p ON b.product_id = p.id
WHERE p.dimensions IS NOT NULL
ORDER BY b.created_at DESC
LIMIT 20;

-- ============================================================================
-- STEP 2: Test normalization for common sizes
-- ============================================================================

SELECT 
  '' as blank,
  '🧪 TEST NORMALIZATION' as section;

WITH test_sizes AS (
  SELECT unnest(ARRAY[
    '90/90-17',
    '90-90-17',
    '90/90/17',
    ' 90 / 90 - 17 ',
    '  90/90-17  ',
    '120/80-18',
    '120-80-18',
    '120/80/18',
    ' 120 / 80 - 18 '
  ]) as test_value
)
SELECT 
  test_value as original,
  LOWER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(test_value, '\s+', '', 'g'), '[/-_]', '/', 'g'), '[^0-9/]', '', 'g'))) as normalized,
  -- Test if it matches the expected normalized format
  CASE 
    WHEN LOWER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(test_value, '\s+', '', 'g'), '[/-_]', '/', 'g'), '[^0-9/]', '', 'g'))) = '90/90/17'
    THEN '✅ Matches 90/90-17'
    WHEN LOWER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(test_value, '\s+', '', 'g'), '[/-_]', '/', 'g'), '[^0-9/]', '', 'g'))) = '120/80/18'
    THEN '✅ Matches 120/80-18'
    ELSE '❓ Different size'
  END as validation_result
FROM test_sizes;

-- ============================================================================
-- STEP 3: Check if your products will match
-- ============================================================================

SELECT 
  '' as blank,
  '✅ VALIDATION TEST - Will your barcodes match?' as section;

WITH normalized_products AS (
  SELECT 
    b.barcode_value,
    p.dimensions as original_dimension,
    LOWER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(p.dimensions, '\s+', '', 'g'), '[/-_]', '/', 'g'), '[^0-9/]', '', 'g'))) as normalized
  FROM barcodes b
  LEFT JOIN products p ON b.product_id = p.id
  WHERE p.dimensions IS NOT NULL
)
SELECT 
  barcode_value,
  original_dimension,
  normalized,
  CASE 
    WHEN normalized = '90/90/17' THEN '✅ Will match when scanning for: 90/90-17'
    WHEN normalized = '120/80/18' THEN '✅ Will match when scanning for: 120/80-18'
    WHEN normalized = '110/80/17' THEN '✅ Will match when scanning for: 110/80-17'
    WHEN normalized = '70/90/17' THEN '✅ Will match when scanning for: 70/90-17'
    WHEN normalized = '80/100/18' THEN '✅ Will match when scanning for: 80/100-18'
    ELSE '⚠️  Will only match exact: ' || original_dimension
  END as match_prediction
FROM normalized_products
ORDER BY normalized
LIMIT 30;

-- ============================================================================
-- STEP 4: Find mismatches (if any)
-- ============================================================================

SELECT 
  '' as blank,
  '🔍 POTENTIAL ISSUES' as section;

SELECT 
  b.barcode_value,
  p.dimensions as stored_dimension,
  p.sku,
  CASE 
    WHEN p.dimensions IS NULL OR p.dimensions = '' THEN '❌ EMPTY DIMENSIONS'
    WHEN p.dimensions = '000/00-00' THEN '❌ INVALID PLACEHOLDER'
    WHEN LENGTH(p.dimensions) < 5 THEN '⚠️  TOO SHORT - might be incomplete'
    WHEN p.dimensions !~ '\d+[/-]\d+[/-]\d+' THEN '⚠️  FORMAT INCORRECT - not matching pattern'
    ELSE '✅ OK'
  END as issue_check
FROM barcodes b
LEFT JOIN products p ON b.product_id = p.id
WHERE p.dimensions IS NULL 
   OR p.dimensions = ''
   OR p.dimensions = '000/00-00'
   OR LENGTH(p.dimensions) < 5
   OR p.dimensions !~ '\d+[/-]\d+[/-]\d+'
LIMIT 20;

-- ============================================================================
-- STEP 5: Show all unique dimension formats
-- ============================================================================

SELECT 
  '' as blank,
  '📋 ALL DIMENSION FORMATS IN YOUR DATABASE' as section;

SELECT DISTINCT
  dimensions as stored_format,
  LOWER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(dimensions, '\s+', '', 'g'), '[/-_]', '/', 'g'), '[^0-9/]', '', 'g'))) as normalized_format,
  COUNT(*) as product_count,
  STRING_AGG(DISTINCT sku, ', ') as example_skus
FROM products
WHERE dimensions IS NOT NULL AND dimensions != ''
GROUP BY dimensions
ORDER BY COUNT(*) DESC, dimensions;
