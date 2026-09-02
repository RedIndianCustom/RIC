-- ============================================================================
-- REFRESH POSTGREST SCHEMA CACHE
-- ============================================================================
-- Sometimes PostgREST doesn't immediately see new functions
-- This forces a schema reload
-- ============================================================================

-- Method 1: Send reload notification
NOTIFY pgrst, 'reload schema';

-- Method 2: Check if function is visible
SELECT 
  routine_name,
  routine_type,
  routine_schema
FROM information_schema.routines
WHERE routine_name IN ('create_inventory_barcodes', 'get_barcodes_with_traceability')
ORDER BY routine_name;

-- Method 3: Grant permissions (in case they're missing)
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.create_inventory_barcodes(UUID, UUID, UUID, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_barcodes_with_traceability(INTEGER) TO authenticated, anon;

-- Verify grants
SELECT 
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'create_inventory_barcodes';

-- Final notification
NOTIFY pgrst, 'reload schema';

SELECT '✅ Schema cache refreshed! Functions should be accessible now.' as status;
