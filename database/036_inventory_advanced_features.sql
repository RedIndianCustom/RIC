-- ============================================================================
-- INVENTORY ADVANCED FEATURES
-- ============================================================================
-- Low Stock Alerts, Stock Movement History, Bulk Operations Tracking
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────
-- 1. LOW STOCK ALERT CONFIGURATION
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS low_stock_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
  
  -- Threshold Configuration
  min_quantity INTEGER NOT NULL DEFAULT 10,
  reorder_quantity INTEGER NOT NULL DEFAULT 50,
  critical_quantity INTEGER NOT NULL DEFAULT 5,
  
  -- Alert Settings
  alert_enabled BOOLEAN DEFAULT true,
  alert_recipients TEXT[] DEFAULT '{}', -- Email addresses
  last_alert_sent_at TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'paused')),
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unique constraint: one threshold per product per warehouse
  UNIQUE(product_id, warehouse_id)
);

CREATE INDEX idx_low_stock_thresholds_product ON low_stock_thresholds(product_id);
CREATE INDEX idx_low_stock_thresholds_warehouse ON low_stock_thresholds(warehouse_id);
CREATE INDEX idx_low_stock_thresholds_status ON low_stock_thresholds(status);

COMMENT ON TABLE low_stock_thresholds IS 'Configurable low stock alert thresholds per product and warehouse';

-- ──────────────────────────────────────────────────────────────────────────
-- 2. STOCK MOVEMENT HISTORY
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Inventory Reference
  inventory_unit_id UUID REFERENCES inventory_units(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  batch_id UUID REFERENCES batches(id),
  
  -- Movement Type
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'RECEIVING',        -- Initial receipt from shipment
    'TRANSFER',         -- Warehouse to warehouse
    'RELOCATION',       -- Within warehouse (rack change)
    'SALE',            -- Sold to customer
    'RETURN',          -- Customer return
    'ADJUSTMENT',      -- Manual adjustment
    'DAMAGE',          -- Marked as damaged
    'INSPECTION',      -- Moved to inspection
    'DISPOSAL'         -- Disposed/scrapped
  )),
  
  -- Location Change
  from_warehouse_id UUID REFERENCES warehouses(id),
  to_warehouse_id UUID REFERENCES warehouses(id),
  from_rack TEXT,
  to_rack TEXT,
  from_position TEXT,
  to_position TEXT,
  
  -- Status Change
  from_status TEXT,
  to_status TEXT,
  
  -- Quantity (for bulk movements)
  quantity INTEGER DEFAULT 1,
  
  -- Movement Details
  reason TEXT,
  notes TEXT,
  reference_number TEXT, -- Shipment, order, or transfer number
  
  -- Execution
  executed_by UUID REFERENCES auth.users(id),
  executed_at TIMESTAMPTZ DEFAULT now(),
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_stock_movements_inventory_unit ON stock_movements(inventory_unit_id);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX idx_stock_movements_executed_at ON stock_movements(executed_at DESC);
CREATE INDEX idx_stock_movements_from_warehouse ON stock_movements(from_warehouse_id);
CREATE INDEX idx_stock_movements_to_warehouse ON stock_movements(to_warehouse_id);

COMMENT ON TABLE stock_movements IS 'Complete history of all inventory movements and status changes';

-- ──────────────────────────────────────────────────────────────────────────
-- 3. BULK OPERATIONS LOG
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bulk_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Operation Details
  operation_type TEXT NOT NULL CHECK (operation_type IN (
    'STATUS_UPDATE',    -- Bulk status change
    'LOCATION_CHANGE',  -- Bulk relocation
    'EXPORT',          -- Data export
    'IMPORT',          -- Bulk import
    'DELETE'           -- Bulk delete (soft)
  )),
  
  -- Affected Items
  affected_count INTEGER NOT NULL DEFAULT 0,
  inventory_unit_ids UUID[] DEFAULT '{}',
  
  -- Operation Parameters
  parameters JSONB DEFAULT '{}', -- Stores filter criteria and changes
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial')),
  
  -- Results
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  error_details JSONB DEFAULT '{}',
  
  -- Execution
  started_by UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bulk_operations_type ON bulk_operations(operation_type);
CREATE INDEX idx_bulk_operations_status ON bulk_operations(status);
CREATE INDEX idx_bulk_operations_started_at ON bulk_operations(started_at DESC);

COMMENT ON TABLE bulk_operations IS 'Log of all bulk operations performed on inventory';

