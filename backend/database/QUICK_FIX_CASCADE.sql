-- ============================================================================
-- QUICK FIX: Enable CASCADE DELETE for batches → shipments
-- ============================================================================
-- Run this in Supabase SQL Editor to fix the delete error
-- ============================================================================

-- Drop and recreate the constraint with CASCADE DELETE
ALTER TABLE batches DROP CONSTRAINT IF EXISTS batches_shipment_id_fkey;
ALTER TABLE batches ADD CONSTRAINT batches_shipment_id_fkey 
  FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE;

-- Verify it worked (should return 'CASCADE')
SELECT 
  tc.constraint_name,
  rc.delete_rule as "Delete Rule (should be CASCADE)"
FROM information_schema.table_constraints AS tc
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.table_name = 'batches' 
  AND tc.constraint_type = 'FOREIGN KEY';
