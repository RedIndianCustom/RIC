-- ============================================================================
-- DEBUG: Check why rack count isn't updating on barcode deletion
-- ============================================================================

-- 1. Check current barcodes and their inventory units
SELECT 
    b.id as barcode_id,
    b.barcode_value,
    b.inventory_unit_id,
    iu.warehouse_id,
    iu.rack as rack_code,
    w.code as warehouse_code,
    w.name as warehouse_name
FROM barcodes b
LEFT JOIN inventory_units iu ON b.inventory_unit_id = iu.id
LEFT JOIN warehouses w ON iu.warehouse_id = w.id
WHERE b.status = 'active'
ORDER BY b.created_at DESC
LIMIT 10;

-- 2. Check rack configurations
SELECT 
    id,
    warehouse_id,
    rack_code,
    rack_number,
    current_count,
    total_capacity,
    designated_size
FROM rack_configurations
WHERE warehouse_id = 'b1eff6be-b968-4861-94c2-f220e4eeffed'
ORDER BY rack_code;

-- 3. Count actual inventory units per rack
SELECT 
    iu.warehouse_id,
    iu.rack as rack_code,
    w.code as warehouse_code,
    COUNT(*) as actual_unit_count
FROM inventory_units iu
LEFT JOIN warehouses w ON iu.warehouse_id = w.id
WHERE iu.warehouse_id IS NOT NULL 
  AND iu.rack IS NOT NULL
GROUP BY iu.warehouse_id, iu.rack, w.code
ORDER BY iu.rack;

-- 4. Check foreign key constraints on barcodes table
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'barcodes'
    AND ccu.table_name = 'inventory_units';

-- 5. Test the exact query the backend should use
-- (Simulating what happens when we delete barcode with inventory_unit_id)
SELECT 
    b.id,
    b.inventory_unit_id,
    iu.warehouse_id,
    iu.rack
FROM barcodes b
LEFT JOIN inventory_units iu ON b.inventory_unit_id = iu.id
WHERE b.status = 'active'
LIMIT 1;
