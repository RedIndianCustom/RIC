-- ============================================================================
-- FIX: Ensure Main Warehouse exists in database
-- ============================================================================

-- Check if warehouse exists
SELECT id, name, code FROM warehouses WHERE id = 'b1eff6be-b968-4861-94c2-f220e4eeffed';

-- If not exists, create it
INSERT INTO warehouses (id, name, code, location, status)
VALUES (
  'b1eff6be-b968-4861-94c2-f220e4eeffed',
  'Main Warehouse',
  'WH1',
  'Main Building',
  'active'
)
ON CONFLICT (id) DO UPDATE SET
  name = 'Main Warehouse',
  code = 'WH1',
  status = 'active';

-- Verify it exists now
SELECT id, name, code, location, status FROM warehouses WHERE id = 'b1eff6be-b968-4861-94c2-f220e4eeffed';

SELECT '✅ Main Warehouse exists and ready for barcode assignments' as status;
