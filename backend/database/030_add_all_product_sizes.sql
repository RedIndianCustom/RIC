-- ============================================================================
-- MIGRATION 030: ADD ALL PRODUCT SIZES
-- ============================================================================
-- This migration adds all Red Indian Customs tire products with correct sizes
-- Organized by brand/model:
-- 1. Classic Sawtooth (17 sizes)
-- 2. Enduro Trail (14 sizes)
-- 3. Street Dual Sport (11 sizes)
-- 4. Dual Sport XT (10 sizes)
-- 5. Armor XT (5 sizes)
-- 6. Armor ADV (9 sizes)
-- 7. ARMOR ST (13 sizes)
-- 8. ARMOR ST-X (2 sizes)
-- Total: 81 products
-- ============================================================================

BEGIN;

-- ============================================================================
-- ADD IMPERIAL_SIZE COLUMN IF NOT EXISTS
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'imperial_size'
  ) THEN
    ALTER TABLE products ADD COLUMN imperial_size VARCHAR(50);
    RAISE NOTICE '✅ Added imperial_size column to products table';
  ELSE
    RAISE NOTICE '✅ imperial_size column already exists';
  END IF;
END $$;

-- ============================================================================
-- 1. CLASSIC SAWTOOTH (17 products)
-- ============================================================================

INSERT INTO products (brand, model, dimensions, imperial_size, sku, category, status, created_at, updated_at)
VALUES
-- Size 15
('Red Indian Customs', 'Classic Sawtooth', '130/90-15', '5.00-15', 'SAW-15-130/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Classic Sawtooth', '170/80-15', '6.50-15', 'SAW-15-170/80', 'Motorcycle Tire', 'active', NOW(), NOW()),

