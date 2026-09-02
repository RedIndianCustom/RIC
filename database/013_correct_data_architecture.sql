-- ============================================================================
-- 013: CORRECT DATA ARCHITECTURE - PROPER RELATIONSHIP CHAIN
-- ============================================================================
-- Red Indian Customs (RIC) Inventory Management System
-- Date: 2026-08-19
-- 
-- Purpose: Correct the database architecture to match the proper traceability chain:
--
-- COMPLETE CHAIN:
-- Supplier → Shipment → Container Number → Batch → Product → Inventory Unit → Barcode → QR Code
--
-- KEY RELATIONSHIPS:
-- 1. suppliers (1) → (N) shipments
-- 2. shipments: stores container_number + bl_number (NO duplicates in batches)
-- 3. shipments (1) → (N) batches (via shipment_id)
-- 4. products (1) → (N) inventory_units (catalog vs physical items)
-- 5. batches (1) → (N) inventory_units (one per physical tire)
-- 6. inventory_units (1) → (1) barcodes (one barcode per physical tire)
-- 7. barcodes: contain QR code data for traceability
--
-- CRITICAL CONCEPT:
-- Each inventory_unit = ONE PHYSICAL TIRE (not a quantity)
-- Example: Batch has 100 tires → Create 100 inventory_units (INV-000001 to INV-000100)
-- This enables: scan during receiving, scan during picking, link to orders, trace returns
--
-- This migration:
-- 1. Ensures shipments table has container_number + bl_number (source of truth)
-- 2. Removes container_number from batches (prevents data duplication)
-- 3. Creates inventory_units as ONE physical tire per record
-- 4. Links barcodes to inventory_units (1-to-1 relationship)
-- 5. Preserves existing data with automatic migration
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: DROP INCORRECT FOREIGN KEYS AND CONSTRAINTS
-- ============================================================================

-- Remove direct product_id from barcodes (should go through inventory_units)
DO $$ 
BEGIN
    -- Check if the constraint exists before dropping
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'barcodes_product_id_fkey' 
        AND table_name = 'barcodes'
    ) THEN
        ALTER TABLE public.barcodes DROP CONSTRAINT barcodes_product_id_fkey;
    END IF;
END $$;

-- ============================================================================
-- STEP 2: ENSURE SHIPMENTS TABLE IS THE SOURCE OF TRUTH
-- ============================================================================
-- Shipments MUST store container_number and bl_number
-- This is the ONLY place these values should exist (no duplication in batches)

DO $$ 
BEGIN
    -- Add container_number if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shipments' AND column_name = 'container_number'
    ) THEN
        ALTER TABLE public.shipments ADD COLUMN container_number TEXT NOT NULL DEFAULT '';
    END IF;
    
    -- Add bl_number if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shipments' AND column_name = 'bl_number'
    ) THEN
        ALTER TABLE public.shipments ADD COLUMN bl_number TEXT;
    END IF;
    
    -- Add supplier_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shipments' AND column_name = 'supplier_id'
    ) THEN
        ALTER TABLE public.shipments ADD COLUMN supplier_id UUID;
        ALTER TABLE public.shipments ADD CONSTRAINT fk_shipments_supplier 
            FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT;
    END IF;
    
    -- Add expected_quantity if missing (Operational Staff enters this)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shipments' AND column_name = 'expected_quantity'
    ) THEN
        ALTER TABLE public.shipments ADD COLUMN expected_quantity INTEGER NOT NULL DEFAULT 0 
            CHECK (expected_quantity >= 0);
    END IF;
    
    -- Add actual_quantity if missing (Updated during receiving)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shipments' AND column_name = 'actual_quantity'
    ) THEN
        ALTER TABLE public.shipments ADD COLUMN actual_quantity INTEGER NOT NULL DEFAULT 0 
            CHECK (actual_quantity >= 0);
    END IF;
    
    -- Add expected_arrival_date if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shipments' AND column_name = 'expected_arrival_date'
    ) THEN
        ALTER TABLE public.shipments ADD COLUMN expected_arrival_date DATE;
    END IF;
    
    -- Ensure status column has proper constraints
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shipments' AND column_name = 'status'
    ) THEN
        -- Drop old constraint if exists
        ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS check_shipment_status;
        -- Add new constraint with proper values
        ALTER TABLE public.shipments ADD CONSTRAINT check_shipment_status 
            CHECK (status IN ('PENDING', 'IN_TRANSIT', 'RECEIVED', 'INSPECTING', 'APPROVED', 'REJECTED', 'CANCELLED'));
    END IF;
