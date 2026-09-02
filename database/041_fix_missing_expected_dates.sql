-- ============================================================================
-- Fix Missing Expected Dates in Shipments
-- ============================================================================
-- This script identifies and optionally fixes shipments with NULL expected_date
-- ============================================================================

-- 1. Check which shipments are missing expected_date
SELECT 
    id,
    shipment_number,
    status,
    expected_date,
    actual_date,
    created_at
FROM public.shipments
WHERE expected_date IS NULL
ORDER BY created_at DESC;

-- 2. For shipments missing expected_date, set it to created_at date
-- (Uncomment to apply the fix)
/*
UPDATE public.shipments
SET expected_date = DATE(created_at)
WHERE expected_date IS NULL;
*/

-- 3. Verify the fix
SELECT 
    id,
    shipment_number,
    status,
    expected_date,
    actual_date,
    created_at
FROM public.shipments
WHERE id IN (
    SELECT id 
    FROM public.shipments 
    WHERE expected_date IS NOT NULL
)
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- INSTRUCTIONS:
-- ============================================================================
-- 1. Run the first query to see which shipments are missing expected_date
-- 2. If you want to fix them, uncomment the UPDATE statement and run it
-- 3. Run the third query to verify the fix was applied
-- ============================================================================
