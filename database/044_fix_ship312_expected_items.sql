-- ============================================================================
-- FIX: SHIP312 Wrong Expected Items
-- ============================================================================
-- Problem: SHIP312 shows wrong products (90/90-19) in receiving modal
-- Solution: Delete all expected items and recreate from product_breakdown
-- ============================================================================

BEGIN;

-- Step 1: Check current expected items for SHIP312
SELECT 
  'CURRENT EXPECTED ITEMS:' as info,
  sei.id,
  sei.product_size,
  sei.expected_quantity,
  p.brand,
  p.model,
  p.dimensions,
  p.sku
FROM shipment_expected_items sei
JOIN shipments s ON s.id = sei.shipment_id
JOIN products p ON p.id = sei.product_id
WHERE s.shipment_number = 'SHIP312'
ORDER BY sei.product_size;

-- Step 2: Check what SHOULD be in SHIP312 (from products table)
SELECT 
  'CORRECT PRODUCTS FOR SHIP312:' as info,
  id as product_id,
  brand,
  model,
  dimensions,
  sku
FROM products
WHERE dimensions IN ('120/80-17', '100/90-17', '120/80-18')
  AND brand = 'Red Indian Customs'
  AND model = 'Dual Sport XT'
ORDER BY dimensions;

-- Step 3: Delete ALL wrong expected items for SHIP312
DELETE FROM shipment_expected_items
WHERE shipment_id = (SELECT id FROM shipments WHERE shipment_number = 'SHIP312');

-- Step 4: Insert CORRECT expected items for SHIP312
INSERT INTO shipment_expected_items (
  shipment_id,
  product_id,
  product_size,
  expected_quantity,
  unit_price,
  notes,
  created_at
)
SELECT 
  (SELECT id FROM shipments WHERE shipment_number = 'SHIP312'),
  p.id,
  p.dimensions,
  CASE 
    WHEN p.dimensions = '120/80-17' THEN 28
    WHEN p.dimensions = '100/90-17' THEN 28
    WHEN p.dimensions = '120/80-18' THEN 14
  END,
  0,
  'Auto-fixed from SQL script',
  NOW()
FROM products p
WHERE p.dimensions IN ('120/80-17', '100/90-17', '120/80-18')
  AND p.brand = 'Red Indian Customs'
  AND p.model = 'Dual Sport XT';

-- Step 5: Verify the fix
SELECT 
  'AFTER FIX:' as info,
  sei.product_size,
  sei.expected_quantity,
  p.brand,
  p.model,
  p.sku
FROM shipment_expected_items sei
JOIN shipments s ON s.id = sei.shipment_id
JOIN products p ON p.id = sei.product_id
WHERE s.shipment_number = 'SHIP312'
ORDER BY sei.product_size;

-- Should show:
-- 100/90-17 | 28
-- 120/80-17 | 28  
-- 120/80-18 | 14

COMMIT;

-- ============================================================================
-- To Run:
-- 1. Copy this entire script
-- 2. Go to Supabase SQL Editor
-- 3. Paste and click "Run"
-- 4. Check results - should show 3 correct items
-- ============================================================================