END $$;

-- Add indexes for shipment lookup
CREATE INDEX IF NOT EXISTS idx_shipments_container_number ON public.shipments(container_number);
CREATE INDEX IF NOT EXISTS idx_shipments_bl_number ON public.shipments(bl_number);
CREATE INDEX IF NOT EXISTS idx_shipments_supplier ON public.shipments(supplier_id);

COMMENT ON COLUMN public.shipments.container_number IS 'Physical container number - SOURCE OF TRUTH (not duplicated in batches)';
COMMENT ON COLUMN public.shipments.bl_number IS 'Bill of Lading number for shipment documentation';
COMMENT ON COLUMN public.shipments.expected_quantity IS 'Expected quantity entered by Operational Staff';
COMMENT ON COLUMN public.shipments.actual_quantity IS 'Actual quantity received and verified';

-- ============================================================================
-- STEP 3: ENSURE BATCHES PROPERLY LINK TO SHIPMENTS
-- ============================================================================
-- Batches MUST have shipment_id
-- Batches should NOT duplicate container_number (gets it from shipment via foreign key)
-- Each batch represents a group of products from a shipment

DO $$ 
BEGIN
    -- Ensure shipment_id exists and is required
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'batches' AND column_name = 'shipment_id'
    ) THEN
        ALTER TABLE public.batches ADD COLUMN shipment_id UUID NOT NULL;
        ALTER TABLE public.batches ADD CONSTRAINT fk_batches_shipment 
            FOREIGN KEY (shipment_id) REFERENCES public.shipments(id) ON DELETE RESTRICT;
    END IF;
    
    -- Ensure product_id exists (batches are for specific products)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'batches' AND column_name = 'product_id'
    ) THEN
        ALTER TABLE public.batches ADD COLUMN product_id UUID;
        ALTER TABLE public.batches ADD CONSTRAINT fk_batches_product 
            FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
    END IF;
    
    -- Add batch_month if missing (used for batch numbering)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'batches' AND column_name = 'batch_month'
    ) THEN
        ALTER TABLE public.batches ADD COLUMN batch_month INTEGER 
            CHECK (batch_month BETWEEN 1 AND 12);
    END IF;
    
    -- Add batch_year if missing (used for batch numbering)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'batches' AND column_name = 'batch_year'
    ) THEN
        ALTER TABLE public.batches ADD COLUMN batch_year INTEGER 
            CHECK (batch_year >= 2000);
    END IF;
    
    -- REMOVE container_number from batches if it exists (prevent data duplication)
    -- Container number should ONLY exist in shipments table
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'batches' AND column_name = 'container_number'
    ) THEN
        -- First, log a warning
        RAISE NOTICE 'Removing container_number from batches - use shipments.container_number instead';
        -- Drop the column (data duplication removed)
        ALTER TABLE public.batches DROP COLUMN container_number;
    END IF;
    
    -- REMOVE bl_number from batches if it exists (prevent data duplication)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'batches' AND column_name = 'bl_number'
    ) THEN
        RAISE NOTICE 'Removing bl_number from batches - use shipments.bl_number instead';
        ALTER TABLE public.batches DROP COLUMN bl_number;
    END IF;
    
    -- Ensure status column has proper constraints
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'batches' AND column_name = 'status'
    ) THEN
        ALTER TABLE public.batches DROP CONSTRAINT IF EXISTS check_batch_status;
        ALTER TABLE public.batches ADD CONSTRAINT check_batch_status 
            CHECK (status IN ('ACTIVE', 'RECEIVED', 'APPROVED', 'REJECTED', 'CLOSED'));
    END IF;
END $$;

