-- ============================================================================
-- FIX: Remove Duplicate Expected Items
-- ============================================================================
-- Problem: Multiple expected items per product size when there should be only one
-- Solution: Delete duplicates, keeping only one per (shipment_id, product_id, product_size)
-- ============================================================================

BEGIN;

-- Step 1: Show current duplicates
SELECT 
  shipment_id,
  product_id,
  product_size,
  COUNT(*) as duplicate_count,
  STRING_AGG(id::text, ', ') as duplicate_ids
FROM shipment_expected_items
GROUP BY shipment_id, product_id, product_size
HAVING COUNT(*) > 1
ORDER BY shipment_id, product_size;

-- Step 2: Delete duplicates, keeping only the FIRST inserted row for each unique combination
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY shipment_id, product_id, product_size 
      ORDER BY created_at ASC, id ASC
    ) as row_num
  FROM shipment_expected_items
)
DELETE FROM shipment_expected_items
WHERE id IN (
  SELECT id FROM duplicates WHERE row_num > 1
);

-- Step 3: Add UNIQUE constraint to prevent future duplicates
ALTER TABLE shipment_expected_items
ADD CONSTRAINT unique_shipment_product_size 
UNIQUE (shipment_id, product_id, product_size);

-- Step 4: Verify remaining expected items
SELECT 
  s.shipment_number,
  sei.product_size,
  sei.expected_quantity,
  p.brand,
  p.model,
  sei.created_at
FROM shipment_expected_items sei
JOIN shipments s ON s.id = sei.shipment_id
JOIN products p ON p.id = sei.product_id
ORDER BY s.shipment_number, sei.product_size;

COMMIT;

-- ============================================================================
-- Notes:
-- - This will keep the FIRST (oldest) expected item for each unique combination
-- - The UNIQUE constraint prevents duplicates in the future
-- - If registration fails due to constraint, it means items already exist
-- ============================================================================
