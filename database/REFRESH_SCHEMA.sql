-- Force Supabase PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';

-- Verify products are visible
SELECT 
    'Schema refresh triggered!' as status,
    COUNT(*) as total_products
FROM public.products;