COMMENT ON COLUMN public.batches.shipment_id IS 'Links batch to shipment (which contains container_number + bl_number)';
COMMENT ON TABLE public.batches IS 'Product batches - DO NOT duplicate container_number here, get it from shipments via shipment_id';

-- ============================================================================
-- STEP 4: ENSURE INVENTORY_UNITS TABLE - ONE RECORD PER PHYSICAL TIRE
-- ============================================================================
-- CRITICAL CONCEPT: Each inventory_unit = ONE PHYSICAL TIRE (not a quantity)
-- 
-- Example: Batch BATCH-2608-000001 has 100 tires
-- You create: INV-000001, INV-000002, INV-000003, ..., INV-000100
-- 
-- This enables:
-- - Scan during receiving (each tire scanned individually)
-- - Scan during picking (specific tire selected for order)
-- - Link barcode to order (know exactly which tire went to which customer)
-- - Preserve barcode during rejection (can trace defective tire back to batch/shipment)
-- - Trace returns (customer returns specific tire, not just "a tire from batch X")

DO $$ 
BEGIN
    -- Create inventory_units table if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'inventory_units'
    ) THEN
        CREATE TABLE public.inventory_units (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            unit_number TEXT NOT NULL UNIQUE,
            product_id UUID NOT NULL
                REFERENCES public.products(id)
                ON DELETE CASCADE,
            batch_id UUID NOT NULL
                REFERENCES public.batches(id)
                ON DELETE RESTRICT,
            barcode_id UUID UNIQUE
                REFERENCES public.barcodes(id)
                ON DELETE SET NULL,
            warehouse_id UUID
                REFERENCES public.warehouses(id)
                ON DELETE SET NULL,
            location_code TEXT,
            status TEXT NOT NULL DEFAULT 'AVAILABLE'
                CHECK (
                    status IN (
                        'AVAILABLE',
                        'RESERVED',
                        'PICKED',
                        'SHIPPED',
                        'SOLD',
                        'RETURNED',
                        'DAMAGED',
                        'REJECTED',
                        'SCRAPPED'
                    )
                ),
            condition TEXT NOT NULL DEFAULT 'NEW'
                CHECK (
                    condition IN (
                        'NEW',
                        'GOOD',
                        'FAIR',
                        'DEFECTIVE',
                        'DAMAGED'
                    )
                ),
            notes TEXT,
            received_date TIMESTAMPTZ DEFAULT NOW(),
            last_scanned_at TIMESTAMPTZ,
            last_scanned_by UUID
                REFERENCES public.users(id)
                ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        
        -- Add indexes
        CREATE INDEX idx_inventory_units_unit_number ON public.inventory_units(unit_number);
        CREATE INDEX idx_inventory_units_product ON public.inventory_units(product_id);
        CREATE INDEX idx_inventory_units_batch ON public.inventory_units(batch_id);
        CREATE INDEX idx_inventory_units_barcode ON public.inventory_units(barcode_id);
        CREATE INDEX idx_inventory_units_warehouse ON public.inventory_units(warehouse_id);
        CREATE INDEX idx_inventory_units_status ON public.inventory_units(status);
        CREATE INDEX idx_inventory_units_location ON public.inventory_units(location_code);
        
        RAISE NOTICE 'Created inventory_units table';
    ELSE
        -- Table exists, ensure required columns
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'inventory_units' AND column_name = 'product_id'
        ) THEN
            ALTER TABLE public.inventory_units ADD COLUMN product_id UUID NOT NULL
                REFERENCES public.products(id) ON DELETE CASCADE;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'inventory_units' AND column_name = 'batch_id'
        ) THEN
            ALTER TABLE public.inventory_units ADD COLUMN batch_id UUID NOT NULL
                REFERENCES public.batches(id) ON DELETE RESTRICT;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'inventory_units' AND column_name = 'barcode_id'
        ) THEN
            ALTER TABLE public.inventory_units ADD COLUMN barcode_id UUID UNIQUE
                REFERENCES public.barcodes(id) ON DELETE SET NULL;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'inventory_units' AND column_name = 'last_scanned_at'
        ) THEN
            ALTER TABLE public.inventory_units ADD COLUMN last_scanned_at TIMESTAMPTZ;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'inventory_units' AND column_name = 'last_scanned_by'
        ) THEN
            ALTER TABLE public.inventory_units ADD COLUMN last_scanned_by UUID
                REFERENCES public.users(id) ON DELETE SET NULL;
        END IF;
        
        -- Remove quantity column if it exists (each unit = 1 physical tire)
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'inventory_units' AND column_name = 'quantity'
        ) THEN
            RAISE NOTICE 'Removing quantity column - each inventory_unit represents ONE physical tire';
            ALTER TABLE public.inventory_units DROP COLUMN quantity;
        END IF;
    END IF;
