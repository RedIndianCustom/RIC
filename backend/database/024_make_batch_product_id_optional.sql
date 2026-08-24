-- ============================================================================
-- Make product_id Optional in Batches Table
-- ============================================================================
-- Issue: Batches now get products from shipment's product_breakdown JSONB
-- The product_id column is no longer needed as the primary product reference
-- 
-- Solution: Make product_id nullable so batches can be created without it
-- ============================================================================

DO $$ 
BEGIN
    -- Make product_id nullable
    ALTER TABLE public.batches ALTER COLUMN product_id DROP NOT NULL;
    
    RAISE NOTICE 'product_id is now nullable in batches table';
END $$;

COMMENT ON COLUMN public.batches.product_id IS 
'Optional: Legacy single product reference. New batches get products from shipments.product_breakdown JSONB array instead.';
