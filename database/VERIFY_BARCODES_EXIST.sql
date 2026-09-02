-- Quick verification: Do barcodes exist?
SELECT 
    'Barcodes in database:' as info,
    COUNT(*) as total_count
FROM barcodes;

-- Show the actual barcodes
SELECT 
    id,
    barcode_value,
    barcode_type,
    status,
    product_id,
    batch_id,
    inventory_unit_id,
    created_at
FROM barcodes
ORDER BY created_at DESC
LIMIT 10;
