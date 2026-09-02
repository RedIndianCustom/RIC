-- ============================================================================
-- BATCH BARCODE COUNT ENHANCEMENT
-- ============================================================================
-- Automatically track the number of barcodes generated for each batch
-- Updates count in real-time when barcodes are created or deleted
-- ============================================================================

-- Step 1: Add barcode_count column to batches table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'batches' 
        AND column_name = 'barcode_count'
    ) THEN
        ALTER TABLE public.batches 
        ADD COLUMN barcode_count INTEGER DEFAULT 0 NOT NULL;
        
        RAISE NOTICE 'Added barcode_count column to batches table';
    ELSE
        RAISE NOTICE 'barcode_count column already exists';
    END IF;
END $$;

-- Step 2: Initialize barcode_count for existing batches
UPDATE public.batches
SET barcode_count = (
    SELECT COUNT(*) 
    FROM public.barcodes 
    WHERE barcodes.batch_id = batches.id
);

-- Verify the update
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count
    FROM public.batches
    WHERE barcode_count > 0;
    
    RAISE NOTICE 'Initialized barcode_count for % batches', updated_count;
END $$;

-- Step 3: Create function to update barcode count
CREATE OR REPLACE FUNCTION public.update_batch_barcode_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT: increment count
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.batches 
        SET barcode_count = barcode_count + 1,
            updated_at = NOW()
        WHERE id = NEW.batch_id;
        
        RETURN NEW;
    END IF;
    
    -- Handle DELETE: decrement count
    IF (TG_OP = 'DELETE') THEN
        UPDATE public.batches 
        SET barcode_count = GREATEST(barcode_count - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.batch_id;
        
        RETURN OLD;
    END IF;
    
    -- Handle UPDATE: adjust count if batch_id changed
    IF (TG_OP = 'UPDATE' AND OLD.batch_id IS DISTINCT FROM NEW.batch_id) THEN
        -- Decrement old batch
        IF (OLD.batch_id IS NOT NULL) THEN
            UPDATE public.batches 
            SET barcode_count = GREATEST(barcode_count - 1, 0),
                updated_at = NOW()
            WHERE id = OLD.batch_id;
        END IF;
        
        -- Increment new batch
        IF (NEW.batch_id IS NOT NULL) THEN
            UPDATE public.batches 
            SET barcode_count = barcode_count + 1,
                updated_at = NOW()
            WHERE id = NEW.batch_id;
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_batch_barcode_count ON public.barcodes;

-- Step 5: Create trigger on barcodes table
CREATE TRIGGER trigger_update_batch_barcode_count
    AFTER INSERT OR UPDATE OR DELETE ON public.barcodes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_batch_barcode_count();

-- Step 6: Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.update_batch_barcode_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_batch_barcode_count() TO anon;

-- Step 7: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_barcodes_batch_id 
ON public.barcodes(batch_id) 
WHERE batch_id IS NOT NULL;

-- Step 8: Add comment for documentation
COMMENT ON COLUMN public.batches.barcode_count IS 
'Automatically updated count of barcodes generated for this batch. Maintained by trigger.';

COMMENT ON FUNCTION public.update_batch_barcode_count() IS 
'Automatically updates the barcode_count column in batches table when barcodes are inserted, updated, or deleted.';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if trigger was created successfully
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_batch_barcode_count';

-- Verify barcode counts match actual counts
SELECT 
    b.id,
    b.batch_number,
    b.barcode_count as stored_count,
    COUNT(bc.id) as actual_count,
    CASE 
        WHEN b.barcode_count = COUNT(bc.id) THEN '✓ Match'
        ELSE '✗ Mismatch'
    END as status
FROM public.batches b
LEFT JOIN public.barcodes bc ON b.id = bc.batch_id
GROUP BY b.id, b.batch_number, b.barcode_count
ORDER BY b.created_at DESC
LIMIT 20;

-- Show batches with their barcode counts
SELECT 
    b.batch_number,
    b.status,
    b.barcode_count,
    p.sku as product_sku,
    s.shipment_number,
    b.created_at
FROM public.batches b
LEFT JOIN public.products p ON b.product_id = p.id
LEFT JOIN public.shipments s ON b.shipment_id = s.id
ORDER BY b.created_at DESC
LIMIT 10;

-- ============================================================================
-- TESTING
-- ============================================================================

-- Test the trigger by inserting a test barcode (uncomment to test)
-- DO $$
-- DECLARE
--     test_batch_id UUID;
--     test_product_id UUID;
--     initial_count INTEGER;
--     final_count INTEGER;
-- BEGIN
--     -- Get a batch to test
--     SELECT id INTO test_batch_id FROM public.batches LIMIT 1;
--     SELECT product_id INTO test_product_id FROM public.batches WHERE id = test_batch_id;
--     
--     -- Get initial count
--     SELECT barcode_count INTO initial_count FROM public.batches WHERE id = test_batch_id;
--     RAISE NOTICE 'Initial count: %', initial_count;
--     
--     -- Insert test barcode
--     INSERT INTO public.barcodes (batch_id, product_id, barcode_value, qr_value)
--     VALUES (test_batch_id, test_product_id, 'TEST-' || gen_random_uuid()::text, 'TEST-QR-' || gen_random_uuid()::text);
--     
--     -- Get final count
--     SELECT barcode_count INTO final_count FROM public.batches WHERE id = test_batch_id;
--     RAISE NOTICE 'Final count: %', final_count;
--     
--     -- Verify increment
--     IF (final_count = initial_count + 1) THEN
--         RAISE NOTICE '✓ Trigger working correctly!';
--     ELSE
--         RAISE EXCEPTION '✗ Trigger failed! Expected %, got %', initial_count + 1, final_count;
--     END IF;
--     
--     -- Clean up test data
--     DELETE FROM public.barcodes WHERE barcode_value LIKE 'TEST-%';
-- END $$;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
DECLARE
    total_batches INTEGER;
    batches_with_barcodes INTEGER;
    total_barcodes INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_batches FROM public.batches;
    SELECT COUNT(*) INTO batches_with_barcodes FROM public.batches WHERE barcode_count > 0;
    SELECT SUM(barcode_count) INTO total_barcodes FROM public.batches;
    
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║  BATCH BARCODE COUNT ENHANCEMENT - COMPLETED ✓            ║';
    RAISE NOTICE '╠════════════════════════════════════════════════════════════╣';
    RAISE NOTICE '║  • Column added: batches.barcode_count                     ║';
    RAISE NOTICE '║  • Trigger created: trigger_update_batch_barcode_count     ║';
    RAISE NOTICE '║  • Auto-update: ON (INSERT/UPDATE/DELETE barcodes)         ║';
    RAISE NOTICE '║  • Index created: idx_barcodes_batch_id                    ║';
    RAISE NOTICE '╠════════════════════════════════════════════════════════════╣';
    RAISE NOTICE '║  STATISTICS:                                               ║';
    RAISE NOTICE '║  • Total Batches: %                                        ║', total_batches;
    RAISE NOTICE '║  • Batches with Barcodes: %                                ║', batches_with_barcodes;
    RAISE NOTICE '║  • Total Barcodes: %                                       ║', COALESCE(total_barcodes, 0);
    RAISE NOTICE '╚════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Refresh your frontend page (Ctrl+Shift+R)';
    RAISE NOTICE '2. Navigate to Batch Management';
    RAISE NOTICE '3. Barcode counts should now display correctly!';
    RAISE NOTICE '';
END $$;
