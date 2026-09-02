-- Check if create_inventory_barcodes exists
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'create_inventory_barcodes';

-- If it exists, test it with dummy data
-- (This will fail with "does not exist" error, but that's expected)
