-- ============================================================================
-- FIX SHIPMENTS STATUS CONSTRAINT - WITH EXISTING DATA HANDLING
-- ============================================================================
-- CORRECT ORDER: Drop constraint FIRST, then update data, then recreate constraint

-- Step 1: Check what status values currently exist in the database
SELECT 
    status,
    COUNT(*) as count
FROM public.shipments
GROUP BY status
ORDER BY count DESC;

-- Step 2: Show current constraints (for verification)
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
JOIN pg_class cl ON cl.oid = c.conrelid
WHERE cl.relname = 'shipments'
AND n.nspname = 'public'
AND (conname LIKE '%status%' OR pg_get_constraintdef(c.oid) LIKE '%status%');

-- Step 3: DROP ALL existing status constraints FIRST (so we can update data)
-- THIS MUST HAPPEN BEFORE UPDATING DATA!
ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS shipments_status_check CASCADE;
ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS chk_shipments_status CASCADE;
ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS check_shipment_status CASCADE;
ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS check_status CASCADE;

-- Step 4: NOW update any invalid status values to valid ones
-- (Constraint is dropped, so this will work now)
UPDATE public.shipments
SET status = CASE
    -- Map lowercase to uppercase
    WHEN LOWER(status) = 'pending' THEN 'PENDING'
    WHEN LOWER(status) = 'in_transit' THEN 'IN_TRANSIT'
    WHEN LOWER(status) = 'in transit' THEN 'IN_TRANSIT'
    WHEN LOWER(status) = 'received' THEN 'RECEIVED'
    WHEN LOWER(status) = 'inspecting' THEN 'INSPECTING'
    WHEN LOWER(status) = 'approved' THEN 'APPROVED'
    WHEN LOWER(status) = 'rejected' THEN 'REJECTED'
    WHEN LOWER(status) = 'cancelled' THEN 'CANCELLED'
    WHEN LOWER(status) = 'canceled' THEN 'CANCELLED'
    
    -- Map other common status values
    WHEN LOWER(status) = 'draft' THEN 'PENDING'
    WHEN LOWER(status) = 'new' THEN 'PENDING'
    WHEN LOWER(status) = 'active' THEN 'PENDING'
    WHEN LOWER(status) = 'shipped' THEN 'IN_TRANSIT'
    WHEN LOWER(status) = 'delivered' THEN 'RECEIVED'
    WHEN LOWER(status) = 'completed' THEN 'RECEIVED'
    WHEN LOWER(status) = 'closed' THEN 'RECEIVED'
    
    -- If none match, default to PENDING
    ELSE 'PENDING'
END
WHERE status NOT IN ('PENDING', 'IN_TRANSIT', 'RECEIVED', 'INSPECTING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- Show how many records were updated
SELECT 
    'Records updated: ' || COUNT(*) as update_result
FROM public.shipments
WHERE status IN ('PENDING', 'IN_TRANSIT', 'RECEIVED', 'INSPECTING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- Step 5: Add the correct constraint (should work now since data is fixed)
ALTER TABLE public.shipments
    ADD CONSTRAINT chk_shipments_status CHECK (
        status IN ('PENDING', 'IN_TRANSIT', 'RECEIVED', 'INSPECTING', 'APPROVED', 'REJECTED', 'CANCELLED')
    );

-- Step 6: Verify the fix worked
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
JOIN pg_class cl ON cl.oid = c.conrelid
WHERE cl.relname = 'shipments'
AND n.nspname = 'public'
AND conname LIKE '%status%';

-- Step 7: Verify all shipments now have valid status values
SELECT 
    status,
    COUNT(*) as count
FROM public.shipments
GROUP BY status
ORDER BY count DESC;

-- Step 8: Test insert with PENDING status
DO $$
BEGIN
    -- Try to insert a test record
    INSERT INTO public.shipments (
        shipment_number,
        container_number,
        supplier_id,
        status,
        expected_quantity,
        actual_quantity
    ) VALUES (
        'TEST-CONSTRAINT-FIX',
        'CNT-TEST',
        (SELECT id FROM public.suppliers LIMIT 1),
        'PENDING',
        0,
        0
    );
    
    -- If we get here, it worked!
    RAISE NOTICE '✅ SUCCESS: PENDING status is now accepted!';
    
    -- Clean up test record
    DELETE FROM public.shipments WHERE shipment_number = 'TEST-CONSTRAINT-FIX';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ FAILED: % - %', SQLSTATE, SQLERRM;
END $$;
