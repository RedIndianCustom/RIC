-- ============================================================================
-- MIGRATION 031: ADD REMAINING PRODUCTS (Street Dual Sport, Dual Sport XT, Armor series)
-- ============================================================================
-- This adds the 5 missing product lines that weren't inserted previously
-- Total: 39 new products
-- ============================================================================

-- Add imperial_size column if not exists
ALTER TABLE products ADD COLUMN IF NOT EXISTS imperial_size VARCHAR(50);

-- ============================================================================
-- 1. STREET DUAL SPORT (11 products)
-- ============================================================================

INSERT INTO products (brand, model, dimensions, imperial_size, sku, category, status, created_at, updated_at)
VALUES
('Red Indian Customs', 'Street Dual Sport', '90/90-17', '3.50-17', 'SDS-17-90/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Street Dual Sport', '100/90-17', '4.00-17', 'SDS-17-100/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Street Dual Sport', '110/90-17', '4.10-17', 'SDS-17-110/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Street Dual Sport', '120/80-17', '4.60-17', 'SDS-17-120/80', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Street Dual Sport', '130/80-17', '5.00-17', 'SDS-17-130/80', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Street Dual Sport', '140/70-17', '5.50-17', 'SDS-17-140/70', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Street Dual Sport', '150/70-17', '6.00-17', 'SDS-17-150/70', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Street Dual Sport', '90/90-18', '3.50-18', 'SDS-18-90/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Street Dual Sport', '100/90-18', '4.00-18', 'SDS-18-100/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Street Dual Sport', '120/80-18', '4.60-18', 'SDS-18-120/80', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Street Dual Sport', '90/90-19', '3.50-19', 'SDS-19-90/90', 'Motorcycle Tire', 'active', NOW(), NOW())
ON CONFLICT (sku) DO UPDATE SET
  brand = EXCLUDED.brand,
  model = EXCLUDED.model,
  dimensions = EXCLUDED.dimensions,
  imperial_size = EXCLUDED.imperial_size,
  category = EXCLUDED.category,
  status = EXCLUDED.status,
  updated_at = NOW();

-- ============================================================================
-- 2. DUAL SPORT XT (10 products)
-- ============================================================================

INSERT INTO products (brand, model, dimensions, imperial_size, sku, category, status, created_at, updated_at)
VALUES
('Red Indian Customs', 'Dual Sport XT', '90/90-17', '3.50-17', 'DSXT-17-90/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Dual Sport XT', '100/90-17', '4.00-17', 'DSXT-17-100/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Dual Sport XT', '110/90-17', '4.10-17', 'DSXT-17-110/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Dual Sport XT', '120/80-17', '4.60-17', 'DSXT-17-120/80', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Dual Sport XT', '130/80-17', '5.00-17', 'DSXT-17-130/80', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Dual Sport XT', '140/70-17', '5.50-17', 'DSXT-17-140/70', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Dual Sport XT', '90/90-18', '3.50-18', 'DSXT-18-90/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Dual Sport XT', '100/90-18', '4.00-18', 'DSXT-18-100/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Dual Sport XT', '120/80-18', '4.60-18', 'DSXT-18-120/80', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Dual Sport XT', '90/90-19', '3.50-19', 'DSXT-19-90/90', 'Motorcycle Tire', 'active', NOW(), NOW())
ON CONFLICT (sku) DO UPDATE SET
  brand = EXCLUDED.brand,
  model = EXCLUDED.model,
  dimensions = EXCLUDED.dimensions,
  imperial_size = EXCLUDED.imperial_size,
  category = EXCLUDED.category,
  status = EXCLUDED.status,
  updated_at = NOW();

-- ============================================================================
-- 3. ARMOR XT (5 products)
-- ============================================================================

INSERT INTO products (brand, model, dimensions, imperial_size, sku, category, status, created_at, updated_at)
VALUES
('Red Indian Customs', 'Armor XT', '100/80-17', '4.00-17', 'ARXT-17-100/80', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Armor XT', '110/80-17', '4.10-17', 'ARXT-17-110/80', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Armor XT', '120/80-17', '4.60-17', 'ARXT-17-120/80', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Armor XT', '130/80-17', '5.00-17', 'ARXT-17-130/80', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Armor XT', '140/70-17', '5.50-17', 'ARXT-17-140/70', 'Motorcycle Tire', 'active', NOW(), NOW())
ON CONFLICT (sku) DO UPDATE SET
  brand = EXCLUDED.brand,
  model = EXCLUDED.model,
  dimensions = EXCLUDED.dimensions,
  imperial_size = EXCLUDED.imperial_size,
  category = EXCLUDED.category,
  status = EXCLUDED.status,
  updated_at = NOW();

-- ============================================================================
-- 4. ARMOR ADV (9 products)
-- ============================================================================

INSERT INTO products (brand, model, dimensions, imperial_size, sku, category, status, created_at, updated_at)
VALUES
('Red Indian Customs', 'Armor ADV', '100/90-17', '4.00-17', 'AADV-17-100/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Armor ADV', '110/90-17', '4.10-17', 'AADV-17-110/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Armor ADV', '120/80-17', '4.60-17', 'AADV-17-120/80', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Armor ADV', '130/80-17', '5.00-17', 'AADV-17-130/80', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Armor ADV', '140/70-17', '5.50-17', 'AADV-17-140/70', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Armor ADV', '90/90-18', '3.50-18', 'AADV-18-90/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Armor ADV', '120/80-18', '4.60-18', 'AADV-18-120/80', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Armor ADV', '90/90-19', '3.50-19', 'AADV-19-90/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Armor ADV', '90/90-21', '3.50-19', 'AADV-21-90/90', 'Motorcycle Tire', 'active', NOW(), NOW())
ON CONFLICT (sku) DO UPDATE SET
  brand = EXCLUDED.brand,
  model = EXCLUDED.model,
  dimensions = EXCLUDED.dimensions,
  imperial_size = EXCLUDED.imperial_size,
  category = EXCLUDED.category,
  status = EXCLUDED.status,
  updated_at = NOW();

-- ============================================================================
-- 5. ARMOR ST (13 products - Scooter)
-- ============================================================================

INSERT INTO products (brand, model, dimensions, imperial_size, sku, category, status, created_at, updated_at)
VALUES
('Red Indian Customs', 'ARMOR ST', '110/70-12', '4.10-12', 'AST-12-110/70', 'Scooter Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'ARMOR ST', '120/70-12', '4.60-12', 'AST-12-120/70', 'Scooter Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'ARMOR ST', '110/70-13', '4.10-13', 'AST-13-110/70', 'Scooter Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'ARMOR ST', '130/70-13', '4.60-13', 'AST-13-130/70', 'Scooter Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'ARMOR ST', '70/80-14', '2.75-14', 'AST-14-70/80', 'Scooter Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'ARMOR ST', '80/80-14', '3.00-14', 'AST-14-80/80', 'Scooter Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'ARMOR ST', '80/90-14', '3.50-14', 'AST-14-80/90', 'Scooter Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'ARMOR ST', '90/90-14', '3.50-14', 'AST-14-90/90', 'Scooter Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'ARMOR ST', '100/80-14', '4.00-14', 'AST-14-100/80', 'Scooter Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'ARMOR ST', '110/70-14', '4.10-14', 'AST-14-110/70', 'Scooter Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'ARMOR ST', '110/80-14', '4.10-14', 'AST-14-110/80', 'Scooter Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'ARMOR ST', '120/70-14', '4.60-14', 'AST-14-120/70', 'Scooter Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'ARMOR ST', '140/60-14', '5.50-14', 'AST-14-140/60', 'Scooter Tire', 'active', NOW(), NOW())
ON CONFLICT (sku) DO UPDATE SET
  brand = EXCLUDED.brand,
  model = EXCLUDED.model,
  dimensions = EXCLUDED.dimensions,
  imperial_size = EXCLUDED.imperial_size,
  category = EXCLUDED.category,
  status = EXCLUDED.status,
  updated_at = NOW();

-- ============================================================================
-- 6. ARMOR ST-X (2 products - Scooter)
-- ============================================================================

INSERT INTO products (brand, model, dimensions, imperial_size, sku, category, status, created_at, updated_at)
VALUES
('Red Indian Customs', 'ARMOR ST-X', '110/70-13', '4.10-13', 'ASTX-13-110/70', 'Scooter Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'ARMOR ST-X', '130/70-13', '5.00-13', 'ASTX-13-130/70', 'Scooter Tire', 'active', NOW(), NOW())
ON CONFLICT (sku) DO UPDATE SET
  brand = EXCLUDED.brand,
  model = EXCLUDED.model,
  dimensions = EXCLUDED.dimensions,
  imperial_size = EXCLUDED.imperial_size,
  category = EXCLUDED.category,
  status = EXCLUDED.status,
  updated_at = NOW();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 
  '✅ Migration 031 complete!' as message,
  COUNT(*) as new_products_added,
  (SELECT COUNT(*) FROM products WHERE brand = 'Red Indian Customs') as total_ric_products
FROM products 
WHERE brand = 'Red Indian Customs'
  AND model IN ('Street Dual Sport', 'Dual Sport XT', 'Armor XT', 'Armor ADV', 'ARMOR ST', 'ARMOR ST-X');

-- Show breakdown
SELECT 
  model,
  COUNT(*) as count,
  STRING_AGG(DISTINCT category, ', ') as categories
FROM products 
WHERE brand = 'Red Indian Customs'
GROUP BY model
ORDER BY 
  CASE model
    WHEN 'Street Dual Sport' THEN 1
    WHEN 'Dual Sport XT' THEN 2
    WHEN 'Classic Sawtooth' THEN 3
    WHEN 'Enduro Trail' THEN 4
    WHEN 'Armor XT' THEN 5
    WHEN 'Armor ADV' THEN 6
    WHEN 'ARMOR ST' THEN 7
    WHEN 'ARMOR ST-X' THEN 8
    ELSE 9
  END;
