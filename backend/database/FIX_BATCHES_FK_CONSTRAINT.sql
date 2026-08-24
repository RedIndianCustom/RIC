-- ============================================================================
-- FIX BATCHES FOREIGN KEY - Change to CASCADE DELETE
-- ============================================================================
-- Problem: When deleting a shipment, batches.shipment_id tries to set to NULL
--          but the column is NOT NULL, causing error
-- Solution: Change foreign key to CASCADE DELETE (delete batches when shipment deleted)
-- ============================================================================

-- Step 1: Check current foreign key constraint
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.table_name = 'batches' 
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'shipment_id';

-- Step 2: Drop the existing foreign key constraint
ALTER TABLE batches 
DROP CONSTRAINT IF EXISTS batches_shipment_id_fkey;

-- Step 3: Add new constraint with CASCADE DELETE
ALTER TABLE batches
ADD CONSTRAINT batches_shipment_id_fkey
FOREIGN KEY (shipment_id) 
REFERENCES shipments(id) 
ON DELETE CASCADE;

-- Step 4: Verify the change
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.table_name = 'batches' 
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'shipment_id';

-- Expected result: delete_rule should be 'CASCADE'
