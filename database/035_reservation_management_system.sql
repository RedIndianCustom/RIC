-- =====================================================
-- RESERVATION MANAGEMENT SYSTEM
-- Description: Easy-to-use views and functions for 
--              managing warehouse position reservations
-- =====================================================

-- =====================================================
-- VIEW 1: All Reservations Summary
-- =====================================================
CREATE OR REPLACE VIEW v_all_reservations AS
SELECT 
  wsp.id as position_id,
  rc.rack_code,
  wsp.position_code,
  wsp.tire_size as product_name,
  wsp.reserved_quantity,
  wsp.reserved_for_shipment as shipment_number,
  wsp.reservation_date,
  wsp.product_metadata,
  -- Add shipment status if exists
  s.status as shipment_status,
  s.expected_arrival_date,
  -- Calculate days reserved
  EXTRACT(DAY FROM (NOW() - wsp.reservation_date)) as days_reserved,
  -- Extract warehouse code from rack_code (e.g., WH1-RACK-1 -> WH1)
  SPLIT_PART(rc.rack_code, '-', 1) as warehouse_code
FROM warehouse_storage_positions wsp
JOIN warehouse_locations wl ON wsp.warehouse_location_id = wl.id
JOIN rack_configurations rc ON wl.id = rc.warehouse_id
LEFT JOIN shipments s ON wsp.reserved_for_shipment = s.shipment_number
WHERE wsp.status = 'reserved'
ORDER BY wsp.reservation_date DESC;

COMMENT ON VIEW v_all_reservations IS 'Shows all currently reserved warehouse positions with shipment details';

-- =====================================================
-- VIEW 2: Reservations by Warehouse
-- =====================================================
CREATE OR REPLACE VIEW v_reservations_by_warehouse AS
SELECT 
  SPLIT_PART(rc.rack_code, '-', 1) as warehouse_code,
  COUNT(*) as reserved_positions,
  SUM(wsp.reserved_quantity) as total_tires_reserved,
  MIN(wsp.reservation_date) as oldest_reservation,
  MAX(wsp.reservation_date) as newest_reservation
FROM warehouse_storage_positions wsp
JOIN warehouse_locations wl ON wsp.warehouse_location_id = wl.id
JOIN rack_configurations rc ON wl.id = rc.warehouse_id
WHERE wsp.status = 'reserved'
GROUP BY SPLIT_PART(rc.rack_code, '-', 1)
ORDER BY warehouse_code;

COMMENT ON VIEW v_reservations_by_warehouse IS 'Summary of reservations grouped by warehouse';

-- =====================================================
-- VIEW 3: Orphaned Reservations (No Valid Shipment)
-- =====================================================
CREATE OR REPLACE VIEW v_orphaned_reservations AS
SELECT 
  wsp.id as position_id,
  SPLIT_PART(rc.rack_code, '-', 1) as warehouse_code,
  rc.rack_code,
  wsp.position_code,
  wsp.tire_size,
  wsp.reserved_quantity,
  wsp.reserved_for_shipment,
  wsp.reservation_date,
  EXTRACT(DAY FROM (NOW() - wsp.reservation_date)) as days_orphaned,
  CASE 
    WHEN wsp.reserved_for_shipment = 'Pending Shipment' THEN 'Test Reservation'
    WHEN wsp.reserved_for_shipment IS NULL THEN 'Missing Shipment Number'
    ELSE 'Shipment Deleted'
  END as orphan_reason
FROM warehouse_storage_positions wsp
JOIN warehouse_locations wl ON wsp.warehouse_location_id = wl.id
JOIN rack_configurations rc ON wl.id = rc.warehouse_id
WHERE wsp.status = 'reserved'
  AND (
    wsp.reserved_for_shipment = 'Pending Shipment'
    OR wsp.reserved_for_shipment IS NULL
    OR wsp.reserved_for_shipment NOT IN (SELECT shipment_number FROM shipments)
  )
ORDER BY wsp.reservation_date;

COMMENT ON VIEW v_orphaned_reservations IS 'Shows reservations without valid shipments (safe to delete)';

-- =====================================================
-- FUNCTION 1: Clear All Orphaned Reservations
-- =====================================================
CREATE OR REPLACE FUNCTION clear_orphaned_reservations()
RETURNS TABLE(
  cleared_count INTEGER,
  message TEXT
) AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Clear orphaned reservations
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
  WHERE wsp.status = 'reserved'
    AND (
      wsp.reserved_for_shipment = 'Pending Shipment'
      OR wsp.reserved_for_shipment IS NULL
      OR wsp.reserved_for_shipment NOT IN (SELECT shipment_number FROM shipments)
    );
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN QUERY SELECT 
    v_count,
    '✅ Cleared ' || v_count || ' orphaned reservations';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION clear_orphaned_reservations() IS 'Clears all reservations without valid shipments';

