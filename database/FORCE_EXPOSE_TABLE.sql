-- Force expose products table to PostgREST API
-- Run this in Supabase SQL Editor

-- Step 1: Make sure table is owned by postgres
ALTER TABLE public.products OWNER TO postgres;

-- Step 2: Grant ALL permissions explicitly to all roles
GRANT ALL ON public.products TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT ON public.products TO anon;
GRANT ALL ON public.products TO service_role;

-- Step 3: Make sure schema is accessible
GRANT USAGE ON SCHEMA public TO postgres, authenticated, anon, service_role;

-- Step 4: Disable RLS temporarily to test
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;

-- Step 5: Send multiple NOTIFY signals
DO $$
BEGIN
    FOR i IN 1..10 LOOP
        PERFORM pg_notify('pgrst', 'reload schema');
        PERFORM pg_notify('pgrst', 'reload config');
        PERFORM pg_sleep(0.1);
    END LOOP;
END $$;

-- Step 6: Verify table is visible
SELECT 
    '✓ Products table is ready!' as status,
    COUNT(*) as total_products,
    (SELECT tableowner FROM pg_tables WHERE tablename = 'products') as owner,
    (SELECT rowsecurity FROM pg_tables WHERE tablename = 'products') as rls_enabled
FROM public.products;

-- Step 7: Show sample data
SELECT sku, brand, model, dimensions, category
FROM public.products
LIMIT 5;
