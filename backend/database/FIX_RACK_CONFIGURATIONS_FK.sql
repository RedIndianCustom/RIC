-- ============================================================================
-- FIX RACK_CONFIGURATIONS FOREIGN KEY
-- ============================================================================
-- Problem: rack_configurations.warehouse_id references warehouse_locations(id)
-- Solution: Change it to reference warehouses(id)
-- ============================================================================

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE rack_configurations 
DROP CONSTRAINT IF EXISTS rack_configurations_warehouse_id_fkey;

-- Step 2: Add new constraint pointing to warehouses table
ALTER TABLE rack_configurations
ADD CONSTRAINT rack_configurations_warehouse_id_fkey
FOREIGN KEY (warehouse_id) 
REFERENCES warehouses(id) 
ON DELETE CASCADE;

-- Step 3: Verify the change
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
WHERE tc.table_name = 'rack_configurations' 
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'warehouse_id';
