-- ============================================================================
-- FIX ALL CASCADE DELETES - Complete Chain Fix
-- ============================================================================
-- Problem: Cannot delete shipments/batches because of FK constraints
-- Solution: Set up proper CASCADE DELETE chain
-- ============================================================================

-- STEP 1: Fix inventory_units → batches (CASCADE DELETE)
-- ============================================================================
DO $$ 
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'inventory_units_batch_id_fkey' 
    AND table_name = 'inventory_units'
  ) THEN
    ALTER TABLE inventory_units DROP CONSTRAINT inventory_units_batch_id_fkey;
  END IF;

  -- Add new constraint with CASCADE DELETE
  ALTER TABLE inventory_units
  ADD CONSTRAINT inventory_units_batch_id_fkey
  FOREIGN KEY (batch_id) 
  REFERENCES batches(id) 
  ON DELETE CASCADE;
  
  RAISE NOTICE '✅ Fixed inventory_units → batches CASCADE DELETE';
END $$;

-- STEP 2: Fix batches → shipments (CASCADE DELETE)
-- ============================================================================
DO $$ 
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'batches_shipment_id_fkey' 
    AND table_name = 'batches'
  ) THEN
    ALTER TABLE batches DROP CONSTRAINT batches_shipment_id_fkey;
  END IF;

  -- Add new constraint with CASCADE DELETE
  ALTER TABLE batches
  ADD CONSTRAINT batches_shipment_id_fkey
  FOREIGN KEY (shipment_id) 
  REFERENCES shipments(id) 
  ON DELETE CASCADE;
  
  RAISE NOTICE '✅ Fixed batches → shipments CASCADE DELETE';
END $$;

-- STEP 3: Check for other inventory_units foreign keys that might cause issues
-- ============================================================================
DO $$ 
BEGIN
  -- Fix inventory_units → products if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'inventory_units_product_id_fkey' 
    AND table_name = 'inventory_units'
  ) THEN
    ALTER TABLE inventory_units DROP CONSTRAINT inventory_units_product_id_fkey;
    ALTER TABLE inventory_units
    ADD CONSTRAINT inventory_units_product_id_fkey
    FOREIGN KEY (product_id) 
    REFERENCES products(id) 
    ON DELETE SET NULL;  -- Don't cascade delete products
    RAISE NOTICE '✅ Fixed inventory_units → products (SET NULL)';
  END IF;

  -- Fix inventory_units → warehouse_locations if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'inventory_units_location_id_fkey' 
    AND table_name = 'inventory_units'
  ) THEN
    ALTER TABLE inventory_units DROP CONSTRAINT inventory_units_location_id_fkey;
    ALTER TABLE inventory_units
    ADD CONSTRAINT inventory_units_location_id_fkey
    FOREIGN KEY (location_id) 
    REFERENCES warehouse_locations(id) 
    ON DELETE SET NULL;  -- Don't cascade delete locations
    RAISE NOTICE '✅ Fixed inventory_units → warehouse_locations (SET NULL)';
  END IF;
END $$;

-- STEP 4: Verify all changes
-- ============================================================================
SELECT 
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.table_name IN ('batches', 'inventory_units')
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, kcu.column_name;

-- Expected results:
-- batches.shipment_id → shipments: CASCADE
-- inventory_units.batch_id → batches: CASCADE
-- inventory_units.product_id → products: SET NULL (or CASCADE, depending on needs)
-- inventory_units.location_id → warehouse_locations: SET NULL

RAISE NOTICE '
============================================================================
✅ ALL CASCADE DELETE FIXES APPLIED
============================================================================
Now you can:
1. Delete shipments → automatically deletes batches → automatically deletes inventory_units
2. Delete batches → automatically deletes inventory_units
3. Delete products → sets inventory_units.product_id to NULL (keeps history)
4. Delete locations → sets inventory_units.location_id to NULL (keeps history)
============================================================================
';
