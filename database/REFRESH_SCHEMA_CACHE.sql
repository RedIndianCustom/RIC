-- ============================================================================
-- REFRESH POSTGREST SCHEMA CACHE
-- ============================================================================
-- PostgREST caches the database schema. After creating new tables,
-- you need to refresh this cache.
-- ============================================================================

-- Method 1: Send a NOTIFY signal to refresh the cache
NOTIFY pgrst, 'reload schema';

-- Method 2: Call the reload_schema function (if available)
-- This may not exist in all Supabase projects
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'reload_schema'
  ) THEN
    PERFORM reload_schema();
    RAISE NOTICE 'Schema reloaded using reload_schema()';
  ELSE
    RAISE NOTICE 'reload_schema() function not found, used NOTIFY instead';
  END IF;
END $$;

-- Verify the warehouse_locations table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'warehouse_locations'
    ) THEN '✅ warehouse_locations table EXISTS'
    ELSE '❌ warehouse_locations table DOES NOT EXIST - Run 008_warehouse_locations.sql first!'
  END as table_status;

-- Show table details if it exists
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'warehouse_locations'
ORDER BY ordinal_position;

-- Show row count
SELECT 
  COUNT(*) as total_rows,
  'Sample data loaded' as status
FROM public.warehouse_locations;