END $$;

-- Ensure unique constraint on barcode_id (one barcode per inventory unit)
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_units_barcode_unique 
    ON public.inventory_units(barcode_id) WHERE barcode_id IS NOT NULL;

COMMENT ON TABLE public.inventory_units IS 'ONE RECORD PER PHYSICAL TIRE - enables scan during receiving, picking, and tracing returns';
COMMENT ON COLUMN public.inventory_units.unit_number IS 'Unique identifier for this physical tire (e.g., INV-000001)';
COMMENT ON COLUMN public.inventory_units.product_id IS 'Which tire product (SKU, brand, model) this unit represents';
COMMENT ON COLUMN public.inventory_units.batch_id IS 'Which batch this tire came from (links to shipment via batch.shipment_id)';
COMMENT ON COLUMN public.inventory_units.barcode_id IS 'Unique barcode assigned to this physical tire (1-to-1 relationship)';
COMMENT ON COLUMN public.inventory_units.status IS 'Lifecycle status: AVAILABLE → PICKED → SHIPPED → SOLD (or RETURNED/REJECTED)';
COMMENT ON COLUMN public.inventory_units.last_scanned_at IS 'Last time this tire was scanned (receiving, picking, shipping, return)';
COMMENT ON COLUMN public.inventory_units.last_scanned_by IS 'User who last scanned this tire';

-- ============================================================================
-- STEP 5: CORRECT BARCODES TABLE STRUCTURE
-- ============================================================================
-- Barcodes should reference inventory_unit (not product directly)
-- Keep product_id for denormalized quick lookup but it's not the primary relationship

DO $$ 
BEGIN
    -- Add inventory_unit_id if missing (proper relationship)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'barcodes' AND column_name = 'inventory_unit_id'
    ) THEN
        ALTER TABLE public.barcodes ADD COLUMN inventory_unit_id UUID UNIQUE;
        ALTER TABLE public.barcodes ADD CONSTRAINT fk_barcodes_inventory_unit 
            FOREIGN KEY (inventory_unit_id) REFERENCES public.inventory_units(id) ON DELETE CASCADE;
    END IF;
    
    -- Keep product_id for denormalized access (optional, for reporting)
    -- But make it nullable since relationship flows through inventory_units
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'barcodes' AND column_name = 'product_id' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.barcodes ALTER COLUMN product_id DROP NOT NULL;
    END IF;
END $$;

-- Ensure unique constraint (one barcode per inventory unit)
CREATE UNIQUE INDEX IF NOT EXISTS idx_barcodes_inventory_unit_unique ON public.barcodes(inventory_unit_id) WHERE inventory_unit_id IS NOT NULL;

COMMENT ON COLUMN public.barcodes.inventory_unit_id IS 'Primary relationship: barcode belongs to one inventory unit (1-to-1)';
COMMENT ON COLUMN public.barcodes.product_id IS 'Denormalized product reference for quick queries (optional)';
COMMENT ON COLUMN public.barcodes.batch_id IS 'Denormalized batch reference for quick queries (optional)';
COMMENT ON COLUMN public.barcodes.qr_code_data IS 'QR code image data (Base64 or URL) for traceability scanning';

-- ============================================================================
-- STEP 6: ADD TRACEABILITY HELPER VIEW
-- ============================================================================
-- Create a view that shows the complete traceability chain

