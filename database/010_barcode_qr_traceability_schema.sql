-- ============================================================================
-- 010: BARCODE & QR CODE TRACEABILITY SYSTEM - COMPLETE SCHEMA
-- ============================================================================
-- Red Indian Customs (RIC) Inventory Management System
-- Description:
-- Creates complete database schema for unit-level barcode/QR traceability:
-- Product → Batch → Inventory Unit → Unique Barcode → QR Code → Shipment → Order → Return
--
-- This migration creates:
-- 1. shipments - Incoming shipment tracking
-- 2. batches - Product batch tracking (linked to shipments)
-- 3. inventory_units - Individual physical inventory items
-- 4. barcodes - Unique barcode storage with UNIQUE constraint
-- 5. orders - Customer orders
-- 6. order_items - Order line items (links orders to inventory)
-- 7. returns - Product return tracking
-- 8. stock_movements - Inventory movement history
-- 9. picking_tasks - Warehouse picking workflow
-- 10. packing_tasks - Warehouse packing workflow
-- 11. barcode_scans - Barcode scan event logging
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. SHIPMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_number VARCHAR(100) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    expected_date DATE,
    actual_date DATE,
    received_date TIMESTAMPTZ,
    container_number VARCHAR(50),
    bl_number VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    actual_quantity INTEGER,
    expected_quantity INTEGER,
    condition VARCHAR(50),
    notes TEXT,
    storage_location VARCHAR(255),
    received_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    inspection_completed BOOLEAN DEFAULT false,
    quality_status VARCHAR(50),
    defects TEXT,
    inspection_notes TEXT,
    inspected_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    inspection_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipments_number ON public.shipments(shipment_number);
CREATE INDEX IF NOT EXISTS idx_shipments_supplier ON public.shipments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON public.shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_expected_date ON public.shipments(expected_date);

COMMENT ON TABLE public.shipments IS 'Incoming shipment tracking for receiving workflow';

-- ============================================================================
-- 2. BATCHES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number VARCHAR(100) UNIQUE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    shipment_id UUID REFERENCES public.shipments(id) ON DELETE SET NULL,
    container_number VARCHAR(50),
    bl_number VARCHAR(50),
    quantity INTEGER NOT NULL DEFAULT 0,
    manufactured_date DATE,
    expiry_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT check_batch_quantity CHECK (quantity >= 0)
);

