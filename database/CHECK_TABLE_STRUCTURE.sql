-- ============================================================================
-- CHECK TABLE STRUCTURES - Find Type Mismatches
-- ============================================================================

-- Check barcodes table structure
SELECT 
    'barcodes' as table_name,
    column_name,
    data_type,
    character_maximum_length,
    ordinal_position
FROM information_schema.columns
WHERE table_name = 'barcodes'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check products table structure
SELECT 
    'products' as table_name,
    column_name,
    data_type,
    character_maximum_length,
    ordinal_position
FROM information_schema.columns
WHERE table_name = 'products'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check batches table structure
SELECT 
    'batches' as table_name,
    column_name,
    data_type,
    character_maximum_length,
    ordinal_position
FROM information_schema.columns
WHERE table_name = 'batches'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check shipments table structure
SELECT 
    'shipments' as table_name,
    column_name,
    data_type,
    character_maximum_length,
    ordinal_position
FROM information_schema.columns
WHERE table_name = 'shipments'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check inventory_units table structure
SELECT 
    'inventory_units' as table_name,
    column_name,
    data_type,
    character_maximum_length,
    ordinal_position
FROM information_schema.columns
WHERE table_name = 'inventory_units'
AND table_schema = 'public'
ORDER BY ordinal_position;
