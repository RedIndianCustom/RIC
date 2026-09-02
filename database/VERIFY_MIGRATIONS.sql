-- ============================================================================
-- VERIFY MIGRATIONS COMPLETED SUCCESSFULLY
-- ============================================================================
-- Run this in Supabase SQL Editor to verify everything is set up correctly
-- ============================================================================

-- 1. Check if tables exist
SELECT 
    '✅ TABLES' as check_type,
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('shipments', 'batches', 'inventory_units', 'barcodes')
ORDER BY table_name;

-- 2. Check if functions exist
SELECT 
    '✅ FUNCTIONS' as check_type,
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'create_inventory_barcodes',
    'get_barcodes_with_traceability',
    'validate_barcode_chain',
    'get_next_barcode_sequence'
)
ORDER BY routine_name;

-- 3. Check if sequence exists
SELECT 
    '✅ SEQUENCE' as check_type,
    sequence_name,
    last_value
FROM information_schema.sequences 
WHERE sequence_schema = 'public' 
AND sequence_name = 'barcode_sequence';

-- 4. Check if view exists
SELECT 
    '✅ VIEW' as check_type,
    table_name as view_name
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name = 'barcode_full_traceability';

-- 5. Check row counts
SELECT 
    '✅ ROW COUNTS' as check_type,
    'suppliers' as table_name, 
    COUNT(*) as row_count 
FROM suppliers
UNION ALL
SELECT '✅ ROW COUNTS', 'products', COUNT(*) FROM products
UNION ALL
SELECT '✅ ROW COUNTS', 'shipments', COUNT(*) FROM shipments
UNION ALL
SELECT '✅ ROW COUNTS', 'batches', COUNT(*) FROM batches
UNION ALL
SELECT '✅ ROW COUNTS', 'inventory_units', COUNT(*) FROM inventory_units
UNION ALL
SELECT '✅ ROW COUNTS', 'barcodes', COUNT(*) FROM barcodes;

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- ✅ 4 tables (shipments, batches, inventory_units, barcodes)
-- ✅ 4 functions (create_inventory_barcodes, get_barcodes_with_traceability, etc.)
-- ✅ 1 sequence (barcode_sequence)
-- ✅ 1 view (barcode_full_traceability)
-- ✅ Row counts (0 is OK for new tables, may have data in suppliers/products)
-- ============================================================================
