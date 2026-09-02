-- ============================================================================
-- CREATE TEST DATA FOR BARCODE GENERATION
-- ============================================================================
-- Run this in Supabase SQL Editor to create the required test data
-- Copy the UUIDs returned - you'll need them!
-- ============================================================================

-- STEP 1: Create Test Supplier
INSERT INTO suppliers (name, supplier_code, contact_person, email, phone, status)
VALUES (
    'Test Tire Supplier Inc',
    'SUP001',
    'John Smith',
    'john@testsupplier.com',
    '+1-555-0123',
    'active'
)
ON CONFLICT (supplier_code) DO UPDATE 
SET status = 'active'
RETURNING id, name, supplier_code;

-- Copy the supplier ID from above and paste it below:
-- Example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

-- STEP 2: Create Test Shipment
-- Replace 'PASTE-SUPPLIER-ID-HERE' with the UUID from Step 1
INSERT INTO shipments (
    supplier_id,
    shipment_number,
    container_number,
    bl_number,
    expected_quantity,
    actual_quantity,
    expected_arrival_date,
    status
)
VALUES (
    'PASTE-SUPPLIER-ID-HERE'::UUID,
    'SHIP-2026-TEST-001',
    'MSKU1234567',
    'BL-2026-TEST-001',
    100,
    100,
    CURRENT_DATE,
    'RECEIVED'
)
ON CONFLICT (shipment_number) DO UPDATE 
SET status = 'RECEIVED'
RETURNING id, shipment_number, container_number;

-- Copy the shipment ID from above

-- STEP 3: Get a Product ID
-- This will show you existing products
SELECT id, sku, brand, model, product_name 
FROM products 
WHERE status = 'active'
LIMIT 5;

-- Copy a product ID from above

-- STEP 4: Create Test Batch
-- Replace the UUIDs with the ones you copied:
-- - PASTE-SHIPMENT-ID-HERE (from Step 2)
-- - PASTE-PRODUCT-ID-HERE (from Step 3)
INSERT INTO batches (
    shipment_id,
    product_id,
    batch_number,
    batch_month,
    batch_year,
    status
)
VALUES (
    'PASTE-SHIPMENT-ID-HERE'::UUID,
    'PASTE-PRODUCT-ID-HERE'::UUID,
    'BATCH-2608-TEST-001',
    8,  -- August
    2026,
    'ACTIVE'
)
ON CONFLICT (batch_number) DO UPDATE 
SET status = 'ACTIVE'
RETURNING id, batch_number, shipment_id, product_id;

-- Copy the batch ID from above

-- STEP 5: Test Barcode Generation (Optional - test via SQL)
-- Replace the UUIDs:
SELECT * FROM create_inventory_barcodes(
    'PASTE-PRODUCT-ID-HERE'::UUID,   -- product_id
    'PASTE-BATCH-ID-HERE'::UUID,      -- batch_id  
    'PASTE-SHIPMENT-ID-HERE'::UUID,   -- shipment_id
    3                                  -- quantity (generate 3 test barcodes)
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Check what you created:
SELECT 
    'Suppliers' as table_name, COUNT(*) as count FROM suppliers
UNION ALL
SELECT 'Shipments', COUNT(*) FROM shipments
UNION ALL
SELECT 'Batches', COUNT(*) FROM batches
UNION ALL
SELECT 'Barcodes', COUNT(*) FROM barcodes;

-- ============================================================================
-- SUCCESS!
-- ============================================================================
-- If you see barcodes generated, you can now use the frontend to generate more!
-- The frontend will need to be updated to select a batch when generating.
-- ============================================================================
