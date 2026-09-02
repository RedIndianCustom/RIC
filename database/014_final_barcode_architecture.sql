-- ============================================================================
-- 014: FINAL BARCODE ARCHITECTURE - COMPLETE IMPLEMENTATION (FIXED)
-- ============================================================================
-- Red Indian Customs (RIC) Inventory Management System
-- Date: 2026-08-20
--
-- FIX NOTE:
-- The original migration used `CREATE TABLE IF NOT EXISTS` and assumed that
-- would guarantee the target schema. If shipments/batches/inventory_units
-- already existed from an earlier migration with a different set of columns,
-- `IF NOT EXISTS` silently skips table creation entirely -- it does NOT add
-- missing columns. This version explicitly reconciles each table's columns
-- with `ADD COLUMN IF NOT EXISTS` (and guarded constraint additions) right
-- after each CREATE TABLE block, before anything downstream (indexes, FKs,
-- views, functions) depends on those columns existing.
--
-- COMPLETE CHAIN:
-- Supplier -> Shipment (container_number + bl_number) -> Batch ->
-- Product -> Inventory Unit -> Barcode (unique) -> QR Code (traceability URL)
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 0: DIAGNOSTIC - SHOW WHAT ALREADY EXISTS (for your logs, non-blocking)
-- ============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT table_name, string_agg(column_name, ', ' ORDER BY ordinal_position) AS cols
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('shipments', 'batches', 'inventory_units', 'barcodes')
        GROUP BY table_name
    LOOP
        RAISE NOTICE 'Pre-existing table %: columns = %', r.table_name, r.cols;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 1: SHIPMENTS TABLE (SOURCE OF TRUTH FOR CONTAINER)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

-- Reconcile columns (safe no-ops if table was just created above)
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS supplier_id UUID;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS shipment_number TEXT;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS container_number TEXT;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS bl_number TEXT;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS expected_quantity INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS actual_quantity INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS expected_arrival_date DATE;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS received_date TIMESTAMPTZ;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS received_by UUID;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS inspection_completed BOOLEAN DEFAULT false;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS inspection_notes TEXT;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS inspected_by UUID;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS inspection_date TIMESTAMPTZ;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Backfill required text columns before enforcing NOT NULL / UNIQUE
UPDATE public.shipments SET shipment_number = 'SHP-' || id::text WHERE shipment_number IS NULL;
UPDATE public.shipments SET container_number = 'UNKNOWN-' || id::text WHERE container_number IS NULL;

ALTER TABLE public.shipments ALTER COLUMN shipment_number SET NOT NULL;
ALTER TABLE public.shipments ALTER COLUMN container_number SET NOT NULL;

-- Guarded FK additions (skip if already present under any name/definition conflict)
DO $$ BEGIN
    ALTER TABLE public.shipments
        ADD CONSTRAINT fk_shipments_supplier
        FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.shipments
        ADD CONSTRAINT fk_shipments_received_by
        FOREIGN KEY (received_by) REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.shipments
        ADD CONSTRAINT fk_shipments_inspected_by
        FOREIGN KEY (inspected_by) REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Guarded CHECK constraints
DO $$ BEGIN
    ALTER TABLE public.shipments
        ADD CONSTRAINT chk_shipments_expected_quantity CHECK (expected_quantity >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.shipments
        ADD CONSTRAINT chk_shipments_actual_quantity CHECK (actual_quantity >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.shipments
        ADD CONSTRAINT chk_shipments_status CHECK (
            status IN ('PENDING','IN_TRANSIT','RECEIVED','INSPECTING','APPROVED','REJECTED','CANCELLED')
        );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Unique on shipment_number
CREATE UNIQUE INDEX IF NOT EXISTS uq_shipments_shipment_number ON public.shipments(shipment_number);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shipments_supplier_id ON public.shipments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_shipments_shipment_number ON public.shipments(shipment_number);
CREATE INDEX IF NOT EXISTS idx_shipments_container_number ON public.shipments(container_number);
CREATE INDEX IF NOT EXISTS idx_shipments_bl_number ON public.shipments(bl_number);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON public.shipments(status);

-- Unique constraint: container number cannot be duplicated for active shipments
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_container_number
ON public.shipments(container_number)
WHERE status NOT IN ('CANCELLED');

COMMENT ON TABLE public.shipments IS 'Incoming shipments - SOURCE OF TRUTH for container_number and bl_number';
COMMENT ON COLUMN public.shipments.container_number IS 'Physical container number - DO NOT duplicate in batches';
COMMENT ON COLUMN public.shipments.bl_number IS 'Bill of Lading number';
COMMENT ON COLUMN public.shipments.expected_quantity IS 'Expected quantity entered by Operational Staff';
COMMENT ON COLUMN public.shipments.actual_quantity IS 'Actual quantity received and verified';

-- ============================================================================
-- STEP 2: BATCHES TABLE (LINKS TO SHIPMENT, NO CONTAINER DUPLICATION)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS shipment_id UUID;
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS batch_number TEXT;
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS product_id UUID;
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS batch_month INTEGER;
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS batch_year INTEGER;
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS manufactured_date DATE;
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Remove container_number/bl_number if they exist on an old schema (prevent duplication)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'batches' AND column_name = 'container_number'
    ) THEN
        RAISE NOTICE 'Removing container_number from batches - use shipments.container_number instead';
        ALTER TABLE public.batches DROP COLUMN container_number CASCADE;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'batches' AND column_name = 'bl_number'
    ) THEN
        RAISE NOTICE 'Removing bl_number from batches - use shipments.bl_number instead';
        ALTER TABLE public.batches DROP COLUMN bl_number CASCADE;
    END IF;