CREATE INDEX IF NOT EXISTS idx_batches_number ON public.batches(batch_number);
CREATE INDEX IF NOT EXISTS idx_batches_product ON public.batches(product_id);
CREATE INDEX IF NOT EXISTS idx_batches_shipment ON public.batches(shipment_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON public.batches(status);

COMMENT ON TABLE public.batches IS 'Product batch tracking linked to shipments';

-- ============================================================================
-- 3. BARCODES TABLE (CRITICAL - UNIQUE CONSTRAINT)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.barcodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode_value VARCHAR(100) UNIQUE NOT NULL,
    barcode_type VARCHAR(50) NOT NULL DEFAULT 'CODE128',
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
    qr_code_data TEXT,
    qr_code_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    generated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    printed_count INTEGER NOT NULL DEFAULT 0,
    last_printed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT check_barcode_value_not_empty CHECK (LENGTH(barcode_value) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_barcodes_value_unique ON public.barcodes(barcode_value);
CREATE INDEX IF NOT EXISTS idx_barcodes_product ON public.barcodes(product_id);
CREATE INDEX IF NOT EXISTS idx_barcodes_batch ON public.barcodes(batch_id);
CREATE INDEX IF NOT EXISTS idx_barcodes_status ON public.barcodes(status);
CREATE INDEX IF NOT EXISTS idx_barcodes_type ON public.barcodes(barcode_type);

COMMENT ON TABLE public.barcodes IS 'Unique barcode storage with traceability - UNIQUE constraint enforced';

-- ============================================================================
-- 4. INVENTORY UNITS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.inventory_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_number VARCHAR(100) UNIQUE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
    barcode_id UUID REFERENCES public.barcodes(id) ON DELETE SET NULL,
    warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
    location_code VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'available',
    condition VARCHAR(50) NOT NULL DEFAULT 'new',
    quantity INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    received_date TIMESTAMPTZ,
    last_movement_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT check_inventory_quantity CHECK (quantity >= 0)
);

CREATE INDEX IF NOT EXISTS idx_inventory_units_number ON public.inventory_units(unit_number);
CREATE INDEX IF NOT EXISTS idx_inventory_units_product ON public.inventory_units(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_units_batch ON public.inventory_units(batch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_units_barcode ON public.inventory_units(barcode_id);
CREATE INDEX IF NOT EXISTS idx_inventory_units_warehouse ON public.inventory_units(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_units_status ON public.inventory_units(status);

COMMENT ON TABLE public.inventory_units IS 'Individual physical inventory items with barcode association';

-- ============================================================================
-- 5. ORDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(100) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    customer_address TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    priority VARCHAR(50) DEFAULT 'normal',
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_status VARCHAR(50) DEFAULT 'unpaid',
    payment_method VARCHAR(50),
    notes TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT check_order_total CHECK (total_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_orders_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_name);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

COMMENT ON TABLE public.orders IS 'Customer orders for tire sales';

-- ============================================================================
-- 6. ORDER ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    inventory_unit_id UUID REFERENCES public.inventory_units(id) ON DELETE SET NULL,
    barcode_id UUID REFERENCES public.barcodes(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT check_order_item_quantity CHECK (quantity > 0),
    CONSTRAINT check_order_item_prices CHECK (unit_price >= 0 AND total_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_barcode ON public.order_items(barcode_id);
CREATE INDEX IF NOT EXISTS idx_order_items_inventory ON public.order_items(inventory_unit_id);

COMMENT ON TABLE public.order_items IS 'Order line items linking orders to inventory units and barcodes';

-- ============================================================================
-- 7. RETURNS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_number VARCHAR(100) UNIQUE NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    order_item_id UUID REFERENCES public.order_items(id) ON DELETE SET NULL,
    barcode_id UUID REFERENCES public.barcodes(id) ON DELETE SET NULL,
    inventory_unit_id UUID REFERENCES public.inventory_units(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    condition VARCHAR(50) NOT NULL DEFAULT 'unknown',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    refund_amount NUMERIC(12, 2) DEFAULT 0.00,
    restocking_action VARCHAR(50),
    discount_percentage INTEGER DEFAULT 0,
    is_saleable BOOLEAN DEFAULT true,
    notes TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    processed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT check_return_refund CHECK (refund_amount >= 0),
    CONSTRAINT check_return_discount CHECK (discount_percentage >= 0 AND discount_percentage <= 100)
);

CREATE INDEX IF NOT EXISTS idx_returns_number ON public.returns(return_number);
CREATE INDEX IF NOT EXISTS idx_returns_order ON public.returns(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_barcode ON public.returns(barcode_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON public.returns(status);
CREATE INDEX IF NOT EXISTS idx_returns_created_at ON public.returns(created_at DESC);

COMMENT ON TABLE public.returns IS 'Product returns preserving original barcode and batch traceability';

-- ============================================================================
-- 8. STOCK MOVEMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movement_type VARCHAR(50) NOT NULL,
    inventory_unit_id UUID REFERENCES public.inventory_units(id) ON DELETE SET NULL,
    barcode_id UUID REFERENCES public.barcodes(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
    from_warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
    to_warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
    from_location VARCHAR(100),
    to_location VARCHAR(100),
    quantity INTEGER NOT NULL DEFAULT 1,
    reason TEXT,
    reference_type VARCHAR(50),
    reference_id UUID,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT check_movement_quantity CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON public.stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_inventory ON public.stock_movements(inventory_unit_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_barcode ON public.stock_movements(barcode_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements(created_at DESC);

COMMENT ON TABLE public.stock_movements IS 'Inventory movement history for traceability';

-- ============================================================================
-- 9. PICKING TASKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.picking_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_number VARCHAR(100) UNIQUE NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    inventory_unit_id UUID REFERENCES public.inventory_units(id) ON DELETE SET NULL,
    barcode_id UUID REFERENCES public.barcodes(id) ON DELETE SET NULL,
    warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
    location_code VARCHAR(100),
    quantity_requested INTEGER NOT NULL DEFAULT 1,
    quantity_picked INTEGER DEFAULT 0,
    actual_quantity INTEGER,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    priority VARCHAR(50) DEFAULT 'normal',
    notes TEXT,
    picked_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT check_picking_quantities CHECK (quantity_requested > 0 AND quantity_picked >= 0)
);

CREATE INDEX IF NOT EXISTS idx_picking_tasks_number ON public.picking_tasks(task_number);
CREATE INDEX IF NOT EXISTS idx_picking_tasks_order ON public.picking_tasks(order_id);
CREATE INDEX IF NOT EXISTS idx_picking_tasks_status ON public.picking_tasks(status);
CREATE INDEX IF NOT EXISTS idx_picking_tasks_barcode ON public.picking_tasks(barcode_id);

COMMENT ON TABLE public.picking_tasks IS 'Warehouse picking workflow with FIFO and barcode scanning';

-- ============================================================================
-- 10. PACKING TASKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.packing_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_number VARCHAR(100) UNIQUE NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    picking_task_id UUID REFERENCES public.picking_tasks(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    package_weight NUMERIC(10, 2),
    dimensions VARCHAR(100),
    notes TEXT,
    packed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packing_tasks_number ON public.packing_tasks(task_number);
CREATE INDEX IF NOT EXISTS idx_packing_tasks_order ON public.packing_tasks(order_id);
CREATE INDEX IF NOT EXISTS idx_packing_tasks_status ON public.packing_tasks(status);

COMMENT ON TABLE public.packing_tasks IS 'Warehouse packing workflow';

-- ============================================================================
-- 11. BARCODE SCANS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.barcode_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode_id UUID REFERENCES public.barcodes(id) ON DELETE CASCADE,
    barcode_value VARCHAR(100) NOT NULL,
    scan_type VARCHAR(50) NOT NULL,
    location VARCHAR(100),
    reference_type VARCHAR(50),
    reference_id UUID,
    scanned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    device_info JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_barcode_scans_barcode ON public.barcode_scans(barcode_id);
CREATE INDEX IF NOT EXISTS idx_barcode_scans_value ON public.barcode_scans(barcode_value);
CREATE INDEX IF NOT EXISTS idx_barcode_scans_type ON public.barcode_scans(scan_type);
CREATE INDEX IF NOT EXISTS idx_barcode_scans_created_at ON public.barcode_scans(created_at DESC);

COMMENT ON TABLE public.barcode_scans IS 'Barcode scan event logging for audit trail';

-- ============================================================================
-- 12. BARCODE SEQUENCE COUNTER (FOR UNIQUE GENERATION)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.barcode_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_name VARCHAR(50) UNIQUE NOT NULL,
    current_value BIGINT NOT NULL DEFAULT 200000000000,
    prefix VARCHAR(20) DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default sequence
INSERT INTO public.barcode_sequences (sequence_name, current_value, prefix)
VALUES ('default', 200000000000, '')
ON CONFLICT (sequence_name) DO NOTHING;

COMMENT ON TABLE public.barcode_sequences IS 'Barcode sequence counter for concurrent-safe unique generation';

-- ============================================================================
-- TRIGGERS FOR AUTO UPDATED_AT
-- ============================================================================
DROP TRIGGER IF EXISTS trg_shipments_updated_at ON public.shipments;
CREATE TRIGGER trg_shipments_updated_at BEFORE UPDATE ON public.shipments 
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_batches_updated_at ON public.batches;
CREATE TRIGGER trg_batches_updated_at BEFORE UPDATE ON public.batches 
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_barcodes_updated_at ON public.barcodes;
CREATE TRIGGER trg_barcodes_updated_at BEFORE UPDATE ON public.barcodes 
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_inventory_units_updated_at ON public.inventory_units;
CREATE TRIGGER trg_inventory_units_updated_at BEFORE UPDATE ON public.inventory_units 
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders 
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_returns_updated_at ON public.returns;
CREATE TRIGGER trg_returns_updated_at BEFORE UPDATE ON public.returns 
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_picking_tasks_updated_at ON public.picking_tasks;
CREATE TRIGGER trg_picking_tasks_updated_at BEFORE UPDATE ON public.picking_tasks 
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_packing_tasks_updated_at ON public.packing_tasks;
CREATE TRIGGER trg_packing_tasks_updated_at BEFORE UPDATE ON public.packing_tasks 
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_barcode_sequences_updated_at ON public.barcode_sequences;
CREATE TRIGGER trg_barcode_sequences_updated_at BEFORE UPDATE ON public.barcode_sequences 
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.picking_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packing_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barcode_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barcode_sequences ENABLE ROW LEVEL SECURITY;

-- Policies: Allow authenticated users to read, authenticated staff to write
DROP POLICY IF EXISTS "Allow authenticated read shipments" ON public.shipments;
CREATE POLICY "Allow authenticated read shipments" ON public.shipments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow staff write shipments" ON public.shipments;
CREATE POLICY "Allow staff write shipments" ON public.shipments FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated read batches" ON public.batches;
CREATE POLICY "Allow authenticated read batches" ON public.batches FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow staff write batches" ON public.batches;
CREATE POLICY "Allow staff write batches" ON public.batches FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated read barcodes" ON public.barcodes;
CREATE POLICY "Allow authenticated read barcodes" ON public.barcodes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow staff write barcodes" ON public.barcodes;
CREATE POLICY "Allow staff write barcodes" ON public.barcodes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated read inventory" ON public.inventory_units;
CREATE POLICY "Allow authenticated read inventory" ON public.inventory_units FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow staff write inventory" ON public.inventory_units;
CREATE POLICY "Allow staff write inventory" ON public.inventory_units FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated read orders" ON public.orders;
CREATE POLICY "Allow authenticated read orders" ON public.orders FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow staff write orders" ON public.orders;
CREATE POLICY "Allow staff write orders" ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated read order_items" ON public.order_items;
CREATE POLICY "Allow authenticated read order_items" ON public.order_items FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow staff write order_items" ON public.order_items;
CREATE POLICY "Allow staff write order_items" ON public.order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated read returns" ON public.returns;
CREATE POLICY "Allow authenticated read returns" ON public.returns FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow staff write returns" ON public.returns;
CREATE POLICY "Allow staff write returns" ON public.returns FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated read stock_movements" ON public.stock_movements;
CREATE POLICY "Allow authenticated read stock_movements" ON public.stock_movements FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow staff write stock_movements" ON public.stock_movements;
CREATE POLICY "Allow staff write stock_movements" ON public.stock_movements FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated read picking_tasks" ON public.picking_tasks;
CREATE POLICY "Allow authenticated read picking_tasks" ON public.picking_tasks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow staff write picking_tasks" ON public.picking_tasks;
CREATE POLICY "Allow staff write picking_tasks" ON public.picking_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated read packing_tasks" ON public.packing_tasks;
CREATE POLICY "Allow authenticated read packing_tasks" ON public.packing_tasks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow staff write packing_tasks" ON public.packing_tasks;
CREATE POLICY "Allow staff write packing_tasks" ON public.packing_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated read barcode_scans" ON public.barcode_scans;
CREATE POLICY "Allow authenticated read barcode_scans" ON public.barcode_scans FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow staff write barcode_scans" ON public.barcode_scans;
CREATE POLICY "Allow staff write barcode_scans" ON public.barcode_scans FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated read barcode_sequences" ON public.barcode_sequences;
CREATE POLICY "Allow authenticated read barcode_sequences" ON public.barcode_sequences FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow staff write barcode_sequences" ON public.barcode_sequences;
CREATE POLICY "Allow staff write barcode_sequences" ON public.barcode_sequences FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Grants
GRANT ALL ON public.shipments TO authenticated;
GRANT ALL ON public.batches TO authenticated;
GRANT ALL ON public.barcodes TO authenticated;
GRANT ALL ON public.inventory_units TO authenticated;
GRANT ALL ON public.orders TO authenticated;
GRANT ALL ON public.order_items TO authenticated;
GRANT ALL ON public.returns TO authenticated;
GRANT ALL ON public.stock_movements TO authenticated;
GRANT ALL ON public.picking_tasks TO authenticated;
GRANT ALL ON public.packing_tasks TO authenticated;
GRANT ALL ON public.barcode_scans TO authenticated;
GRANT ALL ON public.barcode_sequences TO authenticated;

-- ============================================================================
-- REFRESH POSTGREST SCHEMA CACHE
-- ============================================================================
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 
    '✅ 010_barcode_qr_traceability_schema.sql executed successfully!' as status,
    (SELECT COUNT(*) FROM public.shipments) as shipments_count,
    (SELECT COUNT(*) FROM public.batches) as batches_count,
    (SELECT COUNT(*) FROM public.barcodes) as barcodes_count,
    (SELECT COUNT(*) FROM public.inventory_units) as inventory_units_count,
    (SELECT COUNT(*) FROM public.orders) as orders_count,
    (SELECT COUNT(*) FROM public.returns) as returns_count,
    (SELECT current_value FROM public.barcode_sequences WHERE sequence_name = 'default') as next_barcode_sequence;
