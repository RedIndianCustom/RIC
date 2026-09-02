-- ============================================================
-- FORCE POSTGREST SCHEMA CACHE REFRESH
-- ============================================================
--
-- This script attempts to force PostgREST to reload its cache
-- by creating and dropping a dummy table
--
-- ============================================================

-- Method 1: Create and drop a dummy table
DO $$
BEGIN
    -- Create dummy table
    CREATE TABLE IF NOT EXISTS public._schema_refresh_trigger (
        id serial primary key,
        created_at timestamptz default now()
    );
    
    -- Insert a dummy row
    INSERT INTO public._schema_refresh_trigger DEFAULT VALUES;
    
    -- Drop the table
    DROP TABLE public._schema_refresh_trigger;
    
    RAISE NOTICE 'Schema refresh trigger executed';
END $$;

-- Method 2: Send multiple NOTIFY commands
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Method 3: Check current schema cache status
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'employees';

-- Method 4: Verify the table is accessible
SELECT COUNT(*) as total_employees FROM public.employees;

-- Method 5: Verify RLS is properly configured
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'employees';

-- Method 6: Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'employees';

-- ============================================================
-- AFTER RUNNING THIS:
-- ============================================================
--
-- 1. Wait 30 seconds
-- 2. Test the API again
-- 3. If still not working, you MUST pause/resume the project
--
-- ============================================================

SELECT '✅ Schema refresh commands executed. Wait 30 seconds then test again.' as status;
