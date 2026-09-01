-- ============================================================================
-- FIX BATCH STATUS CONSTRAINT TO ALLOW INACTIVE
-- ============================================================================
-- Issue: Batch deactivation fails because CHECK constraint doesn't include 'INACTIVE'
-- Solution: Drop old constraint and add new one with all valid statuses
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE 'Fixing batch status constraint...';
    
    -- Drop existing constraints
    ALTER TABLE public.batches DROP CONSTRAINT IF EXISTS chk_batches_status;
    ALTER TABLE public.batches DROP CONSTRAINT IF EXISTS check_batch_status;
    ALTER TABLE public.batches DROP CONSTRAINT IF EXISTS batches_status_check;
    
    RAISE NOTICE 'Old constraints dropped';
    
    -- Add new constraint with ALL valid statuses including INACTIVE
    ALTER TABLE public.batches 
    ADD CONSTRAINT batches_status_check 
    CHECK (status IN (
        'ACTIVE',
        'INACTIVE',      -- ← Added for soft delete
        'COMPLETED',
        'RECEIVED',
        'APPROVED',
        'REJECTED',
        'CLOSED'
    ));
    
    RAISE NOTICE 'New constraint added with INACTIVE status';
    
    -- Verify constraint was added
    IF EXISTS (
        SELECT 1 
        FROM information_schema.constraint_column_usage 
        WHERE table_name = 'batches' 
        AND constraint_name = 'batches_status_check'
    ) THEN
        RAISE NOTICE '✅ SUCCESS: batches_status_check constraint is active';
    ELSE
        RAISE WARNING '⚠️ WARNING: Constraint may not have been added';
    END IF;
    
END $$;

-- Verify current batch statuses
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM public.batches
    WHERE status NOT IN ('ACTIVE', 'INACTIVE', 'COMPLETED', 'RECEIVED', 'APPROVED', 'REJECTED', 'CLOSED');
    
    IF invalid_count > 0 THEN
        RAISE WARNING 'Found % batches with invalid status values', invalid_count;
        RAISE NOTICE 'Run this query to see them: SELECT id, batch_number, status FROM batches WHERE status NOT IN (''ACTIVE'', ''INACTIVE'', ''COMPLETED'', ''RECEIVED'', ''APPROVED'', ''REJECTED'', ''CLOSED'')';
    ELSE
        RAISE NOTICE '✅ All batches have valid status values';
    END IF;
END $$;

-- Add comment
COMMENT ON CONSTRAINT batches_status_check ON public.batches IS 
'Valid batch statuses: ACTIVE (normal), INACTIVE (soft deleted), COMPLETED (finished), RECEIVED, APPROVED, REJECTED, CLOSED';

-- ============================================================================
-- TESTING
-- ============================================================================

-- Test the constraint by trying to set an invalid status (should fail)
DO $$
BEGIN
    -- This should fail
    BEGIN
        UPDATE public.batches 
        SET status = 'INVALID_STATUS' 
        WHERE id = '00000000-0000-0000-0000-000000000000'; -- Non-existent ID
        RAISE NOTICE '⚠️ WARNING: Invalid status was allowed!';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE '✅ Good: Invalid status correctly rejected by constraint';
    END;
END $$;

SELECT 'Batch status constraint fix completed' AS result;
