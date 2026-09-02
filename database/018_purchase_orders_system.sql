-- ══════════════════════════════════════════════════════════════════════════════
-- 018 - PURCHASE ORDERS SYSTEM
-- ══════════════════════════════════════════════════════════════════════════════
-- Creates purchase_orders table and automatic supplier total calculation
-- Run this in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- 1. CREATE PURCHASE ORDERS TABLE
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference
    po_number           TEXT NOT NULL UNIQUE,
    supplier_id         UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    
    -- Order details
    order_date          DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery   DATE,
    actual_delivery     DATE,
    
    -- Financial
    subtotal            NUMERIC(15,2) NOT NULL DEFAULT 0,
    tax_amount          NUMERIC(15,2) NOT NULL DEFAULT 0,
    shipping_cost       NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_amount        NUMERIC(15,2) NOT NULL DEFAULT 0,
    
    -- Status tracking
    status              TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'pending', 'approved', 'ordered', 'received', 'cancelled')),
    
    -- Additional info
    notes               TEXT,
    payment_terms       TEXT,
    shipping_address    TEXT,
    
    -- Audit fields
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by          UUID REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by          UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_number ON public.purchase_orders(po_number);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_date ON public.purchase_orders(order_date DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. CREATE PURCHASE ORDER ITEMS TABLE
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference
    purchase_order_id   UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    
    -- Item details
    product_name        TEXT NOT NULL,
    product_sku         TEXT,
    description         TEXT,
    
    -- Quantities
    quantity            INTEGER NOT NULL CHECK (quantity > 0),
    received_quantity   INTEGER NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
    
    -- Pricing
    unit_price          NUMERIC(15,2) NOT NULL CHECK (unit_price >= 0),
    line_total          NUMERIC(15,2) NOT NULL DEFAULT 0,
    
    -- Audit
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_po_items_purchase_order_id ON public.purchase_order_items(purchase_order_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. AUTO-GENERATE PO NUMBER FUNCTION
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.generate_po_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    next_seq INTEGER;
    po_num TEXT;
BEGIN
    -- Get the next sequence number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM 8) AS INTEGER)), 0) + 1
    INTO next_seq
    FROM public.purchase_orders
    WHERE po_number LIKE 'PO-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '%';
    
    -- Format: PO-YYYY-NNNN (e.g., PO-2024-0001)
    po_num := 'PO-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(next_seq::TEXT, 4, '0');
    
    RETURN po_num;
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. TRIGGER: AUTO-GENERATE PO NUMBER
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_po_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.po_number IS NULL OR NEW.po_number = '' THEN
        NEW.po_number := public.generate_po_number();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_po_number ON public.purchase_orders;
CREATE TRIGGER trigger_set_po_number
    BEFORE INSERT ON public.purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.set_po_number();

-- ────────────────────────────────────────────────────────────────────────────
-- 5. TRIGGER: UPDATE LINE TOTAL ON ITEM CHANGE
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_po_item_line_total()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.line_total := NEW.quantity * NEW.unit_price;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_po_item_line_total ON public.purchase_order_items;
CREATE TRIGGER trigger_update_po_item_line_total
    BEFORE INSERT OR UPDATE ON public.purchase_order_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_po_item_line_total();

-- ────────────────────────────────────────────────────────────────────────────
-- 6. TRIGGER: UPDATE PO TOTALS WHEN ITEMS CHANGE
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_po_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    po_id UUID;
    new_subtotal NUMERIC(15,2);
BEGIN
    -- Determine which PO to update
    IF TG_OP = 'DELETE' THEN
        po_id := OLD.purchase_order_id;
    ELSE
        po_id := NEW.purchase_order_id;
    END IF;
    
    -- Calculate new subtotal from all items
    SELECT COALESCE(SUM(line_total), 0)
    INTO new_subtotal
    FROM public.purchase_order_items
    WHERE purchase_order_id = po_id;
    
    -- Update PO totals
    UPDATE public.purchase_orders
    SET 
        subtotal = new_subtotal,
        total_amount = new_subtotal + tax_amount + shipping_cost,
        updated_at = NOW()
    WHERE id = po_id;
    
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_po_totals ON public.purchase_order_items;
CREATE TRIGGER trigger_update_po_totals
    AFTER INSERT OR UPDATE OR DELETE ON public.purchase_order_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_po_totals();