-- =====================================================
-- FUNCTION 2: Clear Reservations by Warehouse
-- =====================================================
CREATE OR REPLACE FUNCTION clear_warehouse_reservations(p_warehouse_code VARCHAR)
RETURNS TABLE(
  cleared_count INTEGER,
  message TEXT
) AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Clear all reservations in specified warehouse (using rack_code pattern)
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
    AND rc.rack_code LIKE (p_warehouse_code || '-%')
    AND wsp.status = 'reserved';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN QUERY SELECT 
    v_count,
    '✅ Cleared ' || v_count || ' reservations from ' || p_warehouse_code;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION clear_warehouse_reservations(VARCHAR) IS 'Clears all reservations in a specific warehouse';

-- =====================================================
-- FUNCTION 3: Clear Reservations by Shipment Number
-- =====================================================
CREATE OR REPLACE FUNCTION clear_shipment_reservations(p_shipment_number VARCHAR)
RETURNS TABLE(
  cleared_count INTEGER,
  message TEXT
) AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Clear reservations for specific shipment
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
    AND reserved_for_shipment = p_shipment_number;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN QUERY SELECT 
    v_count,
    '✅ Cleared ' || v_count || ' reservations for shipment ' || p_shipment_number;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION clear_shipment_reservations(VARCHAR) IS 'Clears all reservations for a specific shipment';

-- =====================================================
-- FUNCTION 4: Clear Single Position Reservation
-- =====================================================
CREATE OR REPLACE FUNCTION clear_position_reservation(p_position_id UUID)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_position_code VARCHAR;
BEGIN
  -- Get position code for message
  SELECT position_code INTO v_position_code
  FROM warehouse_storage_positions
  WHERE id = p_position_id;
  
  IF v_position_code IS NULL THEN
    RETURN QUERY SELECT FALSE, '❌ Position not found';
    RETURN;
  END IF;
  
  -- Clear the reservation
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
  WHERE id = p_position_id
    AND status = 'reserved';
  
  IF FOUND THEN
    RETURN QUERY SELECT TRUE, '✅ Cleared reservation for ' || v_position_code;
  ELSE
    RETURN QUERY SELECT FALSE, '⚠️ Position ' || v_position_code || ' is not reserved';
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION clear_position_reservation(UUID) IS 'Clears reservation for a single position';

-- =====================================================
-- USAGE EXAMPLES & QUICK REFERENCE
-- =====================================================

-- 📊 VIEW ALL RESERVATIONS
-- SELECT * FROM v_all_reservations;

-- 📊 VIEW RESERVATIONS BY WAREHOUSE
-- SELECT * FROM v_reservations_by_warehouse;

-- 📊 VIEW ORPHANED RESERVATIONS (safe to delete)
-- SELECT * FROM v_orphaned_reservations;

-- 🗑️ CLEAR ALL ORPHANED RESERVATIONS
-- SELECT * FROM clear_orphaned_reservations();

-- 🗑️ CLEAR ALL RESERVATIONS IN WH2
-- SELECT * FROM clear_warehouse_reservations('WH2');

-- 🗑️ CLEAR ALL RESERVATIONS IN WH1
-- SELECT * FROM clear_warehouse_reservations('WH1');

-- 🗑️ CLEAR RESERVATIONS FOR SPECIFIC SHIPMENT
-- SELECT * FROM clear_shipment_reservations('SHIP-2026-001');

-- 🗑️ CLEAR SINGLE POSITION
-- SELECT * FROM clear_position_reservation('position-uuid-here');

-- =====================================================
-- CREATE HELPER TABLE FOR RESERVATION HISTORY (OPTIONAL)
-- =====================================================
CREATE TABLE IF NOT EXISTS reservation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID NOT NULL,
  position_code VARCHAR(100),
  warehouse_code VARCHAR(50),
  action VARCHAR(20) NOT NULL, -- 'created', 'cleared', 'converted'
  reserved_for_shipment VARCHAR(255),
  tire_size VARCHAR(255),
  reserved_quantity INTEGER,
  action_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  action_by UUID, -- user who performed the action
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_reservation_history_position 
ON reservation_history(position_id);

CREATE INDEX IF NOT EXISTS idx_reservation_history_shipment 
ON reservation_history(reserved_for_shipment);

CREATE INDEX IF NOT EXISTS idx_reservation_history_date 
ON reservation_history(action_date DESC);

COMMENT ON TABLE reservation_history IS 'Tracks all reservation actions for audit trail';

-- =====================================================
-- VERIFICATION & SUMMARY
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Reservation Management System Created!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Available Views:';
  RAISE NOTICE '   - v_all_reservations';
  RAISE NOTICE '   - v_reservations_by_warehouse';
  RAISE NOTICE '   - v_orphaned_reservations';
  RAISE NOTICE '';
  RAISE NOTICE '🛠️ Available Functions:';
  RAISE NOTICE '   - clear_orphaned_reservations()';
  RAISE NOTICE '   - clear_warehouse_reservations(warehouse_code)';
  RAISE NOTICE '   - clear_shipment_reservations(shipment_number)';
  RAISE NOTICE '   - clear_position_reservation(position_id)';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Quick Examples:';
  RAISE NOTICE '   SELECT * FROM v_all_reservations;';
  RAISE NOTICE '   SELECT * FROM clear_warehouse_reservations(''WH2'');';
  RAISE NOTICE '   SELECT * FROM clear_orphaned_reservations();';
END $$;
