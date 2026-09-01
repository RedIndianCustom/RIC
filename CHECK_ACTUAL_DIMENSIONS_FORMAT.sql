-- ============================================================================
-- CHECK ACTUAL DIMENSIONS FORMAT IN DATABASE
-- ============================================================================
-- This will show us EXACTLY how dimensions are stored vs what's expected

-- Show all recent barcodes with their product dimensions
SELECT 
  b.barcode_value,
  p.sku,
  p.brand,
  p.model,
  p.dimensions as stored_in_db,
  LENGTH(p.dimensions) as length_chars,
  p.dimensions = '90/90-17' as exact_match_90_90_17,
  p.dimensions = '120/80-18' as exact_match_120_80_18,
  p.dimensions ILIKE '%90/90-17%' as contains_90_90_17,
  p.dimensions ILIKE '%120/80-18%' as contains_120_80_18,
  -- Show hex representation to see hidden characters
  ENCODE(p.dimensions::bytea, 'hex') as hex_representation
FROM barcodes b
LEFT JOIN products p ON b.product_id = p.id
ORDER BY b.created_at DESC
LIMIT 10;

-- Show all distinct dimension values
SELECT DISTINCT
  dimensions as actual_dimension_value,
  LENGTH(dimensions) as char_count,
  COUNT(*) as products_with_this_dimension,
  ENCODE(dimensions::bytea, 'hex') as hex_to_check_hidden_chars
FROM products
WHERE dimensions IS NOT NULL AND dimensions != ''
GROUP BY dimensions
ORDER BY COUNT(*) DESC;

-- Show products that SHOULD match 90/90-17
SELECT 
  id,
  sku,
  dimensions,
  dimensions = '90/90-17' as exact_match,
  LOWER(TRIM(dimensions)) = '90/90-17' as normalized_match,
  REPLACE(REPLACE(LOWER(TRIM(dimensions)), ' ', ''), '-', '/') as normalized_version
FROM products
WHERE dimensions ILIKE '%90%90%17%'
   OR sku ILIKE '%90%90%17%';

-- Show products that SHOULD match 120/80-18
SELECT 
  id,
  sku,
  dimensions,
  dimensions = '120/80-18' as exact_match,
  LOWER(TRIM(dimensions)) = '120/80-18' as normalized_match,
  REPLACE(REPLACE(LOWER(TRIM(dimensions)), ' ', ''), '-', '/') as normalized_version
FROM products
WHERE dimensions ILIKE '%120%80%18%'
   OR sku ILIKE '%120%80%18%';