END $$;

-- Backfill required columns before enforcing NOT NULL / constraints.
-- batch_number: needs a value for every existing row before UNIQUE + NOT NULL.
UPDATE public.batches SET batch_number = 'BATCH-' || id::text WHERE batch_number IS NULL;
ALTER TABLE public.batches ALTER COLUMN batch_number SET NOT NULL;

-- batch_month / batch_year: default any legacy NULLs to created_at's month/year
UPDATE public.batches
SET batch_month = COALESCE(batch_month, EXTRACT(MONTH FROM created_at)::INTEGER)
WHERE batch_month IS NULL;
UPDATE public.batches
SET batch_year = COALESCE(batch_year, EXTRACT(YEAR FROM created_at)::INTEGER)
WHERE batch_year IS NULL;
ALTER TABLE public.batches ALTER COLUMN batch_month SET NOT NULL;
ALTER TABLE public.batches ALTER COLUMN batch_year SET NOT NULL;

-- shipment_id is NOT NULL in the target schema. If old rows have no shipment,
-- they cannot be backfilled automatically -- surface them instead of guessing.
DO $$
DECLARE
    orphan_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphan_count FROM public.batches WHERE shipment_id IS NULL;
    IF orphan_count > 0 THEN
        RAISE WARNING '% batches row(s) have NULL shipment_id and will NOT get a NOT NULL constraint yet. Backfill shipment_id manually, then run: ALTER TABLE public.batches ALTER COLUMN shipment_id SET NOT NULL;', orphan_count;
    ELSE
        ALTER TABLE public.batches ALTER COLUMN shipment_id SET NOT NULL;
    END IF;
END $$;

