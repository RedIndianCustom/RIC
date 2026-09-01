-- ============================================================================
-- AUTO-FIX BARCODE PRODUCT MISMATCH
-- ============================================================================
-- This script automatically fixes barcodes that are linked to wrong products
-- based on the product dimensions/size field

-- STEP 1: DIAGNOSTIC - See what's wrong
-- ============================================================================

DO $$
DECLARE
  wrong_count INTEGER;
  correct_product_id UUID;
  correct_product_record RECORD;
BEGIN
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔍 BARCODE PRODUCT MISMATCH DIAGNOSTIC';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Count barcodes with wrong size (060/80-80)
  SELECT COUNT(*) INTO wrong_count
  FROM barcodes b
  JOIN products p ON b.product_id = p.id
  WHERE p.dimensions LIKE '%060/80%';
  
  RAISE NOTICE '❌ Found % barcodes linked to WRONG size (060/80-80)', wrong_count;
  RAISE NOTICE '';
  
  -- Find the correct product (120/80-18)
  SELECT id, sku, brand, model, dimensions 
  INTO correct_product_record
  FROM products
  WHERE dimensions ILIKE '%120/80-18%'
  LIMIT 1;
  
  IF FOUND THEN
    RAISE NOTICE '✅ Found CORRECT product:';
    RAISE NOTICE '   ID: %', correct_product_record.id;
    RAISE NOTICE '   SKU: %', correct_product_record.sku;
    RAISE NOTICE '   Product: % %', correct_product_record.brand, correct_product_record.model;
    RAISE NOTICE '   Size: %', correct_product_record.dimensions;
    RAISE NOTICE '';
    
    IF wrong_count > 0 THEN
      RAISE NOTICE '🔧 Ready to fix % barcodes', wrong_count;
      RAISE NOTICE '   Will change product_id from WRONG (060/80-80) to CORRECT (120/80-18)';
    ELSE
      RAISE NOTICE '✓ No barcodes need fixing!';
    END IF;
  ELSE
    RAISE NOTICE '⚠️  WARNING: Could not find product for size 120/80-18';
    RAISE NOTICE '   You need to create this product first before fixing barcodes';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
END $$;

-- STEP 2: SHOW AFFECTED BARCODES
-- ============================================================================

SELECT 
  '📋 AFFECTED BARCODES (Will be updated)' as section,
  '' as blank;

SELECT 
  b.barcode_value,
  p.dimensions as current_wrong_size,
  p.sku as current_sku,
  p.brand || ' ' || p.model as current_product,
  '→ will change to →' as arrow,
  '120/80-18' as new_size
FROM barcodes b
JOIN products p ON b.product_id = p.id
WHERE p.dimensions LIKE '%060/80%'
ORDER BY b.created_at DESC
LIMIT 20;

-- STEP 3: PERFORM THE FIX
-- ============================================================================
-- ⚠️ UNCOMMENT THE SECTION BELOW TO ACTUALLY FIX THE BARCODES

/*
DO $$
DECLARE
  correct_product_id UUID;
  updated_count INTEGER;
  barcode_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔧 EXECUTING FIX';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  
  -- Get correct product ID
  SELECT id INTO correct_product_id
  FROM products
  WHERE dimensions ILIKE '%120/80-18%'
  LIMIT 1;
  
  IF correct_product_id IS NULL THEN
    RAISE EXCEPTION '❌ ERROR: Product for size 120/80-18 not found. Create it first!';
  END IF;
  
  RAISE NOTICE 'Correct product ID: %', correct_product_id;
  RAISE NOTICE '';
  
  -- Update barcodes
  UPDATE barcodes
  SET product_id = correct_product_id,
      updated_at = NOW()
  WHERE product_id IN (
    SELECT id FROM products 
    WHERE dimensions LIKE '%060/80%'
  );
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RAISE NOTICE '✅ Updated % barcodes to correct product', updated_count;
  RAISE NOTICE '';
  
  -- Show sample of updated barcodes
  RAISE NOTICE '📦 Sample of updated barcodes:';
  FOR barcode_record IN 
    SELECT b.barcode_value, p.dimensions
    FROM barcodes b
    JOIN products p ON b.product_id = p.id
    WHERE b.product_id = correct_product_id
    ORDER BY b.updated_at DESC
    LIMIT 5
  LOOP
    RAISE NOTICE '   ✓ % → %', barcode_record.barcode_value, barcode_record.dimensions;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ FIX COMPLETE!';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
END $$;
*/

-- STEP 4: VERIFICATION
-- ============================================================================

SELECT 
  '' as blank,
  '✅ VERIFICATION - All barcodes should now show correct size' as section;

SELECT 
  b.barcode_value,
  p.dimensions as size,
  p.sku,
  p.brand || ' ' || p.model as product_name,
  b.created_at,
  b.updated_at,
  CASE 
    WHEN p.dimensions ILIKE '%120/80-18%' THEN '✅ CORRECT'
    WHEN p.dimensions LIKE '%060/80%' THEN '❌ STILL WRONG'
    ELSE '⚠️  UNEXPECTED: ' || p.dimensions
  END as status
FROM barcodes b
JOIN products p ON b.product_id = p.id
WHERE b.created_at > NOW() - INTERVAL '7 days'
ORDER BY 
  CASE 
    WHEN p.dimensions LIKE '%060/80%' THEN 1
    WHEN p.dimensions ILIKE '%120/80-18%' THEN 2
    ELSE 3
  END,
  b.created_at DESC
LIMIT 50;

-- STEP 5: TEST THE VALIDATION
-- ============================================================================

SELECT 
  '' as blank,
  '🧪 TEST VALIDATION - Simulate scanning' as section;

SELECT 
  b.barcode_value,
  p.dimensions as barcode_actual_size,
  '120/80-18' as expected_size,
  CASE 
    WHEN LOWER(TRIM(REPLACE(p.dimensions, ' ', ''))) = LOWER(TRIM(REPLACE('120/80-18', ' ', '')))
    THEN '✅ SCAN WILL SUCCEED'
    ELSE '❌ SCAN WILL FAIL - Expected 120/80-18, but got ' || p.dimensions
  END as scan_result
FROM barcodes b
JOIN products p ON b.product_id = p.id
WHERE b.created_at > NOW() - INTERVAL '7 days'
ORDER BY b.created_at DESC
LIMIT 10;

-- ============================================================================
-- INSTRUCTIONS
-- ============================================================================

SELECT 
  '' as blank,
  '📖 INSTRUCTIONS' as section;

SELECT '
═══════════════════════════════════════════════════════════════════════

HOW TO USE THIS SCRIPT:

1. Run Steps 1-2 first to see the diagnostic
   - This shows what''s wrong and what will be fixed
   - No data is changed yet

2. Review the affected barcodes list
   - Confirm these are the ones you want to fix

3. To perform the fix:
   - Scroll to STEP 3
   - UNCOMMENT the DO $$ block (remove /* and */)
   - Run the entire script again

4. After running, check Steps 4-5 for verification
   - All barcodes should show ✅ CORRECT
   - Test validation should show ✅ SCAN WILL SUCCEED

5. Test in the app:
   - Go to Receiving page
   - Start receiving a shipment
   - Select size "120/80-18"
   - Scan a QR code
   - Should scan successfully!

═══════════════════════════════════════════════════════════════════════
' as instructions;
