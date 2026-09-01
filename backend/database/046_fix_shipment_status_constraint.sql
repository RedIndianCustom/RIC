-- ============================================================================
-- FIX SHIPMENT STATUS CONSTRAINT
-- ============================================================================
-- Add missing statuses: AWAITING_APPROVAL, READY_FOR_QC, ARRIVED
-- These are used by the receiving workflow

-- Step 1: Drop existing constraint
ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS chk_shipments_status CASCADE;
ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS shipments_status_check CASCADE;
ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS check_shipment_status CASCADE;

-- Step 2: Add new constraint with all required statuses
ALTER TABLE public.shipments
ADD CONSTRAINT chk_shipments_status CHECK (
  status IN (
    'PENDING',
    'IN_TRANSIT',
    'ARRIVED',           -- NEW: When shipment arrives at warehouse
    'INSPECTING',
    'AWAITING_APPROVAL', -- NEW: Waiting for manager to approve receiving report
    'READY_FOR_QC',      -- NEW: Approved and ready for quality control
    'APPROVED',
    'REJECTED',
    'CANCELLED',
    'RECEIVED'           -- Keep for backward compatibility
  )
);

-- Step 3: Verify constraint
DO $$
BEGIN
  RAISE NOTICE '✅ Shipment status constraint updated successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Allowed statuses:';
  RAISE NOTICE '   - PENDING: Initial state';
  RAISE NOTICE '   - IN_TRANSIT: Shipment is on the way';
  RAISE NOTICE '   - ARRIVED: Shipment arrived at warehouse';
  RAISE NOTICE '   - INSPECTING: Warehouse staff is receiving/scanning';
  RAISE NOTICE '   - AWAITING_APPROVAL: Report submitted, waiting for manager approval';
  RAISE NOTICE '   - READY_FOR_QC: Approved by manager, ready for QC inspection';
  RAISE NOTICE '   - APPROVED: Final approval after QC';
  RAISE NOTICE '   - REJECTED: Rejected by manager or QC';
  RAISE NOTICE '   - CANCELLED: Shipment cancelled';
  RAISE NOTICE '   - RECEIVED: Legacy status (keep for backward compatibility)';
END $$;