-- Guarded FK / CHECK additions
DO $$ BEGIN
    ALTER TABLE public.batches
        ADD CONSTRAINT fk_batches_shipment
        FOREIGN KEY (shipment_id) REFERENCES public.shipments(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.batches
        ADD CONSTRAINT fk_batches_product
        FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.batches
        ADD CONSTRAINT chk_batches_month CHECK (batch_month BETWEEN 1 AND 12);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.batches
        ADD CONSTRAINT chk_batches_year CHECK (batch_year >= 2000);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.batches
        ADD CONSTRAINT chk_batches_status CHECK (
            status IN ('ACTIVE','RECEIVED','APPROVED','REJECTED','CLOSED')
        );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_batches_batch_number ON public.batches(batch_number);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_batches_shipment_id ON public.batches(shipment_id);
CREATE INDEX IF NOT EXISTS idx_batches_batch_number ON public.batches(batch_number);
CREATE INDEX IF NOT EXISTS idx_batches_product_id ON public.batches(product_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON public.batches(status);

COMMENT ON TABLE public.batches IS 'Product batches - get container_number from shipments via shipment_id';
COMMENT ON COLUMN public.batches.shipment_id IS 'Links to shipment (which contains container_number + bl_number)';
COMMENT ON COLUMN public.batches.batch_month IS 'Month part of batch number (e.g., 08 for August)';
COMMENT ON COLUMN public.batches.batch_year IS 'Year part of batch number (e.g., 2026)';

-- ============================================================================
-- STEP 3: INVENTORY_UNITS TABLE - ONE RECORD PER PHYSICAL TIRE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.inventory_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE public.inventory_units ADD COLUMN IF NOT EXISTS inventory_unit_code TEXT;
ALTER TABLE public.inventory_units ADD COLUMN IF NOT EXISTS product_id UUID;
ALTER TABLE public.inventory_units ADD COLUMN IF NOT EXISTS batch_id UUID;
ALTER TABLE public.inventory_units ADD COLUMN IF NOT EXISTS quantity NUMERIC(12,2) NOT NULL DEFAULT 1;
ALTER TABLE public.inventory_units ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'NEW';
ALTER TABLE public.inventory_units ADD COLUMN IF NOT EXISTS warehouse_id UUID;
ALTER TABLE public.inventory_units ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE public.inventory_units ADD COLUMN IF NOT EXISTS rack TEXT;
ALTER TABLE public.inventory_units ADD COLUMN IF NOT EXISTS shelf TEXT;
ALTER TABLE public.inventory_units ADD COLUMN IF NOT EXISTS section TEXT;
ALTER TABLE public.inventory_units ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ;
ALTER TABLE public.inventory_units ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMPTZ;
ALTER TABLE public.inventory_units ADD COLUMN IF NOT EXISTS last_scanned_by UUID;
ALTER TABLE public.inventory_units ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.inventory_units ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.inventory_units ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Backfill inventory_unit_code before UNIQUE + NOT NULL
UPDATE public.inventory_units SET inventory_unit_code = 'INV-' || id::text WHERE inventory_unit_code IS NULL;
ALTER TABLE public.inventory_units ALTER COLUMN inventory_unit_code SET NOT NULL;

-- product_id / batch_id are NOT NULL in target schema; surface orphans instead of guessing
DO $$
DECLARE
    orphan_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphan_count FROM public.inventory_units WHERE product_id IS NULL;
    IF orphan_count > 0 THEN
        RAISE WARNING '% inventory_units row(s) have NULL product_id. Backfill manually, then run: ALTER TABLE public.inventory_units ALTER COLUMN product_id SET NOT NULL;', orphan_count;
    ELSE
        ALTER TABLE public.inventory_units ALTER COLUMN product_id SET NOT NULL;
    END IF;

    SELECT COUNT(*) INTO orphan_count FROM public.inventory_units WHERE batch_id IS NULL;
    IF orphan_count > 0 THEN
        RAISE WARNING '% inventory_units row(s) have NULL batch_id. Backfill manually, then run: ALTER TABLE public.inventory_units ALTER COLUMN batch_id SET NOT NULL;', orphan_count;
    ELSE
        ALTER TABLE public.inventory_units ALTER COLUMN batch_id SET NOT NULL;
    END IF;
END $$;

-- Guarded FK / CHECK additions
DO $$ BEGIN
    ALTER TABLE public.inventory_units
        ADD CONSTRAINT fk_inventory_units_product
        FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.inventory_units
        ADD CONSTRAINT fk_inventory_units_batch
        FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.inventory_units
        ADD CONSTRAINT fk_inventory_units_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.inventory_units
        ADD CONSTRAINT fk_inventory_units_scanned_by
        FOREIGN KEY (last_scanned_by) REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.inventory_units
        ADD CONSTRAINT chk_inventory_units_quantity CHECK (quantity > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.inventory_units
        ADD CONSTRAINT chk_inventory_units_status CHECK (
            status IN (
                'NEW','RECEIVED','AVAILABLE','RESERVED','PICKED','SOLD',
                'RETURNED','REJECTED_DISCOUNTABLE','REJECTED_NOT_FOR_SALE',
                'DAMAGED','QUARANTINED'
            )
        );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_units_code ON public.inventory_units(inventory_unit_code);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_units_code ON public.inventory_units(inventory_unit_code);
CREATE INDEX IF NOT EXISTS idx_inventory_units_product_id ON public.inventory_units(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_units_batch_id ON public.inventory_units(batch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_units_warehouse_id ON public.inventory_units(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_units_status ON public.inventory_units(status);
CREATE INDEX IF NOT EXISTS idx_inventory_units_location ON public.inventory_units(warehouse_id, level, rack, shelf, section);

COMMENT ON TABLE public.inventory_units IS 'ONE RECORD PER PHYSICAL TIRE - enables scan during receiving, picking, returns';
COMMENT ON COLUMN public.inventory_units.inventory_unit_code IS 'Unique code for this physical tire (e.g., INV-{uuid})';
COMMENT ON COLUMN public.inventory_units.quantity IS 'Quantity for this unit (typically 1)';
COMMENT ON COLUMN public.inventory_units.status IS 'Lifecycle: NEW -> RECEIVED -> AVAILABLE -> PICKED -> SOLD (or RETURNED/REJECTED)';
COMMENT ON COLUMN public.inventory_units.level IS 'Warehouse level (e.g., Ground Level, Mezzanine)';
COMMENT ON COLUMN public.inventory_units.rack IS 'Rack identifier (e.g., A, B, C)';
COMMENT ON COLUMN public.inventory_units.shelf IS 'Shelf number (e.g., 02, 15)';
COMMENT ON COLUMN public.inventory_units.section IS 'Section identifier';
COMMENT ON COLUMN public.inventory_units.last_scanned_at IS 'Last scan time (receiving, picking, shipping, return)';
COMMENT ON COLUMN public.inventory_units.last_scanned_by IS 'User who last scanned this tire';

-- ============================================================================
-- STEP 4: BARCODE SEQUENCE FOR UNIQUE GENERATION
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS barcode_sequence
START WITH 1
INCREMENT BY 1;

CREATE OR REPLACE FUNCTION get_next_barcode_sequence()
RETURNS BIGINT
LANGUAGE SQL
AS $$
    SELECT nextval('barcode_sequence');
$$;

COMMENT ON FUNCTION get_next_barcode_sequence IS 'Concurrent-safe barcode sequence generator';

-- ============================================================================
-- STEP 5: BARCODES TABLE - ONE BARCODE PER INVENTORY UNIT
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.barcodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE public.barcodes ADD COLUMN IF NOT EXISTS barcode_value TEXT;
ALTER TABLE public.barcodes ADD COLUMN IF NOT EXISTS barcode_type TEXT NOT NULL DEFAULT 'CODE128';
ALTER TABLE public.barcodes ADD COLUMN IF NOT EXISTS product_id UUID;
ALTER TABLE public.barcodes ADD COLUMN IF NOT EXISTS batch_id UUID;
ALTER TABLE public.barcodes ADD COLUMN IF NOT EXISTS inventory_unit_id UUID;
ALTER TABLE public.barcodes ADD COLUMN IF NOT EXISTS traceability_url TEXT;
ALTER TABLE public.barcodes ADD COLUMN IF NOT EXISTS qr_code_data TEXT;
ALTER TABLE public.barcodes ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.barcodes ADD COLUMN IF NOT EXISTS generated_by UUID;
ALTER TABLE public.barcodes ADD COLUMN IF NOT EXISTS printed_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.barcodes ADD COLUMN IF NOT EXISTS last_printed_at TIMESTAMPTZ;
ALTER TABLE public.barcodes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.barcodes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Backfill barcode_value before UNIQUE + NOT NULL
UPDATE public.barcodes
SET barcode_value = 'RIC' || lpad(nextval('barcode_sequence')::text, 12, '0')
WHERE barcode_value IS NULL;
ALTER TABLE public.barcodes ALTER COLUMN barcode_value SET NOT NULL;

-- product_id / batch_id / inventory_unit_id are NOT NULL in target schema
DO $$
DECLARE
    orphan_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphan_count FROM public.barcodes WHERE product_id IS NULL;
    IF orphan_count > 0 THEN
        RAISE WARNING '% barcodes row(s) have NULL product_id. Backfill manually, then run: ALTER TABLE public.barcodes ALTER COLUMN product_id SET NOT NULL;', orphan_count;
    ELSE
        ALTER TABLE public.barcodes ALTER COLUMN product_id SET NOT NULL;
    END IF;

    SELECT COUNT(*) INTO orphan_count FROM public.barcodes WHERE batch_id IS NULL;
    IF orphan_count > 0 THEN
        RAISE WARNING '% barcodes row(s) have NULL batch_id. Backfill manually, then run: ALTER TABLE public.barcodes ALTER COLUMN batch_id SET NOT NULL;', orphan_count;
    ELSE
        ALTER TABLE public.barcodes ALTER COLUMN batch_id SET NOT NULL;
    END IF;

    SELECT COUNT(*) INTO orphan_count FROM public.barcodes WHERE inventory_unit_id IS NULL;
    IF orphan_count > 0 THEN
        RAISE WARNING '% barcodes row(s) have NULL inventory_unit_id. Backfill manually, then run: ALTER TABLE public.barcodes ALTER COLUMN inventory_unit_id SET NOT NULL;', orphan_count;
    ELSE
        ALTER TABLE public.barcodes ALTER COLUMN inventory_unit_id SET NOT NULL;
    END IF;
END $$;

-- Guarded FK / CHECK additions
DO $$ BEGIN
    ALTER TABLE public.barcodes
        ADD CONSTRAINT fk_barcodes_product
        FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.barcodes
        ADD CONSTRAINT fk_barcodes_batch
        FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.barcodes
        ADD CONSTRAINT fk_barcodes_inventory_unit
        FOREIGN KEY (inventory_unit_id) REFERENCES public.inventory_units(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.barcodes
        ADD CONSTRAINT chk_barcodes_type CHECK (
            barcode_type IN ('CODE128','CODE39','EAN13','UPC')
        );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.barcodes
        ADD CONSTRAINT chk_barcodes_status CHECK (
            status IN ('active','inactive','void','replaced')
        );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.barcodes
        ADD CONSTRAINT fk_barcodes_generated_by
        FOREIGN KEY (generated_by) REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Uniqueness: one barcode value overall, one barcode per inventory unit (1:1)
CREATE UNIQUE INDEX IF NOT EXISTS uq_barcodes_barcode_value ON public.barcodes(barcode_value);
CREATE UNIQUE INDEX IF NOT EXISTS uq_barcodes_inventory_unit_id ON public.barcodes(inventory_unit_id);

-- Indexes (critical for scanning performance)
CREATE INDEX IF NOT EXISTS idx_barcodes_barcode_value ON public.barcodes(barcode_value);
CREATE INDEX IF NOT EXISTS idx_barcodes_product_id ON public.barcodes(product_id);
CREATE INDEX IF NOT EXISTS idx_barcodes_batch_id ON public.barcodes(batch_id);
CREATE INDEX IF NOT EXISTS idx_barcodes_inventory_unit_id ON public.barcodes(inventory_unit_id);
CREATE INDEX IF NOT EXISTS idx_barcodes_status ON public.barcodes(status);

COMMENT ON TABLE public.barcodes IS 'Unique barcodes - ONE barcode per inventory_unit (1:1 relationship)';
COMMENT ON COLUMN public.barcodes.barcode_value IS 'Unique barcode string (e.g., RIC000000000001)';
COMMENT ON COLUMN public.barcodes.inventory_unit_id IS 'Links to ONE physical tire (UNIQUE constraint enforces 1:1)';
COMMENT ON COLUMN public.barcodes.traceability_url IS 'URL encoded in QR code (e.g., https://domain.com/trace/RIC000000000001)';
COMMENT ON COLUMN public.barcodes.qr_code_data IS 'Base64 QR code image data';
COMMENT ON COLUMN public.barcodes.status IS 'active, inactive, void, replaced - NEVER hard-delete (preserve for returns)';

-- ============================================================================
-- STEP 6: TRACEABILITY VIEW - COMPLETE CHAIN
-- ============================================================================
-- SELF-DETECTING: we no longer hardcode products.product_name / .dimensions /
-- .category / warehouses.name / .code / .location / suppliers.name / etc.
-- because those guesses have repeatedly not matched the real schema. Instead
-- this resolves each display column at migration time by checking
-- information_schema for the first matching candidate name, and falls back
-- to NULL::text if none of the candidates exist (so the migration always
-- succeeds; widen the candidate list later if a column is missing).
--
-- Also fixed: the original view selected both `iu.warehouse_id` and
-- `w.id as warehouse_id` -- two output columns with the same name, which
-- Postgres rejects. Removed the redundant `w.id`.

CREATE OR REPLACE FUNCTION public._resolve_column(p_table TEXT, p_candidates TEXT[])
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
    c TEXT;
BEGIN
    FOREACH c IN ARRAY p_candidates LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = p_table AND column_name = c
        ) THEN
            RETURN c;
        END IF;
    END LOOP;
    RETURN NULL;
END;
$$;

DO $$
DECLARE
    v_product_name_col TEXT;
    v_product_dim_col TEXT;
    v_product_cat_col TEXT;
    v_warehouse_name_col TEXT;
    v_warehouse_code_col TEXT;
    v_warehouse_location_col TEXT;
    v_supplier_name_col TEXT;
    v_supplier_code_col TEXT;
    v_supplier_contact_col TEXT;
    v_sql TEXT;
BEGIN
    v_product_name_col      := public._resolve_column('products',   ARRAY['product_name','name','title','description']);
    v_product_dim_col       := public._resolve_column('products',   ARRAY['dimensions','product_dimensions','size','tire_size','tyre_size']);
    v_product_cat_col       := public._resolve_column('products',   ARRAY['category','product_category','type']);
    v_warehouse_name_col    := public._resolve_column('warehouses', ARRAY['name','warehouse_name']);
    v_warehouse_code_col    := public._resolve_column('warehouses', ARRAY['code','warehouse_code']);
    v_warehouse_location_col:= public._resolve_column('warehouses', ARRAY['location','address']);
    v_supplier_name_col     := public._resolve_column('suppliers',  ARRAY['name','supplier_name']);
    v_supplier_code_col     := public._resolve_column('suppliers',  ARRAY['supplier_code','code']);
    v_supplier_contact_col  := public._resolve_column('suppliers',  ARRAY['contact_person','contact_name']);

    RAISE NOTICE 'products: name=%, dimensions=%, category=%', v_product_name_col, v_product_dim_col, v_product_cat_col;
    RAISE NOTICE 'warehouses: name=%, code=%, location=%', v_warehouse_name_col, v_warehouse_code_col, v_warehouse_location_col;
    RAISE NOTICE 'suppliers: name=%, code=%, contact=%', v_supplier_name_col, v_supplier_code_col, v_supplier_contact_col;

    v_sql := format($f$
        CREATE OR REPLACE VIEW public.barcode_full_traceability AS
        SELECT
            b.id as barcode_id,
            b.barcode_value,
            b.barcode_type,
            b.traceability_url,
            b.status as barcode_status,
            b.created_at as barcode_generated_at,

            iu.id as inventory_unit_id,
            iu.inventory_unit_code,
            iu.quantity as unit_quantity,
            iu.status as unit_status,
            iu.warehouse_id,
            iu.level as warehouse_level,
            iu.rack as warehouse_rack,
            iu.shelf as warehouse_shelf,
            iu.section as warehouse_section,
            iu.received_at as unit_received_at,
            iu.last_scanned_at,

            p.id as product_id,
            p.sku as product_sku,
            p.brand as product_brand,
            p.model as product_model,
            %s as product_name,
            %s as product_dimensions,
            %s as product_category,

            bat.id as batch_id,
            bat.batch_number,
            bat.batch_month,
            bat.batch_year,
            bat.manufactured_date,
            bat.expiry_date,
            bat.status as batch_status,

            s.id as shipment_id,
            s.shipment_number,
            s.container_number,
            s.bl_number,
            s.expected_quantity as shipment_expected_qty,
            s.actual_quantity as shipment_actual_qty,
            s.expected_arrival_date,
            s.received_date as shipment_received_date,
            s.status as shipment_status,

            sup.id as supplier_id,
            %s as supplier_name,
            %s as supplier_code,
            %s as supplier_contact,

            %s as warehouse_name,
            %s as warehouse_code,
            %s as warehouse_location

        FROM public.barcodes b
        INNER JOIN public.inventory_units iu ON b.inventory_unit_id = iu.id
        INNER JOIN public.products p ON iu.product_id = p.id
        INNER JOIN public.batches bat ON iu.batch_id = bat.id
        INNER JOIN public.shipments s ON bat.shipment_id = s.id
        LEFT JOIN public.suppliers sup ON s.supplier_id = sup.id
        LEFT JOIN public.warehouses w ON iu.warehouse_id = w.id;
    $f$,
        CASE WHEN v_product_name_col       IS NOT NULL THEN format('p.%I', v_product_name_col)       ELSE 'NULL::text' END,
        CASE WHEN v_product_dim_col        IS NOT NULL THEN format('p.%I', v_product_dim_col)        ELSE 'NULL::text' END,
        CASE WHEN v_product_cat_col        IS NOT NULL THEN format('p.%I', v_product_cat_col)        ELSE 'NULL::text' END,
        CASE WHEN v_supplier_name_col      IS NOT NULL THEN format('sup.%I', v_supplier_name_col)    ELSE 'NULL::text' END,
        CASE WHEN v_supplier_code_col      IS NOT NULL THEN format('sup.%I', v_supplier_code_col)    ELSE 'NULL::text' END,
        CASE WHEN v_supplier_contact_col   IS NOT NULL THEN format('sup.%I', v_supplier_contact_col) ELSE 'NULL::text' END,
        CASE WHEN v_warehouse_name_col     IS NOT NULL THEN format('w.%I', v_warehouse_name_col)     ELSE 'NULL::text' END,
        CASE WHEN v_warehouse_code_col     IS NOT NULL THEN format('w.%I', v_warehouse_code_col)     ELSE 'NULL::text' END,
        CASE WHEN v_warehouse_location_col IS NOT NULL THEN format('w.%I', v_warehouse_location_col) ELSE 'NULL::text' END
    );

    EXECUTE v_sql;
END $$;

DROP FUNCTION IF EXISTS public._resolve_column(TEXT, TEXT[]);

COMMENT ON VIEW public.barcode_full_traceability IS
'Complete traceability: Barcode -> Inventory Unit -> Batch -> Shipment (container) -> Supplier. Product/warehouse/supplier display columns auto-resolved at migration time -- see NOTICE output for which columns were used.';

-- ============================================================================
-- STEP 7: VALIDATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_barcode_chain(barcode_value_input TEXT)
RETURNS TABLE(
    is_valid BOOLEAN,
    missing_links TEXT[],
    chain_summary TEXT,
    barcode_id UUID,
    inventory_unit_id UUID,
    product_sku TEXT,
    batch_number TEXT,
    shipment_number TEXT,
    container_number TEXT,
    supplier_name TEXT
) AS $$
DECLARE
    v_missing TEXT[] := ARRAY[]::TEXT[];
    v_summary TEXT;
    v_barcode_id UUID;
    v_inventory_unit_id UUID;
    v_product_sku TEXT;
    v_batch_number TEXT;
    v_shipment_number TEXT;
    v_container_number TEXT;
    v_supplier_name TEXT;
BEGIN
    SELECT
        b.id, iu.id, p.sku, bat.batch_number, s.shipment_number, s.container_number, sup.name
    INTO
        v_barcode_id, v_inventory_unit_id, v_product_sku, v_batch_number,
        v_shipment_number, v_container_number, v_supplier_name
    FROM public.barcodes b
    LEFT JOIN public.inventory_units iu ON b.inventory_unit_id = iu.id
    LEFT JOIN public.products p ON iu.product_id = p.id
    LEFT JOIN public.batches bat ON iu.batch_id = bat.id
    LEFT JOIN public.shipments s ON bat.shipment_id = s.id
    LEFT JOIN public.suppliers sup ON s.supplier_id = sup.id
    WHERE b.barcode_value = barcode_value_input;

    IF v_barcode_id IS NULL THEN
        RETURN QUERY SELECT
            FALSE,
            ARRAY['Barcode not found']::TEXT[],
            'Invalid barcode'::TEXT,
            NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    IF v_inventory_unit_id IS NULL THEN v_missing := array_append(v_missing, 'Inventory Unit'); END IF;
    IF v_product_sku IS NULL THEN v_missing := array_append(v_missing, 'Product'); END IF;
    IF v_batch_number IS NULL THEN v_missing := array_append(v_missing, 'Batch'); END IF;
    IF v_shipment_number IS NULL THEN v_missing := array_append(v_missing, 'Shipment'); END IF;
    IF v_container_number IS NULL THEN v_missing := array_append(v_missing, 'Container Number'); END IF;
    IF v_supplier_name IS NULL THEN v_missing := array_append(v_missing, 'Supplier'); END IF;

    IF array_length(v_missing, 1) IS NULL THEN
        v_summary := 'Complete chain: ' || v_supplier_name || ' -> ' || v_container_number ||
                     ' -> ' || v_batch_number || ' -> ' || v_product_sku || ' -> ' || barcode_value_input;
        RETURN QUERY SELECT
            TRUE, v_missing, v_summary, v_barcode_id, v_inventory_unit_id,
            v_product_sku, v_batch_number, v_shipment_number, v_container_number, v_supplier_name;
    ELSE
        v_summary := 'Incomplete chain. Missing: ' || array_to_string(v_missing, ', ');
        RETURN QUERY SELECT
            FALSE, v_missing, v_summary, v_barcode_id, v_inventory_unit_id,
            v_product_sku, v_batch_number, v_shipment_number, v_container_number, v_supplier_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.validate_barcode_chain IS
'Validates complete traceability chain for a barcode';

-- ============================================================================
-- STEP 8: TRIGGERS FOR AUTO UPDATED_AT
-- ============================================================================

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'trigger_set_updated_at'
    ) THEN
        RAISE EXCEPTION 'Function public.trigger_set_updated_at() does not exist. Create it before running this migration, e.g.:
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $f$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$f$;';
    END IF;
END $$;

DROP TRIGGER IF EXISTS trg_shipments_updated_at ON public.shipments;
CREATE TRIGGER trg_shipments_updated_at BEFORE UPDATE ON public.shipments
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_batches_updated_at ON public.batches;
CREATE TRIGGER trg_batches_updated_at BEFORE UPDATE ON public.batches
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_inventory_units_updated_at ON public.inventory_units;
CREATE TRIGGER trg_inventory_units_updated_at BEFORE UPDATE ON public.inventory_units
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_barcodes_updated_at ON public.barcodes;
CREATE TRIGGER trg_barcodes_updated_at BEFORE UPDATE ON public.barcodes
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- ============================================================================
-- STEP 9: ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barcodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read shipments" ON public.shipments;
CREATE POLICY "Allow authenticated read shipments" ON public.shipments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow staff write shipments" ON public.shipments;
CREATE POLICY "Allow staff write shipments" ON public.shipments FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated read batches" ON public.batches;
CREATE POLICY "Allow authenticated read batches" ON public.batches FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow staff write batches" ON public.batches;
CREATE POLICY "Allow staff write batches" ON public.batches FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated read inventory_units" ON public.inventory_units;
CREATE POLICY "Allow authenticated read inventory_units" ON public.inventory_units FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow staff write inventory_units" ON public.inventory_units;
CREATE POLICY "Allow staff write inventory_units" ON public.inventory_units FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated read barcodes" ON public.barcodes;
CREATE POLICY "Allow authenticated read barcodes" ON public.barcodes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow staff write barcodes" ON public.barcodes;
CREATE POLICY "Allow staff write barcodes" ON public.barcodes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Grants
GRANT ALL ON public.shipments TO authenticated;
GRANT ALL ON public.batches TO authenticated;
GRANT ALL ON public.inventory_units TO authenticated;
GRANT ALL ON public.barcodes TO authenticated;
GRANT SELECT ON public.barcode_full_traceability TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_barcode_sequence TO authenticated;
GRANT EXECUTE ON FUNCTION validate_barcode_chain TO authenticated;

-- ============================================================================
-- COMMIT AND VERIFY
-- ============================================================================

COMMIT;

-- Verification
SELECT
    'Migration 014_final_barcode_architecture_fixed.sql executed successfully' as status,
    (SELECT COUNT(*) FROM public.suppliers) as suppliers_count,
    (SELECT COUNT(*) FROM public.shipments) as shipments_count,
    (SELECT COUNT(*) FROM public.batches) as batches_count,
    (SELECT COUNT(*) FROM public.products) as products_count,
    (SELECT COUNT(*) FROM public.inventory_units) as inventory_units_count,
    (SELECT COUNT(*) FROM public.barcodes) as barcodes_count,
    (SELECT last_value FROM barcode_sequence) as next_barcode_sequence,
    NOW() as migration_completed_at;

-- Any rows that still need manual backfill (NOT NULL not yet enforced)
SELECT 'batches missing shipment_id' AS issue, COUNT(*) FROM public.batches WHERE shipment_id IS NULL
UNION ALL
SELECT 'inventory_units missing product_id', COUNT(*) FROM public.inventory_units WHERE product_id IS NULL
UNION ALL
SELECT 'inventory_units missing batch_id', COUNT(*) FROM public.inventory_units WHERE batch_id IS NULL
UNION ALL
SELECT 'barcodes missing product_id', COUNT(*) FROM public.barcodes WHERE product_id IS NULL
UNION ALL
SELECT 'barcodes missing batch_id', COUNT(*) FROM public.barcodes WHERE batch_id IS NULL
UNION ALL
SELECT 'barcodes missing inventory_unit_id', COUNT(*) FROM public.barcodes WHERE inventory_unit_id IS NULL;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- SUMMARY
-- ============================================================================
/*
WHAT THIS FIXED VERSION DOES DIFFERENTLY:

1. Every CREATE TABLE IF NOT EXISTS now only creates a bare table with just
   `id`. All other columns are added with ALTER TABLE ... ADD COLUMN IF NOT
   EXISTS, which works correctly whether the table is brand new or already
   existed with a different (older) shape.

2. Columns that must end up NOT NULL / UNIQUE are backfilled first
   (shipment_number, container_number, batch_number, batch_month/year,
   inventory_unit_code, barcode_value), then the constraint is applied.

3. Columns that reference other tables (shipment_id, product_id, batch_id,
   inventory_unit_id) CANNOT be safely auto-backfilled -- if any existing
   rows have NULLs there, the migration logs a WARNING and leaves the
   column nullable instead of failing the whole transaction. Check the
   "still need manual backfill" query at the end and fix those rows, then
   run the ALTER COLUMN ... SET NOT NULL statements shown in the warnings.

4. All FK and CHECK constraints are added via DO $$ ... EXCEPTION WHEN
   duplicate_object THEN NULL; END $$ blocks so re-running this file is
   idempotent even after a partial prior run.

5. Added a preflight check for trigger_set_updated_at() so Step 8 fails
   with a clear message instead of a cryptic "function does not exist"
   if that helper wasn't created in an earlier migration.

NEXT STEPS AFTER RUNNING:
- Review the "still need manual backfill" result set.
- For any non-zero counts, backfill those FK columns from your source data
  (e.g., match existing inventory_units to a batch by SKU + received date),
  then run the corresponding ALTER COLUMN ... SET NOT NULL statement.
- Re-run this script any time -- it's safe to execute repeatedly.
*/