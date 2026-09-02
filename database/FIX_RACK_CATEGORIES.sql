-- ============================================================================
-- FIX RACK CATEGORIES TO MATCH PRODUCT CATEGORIES
-- ============================================================================
-- This updates rack categories to match the actual products being used
-- ============================================================================

-- 1. First, check what product categories we have
SELECT DISTINCT category, brand, model, dimensions
FROM products
WHERE status = 'active'
ORDER BY category;

-- 2. Check current rack categories
SELECT rack_code, designated_size, size_category, status
FROM rack_configurations
ORDER BY rack_number;

-- 3. Update rack categories to match products
-- RACK-1 & RACK-2: Update to 'Sawtooth' (Classic Sawtooth products)
UPDATE rack_configurations
SET 
  size_category = 'Sawtooth',
  designated_size = 'Classic Sawtooth 120/90-18, 130/90-15, 170/80-15',
  updated_at = NOW()
WHERE rack_number IN ('RACK-1', 'RACK-2');

-- RACK-3: Set to 'Enduro' (Enduro Trail products)
UPDATE rack_configurations
SET 
  size_category = 'Enduro',
  designated_size = 'Enduro Trail 70/90-17, 80/100-17',
  updated_at = NOW()
WHERE rack_number = 'RACK-3';

-- RACK-4: Set to 'Dual Sport' (ST Dual Sport products)
UPDATE rack_configurations
SET 
  size_category = 'Dual Sport',
  designated_size = 'ST Dual Sport 90/90-17, 100/90-17',
  updated_at = NOW()
WHERE rack_number = 'RACK-4';

-- RACK-5: Set to 'Motocross' (MX Motocross and Trail products)
UPDATE rack_configurations
SET 
  size_category = 'Motocross',
  designated_size = 'MX Motocross & Trail 80/100-18, 110/80-17',
  updated_at = NOW()
WHERE rack_number = 'RACK-5';

-- 4. Verify the changes
SELECT 
  rack_code,
  rack_number,
  designated_size,
  size_category,
  total_capacity,
  current_count,
  status
FROM rack_configurations
ORDER BY rack_number;

-- 5. Show which products can go in which racks now
SELECT 
  p.category as product_category,
  p.sku,
  p.brand,
  p.model,
  rc.rack_code,
  rc.size_category as rack_category
FROM products p
CROSS JOIN rack_configurations rc
WHERE p.category = rc.size_category
ORDER BY p.category, rc.rack_number;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Rack categories updated to match product categories!';
  RAISE NOTICE '📦 RACK-1 & RACK-2: Sawtooth';
  RAISE NOTICE '📦 RACK-3: Enduro';
  RAISE NOTICE '📦 RACK-4: Dual Sport';
  RAISE NOTICE '📦 RACK-5: Motocross';
END $$;