-- ──────────────────────────────────────────────────────────────────────────
-- 4. INVENTORY ANALYTICS CACHE
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Time Period
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Warehouse (NULL for global)
  warehouse_id UUID REFERENCES warehouses(id),
  
  -- Metrics
  total_units INTEGER DEFAULT 0,
  available_units INTEGER DEFAULT 0,
  sold_units INTEGER DEFAULT 0,
  returned_units INTEGER DEFAULT 0,
  damaged_units INTEGER DEFAULT 0,
  
  -- Movement Metrics
  total_movements INTEGER DEFAULT 0,
  incoming_movements INTEGER DEFAULT 0,
  outgoing_movements INTEGER DEFAULT 0,
  
  -- Turnover
  turnover_rate DECIMAL(10, 2),
  avg_stock_level INTEGER,
  
  -- Value (if cost data available)
  total_value DECIMAL(15, 2),
  
  -- Computed At
  computed_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unique constraint
  UNIQUE(period_type, period_start, warehouse_id)
);

CREATE INDEX idx_inventory_analytics_period ON inventory_analytics(period_type, period_start);
CREATE INDEX idx_inventory_analytics_warehouse ON inventory_analytics(warehouse_id);

COMMENT ON TABLE inventory_analytics IS 'Pre-computed analytics for fast dashboard loading';

-- ──────────────────────────────────────────────────────────────────────────
-- 5. TRIGGERS FOR AUTOMATIC MOVEMENT TRACKING
-- ──────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION track_inventory_movement()
RETURNS TRIGGER AS $$
BEGIN
  -- Track significant changes to inventory units
  IF (TG_OP = 'UPDATE') THEN
    -- Status change
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
      INSERT INTO stock_movements (
        inventory_unit_id,
        product_id,
        batch_id,
        movement_type,
        from_warehouse_id,
        to_warehouse_id,
        from_rack,
        to_rack,
        from_position,
        to_position,
        from_status,
        to_status,
        reason,
        executed_at
      ) VALUES (
        NEW.id,
        NEW.product_id,
        NEW.batch_id,
        CASE NEW.status
          WHEN 'SOLD' THEN 'SALE'
          WHEN 'RETURNED' THEN 'RETURN'
          WHEN 'DAMAGED' THEN 'DAMAGE'
          WHEN 'INSPECTION' THEN 'INSPECTION'
          ELSE 'ADJUSTMENT'
        END,
        OLD.warehouse_id,
        NEW.warehouse_id,
        OLD.rack,
        NEW.rack,
        OLD.position_code,
        NEW.position_code,
        OLD.status,
        NEW.status,
        'Status updated',
        now()
      );
    END IF;
    
    -- Location change
    IF (OLD.warehouse_id IS DISTINCT FROM NEW.warehouse_id) OR 
       (OLD.rack IS DISTINCT FROM NEW.rack) OR
       (OLD.position_code IS DISTINCT FROM NEW.position_code) THEN
      INSERT INTO stock_movements (
        inventory_unit_id,
        product_id,
        batch_id,
        movement_type,
        from_warehouse_id,
        to_warehouse_id,
        from_rack,
        to_rack,
        from_position,
        to_position,
        from_status,
        to_status,
        reason,
        executed_at
      ) VALUES (
        NEW.id,
        NEW.product_id,
        NEW.batch_id,
        CASE 
          WHEN OLD.warehouse_id IS DISTINCT FROM NEW.warehouse_id THEN 'TRANSFER'
          ELSE 'RELOCATION'
        END,
        OLD.warehouse_id,
        NEW.warehouse_id,
        OLD.rack,
        NEW.rack,
        OLD.position_code,
        NEW.position_code,
        OLD.status,
        NEW.status,
        'Location updated',
        now()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS inventory_movement_tracker ON inventory_units;

CREATE TRIGGER inventory_movement_tracker
  AFTER UPDATE ON inventory_units
  FOR EACH ROW
  EXECUTE FUNCTION track_inventory_movement();

COMMENT ON FUNCTION track_inventory_movement() IS 'Automatically logs inventory movements to stock_movements table';

-- ──────────────────────────────────────────────────────────────────────────
-- 6. FUNCTION: CHECK LOW STOCK ALERTS
-- ──────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION check_low_stock_alerts()
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  warehouse_id UUID,
  warehouse_name TEXT,
  current_stock BIGINT,
  threshold_quantity INTEGER,
  alert_level TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS product_id,
    (p.brand || ' ' || p.model) AS product_name,
    w.id AS warehouse_id,
    w.name AS warehouse_name,
    COUNT(iu.id) AS current_stock,
    lst.min_quantity AS threshold_quantity,
    CASE 
      WHEN COUNT(iu.id) <= lst.critical_quantity THEN 'CRITICAL'
      WHEN COUNT(iu.id) <= lst.min_quantity THEN 'LOW'
      ELSE 'NORMAL'
    END AS alert_level
  FROM low_stock_thresholds lst
  JOIN products p ON p.id = lst.product_id
  LEFT JOIN warehouses w ON w.id = lst.warehouse_id
  LEFT JOIN inventory_units iu ON iu.product_id = p.id 
    AND (lst.warehouse_id IS NULL OR iu.warehouse_id = lst.warehouse_id)
    AND iu.status IN ('NEW', 'AVAILABLE')
  WHERE lst.status = 'active'
    AND lst.alert_enabled = true
  GROUP BY p.id, p.brand, p.model, w.id, w.name, lst.min_quantity, lst.critical_quantity
  HAVING COUNT(iu.id) <= lst.min_quantity
  ORDER BY 
    CASE 
      WHEN COUNT(iu.id) <= lst.critical_quantity THEN 1
      WHEN COUNT(iu.id) <= lst.min_quantity THEN 2
      ELSE 3
    END,
    COUNT(iu.id) ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_low_stock_alerts() IS 'Returns products with stock below configured thresholds';

-- ──────────────────────────────────────────────────────────────────────────
-- 7. FUNCTION: GET STOCK MOVEMENT HISTORY
-- ──────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_stock_movement_history(
  p_product_id UUID DEFAULT NULL,
  p_warehouse_id UUID DEFAULT NULL,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  movement_id UUID,
  movement_type TEXT,
  movement_date TIMESTAMPTZ,
  product_name TEXT,
  from_location TEXT,
  to_location TEXT,
  quantity INTEGER,
  executed_by_name TEXT,
  reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sm.id AS movement_id,
    sm.movement_type,
    sm.executed_at AS movement_date,
    (p.brand || ' ' || p.model) AS product_name,
    COALESCE(wf.name || ' - ' || sm.from_rack, 'N/A') AS from_location,
    COALESCE(wt.name || ' - ' || sm.to_rack, 'N/A') AS to_location,
    sm.quantity,
    COALESCE(u.raw_user_meta_data->>'full_name', u.email, 'System') AS executed_by_name,
    sm.reason
  FROM stock_movements sm
  LEFT JOIN products p ON p.id = sm.product_id
  LEFT JOIN warehouses wf ON wf.id = sm.from_warehouse_id
  LEFT JOIN warehouses wt ON wt.id = sm.to_warehouse_id
  LEFT JOIN auth.users u ON u.id = sm.executed_by
  WHERE 
    (p_product_id IS NULL OR sm.product_id = p_product_id)
    AND (p_warehouse_id IS NULL OR sm.from_warehouse_id = p_warehouse_id OR sm.to_warehouse_id = p_warehouse_id)
    AND sm.executed_at >= (now() - (p_days || ' days')::INTERVAL)
  ORDER BY sm.executed_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_stock_movement_history IS 'Returns filtered stock movement history';

-- ──────────────────────────────────────────────────────────────────────────
-- 8. RLS POLICIES
-- ──────────────────────────────────────────────────────────────────────────

ALTER TABLE low_stock_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_analytics ENABLE ROW LEVEL SECURITY;

-- Low Stock Thresholds: Admin and Manager can manage, others can view
CREATE POLICY "Users can view low stock thresholds"
  ON low_stock_thresholds FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and Manager can manage low stock thresholds"
  ON low_stock_thresholds FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'manager')
    )
  );