-- ────────────────────────────────────────────────────────────────────────────
-- 7. TRIGGER: UPDATE SUPPLIER TOTALS AUTOMATICALLY
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_supplier_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    supplier_uuid UUID;
    total_count INTEGER;
    total_val NUMERIC(15,2);
BEGIN
    -- Determine which supplier to update
    IF TG_OP = 'DELETE' THEN
        supplier_uuid := OLD.supplier_id;
    ELSE
        supplier_uuid := NEW.supplier_id;
    END IF;
    
    -- Calculate totals for completed orders only
    SELECT 
        COUNT(*),
        COALESCE(SUM(total_amount), 0)
    INTO 
        total_count,
        total_val
    FROM public.purchase_orders
    WHERE supplier_id = supplier_uuid
      AND status IN ('received', 'approved');
    
    -- Update supplier
    UPDATE public.suppliers
    SET 
        total_orders = total_count,
        total_value = total_val,
        updated_at = NOW()
    WHERE id = supplier_uuid;
    
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_supplier_totals ON public.purchase_orders;
CREATE TRIGGER trigger_update_supplier_totals
    AFTER INSERT OR UPDATE OR DELETE ON public.purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_supplier_totals();

-- ────────────────────────────────────────────────────────────────────────────
-- 8. TRIGGER: UPDATE TIMESTAMPS
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_po_timestamp ON public.purchase_orders;
CREATE TRIGGER trigger_update_po_timestamp
    BEFORE UPDATE ON public.purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- 9. RLS POLICIES
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
DROP POLICY IF EXISTS "Allow authenticated read purchase_orders" ON public.purchase_orders;
CREATE POLICY "Allow authenticated read purchase_orders"
    ON public.purchase_orders FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow authenticated read po_items" ON public.purchase_order_items;
CREATE POLICY "Allow authenticated read po_items"
    ON public.purchase_order_items FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert/update/delete
DROP POLICY IF EXISTS "Allow authenticated write purchase_orders" ON public.purchase_orders;
CREATE POLICY "Allow authenticated write purchase_orders"
    ON public.purchase_orders FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated write po_items" ON public.purchase_order_items;
CREATE POLICY "Allow authenticated write po_items"
    ON public.purchase_order_items FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ────────────────────────────────────────────────────────────────────────────
-- 10. SAMPLE DATA
-- ────────────────────────────────────────────────────────────────────────────

-- Insert sample purchase order (will auto-generate PO number)
INSERT INTO public.purchase_orders (
    supplier_id,
    order_date,
    expected_delivery,
    status,
    tax_amount,
    shipping_cost,
    notes,
    payment_terms
)
SELECT 
    id,
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE - INTERVAL '15 days',
    'received',
    125000,
    25000,
    'Sample purchase order for tire inventory',
    'Net 30'
FROM public.suppliers
WHERE name = 'Asian Auto Parts Corp'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Insert sample items
INSERT INTO public.purchase_order_items (
    purchase_order_id,
    product_name,
    product_sku,
    description,
    quantity,
    received_quantity,
    unit_price
)
SELECT 
    po.id,
    'Michelin Pilot Sport 4',
    'MICH-PS4-225-45-17',
    '225/45R17 High Performance Tire',
    100,
    100,
    5500.00
FROM public.purchase_orders po
WHERE po.po_number LIKE 'PO-%'
LIMIT 1
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- 11. GRANT PERMISSIONS
-- ────────────────────────────────────────────────────────────────────────────

GRANT ALL ON public.purchase_orders TO authenticated;
GRANT ALL ON public.purchase_order_items TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- ✅ COMPLETE! Supplier totals will now update automatically
-- ────────────────────────────────────────────────────────────────────────────

COMMENT ON TABLE public.purchase_orders IS 'Purchase orders from suppliers with automatic total calculation';
COMMENT ON TABLE public.purchase_order_items IS 'Line items for purchase orders';
COMMENT ON FUNCTION public.update_supplier_totals() IS 'Automatically updates supplier total_orders and total_value when POs change';
