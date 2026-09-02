-- =====================================================
-- Clear Test Reservations
-- Description: Remove reserved status from positions
--              that don't have actual shipments
-- =====================================================

-- Show current reserved positions
SELECT 
  id,
  position_code,
  tire_size,
  reserved_quantity,
  reserved_for_shipment,
  reservation_date
FROM warehouse_storage_positions
WHERE status = 'reserved'
ORDER BY reservation_date DESC;

-- Clear reservations for "Pending Shipment" (test data)
UPDATE warehouse_storage_positions
SET 
  status = 'empty',
  current_stock = 0,
  tire_size = NULL,
  reserved_quantity = NULL,
  reserved_for_shipment = NULL,
  product_metadata = NULL,
  reservation_date = NULL,
  updated_at = NOW()
WHERE status = 'reserved' 
  AND (
    reserved_for_shipment = 'Pending Shipment' 
    OR reserved_for_shipment IS NULL
    OR reserved_for_shipment NOT IN (SELECT shipment_number FROM shipments)
  );

-- Show results
SELECT 
  status,
  COUNT(*) as count
FROM warehouse_storage_positions
GROUP BY status
ORDER BY status;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Test reservations cleared!';
  RAISE NOTICE '💡 Positions are now available for new assignments';
END $$;
