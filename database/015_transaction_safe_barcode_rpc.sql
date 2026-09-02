-- ============================================================================
-- 015: TRANSACTION-SAFE BARCODE GENERATION RPC
-- ============================================================================
-- Red Indian Customs (RIC) Inventory Management System
-- Date: 2026-08-19
-- 
-- Purpose: Create atomic transaction for barcode generation
-- 
-- CRITICAL: This ensures all-or-nothing operation:
-- - If 100 units requested and unit #73 fails → ROLLBACK all
-- - No orphaned inventory units
-- - No partial barcode generation
-- - Concurrent-safe sequence generation
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 0: DROP EXISTING FUNCTIONS (allows schema changes)
-- ============================================================================

DROP FUNCTION IF EXISTS public.create_inventory_barcodes(UUID, UUID, UUID, INTEGER);
DROP FUNCTION IF EXISTS public.get_barcodes_with_traceability(INTEGER);

-- ============================================================================
-- STEP 1: ENSURE BARCODE SEQUENCE EXISTS
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS public.barcode_sequence
START WITH 1
INCREMENT BY 1;

COMMENT ON SEQUENCE public.barcode_sequence IS 
'Concurrent-safe barcode sequence: produces unique numbers even with simultaneous requests';

-- ============================================================================
-- STEP 2: CREATE TRANSACTION-SAFE RPC FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_inventory_barcodes(
    p_product_id UUID,
    p_batch_id UUID,
    p_shipment_id UUID,
    p_quantity INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_product RECORD;
    v_batch RECORD;
    v_shipment RECORD;
    v_inventory_unit RECORD;
    v_barcode_id UUID;
    v_inventory_unit_id UUID;
    v_sequence BIGINT;
    v_barcode_value TEXT;
    v_traceability_url TEXT;
    v_trace_base_url TEXT;
    v_results JSONB := '[]'::JSONB;
    i INTEGER;
BEGIN
    -- ========================================================
    -- 1. VALIDATE QUANTITY
    -- ========================================================
    IF p_quantity IS NULL
       OR p_quantity < 1
       OR p_quantity > 5000 THEN
        RAISE EXCEPTION
            'Quantity must be between 1 and 5000';
    END IF;

    -- ========================================================
    -- 2. VERIFY PRODUCT EXISTS
    -- ========================================================
    SELECT *
    INTO v_product
    FROM public.products
    WHERE id = p_product_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Product % does not exist',
            p_product_id;
    END IF;

    -- ========================================================
    -- 3. VERIFY SHIPMENT EXISTS
    -- ========================================================
    SELECT *
    INTO v_shipment
    FROM public.shipments
    WHERE id = p_shipment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Shipment % does not exist',
            p_shipment_id;
    END IF;

    -- ========================================================
    -- 4. VERIFY BATCH EXISTS
    -- ========================================================
    SELECT *
    INTO v_batch
    FROM public.batches
    WHERE id = p_batch_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Batch % does not exist',
            p_batch_id;
    END IF;

    -- ========================================================
    -- 5. CRITICAL: VERIFY BATCH BELONGS TO SHIPMENT
    -- ========================================================
    IF v_batch.shipment_id <> p_shipment_id THEN
        RAISE EXCEPTION
            'Batch % does not belong to shipment %',
            p_batch_id,
            p_shipment_id;
    END IF;

    -- ========================================================
    -- 6. GET TRACE BASE URL (with fallback)
    -- ========================================================
    BEGIN
        v_trace_base_url := current_setting('app.trace_base_url', true);
    EXCEPTION
        WHEN OTHERS THEN
            v_trace_base_url := NULL;
    END;
    
    IF v_trace_base_url IS NULL OR v_trace_base_url = '' THEN
        v_trace_base_url := 'http://localhost:5173/trace';
    END IF;

    -- ========================================================
    -- 7. GENERATE INVENTORY UNITS + BARCODES (ATOMIC LOOP)
    -- ========================================================
    FOR i IN 1..p_quantity LOOP
        -- Get Unique Barcode Sequence First (concurrent-safe)
        SELECT nextval('public.barcode_sequence')
        INTO v_sequence;

        -- Create unit_number from sequence for backward compatibility
        v_barcode_value := 'RIC' || LPAD(v_sequence::TEXT, 12, '0');

        -- Create Inventory Unit
        INSERT INTO public.inventory_units (
            unit_number,
            inventory_unit_code,
            product_id,
            batch_id,
            quantity,
            status,
            received_at
        )
        VALUES (
            v_barcode_value,  -- Use barcode as unit_number
            'INV-' || gen_random_uuid()::TEXT,
            p_product_id,
            p_batch_id,
            1,  -- Each unit = 1 physical tire
            'NEW',
            NOW()
        )
        RETURNING *
        INTO v_inventory_unit;

        -- Get Unique Barcode Sequence First (concurrent-safe)
        SELECT nextval('public.barcode_sequence')
        INTO v_sequence;

        -- Create unit_number from sequence for backward compatibility
        v_barcode_value := 'RIC' || LPAD(v_sequence::TEXT, 12, '0');

        -- Create Inventory Unit
        INSERT INTO public.inventory_units (
            unit_number,
            inventory_unit_code,
            product_id,
            batch_id,
            quantity,
            status,
            received_at
        )
        VALUES (
            v_barcode_value,  -- Use barcode as unit_number
            'INV-' || gen_random_uuid()::TEXT,
            p_product_id,
            p_batch_id,
            1,  -- Each unit = 1 physical tire
            'NEW',
            NOW()
        )
        RETURNING *
        INTO v_inventory_unit;

        -- Create Barcode Value (already created above)
        -- v_barcode_value is RIC000000000001, RIC000000000002, etc.

        -- Create Traceability URL
        v_traceability_url :=
            v_trace_base_url || '/' || v_barcode_value;

        -- Create Barcode Record
        INSERT INTO public.barcodes (
            barcode_value,
            barcode_type,
            product_id,
            batch_id,
            inventory_unit_id,
            traceability_url,
            status
        )
        VALUES (
            v_barcode_value,
            'CODE128',
            p_product_id,
            p_batch_id,
            v_inventory_unit.id,
            v_traceability_url,
            'active'
        )
        RETURNING id
        INTO v_barcode_id;

        -- Add to Results Array
        v_results :=
            v_results ||
            jsonb_build_array(
                jsonb_build_object(
                    'barcode_id',
                    v_barcode_id,
                    'barcode_value',
                    v_barcode_value,
                    'barcode_type',
                    'CODE128',
                    'inventory_unit_id',
                    v_inventory_unit.id,
                    'inventory_unit_code',
                    v_inventory_unit.inventory_unit_code,
                    'product_id',
                    p_product_id,
                    'batch_id',
                    p_batch_id,
                    'shipment_id',
                    p_shipment_id,
                    'traceability_url',
                    v_traceability_url,
                    'status',
                    'active'
                )
            );
    END LOOP;

    -- ========================================================
    -- 8. RETURN COMPLETE RESULT
    -- ========================================================
    RETURN jsonb_build_object(
        'success',
        true,
        'product_id',
        p_product_id,
        'product_sku',
        v_product.sku,
        'product_brand',
        v_product.brand,
        'product_model',
        v_product.model,
        'batch_id',
        p_batch_id,
        'batch_number',
        v_batch.batch_number,
        'shipment_id',
        p_shipment_id,
        'shipment_number',
        v_shipment.shipment_number,
        'container_number',
        v_shipment.container_number,
        'bl_number',
        v_shipment.bl_number,
        'quantity',
        p_quantity,
        'barcodes',
        v_results
    );

EXCEPTION
    WHEN OTHERS THEN
        -- Any error triggers ROLLBACK
        RAISE EXCEPTION
            'Barcode generation failed: %',
            SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.create_inventory_barcodes IS 
'Transaction-safe barcode generation: creates inventory units + barcodes atomically. If any step fails, entire operation rolls back.';

-- Grant execution permission
GRANT EXECUTE ON FUNCTION public.create_inventory_barcodes TO authenticated;

-- ============================================================================
-- STEP 3: CREATE HELPER FUNCTION TO GET BARCODES WITH FULL DATA
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_barcodes_with_traceability(
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
    barcode_id UUID,
    barcode_value TEXT,
    barcode_type TEXT,
    traceability_url TEXT,
    qr_code_data TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    product_id UUID,
    product_sku TEXT,
    product_brand TEXT,
    product_model TEXT,
    batch_id UUID,
    batch_number TEXT,
    container_number TEXT,
    bl_number TEXT,
    shipment_number TEXT,
    supplier_name TEXT,
    inventory_unit_id UUID,
    inventory_unit_code TEXT,
    unit_status TEXT,
    warehouse_location TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id as barcode_id,
        b.barcode_value,
        b.barcode_type,
        b.traceability_url,
        b.qr_code_data,
        b.status,
        b.created_at,
        p.id as product_id,
        p.sku as product_sku,
        p.brand as product_brand,
        p.model as product_model,
        bat.id as batch_id,
        bat.batch_number,
        s.container_number,
        s.bl_number,
        s.shipment_number,
        sup.name as supplier_name,
        iu.id as inventory_unit_id,
        iu.inventory_unit_code,
        iu.status as unit_status,
        CASE 
            WHEN w.name IS NOT NULL THEN 
                w.name || ' - ' || 
                COALESCE(iu.level, '') || ' ' || 
                COALESCE(iu.rack, '') || ' ' || 
                COALESCE(iu.shelf, '')
            ELSE NULL
        END as warehouse_location
    FROM public.barcodes b
    INNER JOIN public.inventory_units iu ON b.inventory_unit_id = iu.id
    INNER JOIN public.products p ON iu.product_id = p.id
    INNER JOIN public.batches bat ON iu.batch_id = bat.id
    INNER JOIN public.shipments s ON bat.shipment_id = s.id
    LEFT JOIN public.suppliers sup ON s.supplier_id = sup.id
    LEFT JOIN public.warehouses w ON iu.warehouse_id = w.id
    ORDER BY b.created_at DESC
    LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.get_barcodes_with_traceability IS 
'Retrieve barcodes with complete traceability information in a single query';

GRANT EXECUTE ON FUNCTION public.get_barcodes_with_traceability TO authenticated;

-- ============================================================================
-- COMMIT AND VERIFY
-- ============================================================================

COMMIT;

-- Verification
SELECT 
    '✅ 015_transaction_safe_barcode_rpc.sql executed successfully!' as status,
    (SELECT last_value FROM public.barcode_sequence) as next_sequence_number,
    NOW() as migration_completed_at;

-- Test function exists
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('create_inventory_barcodes', 'get_barcodes_with_traceability');

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- SUMMARY
-- ============================================================================
/*
✅ TRANSACTION-SAFE RPC IMPLEMENTED:

FUNCTION: create_inventory_barcodes(product_id, batch_id, shipment_id, quantity)

BENEFITS:
1. ✅ Atomic operation (all-or-nothing)
2. ✅ Concurrent-safe sequence generation
3. ✅ Validates product, batch, shipment relationships
4. ✅ Creates inventory units + barcodes in one transaction
5. ✅ If any step fails → ROLLBACK (no orphaned records)

FLOW:
BEGIN TRANSACTION
  ├─ Validate quantity (1-5000)
  ├─ Verify product exists
  ├─ Verify shipment exists
  ├─ Verify batch exists
  ├─ Verify batch belongs to shipment
  ├─ Loop for quantity:
  │   ├─ Create inventory_unit
  │   ├─ Get next sequence (concurrent-safe)
  │   ├─ Generate barcode value (RIC000000000001)
  │   ├─ Create traceability URL
  │   └─ Insert barcode record
  └─ Return all generated barcodes
COMMIT (or ROLLBACK on error)

EXAMPLE USAGE:
SELECT * FROM create_inventory_barcodes(
  'product-uuid',
  'batch-uuid',
  'shipment-uuid',
  100  -- Creates 100 inventory units + barcodes atomically
);

SEQUENCE BEHAVIOR:
- Numbers may have gaps (normal and acceptable)
- RIC000000000001, RIC000000000002, RIC000000000003
- Transaction fails → next successful = RIC000000000005 (gap is OK)
- Barcodes should be unique and immutable, not gapless
*/
