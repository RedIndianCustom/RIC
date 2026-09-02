-- Comprehensive verification of products table

-- 1. Check if table exists
SELECT 
    'Table Exists: ' || CASE WHEN EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'products'
    ) THEN 'YES ✓' ELSE 'NO ✗' END as status;

-- 2. Check table owner
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename = 'products';

-- 3. Check permissions on table
SELECT 
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name = 'products';

-- 4. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'products';

-- 5. Count products
SELECT COUNT(*) as total_products FROM public.products;

-- 6. Check if table is in pg_class
SELECT 
    relname as table_name,
    relkind as table_type
FROM pg_class
WHERE relname = 'products'
AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 7. Force expose table to PostgREST
-- Ensure schema is in the search path
SHOW search_path;

-- 8. Check PostgREST config
SELECT name, setting 
FROM pg_settings 
WHERE name LIKE '%pgrst%' OR name LIKE '%postgrest%';
