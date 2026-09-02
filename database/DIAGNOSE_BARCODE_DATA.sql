-- ============================================================================
-- BARCODE DATA DIAGNOSTIC SCRIPT (Updated - Works Without RPC)
-- ============================================================================
-- This script checks why barcodes don't have product/batch information
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Check 1: How many barcodes exist?
SELECT 'Total Barcodes' as check_name, COUNT(*) as count
FROM barcodes;

-- Check 2: How many barcodes have inventory_unit_id?
SELECT 
    'Barcodes with inventory_unit_id' as check_name,
    COUNT(*) as count
FROM barcodes
WHERE inventory_unit_id IS NOT NULL;

-- Check 3: How many barcodes are missing inventory_unit_id?
SELECT 
    'Barcodes WITHOUT inventory_unit_id' as check_name,
    COUNT(*) as count
FROM barcodes
WHERE inventory_unit_id IS NULL;

-- Check 4: Sample of barcodes and their relationships
SELECT 
    b.id,
    b.barcode_value,
    b.inventory_unit_id,
    b.created_at
FROM barcodes b
ORDER BY b.created_at DESC
LIMIT 10;

-- Check 5: Check if inventory_units have product/batch links
SELECT 
    'Inventory Units with product_id' as check_name,
    COUNT(*) as count
FROM inventory_units
WHERE product_id IS NOT NULL;

-- Check 6: Check if inventory_units have batch_id
SELECT 
    'Inventory Units with batch_id' as check_name,
    COUNT(*) as count
FROM inventory_units
WHERE batch_id IS NOT NULL;

-- Check 7: Sample inventory units
SELECT 
    iu.id,
    iu.inventory_unit_code,
    iu.product_id,
    iu.batch_id,
    iu.status
FROM inventory_units iu
ORDER BY iu.created_at DESC
LIMIT 10;

-- Check 8: Try to manually join data (like RPC function does)
SELECT 
    'Manual Join Test' as check_name,
    COUNT(*) as barcode_count_with_full_data
FROM barcodes b
INNER JOIN inventory_units iu ON b.inventory_unit_id = iu.id
INNER JOIN products p ON iu.product_id = p.id
INNER JOIN batches bat ON iu.batch_id = bat.id;

-- Check 9: Sample joined data (this is what SHOULD appear in UI)
SELECT 
    b.barcode_value,
    p.brand as product_brand,
    p.model as product_model,
    p.sku as product_sku,
    bat.batch_number
FROM barcodes b
INNER JOIN inventory_units iu ON b.inventory_unit_id = iu.id
INNER JOIN products p ON iu.product_id = p.id
INNER JOIN batches bat ON iu.batch_id = bat.id
ORDER BY b.created_at DESC
LIMIT 5;

-- Check 10: Check barcodes table structure
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'barcodes'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================================================
-- INTERPRETATION GUIDE:
-- ============================================================================
--
-- If Check 3 shows many barcodes without inventory_unit_id:
--   ➜ Barcodes were created incorrectly, bypassing the proper RPC function
--
-- If Check 5 or 6 show 0:
--   ➜ Inventory units exist but don't link to products/batches
--
-- If Check 8 shows 0 but Check 1 shows many:
--   ➜ The INNER JOIN fails - missing relationships in the chain
--
-- If Check 9 returns data:
--   ➜ Some barcodes ARE properly linked! But maybe old ones aren't
--
-- Next Step: Run FIX_RPC_TYPE_MISMATCH.sql to fix the function error
-- ============================================================================