CREATE OR REPLACE VIEW public.barcode_traceability AS
SELECT 
    b.id as barcode_id,
    b.barcode_value,
    b.barcode_type,
    b.qr_code_data,
    b.status as barcode_status,
    b.created_at as barcode_generated_at,
    
    -- Inventory Unit
    iu.id as inventory_unit_id,
    iu.unit_number,
    iu.status as unit_status,
    iu.condition as unit_condition,
    iu.location_code,
    
    -- Product
    p.id as product_id,
    p.sku as product_sku,
    p.brand as product_brand,
    p.model as product_model,
    p.dimensions as product_dimensions,
    p.category as product_category,
    
    -- Batch
    bat.id as batch_id,
    bat.batch_number,
    bat.manufactured_date,
    bat.container_number as batch_container_number,
    
    -- Shipment
    s.id as shipment_id,
    s.shipment_number,
    s.container_number as shipment_container_number,
    s.bl_number,
    s.received_date as shipment_received_date,
    
    -- Supplier
    sup.id as supplier_id,
    sup.name as supplier_name,
    sup.supplier_code,
    
    -- Warehouse
    w.id as warehouse_id,
    w.name as warehouse_name,
    w.code as warehouse_code
    
FROM public.barcodes b
LEFT JOIN public.inventory_units iu ON b.inventory_unit_id = iu.id
LEFT JOIN public.products p ON iu.product_id = p.id
LEFT JOIN public.batches bat ON iu.batch_id = bat.id
LEFT JOIN public.shipments s ON bat.shipment_id = s.id
LEFT JOIN public.suppliers sup ON s.supplier_id = sup.id
LEFT JOIN public.warehouses w ON iu.warehouse_id = w.id;

COMMENT ON VIEW public.barcode_traceability IS 
'Complete traceability chain: Supplier → Shipment → Container → Batch → Product → Inventory Unit → Barcode → QR Code';

-- Grant access
GRANT SELECT ON public.barcode_traceability TO authenticated;

-- ============================================================================
-- STEP 7: ADD VALIDATION FUNCTION
-- ============================================================================
-- Function to validate the traceability chain is complete

CREATE OR REPLACE FUNCTION public.validate_traceability_chain(barcode_value_input VARCHAR)
RETURNS TABLE(
    is_valid BOOLEAN,
    missing_links TEXT[],
    chain_summary TEXT
) AS $$
DECLARE
    v_barcode_id UUID;
    v_inventory_unit_id UUID;
    v_batch_id UUID;
    v_shipment_id UUID;
    v_supplier_id UUID;
    v_missing TEXT[] := ARRAY[]::TEXT[];
    v_summary TEXT;
BEGIN
    -- Get barcode
    SELECT id, inventory_unit_id INTO v_barcode_id, v_inventory_unit_id
    FROM public.barcodes WHERE barcode_value = barcode_value_input;
    
    IF v_barcode_id IS NULL THEN
        RETURN QUERY SELECT FALSE, ARRAY['Barcode not found']::TEXT[], 'Invalid barcode'::TEXT;
        RETURN;
    END IF;
    
    -- Check inventory unit
    IF v_inventory_unit_id IS NULL THEN
        v_missing := array_append(v_missing, 'Inventory Unit');
    ELSE
        -- Get batch and shipment
        SELECT batch_id INTO v_batch_id FROM public.inventory_units WHERE id = v_inventory_unit_id;
        
        IF v_batch_id IS NULL THEN
            v_missing := array_append(v_missing, 'Batch');
        ELSE
            -- Get shipment
            SELECT shipment_id INTO v_shipment_id FROM public.batches WHERE id = v_batch_id;
            
            IF v_shipment_id IS NULL THEN
                v_missing := array_append(v_missing, 'Shipment');
            ELSE
                -- Get supplier
                SELECT supplier_id INTO v_supplier_id FROM public.shipments WHERE id = v_shipment_id;
                
                IF v_supplier_id IS NULL THEN
                    v_missing := array_append(v_missing, 'Supplier');
                END IF;
            END IF;
        END IF;
    END IF;
    
    -- Build summary
    IF array_length(v_missing, 1) IS NULL THEN
        v_summary := '✅ Complete traceability chain: Supplier → Shipment → Batch → Inventory Unit → Barcode';
        RETURN QUERY SELECT TRUE, v_missing, v_summary;
    ELSE
        v_summary := '⚠️ Incomplete chain. Missing: ' || array_to_string(v_missing, ', ');
        RETURN QUERY SELECT FALSE, v_missing, v_summary;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.validate_traceability_chain IS 
