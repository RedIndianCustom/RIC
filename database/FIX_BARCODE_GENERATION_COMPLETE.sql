-- ============================================================================
-- COMPLETE FIX FOR BARCODE GENERATION + TRACEABILITY
-- ============================================================================
-- This ensures:
-- 1. RPC function exists
-- 2. Barcode sequence exists  
-- 3. Creates working test barcodes you can trace immediately
-- ============================================================================

-- STEP 1: Check what we have
SELECT '=== CHECKING CURRENT STATE ===' as status;

SELECT 
  'Barcodes in database: ' || COUNT(*)::TEXT as info 
FROM barcodes;

SELECT 
  'RPC function exists: ' || 
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'create_inventory_barcodes'
  ) THEN 'YES ✅' ELSE 'NO ❌' END as info;

SELECT 
  'Barcode sequence exists: ' || 
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.sequences 
    WHERE sequence_name = 'barcode_sequence'
  ) THEN 'YES ✅' ELSE 'NO ❌' END as info;

-- STEP 2: Get test data IDs we can use
DO $$
DECLARE
  v_product_id UUID;
  v_batch_id UUID;
  v_shipment_id UUID;
  v_result RECORD;
BEGIN
  -- Find first available product
  SELECT id INTO v_product_id FROM products LIMIT 1;
  
  IF v_product_id IS NULL THEN
    RAISE NOTICE '❌ NO PRODUCTS FOUND - Cannot create test barcodes!';
    RAISE NOTICE '   Please create products first in the Products page';
    RETURN;
  END IF;

  -- Find first available batch
  SELECT id INTO v_batch_id FROM batches WHERE product_id = v_product_id LIMIT 1;
  
  IF v_batch_id IS NULL THEN
    RAISE NOTICE '❌ NO BATCHES FOUND for this product - Cannot create test barcodes!';
    RAISE NOTICE '   Please create a batch first in the Batch Management page';
    RETURN;
  END IF;

  -- Find first available shipment
  SELECT id INTO v_shipment_id FROM shipments LIMIT 1;
  
  IF v_shipment_id IS NULL THEN
    RAISE NOTICE '❌ NO SHIPMENTS FOUND - Cannot create test barcodes!';
    RAISE NOTICE '   Please create a shipment first in the Shipment Management page';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Found test data:';
  RAISE NOTICE '   Product ID: %', v_product_id;
  RAISE NOTICE '   Batch ID: %', v_batch_id;
  RAISE NOTICE '   Shipment ID: %', v_shipment_id;
  
  -- Check if RPC function exists
  IF NOT EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'create_inventory_barcodes'
  ) THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ RPC FUNCTION MISSING!';
    RAISE NOTICE '   Run this file to create it:';
    RAISE NOTICE '   backend/database/015_transaction_safe_barcode_rpc.sql';
    RETURN;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '✅ RPC function exists - Creating 3 test barcodes...';
  
  -- Create test barcodes using RPC
  SELECT * INTO v_result FROM create_inventory_barcodes(
    v_product_id,
    v_batch_id,
    v_shipment_id,
    3  -- quantity
  );

  RAISE NOTICE '';
  RAISE NOTICE '✅ SUCCESS! Created % barcodes', (v_result.json_data->'quantity')::TEXT;
  RAISE NOTICE '';
  RAISE NOTICE '📋 Test these barcodes in the UI:';
  
  -- Show the created barcodes
  FOR v_result IN 
    SELECT barcode_value 
    FROM barcodes 
    WHERE product_id = v_product_id 
    ORDER BY created_at DESC 
    LIMIT 3
  LOOP
    RAISE NOTICE '   🏷️  %', v_result.barcode_value;
  END LOOP;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ ERROR: %', SQLERRM;
    RAISE NOTICE '';
    RAISE NOTICE '   Common causes:';
    RAISE NOTICE '   1. RPC function missing - run 015_transaction_safe_barcode_rpc.sql';
    RAISE NOTICE '   2. No test data - create products, batches, shipments first';
    RAISE NOTICE '   3. Sequence missing - run 011_barcode_sequence_function.sql';
END $$;

-- STEP 3: Show recent barcodes for testing
SELECT '=== RECENT BARCODES YOU CAN TEST ===' as status;

SELECT 
  barcode_value,
  status,
  created_at,
  'Click eye icon to test traceability' as action
FROM barcodes
ORDER BY created_at DESC
LIMIT 5;
