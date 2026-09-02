-- ============================================================================
-- Fix Batch Status Constraint
-- ============================================================================
-- Issue: Frontend uses INACTIVE and COMPLETED but constraint only allows
-- ACTIVE, RECEIVED, APPROVED, REJECTED, CLOSED
--
-- Solution: Update constraint to include all status values used in frontend
-- ============================================================================

DO $$ 
BEGIN
    -- Drop existing constraint
    ALTER TABLE public.batches DROP CONSTRAINT IF EXISTS check_batch_status;
    
    -- Add new constraint with all valid statuses
    ALTER TABLE public.batches ADD CONSTRAINT check_batch_status 
        CHECK (status IN ('ACTIVE', 'INACTIVE', 'COMPLETED', 'RECEIVED', 'APPROVED', 'REJECTED', 'CLOSED'));
    
    RAISE NOTICE 'Batch status constraint updated successfully';
END $$;

-- Update any existing batches with invalid status to ACTIVE
UPDATE public.batches 
SET status = 'ACTIVE' 
WHERE status NOT IN ('ACTIVE', 'INACTIVE', 'COMPLETED', 'RECEIVED', 'APPROVED', 'REJECTED', 'CLOSED');

COMMENT ON CONSTRAINT check_batch_status ON public.batches IS 
'Valid batch statuses: ACTIVE (in use), INACTIVE (not in use), COMPLETED (finished), RECEIVED (from shipment), APPROVED (quality checked), REJECTED (failed QC), CLOSED (archived)';