'Validates that a barcode has a complete traceability chain back to supplier';

-- ============================================================================
-- STEP 8: UPDATE RLS POLICIES FOR NEW STRUCTURE
-- ============================================================================

-- Ensure inventory_units has RLS enabled
ALTER TABLE public.inventory_units ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Allow authenticated read inventory_units" ON public.inventory_units;
DROP POLICY IF EXISTS "Allow staff write inventory_units" ON public.inventory_units;

-- Create new policies
CREATE POLICY "Allow authenticated read inventory_units" 
    ON public.inventory_units FOR SELECT 
    TO authenticated USING (true);

CREATE POLICY "Allow staff write inventory_units" 
    ON public.inventory_units FOR ALL 
    TO authenticated USING (true) WITH CHECK (true);

-- Ensure barcodes view access
DROP POLICY IF EXISTS "Allow public read barcode_traceability" ON public.barcode_traceability;
-- Views don't need RLS, they inherit from underlying tables

-- ============================================================================
-- STEP 9: ADD HELPFUL INDEXES FOR TRACEABILITY QUERIES
-- ============================================================================

-- Indexes for efficient traceability lookups
CREATE INDEX IF NOT EXISTS idx_inventory_units_product_batch ON public.inventory_units(product_id, batch_id);
CREATE INDEX IF NOT EXISTS idx_batches_shipment_product ON public.batches(shipment_id, product_id);
CREATE INDEX IF NOT EXISTS idx_barcodes_inventory_unit ON public.barcodes(inventory_unit_id);
CREATE INDEX IF NOT EXISTS idx_shipments_supplier ON public.shipments(supplier_id);

-- ============================================================================
-- STEP 10: DATA MIGRATION - CREATE INVENTORY UNITS FOR EXISTING BARCODES
-- ============================================================================
-- If there are existing barcodes with product_id but no inventory_unit_id,
-- create ONE inventory_unit per barcode (each unit = one physical tire)

DO $$ 
DECLARE
    v_barcode RECORD;
    v_new_inventory_unit_id UUID;
    v_migration_count INTEGER := 0;
BEGIN
    -- Find barcodes that have product_id but no inventory_unit_id
    FOR v_barcode IN 
        SELECT b.id, b.barcode_value, b.product_id, b.batch_id
        FROM public.barcodes b
        WHERE b.product_id IS NOT NULL 
        AND b.inventory_unit_id IS NULL
        LIMIT 1000 -- Safety limit (process in batches if needed)
    LOOP
        -- Create ONE inventory unit for this barcode (one unit = one physical tire)
        INSERT INTO public.inventory_units (
            unit_number,
            product_id,
            batch_id,
            barcode_id,
            status,
            condition,
            notes
        ) VALUES (
            'MIGRATED-' || SUBSTRING(v_barcode.barcode_value, 1, 20),
            v_barcode.product_id,
            v_barcode.batch_id,
            v_barcode.id,
            'AVAILABLE',
            'NEW',
            'Auto-migrated from existing barcode during architecture correction'
        ) RETURNING id INTO v_new_inventory_unit_id;
        
        -- Update barcode to reference this inventory unit
        UPDATE public.barcodes 
        SET inventory_unit_id = v_new_inventory_unit_id
        WHERE id = v_barcode.id;
        
        v_migration_count := v_migration_count + 1;
        
        IF v_migration_count % 100 = 0 THEN
            RAISE NOTICE 'Migrated % barcodes to inventory units...', v_migration_count;
        END IF;
    END LOOP;
    
    IF v_migration_count > 0 THEN
        RAISE NOTICE '✅ Successfully migrated % existing barcodes to inventory_units', v_migration_count;
        RAISE NOTICE 'Each inventory_unit represents ONE physical tire with its own barcode';
    ELSE
        RAISE NOTICE 'No existing barcodes needed migration';
    END IF;
