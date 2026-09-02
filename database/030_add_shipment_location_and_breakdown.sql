-- ============================================================================
-- 030: Add assigned_location_id and product_breakdown to shipments table
-- ============================================================================
-- Adds warehouse location assignment and product breakdown fields to shipments
-- ============================================================================

-- Add assigned_location_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'shipments' 
        AND column_name = 'assigned_location_id'
    ) THEN
        ALTER TABLE public.shipments 
        ADD COLUMN assigned_location_id UUID REFERENCES public.warehouse_locations(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_shipments_assigned_location 
        ON public.shipments(assigned_location_id);
        
        RAISE NOTICE '✅ Added assigned_location_id column to shipments table';
    ELSE
        RAISE NOTICE '⏭️  Column assigned_location_id already exists';
    END IF;
END $$;

-- Add product_breakdown column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'shipments' 
        AND column_name = 'product_breakdown'
    ) THEN
        ALTER TABLE public.shipments 
        ADD COLUMN product_breakdown JSONB DEFAULT '[]'::jsonb;
        
        CREATE INDEX IF NOT EXISTS idx_shipments_product_breakdown 
        ON public.shipments USING gin(product_breakdown);
        
        RAISE NOTICE '✅ Added product_breakdown column to shipments table';
    ELSE
        RAISE NOTICE '⏭️  Column product_breakdown already exists';
    END IF;
END $$;

-- Add comments
COMMENT ON COLUMN public.shipments.assigned_location_id IS 'Warehouse location where this shipment should be stored';
COMMENT ON COLUMN public.shipments.product_breakdown IS 'JSONB array of products with quantities and position assignments';

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Verification
SELECT 
    '✅ Migration 030 completed successfully!' as status,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shipments' AND column_name = 'assigned_location_id'
    ) as has_assigned_location_id,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shipments' AND column_name = 'product_breakdown'
    ) as has_product_breakdown;
