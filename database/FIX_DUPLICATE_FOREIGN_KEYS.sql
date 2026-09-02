-- ============================================================================
-- FIX DUPLICATE FOREIGN KEY CONSTRAINTS
-- ============================================================================
-- There are duplicate foreign keys causing PostgREST ambiguity errors
-- We'll keep the standard naming and drop custom ones
-- ============================================================================

-- Check existing constraints
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  conrelid::regclass as table_name
FROM pg_constraint 
WHERE conrelid = 'barcodes'::regclass
AND contype = 'f'  -- foreign keys only
ORDER BY conname;

-- Drop duplicate foreign key constraints (keep standard ones)
ALTER TABLE barcodes DROP CONSTRAINT IF EXISTS fk_barcodes_batch CASCADE;
ALTER TABLE barcodes DROP CONSTRAINT IF EXISTS fk_barcodes_product CASCADE;
ALTER TABLE barcodes DROP CONSTRAINT IF EXISTS fk_barcodes_inventory_unit CASCADE;

-- Ensure standard foreign keys exist
DO $$
BEGIN
  -- batch_id foreign key
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'barcodes_batch_id_fkey'
  ) THEN
    ALTER TABLE barcodes 
    ADD CONSTRAINT barcodes_batch_id_fkey 
    FOREIGN KEY (batch_id) REFERENCES batches(id);
  END IF;

  -- product_id foreign key
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'barcodes_product_id_fkey'
  ) THEN
    ALTER TABLE barcodes 
    ADD CONSTRAINT barcodes_product_id_fkey 
    FOREIGN KEY (product_id) REFERENCES products(id);
  END IF;

  -- inventory_unit_id foreign key
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'barcodes_inventory_unit_id_fkey'
  ) THEN
    ALTER TABLE barcodes 
    ADD CONSTRAINT barcodes_inventory_unit_id_fkey 
    FOREIGN KEY (inventory_unit_id) REFERENCES inventory_units(id);
  END IF;
END $$;

-- Verify final state
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  conrelid::regclass as table_name
FROM pg_constraint 
WHERE conrelid = 'barcodes'::regclass
AND contype = 'f'
ORDER BY conname;

-- Refresh schema
NOTIFY pgrst, 'reload schema';

SELECT '✅ Duplicate foreign keys removed. Only standard constraints remain.' as status;