-- Size 16
('Red Indian Customs', 'Classic Sawtooth', '130/90-16', '5.00-16', 'SAW-16-130/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Classic Sawtooth', '150/80-16', '6.00-16', 'SAW-16-150/80', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Classic Sawtooth', '180/65-16', '7.00-16', 'SAW-16-180/65', 'Motorcycle Tire', 'active', NOW(), NOW()),

-- Size 17
('Red Indian Customs', 'Classic Sawtooth', '90/90-17', '3.50-17', 'SAW-17-90/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Classic Sawtooth', '100/90-17', '4.00-17', 'SAW-17-100/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Classic Sawtooth', '120/90-17', '4.50-17', 'SAW-17-120/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Classic Sawtooth', '130/90-17', '5.00-17', 'SAW-17-130/90', 'Motorcycle Tire', 'active', NOW(), NOW()),

-- Size 18
('Red Indian Customs', 'Classic Sawtooth', '90/90-18', '3.50-18', 'SAW-18-90/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Classic Sawtooth', '100/90-18', '4.00-18', 'SAW-18-100/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Classic Sawtooth', '120/90-18', '4.50-18', 'SAW-18-120/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Classic Sawtooth', '130/90-18', '5.00-18', 'SAW-18-130/90', 'Motorcycle Tire', 'active', NOW(), NOW()),

-- Size 19
('Red Indian Customs', 'Classic Sawtooth', '80/90-19', '3.25-19', 'SAW-19-80/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Classic Sawtooth', '100/90-19', '4.00-19', 'SAW-19-100/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Classic Sawtooth', '120/90-19', '4.50-19', 'SAW-19-120/90', 'Motorcycle Tire', 'active', NOW(), NOW()),

-- Size 21
('Red Indian Customs', 'Classic Sawtooth', '90/90-21', '3.00-21', 'SAW-21-90/90', 'Motorcycle Tire', 'active', NOW(), NOW())

ON CONFLICT (sku) DO UPDATE SET
  brand = EXCLUDED.brand,
  model = EXCLUDED.model,
  dimensions = EXCLUDED.dimensions,
  imperial_size = EXCLUDED.imperial_size,
  category = EXCLUDED.category,
  status = EXCLUDED.status,
  updated_at = NOW();

-- ============================================================================
-- 2. ENDURO TRAIL (14 products)
-- ============================================================================

INSERT INTO products (brand, model, dimensions, imperial_size, sku, category, status, created_at, updated_at)
VALUES
-- Size 17
('Red Indian Customs', 'Enduro Trail', '70/90-17', '2.75-17', 'END-17-70/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Enduro Trail', '80/90-17', '3.00-17', 'END-17-80/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Enduro Trail', '90/90-17', '3.50-17', 'END-17-90/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Enduro Trail', '110/90-17', '4.10-17', 'END-17-110/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Enduro Trail', '120/90-17', '4.60-17', 'END-17-120/90', 'Motorcycle Tire', 'active', NOW(), NOW()),

-- Size 18
('Red Indian Customs', 'Enduro Trail', '70/90-18', '2.75-18', 'END-18-70/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Enduro Trail', '80/90-18', '3.00-18', 'END-18-80/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Enduro Trail', '90/90-18', '3.50-18', 'END-18-90/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Enduro Trail', '110/90-18', '4.10-18', 'END-18-110/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Enduro Trail', '120/90-18', '4.60-18', 'END-18-120/90', 'Motorcycle Tire', 'active', NOW(), NOW()),

-- Size 19
('Red Indian Customs', 'Enduro Trail', '70/90-19', '2.75-19', 'END-19-70/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Enduro Trail', '90/90-19', '3.75-19', 'END-19-90/90', 'Motorcycle Tire', 'active', NOW(), NOW()),

-- Size 21
('Red Indian Customs', 'Enduro Trail', '70/90-21', '2.75-21', 'END-21-70/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Enduro Trail', '90/90-21', '3.00-21', 'END-21-90/90', 'Motorcycle Tire', 'active', NOW(), NOW())

ON CONFLICT (sku) DO UPDATE SET
  brand = EXCLUDED.brand,
  model = EXCLUDED.model,
  dimensions = EXCLUDED.dimensions,
  imperial_size = EXCLUDED.imperial_size,
  category = EXCLUDED.category,
  status = EXCLUDED.status,
  updated_at = NOW();

-- ============================================================================
-- 3. STREET DUAL SPORT (11 products)
-- ============================================================================

INSERT INTO products (brand, model, dimensions, imperial_size, sku, category, status, created_at, updated_at)
VALUES
-- Size 17
('Red Indian Customs', 'Street Dual Sport', '90/90-17', '3.50-17', 'SDS-17-90/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Street Dual Sport', '100/90-17', '4.00-17', 'SDS-17-100/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Street Dual Sport', '110/90-17', '4.10-17', 'SDS-17-110/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Street Dual Sport', '120/80-17', '4.60-17', 'SDS-17-120/80', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Street Dual Sport', '130/80-17', '5.00-17', 'SDS-17-130/80', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Street Dual Sport', '140/70-17', '5.50-17', 'SDS-17-140/70', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Street Dual Sport', '150/70-17', '6.00-17', 'SDS-17-150/70', 'Motorcycle Tire', 'active', NOW(), NOW()),

-- Size 18
('Red Indian Customs', 'Street Dual Sport', '90/90-18', '3.50-18', 'SDS-18-90/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Street Dual Sport', '100/90-18', '4.00-18', 'SDS-18-100/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Street Dual Sport', '120/80-18', '4.60-18', 'SDS-18-120/80', 'Motorcycle Tire', 'active', NOW(), NOW()),

-- Size 19
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
-- 4. DUAL SPORT XT (10 products)
-- ============================================================================

INSERT INTO products (brand, model, dimensions, imperial_size, sku, category, status, created_at, updated_at)
VALUES
-- Size 17
('Red Indian Customs', 'Dual Sport XT', '90/90-17', '3.50-17', 'DSXT-17-90/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Dual Sport XT', '100/90-17', '4.00-17', 'DSXT-17-100/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Dual Sport XT', '110/90-17', '4.10-17', 'DSXT-17-110/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Dual Sport XT', '120/80-17', '4.60-17', 'DSXT-17-120/80', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Dual Sport XT', '130/80-17', '5.00-17', 'DSXT-17-130/80', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Dual Sport XT', '140/70-17', '5.50-17', 'DSXT-17-140/70', 'Motorcycle Tire', 'active', NOW(), NOW()),

-- Size 18
('Red Indian Customs', 'Dual Sport XT', '90/90-18', '3.50-18', 'DSXT-18-90/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Dual Sport XT', '100/90-18', '4.00-18', 'DSXT-18-100/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Dual Sport XT', '120/80-18', '4.60-18', 'DSXT-18-120/80', 'Motorcycle Tire', 'active', NOW(), NOW()),

-- Size 19
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
-- 5. ARMOR XT (5 products)
-- ============================================================================

INSERT INTO products (brand, model, dimensions, imperial_size, sku, category, status, created_at, updated_at)
VALUES
-- Size 17
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
-- 6. ARMOR ADV (9 products)
-- ============================================================================

INSERT INTO products (brand, model, dimensions, imperial_size, sku, category, status, created_at, updated_at)
VALUES
-- Size 17
('Red Indian Customs', 'Armor ADV', '100/90-17', '4.00-17', 'AADV-17-100/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Armor ADV', '110/90-17', '4.10-17', 'AADV-17-110/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Armor ADV', '120/80-17', '4.60-17', 'AADV-17-120/80', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Armor ADV', '130/80-17', '5.00-17', 'AADV-17-130/80', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Armor ADV', '140/70-17', '5.50-17', 'AADV-17-140/70', 'Motorcycle Tire', 'active', NOW(), NOW()),

-- Size 18
('Red Indian Customs', 'Armor ADV', '90/90-18', '3.50-18', 'AADV-18-90/90', 'Motorcycle Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'Armor ADV', '120/80-18', '4.60-18', 'AADV-18-120/80', 'Motorcycle Tire', 'active', NOW(), NOW()),

-- Size 19
('Red Indian Customs', 'Armor ADV', '90/90-19', '3.50-19', 'AADV-19-90/90', 'Motorcycle Tire', 'active', NOW(), NOW()),

-- Size 21
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
-- 7. ARMOR ST (13 products)
-- ============================================================================

INSERT INTO products (brand, model, dimensions, imperial_size, sku, category, status, created_at, updated_at)
VALUES
-- Size 12
('Red Indian Customs', 'ARMOR ST', '110/70-12', '4.10-12', 'AST-12-110/70', 'Scooter Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'ARMOR ST', '120/70-12', '4.60-12', 'AST-12-120/70', 'Scooter Tire', 'active', NOW(), NOW()),

-- Size 13
('Red Indian Customs', 'ARMOR ST', '110/70-13', '4.10-13', 'AST-13-110/70', 'Scooter Tire', 'active', NOW(), NOW()),
('Red Indian Customs', 'ARMOR ST', '130/70-13', '4.60-13', 'AST-13-130/70', 'Scooter Tire', 'active', NOW(), NOW()),

-- Size 14
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
-- 8. ARMOR ST-X (2 products)
-- ============================================================================

INSERT INTO products (brand, model, dimensions, imperial_size, sku, category, status, created_at, updated_at)
VALUES
-- Size 13
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

DO $$
DECLARE
  sawtooth_count INTEGER;
  enduro_count INTEGER;
  street_ds_count INTEGER;
  ds_xt_count INTEGER;
  armor_xt_count INTEGER;
  armor_adv_count INTEGER;
  armor_st_count INTEGER;
  armor_stx_count INTEGER;
  total_count INTEGER;
BEGIN
  -- Count products per brand
  SELECT COUNT(*) INTO sawtooth_count FROM products WHERE model = 'Classic Sawtooth';
  SELECT COUNT(*) INTO enduro_count FROM products WHERE model = 'Enduro Trail';
  SELECT COUNT(*) INTO street_ds_count FROM products WHERE model = 'Street Dual Sport';
  SELECT COUNT(*) INTO ds_xt_count FROM products WHERE model = 'Dual Sport XT';
  SELECT COUNT(*) INTO armor_xt_count FROM products WHERE model = 'Armor XT';
  SELECT COUNT(*) INTO armor_adv_count FROM products WHERE model = 'Armor ADV';
  SELECT COUNT(*) INTO armor_st_count FROM products WHERE model = 'ARMOR ST';
  SELECT COUNT(*) INTO armor_stx_count FROM products WHERE model = 'ARMOR ST-X';
  
  SELECT COUNT(*) INTO total_count FROM products WHERE brand = 'Red Indian Customs';
  
  -- Display results
  RAISE NOTICE '============================================';
  RAISE NOTICE 'PRODUCT COUNT VERIFICATION';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Classic Sawtooth:     % products', sawtooth_count;
  RAISE NOTICE 'Enduro Trail:         % products', enduro_count;
  RAISE NOTICE 'Street Dual Sport:    % products', street_ds_count;
  RAISE NOTICE 'Dual Sport XT:        % products', ds_xt_count;
  RAISE NOTICE 'Armor XT:             % products', armor_xt_count;
  RAISE NOTICE 'Armor ADV:            % products', armor_adv_count;
  RAISE NOTICE 'ARMOR ST:             % products', armor_st_count;
  RAISE NOTICE 'ARMOR ST-X:           % products', armor_stx_count;
  RAISE NOTICE '--------------------------------------------';
  RAISE NOTICE 'TOTAL:                % products', total_count;
  RAISE NOTICE '============================================';
  
  -- Verify expected counts
  IF sawtooth_count != 17 THEN
    RAISE WARNING 'Expected 17 Classic Sawtooth products, found %', sawtooth_count;
  END IF;
  
  IF enduro_count != 14 THEN
    RAISE WARNING 'Expected 14 Enduro Trail products, found %', enduro_count;
  END IF;
  
  IF street_ds_count != 11 THEN
    RAISE WARNING 'Expected 11 Street Dual Sport products, found %', street_ds_count;
  END IF;
  
  IF ds_xt_count != 10 THEN
    RAISE WARNING 'Expected 10 Dual Sport XT products, found %', ds_xt_count;
  END IF;
  
  IF armor_xt_count != 5 THEN
    RAISE WARNING 'Expected 5 Armor XT products, found %', armor_xt_count;
  END IF;
  
  IF armor_adv_count != 9 THEN
    RAISE WARNING 'Expected 9 Armor ADV products, found %', armor_adv_count;
  END IF;
  
  IF armor_st_count != 13 THEN
    RAISE WARNING 'Expected 13 ARMOR ST products, found %', armor_st_count;
  END IF;
  
  IF armor_stx_count != 2 THEN
    RAISE WARNING 'Expected 2 ARMOR ST-X products, found %', armor_stx_count;
  END IF;
  
  RAISE NOTICE '✅ Migration 030 completed successfully!';
END $$;

COMMIT;
