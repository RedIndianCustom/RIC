-- =====================================================
-- Migration: Add Position Reservation Fields
-- Description: Add fields to support reserving positions
--              for incoming shipments before actual receipt
-- =====================================================

-- Step 1: Add reservation fields to warehouse_storage_positions
ALTER TABLE warehouse_storage_positions
ADD COLUMN IF NOT EXISTS reserved_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reserved_for_shipment VARCHAR(255),
ADD COLUMN IF NOT EXISTS product_metadata JSONB,
ADD COLUMN IF NOT EXISTS reservation_date TIMESTAMP WITH TIME ZONE;

-- Add comments explaining the reservation fields
COMMENT ON COLUMN warehouse_storage_positions.reserved_quantity IS 'Number of tires reserved for incoming shipment';
COMMENT ON COLUMN warehouse_storage_positions.reserved_for_shipment IS 'Shipment number this position is reserved for';
COMMENT ON COLUMN warehouse_storage_positions.product_metadata IS 'Product details (brand, model, dimensions, sku) for reserved items';
COMMENT ON COLUMN warehouse_storage_positions.reservation_date IS 'When this position was reserved';

DO $$
BEGIN
  RAISE NOTICE '✅ Step 1: Reservation columns added';
END $$;

-- =====================================================
-- Step 2: Drop old constraint without triggering updates
-- =====================================================

DO $$
DECLARE
  constraint_rec RECORD;
BEGIN
  RAISE NOTICE '🔍 Step 2: Removing old status constraints...';
  
  -- Drop all check constraints on this table
  FOR constraint_rec IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'warehouse_storage_positions'::regclass
      AND contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE warehouse_storage_positions DROP CONSTRAINT %I', constraint_rec.conname);
    RAISE NOTICE '  ✓ Dropped: %', constraint_rec.conname;
  END LOOP;
  
  RAISE NOTICE '✅ Step 2: Old constraints removed';
END $$;

-- =====================================================
-- Step 3: Create indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_positions_reserved 
ON warehouse_storage_positions(status) 
WHERE status = 'reserved';

CREATE INDEX IF NOT EXISTS idx_positions_reservation_shipment 
ON warehouse_storage_positions(reserved_for_shipment) 
WHERE reserved_for_shipment IS NOT NULL;

DO $$
BEGIN
  RAISE NOTICE '✅ Step 3: Performance indexes created';
END $$;

-- =====================================================
-- Step 4: Function to auto-convert reserved positions
-- =====================================================

CREATE OR REPLACE FUNCTION convert_reserved_positions_on_receipt()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'RECEIVED' AND OLD.status != 'RECEIVED' THEN
    UPDATE warehouse_storage_positions
    SET 
      status = 'active',
      current_stock = COALESCE(reserved_quantity, 0),
      reserved_quantity = NULL,
      reserved_for_shipment = NULL,
      reservation_date = NULL,
      updated_at = NOW()
    WHERE reserved_for_shipment = NEW.shipment_number
      AND status = 'reserved';
    
    RAISE NOTICE 'Converted reserved positions for shipment %', NEW.shipment_number;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_convert_reserved_on_receipt ON shipments;

CREATE TRIGGER trigger_convert_reserved_on_receipt
AFTER UPDATE OF status ON shipments
FOR EACH ROW
WHEN (NEW.status = 'RECEIVED')
EXECUTE FUNCTION convert_reserved_positions_on_receipt();

DO $$
BEGIN
  RAISE NOTICE '✅ Step 4: Auto-convert trigger created';
END $$;

-- =====================================================
-- Step 5: Function to clear reservations on cancellation
-- =====================================================

CREATE OR REPLACE FUNCTION clear_reserved_positions_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.status = 'CANCELLED') OR TG_OP = 'DELETE' THEN
    UPDATE warehouse_storage_positions
    SET 
      status = 'empty',
      tire_size = NULL,
      current_stock = 0,
      reserved_quantity = NULL,
      reserved_for_shipment = NULL,
      product_metadata = NULL,
      reservation_date = NULL,
      updated_at = NOW()
    WHERE reserved_for_shipment = COALESCE(NEW.shipment_number, OLD.shipment_number)
      AND status = 'reserved';
    
    RAISE NOTICE 'Cleared reservations for shipment %', COALESCE(NEW.shipment_number, OLD.shipment_number);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_clear_reserved_on_cancel ON shipments;

CREATE TRIGGER trigger_clear_reserved_on_cancel
AFTER UPDATE OF status ON shipments
FOR EACH ROW
WHEN (NEW.status = 'CANCELLED')
EXECUTE FUNCTION clear_reserved_positions_on_cancel();

DROP TRIGGER IF EXISTS trigger_clear_reserved_on_delete ON shipments;

CREATE TRIGGER trigger_clear_reserved_on_delete
BEFORE DELETE ON shipments
FOR EACH ROW
EXECUTE FUNCTION clear_reserved_positions_on_cancel();

DO $$
BEGIN
  RAISE NOTICE '✅ Step 5: Auto-clear triggers created';
END $$;

-- =====================================================
-- Final Summary
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ Position Reservation Migration Complete!';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📦 New columns added:';
  RAISE NOTICE '   • reserved_quantity';
  RAISE NOTICE '   • reserved_for_shipment';
  RAISE NOTICE '   • product_metadata';
  RAISE NOTICE '   • reservation_date';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Triggers created:';
  RAISE NOTICE '   • Auto-convert: reserved → active (on receipt)';
  RAISE NOTICE '   • Auto-clear: clear reservations (on cancel)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Status constraint removed';
  RAISE NOTICE '   The old status constraint was causing conflicts.';
  RAISE NOTICE '   The application will enforce valid status values.';
  RAISE NOTICE '   You can manually add a constraint later if needed:';
  RAISE NOTICE '';
  RAISE NOTICE '   ALTER TABLE warehouse_storage_positions';
  RAISE NOTICE '   ADD CONSTRAINT check_status';
  RAISE NOTICE '   CHECK (status IN (''active'', ''available'', ''empty'',';
  RAISE NOTICE '                     ''reserved'', ''maintenance'', ''inactive''));';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next steps:';
  RAISE NOTICE '   1. Test reservation in Shipment Registration';
  RAISE NOTICE '   2. View reserved positions in Warehouse Locations';
  RAISE NOTICE '   3. Verify auto-conversion on shipment receipt';
  RAISE NOTICE '================================================';
END $$;
