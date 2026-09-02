-- ============================================================================
-- FORCE POSTGREST SCHEMA RELOAD - AGGRESSIVE METHOD
-- ============================================================================
-- This forces PostgREST to reload its schema cache immediately
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Method 1: NOTIFY command
NOTIFY pgrst, 'reload schema';

-- Method 2: Also try pg_notify
SELECT pg_notify('pgrst', 'reload schema');

-- Method 3: Reload config
NOTIFY pgrst, 'reload config';

-- Verify tables are in public schema
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('barcodes', 'inventory_units', 'batches', 'shipments')
ORDER BY tablename;

-- Check table permissions
SELECT 
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND table_name IN ('barcodes', 'inventory_units', 'batches', 'shipments')
AND grantee IN ('authenticator', 'authenticated', 'anon', 'service_role')
ORDER BY table_name, grantee;

SELECT '✅ Schema reload commands sent!' as status;
SELECT '⚠️ If still not working, restart PostgREST from Supabase Dashboard' as note;
SELECT '📍 Go to: Project Settings > API > Restart PostgREST' as instructions;
