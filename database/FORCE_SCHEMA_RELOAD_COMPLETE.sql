-- ============================================================================
-- FORCE SCHEMA RELOAD - Complete Fix for Schema Cache Issue
-- Run this entire script in Supabase SQL Editor
-- ============================================================================

-- Step 1: Verify products table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
        RAISE EXCEPTION 'Products table does not exist! Run SETUP_PRODUCTS_TABLE.sql first.';
    END IF;
    RAISE NOTICE 'Products table exists ✓';
END $$;

-- Step 2: Grant explicit permissions to anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;

-- Step 3: Ensure RLS is properly configured
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to ensure they're fresh
DROP POLICY IF EXISTS "Allow public read access to products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
DROP POLICY IF EXISTS "Service role full access" ON public.products;

-- Create permissive read policy for all authenticated users
CREATE POLICY "Authenticated users can view products"
ON public.products
FOR SELECT
TO authenticated
USING (true);

-- Create policy for anon (public) read if needed
CREATE POLICY "Allow public read access to products"
ON public.products
FOR SELECT
TO anon
USING (true);

-- Step 4: Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Step 5: Refresh materialized views if any exist
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT matviewname FROM pg_matviews WHERE schemaname = 'public'
    LOOP
        EXECUTE 'REFRESH MATERIALIZED VIEW ' || quote_ident(r.matviewname);
        RAISE NOTICE 'Refreshed materialized view: %', r.matviewname;
    END LOOP;
END $$;

-- Step 6: Update table statistics
ANALYZE public.products;

-- Step 7: Verify table is accessible
DO $$
DECLARE
    product_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO product_count FROM public.products;
    RAISE NOTICE 'Product count: %', product_count;
    
    IF product_count = 0 THEN
        RAISE WARNING 'Products table is empty! Run the product insert script.';
    ELSE
        RAISE NOTICE '✓ Products table has % rows', product_count;
    END IF;
END $$;

-- Step 8: Show table info for verification
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE tablename = 'products';

-- Step 9: Show current policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'products';

-- Step 10: Final verification query
SELECT 
    '✅ SCHEMA RELOAD COMPLETE!' as status,
    COUNT(*) as total_products,
    COUNT(DISTINCT brand) as brands,
    COUNT(DISTINCT category) as categories,
    STRING_AGG(DISTINCT category, ', ') as category_list
FROM public.products;

-- Step 11: Sample products to verify data
SELECT 
    sku,
    brand,
    model,
    dimensions,
    category,
    current_stock,
    status
FROM public.products
ORDER BY category, sku
LIMIT 10;

-- Final message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '================================================================';
    RAISE NOTICE 'SCHEMA RELOAD COMPLETED!';
    RAISE NOTICE '================================================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Wait 10 seconds for cache to propagate';
    RAISE NOTICE '2. Restart your backend server';
    RAISE NOTICE '3. Hard refresh your browser (Ctrl + Shift + R)';
    RAISE NOTICE '4. Navigate to Barcode Generation page';
    RAISE NOTICE '================================================================';
END $$;