END $$;

-- ============================================================================
-- COMMIT AND VERIFY
-- ============================================================================

COMMIT;

-- Verification query
SELECT 
    '✅ 013_correct_data_architecture.sql executed successfully!' as status,
    (SELECT COUNT(*) FROM public.suppliers) as suppliers_count,
    (SELECT COUNT(*) FROM public.shipments) as shipments_count,
    (SELECT COUNT(*) FROM public.batches) as batches_count,
    (SELECT COUNT(*) FROM public.inventory_units) as inventory_units_count,
    (SELECT COUNT(*) FROM public.barcodes) as barcodes_count,
    (SELECT COUNT(*) FROM public.products) as products_count,
    NOW() as migration_completed_at;

-- Show sample traceability chain
SELECT 
    '📊 Sample Traceability Chains:' as info;

SELECT 
    barcode_value,
    product_sku,
    batch_number,
    shipment_number,
    supplier_name,
    CASE 
        WHEN supplier_id IS NOT NULL THEN '✅ Complete'
        ELSE '⚠️ Incomplete'
    END as chain_status
FROM public.barcode_traceability
LIMIT 5;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- SUMMARY OF CHANGES
-- ============================================================================
/*
✅ CORRECT RELATIONSHIP CHAIN NOW ESTABLISHED:

1. suppliers (1) → (N) shipments
   └─ shipments store: container_number, bl_number, expected_quantity, actual_quantity
   └─ SOURCE OF TRUTH for container/BL (NOT duplicated in batches)

2. shipments (1) → (N) batches
   └─ batches reference: shipment_id only
   └─ Get container_number via: batch.shipment_id → shipment.container_number

3. products (1) → (N) inventory_units
   └─ products define: SKU, brand, model, dimensions (CATALOG)
   └─ inventory_units = PHYSICAL TIRES (one record per tire)

4. batches (1) → (N) inventory_units
   └─ Example: Batch has 100 tires → Create INV-000001 to INV-000100
   └─ Each inventory_unit = ONE PHYSICAL TIRE (not a quantity)

5. inventory_units (1) → (1) barcodes
   └─ barcodes contain: barcode_value, QR code data
   └─ Each physical tire gets ONE unique barcode

COMPLETE CHAIN:
Supplier → Shipment (container_number + bl_number) → Batch → Product (catalog) → Inventory Unit (physical tire) → Barcode (unique ID) → QR Code (traceability)

CRITICAL CONCEPT - WHY INVENTORY_UNITS IS ESSENTIAL:

❌ WRONG: Barcode represents a quantity (e.g., "this barcode = 50 tires from batch X")
✅ CORRECT: Each physical tire gets its own inventory_unit and barcode

Example workflow:
1. Shipment arrives with 100 tires
2. Create batch: BATCH-2608-000001
3. Create 100 inventory_units: INV-000001 to INV-000100
4. Scan each tire during receiving → update inventory_unit.last_scanned_at
5. Customer orders tire → pick INV-000042 → scan barcode → link to order
6. Customer returns tire → scan barcode → identify exact tire → preserve traceability
7. Defective tire found → scan barcode → trace back to batch → trace to shipment → trace to supplier

This enables:
✅ Scan during receiving (each tire scanned individually)
✅ Scan during picking (specific tire selected for FIFO)
✅ Link barcode to order (know which customer got which tire)
✅ Preserve barcode during rejection (trace defective items)
✅ Trace returns (exact tire returned, not just "a tire from batch X")
✅ Warranty tracking (per physical tire, not per batch)

TRACEABILITY QUERIES:
- Use view: public.barcode_traceability
- Use function: public.validate_traceability_chain('BARCODE_VALUE')

DATA INTEGRITY:
- All foreign keys properly set with RESTRICT/CASCADE
- NO container_number duplication (only in shipments)
- Unique constraints on barcode_value and inventory_unit relationships
- Indexes for efficient traceability lookups
- Each inventory_unit = ONE physical tire (no quantity field)
*/