-- Stock Movements: All authenticated users can view
CREATE POLICY "Users can view stock movements"
  ON stock_movements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert stock movements"
  ON stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Bulk Operations: All can view their own, admin can view all
CREATE POLICY "Users can view their bulk operations"
  ON bulk_operations FOR SELECT
  TO authenticated
  USING (
    started_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

-- Inventory Analytics: All authenticated users can view
CREATE POLICY "Users can view inventory analytics"
  ON inventory_analytics FOR SELECT
  TO authenticated
  USING (true);

-- ──────────────────────────────────────────────────────────────────────────
-- 9. SAMPLE DATA (OPTIONAL)
-- ──────────────────────────────────────────────────────────────────────────

-- Create some sample low stock thresholds
-- INSERT INTO low_stock_thresholds (product_id, warehouse_id, min_quantity, reorder_quantity, critical_quantity)
-- SELECT 
--   p.id,
--   w.id,
--   10,
--   50,
--   5
-- FROM products p
-- CROSS JOIN warehouses w
-- LIMIT 10;

-- ──────────────────────────────────────────────────────────────────────────
-- SUCCESS MESSAGE
-- ──────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  RAISE NOTICE '✅ Inventory Advanced Features Schema Created Successfully!';
  RAISE NOTICE '   - Low Stock Thresholds table';
  RAISE NOTICE '   - Stock Movements tracking';
  RAISE NOTICE '   - Bulk Operations logging';
  RAISE NOTICE '   - Inventory Analytics cache';
  RAISE NOTICE '   - Automatic movement triggers';
  RAISE NOTICE '   - Helper functions for alerts and history';
END $$;
