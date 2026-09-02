-- ============================================================================
-- QUICK FIX: Enable CASCADE DELETE for entire chain
-- ============================================================================
-- Run this in Supabase SQL Editor NOW to fix delete errors
-- ============================================================================

-- Fix inventory_units → batches (CASCADE DELETE)
ALTER TABLE inventory_units DROP CONSTRAINT IF EXISTS inventory_units_batch_id_fkey;
ALTER TABLE inventory_units ADD CONSTRAINT inventory_units_batch_id_fkey 
  FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE;

-- Fix batches → shipments (CASCADE DELETE)
ALTER TABLE batches DROP CONSTRAINT IF EXISTS batches_shipment_id_fkey;
ALTER TABLE batches ADD CONSTRAINT batches_shipment_id_fkey 
  FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE;

-- Fix inventory_units → products (SET NULL, don't delete products)
ALTER TABLE inventory_units DROP CONSTRAINT IF EXISTS inventory_units_product_id_fkey;
ALTER TABLE inventory_units ADD CONSTRAINT inventory_units_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

-- Verify (should show CASCADE for batch_id and shipment_id)
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS references_table,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc ON rc.constraint_name = tc.constraint_name
WHERE tc.table_name IN ('batches', 'inventory_units')
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;
