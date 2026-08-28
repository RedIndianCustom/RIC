-- =====================================================
-- Delete Warehouse 2 Reservations
-- Description: Clear all reserved positions in WH2
-- =====================================================

-- Show current WH2 reservations before deletion
SELECT 
  wsp.id,
  wsp.position_code,
  wsp.tire_size,
  wsp.reserved_quantity,
  wsp.reserved_for_shipment,
  wsp.reservation_date,
  rc.rack_code,
  w.code as warehouse_code
FROM warehouse_storage_positions wsp
JOIN warehouse_locations wl ON wsp.warehouse_location_id = wl.id
JOIN rack_configurations rc ON wl.id = rc.warehouse_id
JOIN warehouses w ON rc.warehouse_id = (
  SELECT id FROM warehouses WHERE code = 'WH2' LIMIT 1
)
WHERE wsp.status = 'reserved'
  AND rc.rack_code LIKE 'WH2-%'
ORDER BY wsp.reservation_date DESC;

-- Count before
SELECT COUNT(*) as wh2_reserved_count
FROM warehouse_storage_positions wsp
JOIN warehouse_locations wl ON wsp.warehouse_location_id = wl.id
JOIN rack_configurations rc ON wl.id = rc.warehouse_id
WHERE wsp.status = 'reserved'
  AND rc.rack_code LIKE 'WH2-%';

-- DELETE ALL WH2 RESERVATIONS
UPDATE warehouse_storage_positions wsp
SET 
  status = 'empty',
  current_stock = 0,
  tire_size = NULL,
  reserved_quantity = NULL,
  reserved_for_shipment = NULL,
  product_metadata = NULL,
  reservation_date = NULL,
  updated_at = NOW()
FROM warehouse_locations wl, rack_configurations rc
WHERE wsp.warehouse_location_id = wl.id
  AND wl.id = rc.warehouse_id
  AND rc.rack_code LIKE 'WH2-%'
  AND wsp.status = 'reserved';

-- Count after
SELECT COUNT(*) as wh2_reserved_count_after
FROM warehouse_storage_positions wsp
JOIN warehouse_locations wl ON wsp.warehouse_location_id = wl.id
JOIN rack_configurations rc ON wl.id = rc.warehouse_id
WHERE wsp.status = 'reserved'
  AND rc.rack_code LIKE 'WH2-%';

-- Show summary by rack
SELECT 
  rc.rack_code,
  wsp.status,
  COUNT(*) as position_count
FROM warehouse_storage_positions wsp
JOIN warehouse_locations wl ON wsp.warehouse_location_id = wl.id
JOIN rack_configurations rc ON wl.id = rc.warehouse_id
WHERE rc.rack_code LIKE 'WH2-%'
GROUP BY rc.rack_code, wsp.status
ORDER BY rc.rack_code, wsp.status;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ All WH2 reservations cleared!';
  RAISE NOTICE '📦 Warehouse 2 positions are now available';
END $$;
