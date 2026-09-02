-- ============================================================================
-- FIX EXISTING BARCODES - Link to Products and Batches
-- ============================================================================
-- This script fixes barcodes that were created without proper relationships
-- 
-- WARNING: Run DIAGNOSE_BARCODE_DATA.sql first to understand the issue!
-- ============================================================================

-- Step 1: Check current state
DO $$
DECLARE
    v_total_barcodes INTEGER;
    v_barcodes_with_units INTEGER;
    v_barcodes_without_units INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_barcodes FROM barcodes;
    SELECT COUNT(*) INTO v_barcodes_with_units FROM barcodes WHERE inventory_unit_id IS NOT NULL;
    SELECT COUNT(*) INTO v_barcodes_without_units FROM barcodes WHERE inventory_unit_id IS NULL;
    
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE 'CURRENT STATE:';
    RAISE NOTICE '  Total barcodes: %', v_total_barcodes;
    RAISE NOTICE '  With inventory_unit_id: %', v_barcodes_with_units;
    RAISE NOTICE '  Without inventory_unit_id: %', v_barcodes_without_units;
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

-- ============================================================================
-- OPTION 1: Delete old broken barcodes and regenerate properly
-- ============================================================================
-- This is the RECOMMENDED approach if the barcodes haven't been printed/used yet

-- UNCOMMENT TO USE:
/*
DO $$
BEGIN
    -- Delete barcodes without proper relationships
    DELETE FROM barcodes 
    WHERE inventory_unit_id IS NULL;
    
    RAISE NOTICE '✅ Deleted barcodes without inventory_unit_id';
    RAISE NOTICE 'ℹ️  Now regenerate barcodes using the Barcode Generation page';
    RAISE NOTICE 'ℹ️  Make sure to select:';
    RAISE NOTICE '   1. A Product';
    RAISE NOTICE '   2. A Batch (from dropdown)';
    RAISE NOTICE '   3. Click "Generate 1 Barcode" button';
END $$;
*/

-- ============================================================================
-- OPTION 2: Create inventory units for existing barcodes
-- ============================================================================
-- Use this if you need to keep existing barcodes (already printed/in use)
-- This will create inventory_units and link them properly

-- UNCOMMENT TO USE (requires product_id and batch_id):
/*
DO $$
DECLARE
    v_default_product_id UUID;
    v_default_batch_id UUID;
    v_default_shipment_id UUID;
    v_barcode RECORD;
    v_new_unit_id UUID;
    v_counter INTEGER := 0;
BEGIN
    -- TODO: Replace these UUIDs with actual IDs from your database
    -- Query: SELECT id, sku, brand, model FROM products LIMIT 5;
    v_default_product_id := 'YOUR_PRODUCT_ID_HERE'::UUID;
    
    -- Query: SELECT id, batch_number FROM batches LIMIT 5;
    v_default_batch_id := 'YOUR_BATCH_ID_HERE'::UUID;
    
    -- Query: SELECT id, shipment_number FROM shipments LIMIT 5;
    v_default_shipment_id := 'YOUR_SHIPMENT_ID_HERE'::UUID;
    
    -- Loop through barcodes without inventory_unit_id
    FOR v_barcode IN 
        SELECT id, barcode_value 
        FROM barcodes 
        WHERE inventory_unit_id IS NULL
    LOOP
        -- Create inventory unit
        INSERT INTO inventory_units (
            product_id,
            batch_id,
            status
        ) VALUES (
            v_default_product_id,
            v_default_batch_id,
            'IN_WAREHOUSE'
        ) RETURNING id INTO v_new_unit_id;
        
        -- Link barcode to inventory unit
        UPDATE barcodes 
        SET inventory_unit_id = v_new_unit_id
        WHERE id = v_barcode.id;
        
        v_counter := v_counter + 1;
    END LOOP;
    
    RAISE NOTICE '✅ Created % inventory units and linked them to barcodes', v_counter;
END $$;
*/

-- ============================================================================
-- OPTION 3: Check if barcodes have product_id/batch_id columns directly
-- ============================================================================
-- Newer schema might have these columns on barcodes table itself

DO $$
DECLARE
    v_has_product_col BOOLEAN;
    v_has_batch_col BOOLEAN;
BEGIN
    -- Check if columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'barcodes' 
        AND column_name = 'product_id'
    ) INTO v_has_product_col;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'barcodes' 
        AND column_name = 'batch_id'
    ) INTO v_has_batch_col;
    
    IF v_has_product_col AND v_has_batch_col THEN
        RAISE NOTICE '✅ Barcodes table has product_id and batch_id columns';
        RAISE NOTICE 'ℹ️  Checking if they are populated...';
        
        -- Check if populated
        DECLARE
            v_populated INTEGER;
        BEGIN
            SELECT COUNT(*) INTO v_populated 
            FROM barcodes 
            WHERE product_id IS NOT NULL AND batch_id IS NOT NULL;
            
            RAISE NOTICE 'ℹ️  % barcodes have product_id and batch_id', v_populated;
            
            IF v_populated = 0 THEN
                RAISE NOTICE '⚠️  Columns exist but are empty - barcodes need product/batch assignments';
            END IF;
        END;
    ELSE
        RAISE NOTICE '❌ Barcodes table does not have product_id/batch_id columns';
        RAISE NOTICE 'ℹ️  Must use inventory_units table for relationships';
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION: Test the RPC function after fix
-- ============================================================================

-- This should return data if relationships are fixed
SELECT 
    'After Fix - RPC Test' as status,
    COUNT(*) as barcode_count
FROM get_barcodes_with_traceability(50);

-- Show sample with product info
SELECT 
    barcode_value,
    product_brand,
    product_model,
    product_sku,
    batch_number
FROM get_barcodes_with_traceability(10);

-- ============================================================================
-- RECOMMENDED STEPS:
-- ============================================================================
--
-- 1. Run DIAGNOSE_BARCODE_DATA.sql to understand the issue
-- 2. Choose one option above based on your situation:
--    - OPTION 1: Delete and regenerate (if not yet printed)
--    - OPTION 2: Create inventory units (if barcodes are in use)
--    - OPTION 3: Direct assignment (if schema supports it)
-- 3. Run this script with chosen option uncommented
-- 4. Verify with the test queries at the end
-- 5. Refresh your frontend page
--
-- ============================================================================
