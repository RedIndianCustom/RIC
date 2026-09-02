-- ============================================================================
-- RELOAD SUPABASE SCHEMA CACHE
-- ============================================================================
-- Run this in Supabase SQL Editor after creating new tables
-- This forces PostgREST to reload its schema cache
-- ============================================================================

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- Also refresh the schema cache
SELECT pg_notify('pgrst', 'reload schema');

-- Verify tables are accessible
SELECT 
    schemaname, 
    tablename, 
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('shipments', 'batches', 'inventory_units', 'barcodes')
ORDER BY tablename;

-- Show message
SELECT '✅ Schema cache reload notification sent!' as status;
SELECT '⏳ Wait 5-10 seconds then try your API again' as next_step;
