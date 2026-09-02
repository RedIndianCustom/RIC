-- ============================================================================
-- AUTO CREATE TEST DATA - ONE CLICK SETUP
-- ============================================================================
-- This script creates everything needed for barcode generation
-- Just copy and run this entire script in Supabase SQL Editor!
-- ============================================================================

DO $$
DECLARE
    v_supplier_id UUID;
    v_shipment_id UUID;
    v_product_id UUID;
    v_batch_id UUID;
    v_result JSONB;
BEGIN
    -- ========================================================
    -- STEP 1: Create Test Supplier (or reuse existing)
    -- ========================================================
    -- Try to get existing supplier first
    SELECT id INTO v_supplier_id
    FROM suppliers 
    WHERE name = 'Test Tire Supplier Inc'
    LIMIT 1;

    -- If no supplier exists, create one
    IF v_supplier_id IS NULL THEN
        INSERT INTO suppliers (name, contact_person, email, phone, status)
        VALUES (
            'Test Tire Supplier Inc',
            'John Smith',
            'john@testsupplier.com',
            '+1-555-0123',
            'active'
        )
        RETURNING id INTO v_supplier_id;
        
        RAISE NOTICE '✅ Supplier created: %', v_supplier_id;
    ELSE
        RAISE NOTICE '✅ Using existing supplier: %', v_supplier_id;
    END IF;

    -- ========================================================
    -- STEP 2: Create Test Shipment
    -- ========================================================
    INSERT INTO shipments (
        supplier_id,
        shipment_number,
        container_number,
        bl_number,
        expected_quantity,
        actual_quantity,
        expected_arrival_date,
        received_date,
        status
    )
    VALUES (
        v_supplier_id,
        'SHIP-2026-TEST-001',
        'MSKU1234567',
        'BL-2026-TEST-001',
        100,
        100,
        CURRENT_DATE,
        NOW(),
        'RECEIVED'
    )
    ON CONFLICT (shipment_number) DO UPDATE 
    SET status = 'RECEIVED', supplier_id = v_supplier_id
    RETURNING id INTO v_shipment_id;

    RAISE NOTICE '✅ Shipment created: %', v_shipment_id;

    -- ========================================================
    -- STEP 3: Get or Create Test Product
    -- ========================================================
    -- Try to get existing product first
    SELECT id INTO v_product_id
    FROM products 
    WHERE status = 'In Stock'
    LIMIT 1;

    -- If no product exists, create one
    IF v_product_id IS NULL THEN
        INSERT INTO products (
            sku,
            brand,
            model,
            dimensions,
            category,
            unit_cost,
            retail_price,
            current_stock,
            reorder_level,
            status
        )
        VALUES (
            'TEST-15-130/90',
            'Red Indian Customs',
            'Test Tire',
            '130/90-15',
            'Test',
            45.00,
            89.99,
            0,
            10,
            'In Stock'
        )
        RETURNING id INTO v_product_id;
        
        RAISE NOTICE '✅ Product created: %', v_product_id;
    ELSE
        RAISE NOTICE '✅ Using existing product: %', v_product_id;
    END IF;

    -- ========================================================
    -- STEP 4: Create Test Batch
    -- ========================================================
    INSERT INTO batches (
        shipment_id,
        product_id,
        batch_number,
        batch_month,
        batch_year,
        status
    )
    VALUES (
        v_shipment_id,
        v_product_id,
        'BATCH-2608-TEST-001',
        8,  -- August
        2026,
        'ACTIVE'
    )
    ON CONFLICT (batch_number) DO UPDATE 
    SET status = 'ACTIVE', shipment_id = v_shipment_id, product_id = v_product_id
    RETURNING id INTO v_batch_id;

    RAISE NOTICE '✅ Batch created: %', v_batch_id;

    -- ========================================================
    -- STEP 5: Generate Test Barcodes
    -- ========================================================
    SELECT create_inventory_barcodes(
        v_product_id,
        v_batch_id,
        v_shipment_id,
        3  -- Generate 3 test barcodes
    ) INTO v_result;

    RAISE NOTICE '✅ Barcodes generated: %', v_result->>'quantity';

    -- ========================================================
    -- STEP 6: Display Summary
    -- ========================================================
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE '           TEST DATA CREATED SUCCESSFULLY!      ';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Supplier ID:  %', v_supplier_id;
    RAISE NOTICE 'Shipment ID:  %', v_shipment_id;
    RAISE NOTICE 'Product ID:   %', v_product_id;
    RAISE NOTICE 'Batch ID:     %', v_batch_id;
    RAISE NOTICE 'Barcodes:     %', v_result->>'quantity';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 You can now generate barcodes in the frontend!';
    RAISE NOTICE '';

END $$;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
SELECT 
    '📊 Summary' as info,
    (SELECT COUNT(*) FROM suppliers WHERE name = 'Test Tire Supplier Inc') as suppliers,
    (SELECT COUNT(*) FROM shipments WHERE shipment_number = 'SHIP-2026-TEST-001') as shipments,
    (SELECT COUNT(*) FROM batches WHERE batch_number = 'BATCH-2608-TEST-001') as batches,
    (SELECT COUNT(*) FROM barcodes) as total_barcodes;

-- Show the created data
SELECT 
    '✅ Created Data' as status,
    s.name as supplier_name,
    sh.shipment_number,
    sh.container_number,
    b.batch_number,
    p.sku as product_sku,
    (SELECT COUNT(*) FROM barcodes WHERE batch_id = b.id) as barcode_count
FROM batches b
JOIN shipments sh ON b.shipment_id = sh.id
JOIN suppliers s ON sh.supplier_id = s.id
JOIN products p ON b.product_id = p.id
WHERE b.batch_number = 'BATCH-2608-TEST-001';

-- Show generated barcodes
SELECT 
    barcode_value,
    barcode_type,
    status,
    created_at
FROM barcodes
ORDER BY created_at DESC
LIMIT 5;
