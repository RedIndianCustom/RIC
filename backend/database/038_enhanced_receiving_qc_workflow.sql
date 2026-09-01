-- ============================================================================
-- ENHANCED RECEIVING & QC INSPECTION WORKFLOW
-- ============================================================================
-- Complete workflow for:
-- 1. Shipment registration with size breakdown
-- 2. Receiving with scanning & discrepancy detection
-- 3. QC Inspection with defect classification
-- 4. Manager approval workflow
-- 5. Stock allocation (Good/Minor Defect/Major Defect)
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────
-- 1. SHIPMENT EXPECTED ITEMS (Size Breakdown)
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shipment_expected_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference
  shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL,
  
  -- Size Details
  product_size VARCHAR(50) NOT NULL, -- '90/90-17', '100/90-17', etc.
  expected_quantity INTEGER NOT NULL CHECK (expected_quantity > 0),
  
  -- Additional Info
  unit_price DECIMAL(10, 2),
  total_value DECIMAL(12, 2) GENERATED ALWAYS AS (expected_quantity * unit_price) STORED,
  notes TEXT,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipment_expected_items_shipment ON shipment_expected_items(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_expected_items_product ON shipment_expected_items(product_id);

-- ──────────────────────────────────────────────────────────────────────────
-- 2. SHIPMENT RECEIVED ITEMS (Actual Scanned Count)
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shipment_received_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference
  shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE NOT NULL,
  expected_item_id UUID REFERENCES shipment_expected_items(id),
  product_id UUID REFERENCES products(id) NOT NULL,
  
  -- Size Details
  product_size VARCHAR(50) NOT NULL,
  received_quantity INTEGER NOT NULL DEFAULT 0,
  
  -- Scanning Info
  scanned_barcodes TEXT[], -- Array of scanned barcodes
  
  -- Status
  status VARCHAR(50) DEFAULT 'COUNTING' CHECK (status IN (
    'COUNTING',
    'COMPLETED',
    'DISCREPANCY_FOUND'
  )),
  
  -- Audit
  received_by UUID REFERENCES auth.users(id),
  received_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipment_received_items_shipment ON shipment_received_items(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_received_items_product ON shipment_received_items(product_id);
CREATE INDEX IF NOT EXISTS idx_shipment_received_items_status ON shipment_received_items(status);

-- ──────────────────────────────────────────────────────────────────────────
-- 3. SHIPMENT DISCREPANCIES
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shipment_discrepancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference
  shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE NOT NULL,
  expected_item_id UUID REFERENCES shipment_expected_items(id),
  received_item_id UUID REFERENCES shipment_received_items(id),
  product_id UUID REFERENCES products(id) NOT NULL,
  
  -- Discrepancy Details
  discrepancy_type VARCHAR(50) NOT NULL CHECK (discrepancy_type IN (
    'SHORT',        -- Received less than expected
    'OVERAGE',      -- Received more than expected
    'DAMAGED',      -- Items damaged in transit
    'WRONG_ITEM',   -- Wrong product/size received
    'MISSING'       -- Items completely missing
  )),
  
  product_size VARCHAR(50) NOT NULL,
  expected_quantity INTEGER NOT NULL,
  received_quantity INTEGER NOT NULL,
  difference INTEGER GENERATED ALWAYS AS (received_quantity - expected_quantity) STORED,
  
  -- Financial Impact
  unit_price DECIMAL(10, 2),
  financial_impact DECIMAL(12, 2),
  
  -- Resolution
  reason TEXT,
  resolution_action VARCHAR(100), -- 'ACCEPT_OVERAGE', 'ACCEPT_SHORTAGE', 'RETURN', 'CLAIM', etc.
  resolution_notes TEXT,
  
  -- Documentation
  photos TEXT[], -- URLs to photos
  documents TEXT[], -- URLs to documents
  
  -- Reporting
  reported_by UUID REFERENCES auth.users(id),
  reported_at TIMESTAMPTZ DEFAULT now(),
  
  -- Manager Review
  manager_reviewed_by UUID REFERENCES auth.users(id),
  manager_reviewed_at TIMESTAMPTZ,
  manager_decision VARCHAR(50) CHECK (manager_decision IN (
    'APPROVED',
    'REJECTED',
    'PENDING',
    'REQUIRES_MORE_INFO'
  )) DEFAULT 'PENDING',
  manager_notes TEXT,
  
  -- Notifications
  manager_notified BOOLEAN DEFAULT false,
  manager_notified_at TIMESTAMPTZ,
  
  -- Status
  status VARCHAR(50) DEFAULT 'OPEN' CHECK (status IN (
    'OPEN',
    'UNDER_REVIEW',
    'RESOLVED',
    'CLOSED'
  )),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipment_discrepancies_shipment ON shipment_discrepancies(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_discrepancies_type ON shipment_discrepancies(discrepancy_type);
CREATE INDEX IF NOT EXISTS idx_shipment_discrepancies_status ON shipment_discrepancies(status);
CREATE INDEX IF NOT EXISTS idx_shipment_discrepancies_manager_decision ON shipment_discrepancies(manager_decision);

-- ──────────────────────────────────────────────────────────────────────────
-- 4. QC INSPECTIONS (Enhanced with 15-day deadline)
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS qc_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference
  shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE NOT NULL,
  inspection_number VARCHAR(100) UNIQUE NOT NULL,
  
  -- Inspector
  inspector_id UUID REFERENCES auth.users(id),
  
  -- Timeline
  ready_for_qc_date TIMESTAMPTZ, -- When shipment marked ready for QC
  due_date TIMESTAMPTZ, -- 15 days from ready_for_qc_date
  inspection_start_date TIMESTAMPTZ,
  inspection_end_date TIMESTAMPTZ,
  
  -- Status
  status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN (
    'PENDING',
    'IN_PROGRESS',
    'PAUSED',
    'COMPLETED',
    'OVERDUE',
    'CANCELLED'
  )),
  
  -- Progress
  total_items INTEGER NOT NULL DEFAULT 0,
  items_inspected INTEGER DEFAULT 0,
  inspection_progress DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE 
      WHEN total_items > 0 THEN (items_inspected::DECIMAL / total_items::DECIMAL * 100)
      ELSE 0 
    END
  ) STORED,
  
  -- Results Summary
  good_quality_count INTEGER DEFAULT 0,
  minor_defect_count INTEGER DEFAULT 0,
  major_defect_count INTEGER DEFAULT 0,
  
  -- Quality Percentages
  good_quality_percentage DECIMAL(5, 2),
  minor_defect_percentage DECIMAL(5, 2),
  major_defect_percentage DECIMAL(5, 2),
  
  -- Inspector Notes
  inspector_notes TEXT,
  overall_assessment TEXT,
  recommendations TEXT,
  
  -- Manager Review
  manager_reviewed_by UUID REFERENCES auth.users(id),
  manager_reviewed_at TIMESTAMPTZ,
  manager_decision VARCHAR(50) CHECK (manager_decision IN (
    'APPROVED',
    'REJECTED',
    'PARTIAL_APPROVED',
    'REQUIRES_REINSPECTION',
    'PENDING'
  )) DEFAULT 'PENDING',
  manager_notes TEXT,
  
  -- Notifications
  manager_notified BOOLEAN DEFAULT false,
  manager_notified_at TIMESTAMPTZ,
  overdue_notification_sent BOOLEAN DEFAULT false,
  
  -- Timing Metrics
  total_inspection_time INTERVAL, -- Time taken to complete inspection
  average_time_per_item INTERVAL,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qc_inspections_shipment ON qc_inspections(shipment_id);
CREATE INDEX IF NOT EXISTS idx_qc_inspections_status ON qc_inspections(status);
CREATE INDEX IF NOT EXISTS idx_qc_inspections_due_date ON qc_inspections(due_date);
CREATE INDEX IF NOT EXISTS idx_qc_inspections_inspector ON qc_inspections(inspector_id);
CREATE INDEX IF NOT EXISTS idx_qc_inspections_manager_decision ON qc_inspections(manager_decision);

-- ──────────────────────────────────────────────────────────────────────────
-- 5. QC INSPECTION ITEMS (Individual Product Inspection)
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS qc_inspection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference
  qc_inspection_id UUID REFERENCES qc_inspections(id) ON DELETE CASCADE NOT NULL,
  inventory_unit_id UUID REFERENCES inventory_units(id),
  product_id UUID REFERENCES products(id) NOT NULL,
  
  -- Product Info
  barcode VARCHAR(255) NOT NULL,
  product_size VARCHAR(50),
  batch_id UUID REFERENCES batches(id),
  
  -- Classification
  classification VARCHAR(50) NOT NULL CHECK (classification IN (
    'GOOD',
    'MINOR_DEFECT',
    'MAJOR_DEFECT'
  )),
  
  -- Defect Details (if applicable)
  has_defect BOOLEAN DEFAULT false,
  defect_type VARCHAR(100), -- 'SCRATCH', 'CRACK', 'TEAR', 'STAIN', 'WRONG_PRODUCT', etc.
  defect_location VARCHAR(100), -- 'TREAD', 'SIDEWALL', 'BEAD', 'MULTIPLE', etc.
  defect_description TEXT,
  defect_severity VARCHAR(50) CHECK (defect_severity IN (
    'COSMETIC',    -- Minor, doesn't affect function
    'FUNCTIONAL',  -- Affects performance
    'CRITICAL'     -- Severe, unusable
  )),
  
  -- Sellability
  is_sellable BOOLEAN DEFAULT true,
  recommended_action VARCHAR(50) CHECK (recommended_action IN (
    'SELL_NORMAL',
    'SELL_DISCOUNT',
    'RETURN_SUPPLIER',
    'DISPOSE',
    'REPAIR'
  )),
  suggested_discount_percentage DECIMAL(5, 2),
  
  -- Documentation
  photos TEXT[], -- Array of photo URLs
  photo_count INTEGER DEFAULT 0,
  
  -- Inspector Assessment
  quality_notes TEXT,
  inspected_by UUID REFERENCES auth.users(id),
  inspected_at TIMESTAMPTZ DEFAULT now(),
  
  -- Manager Review
  manager_approved BOOLEAN DEFAULT false,
  manager_reviewed_by UUID REFERENCES auth.users(id),
  manager_reviewed_at TIMESTAMPTZ,
  manager_override_classification VARCHAR(50), -- If manager disagrees
  manager_notes TEXT,
  
  -- Final Status
  final_status VARCHAR(50) DEFAULT 'PENDING' CHECK (final_status IN (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'RECLASSIFIED'
  )),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qc_inspection_items_inspection ON qc_inspection_items(qc_inspection_id);
CREATE INDEX IF NOT EXISTS idx_qc_inspection_items_classification ON qc_inspection_items(classification);
CREATE INDEX IF NOT EXISTS idx_qc_inspection_items_barcode ON qc_inspection_items(barcode);
CREATE INDEX IF NOT EXISTS idx_qc_inspection_items_product ON qc_inspection_items(product_id);
CREATE INDEX IF NOT EXISTS idx_qc_inspection_items_final_status ON qc_inspection_items(final_status);

-- ──────────────────────────────────────────────────────────────────────────
-- 6. DEFECT INVENTORY (Sellable & Return to Supplier)
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS defect_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference
  inventory_unit_id UUID REFERENCES inventory_units(id) NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL,
  qc_inspection_item_id UUID REFERENCES qc_inspection_items(id),
  
  -- Classification
  defect_classification VARCHAR(50) NOT NULL CHECK (defect_classification IN (
    'MINOR_SELLABLE',     -- Can be sold at discount
    'MAJOR_RETURN'        -- Must be returned to supplier
  )),
  
  -- Pricing (for sellable items)
  original_price DECIMAL(10, 2),
  discount_percentage DECIMAL(5, 2),
  discounted_price DECIMAL(10, 2),
  
  -- Status
  status VARCHAR(50) DEFAULT 'AVAILABLE' CHECK (status IN (
    'AVAILABLE',
    'RESERVED',
    'SOLD',
    'RETURNED_TO_SUPPLIER',
    'DISPOSED'
  )),
  
  -- Location
  storage_location TEXT, -- Special defect inventory area
  warehouse_id UUID REFERENCES warehouses(id),
  
  -- Sales Info (for sellable)
  sold_to VARCHAR(255),
  sold_at TIMESTAMPTZ,
  sale_price DECIMAL(10, 2),
  
  -- Return Info (for return to supplier)
  return_request_number VARCHAR(100),
  return_reason TEXT,
  returned_at TIMESTAMPTZ,
  supplier_accepted BOOLEAN,
  refund_amount DECIMAL(10, 2),
  
  -- Audit
  added_by UUID REFERENCES auth.users(id),
  added_at TIMESTAMPTZ DEFAULT now(),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_defect_inventory_classification ON defect_inventory(defect_classification);
CREATE INDEX IF NOT EXISTS idx_defect_inventory_status ON defect_inventory(status);
CREATE INDEX IF NOT EXISTS idx_defect_inventory_product ON defect_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_defect_inventory_warehouse ON defect_inventory(warehouse_id);

-- ──────────────────────────────────────────────────────────────────────────
-- 7. NOTIFICATIONS LOG
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Notification Details
  notification_type VARCHAR(100) NOT NULL, -- 'DISCREPANCY_REPORTED', 'QC_COMPLETE', 'QC_OVERDUE', etc.
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(50) CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')) DEFAULT 'MEDIUM',
  
  -- References
  shipment_id UUID REFERENCES shipments(id),
  qc_inspection_id UUID REFERENCES qc_inspections(id),
  discrepancy_id UUID REFERENCES shipment_discrepancies(id),
  
  -- Recipient
  recipient_user_id UUID REFERENCES auth.users(id),
  recipient_role VARCHAR(50), -- 'MANAGER', 'WAREHOUSE_STAFF', 'OPERATIONAL_STAFF', etc.
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- Action Required
  requires_action BOOLEAN DEFAULT false,
  action_url TEXT,
  action_completed BOOLEAN DEFAULT false,
  action_completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_notifications_recipient ON workflow_notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_type ON workflow_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_is_read ON workflow_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_created_at ON workflow_notifications(created_at DESC);

-- ──────────────────────────────────────────────────────────────────────────
-- 8. HELPER FUNCTIONS
-- ──────────────────────────────────────────────────────────────────────────

-- Calculate discrepancy summary for a shipment
CREATE OR REPLACE FUNCTION get_shipment_discrepancy_summary(p_shipment_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_summary JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_discrepancies', COUNT(*),
    'short_count', COUNT(*) FILTER (WHERE discrepancy_type = 'SHORT'),
    'overage_count', COUNT(*) FILTER (WHERE discrepancy_type = 'OVERAGE'),
    'damaged_count', COUNT(*) FILTER (WHERE discrepancy_type = 'DAMAGED'),
    'wrong_item_count', COUNT(*) FILTER (WHERE discrepancy_type = 'WRONG_ITEM'),
    'total_financial_impact', COALESCE(SUM(financial_impact), 0),
    'pending_approval', COUNT(*) FILTER (WHERE manager_decision = 'PENDING')
  ) INTO v_summary
  FROM shipment_discrepancies
  WHERE shipment_id = p_shipment_id;
  
  RETURN v_summary;
END;
$$ LANGUAGE plpgsql;

-- Calculate QC inspection summary
CREATE OR REPLACE FUNCTION get_qc_inspection_summary(p_inspection_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_summary JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_items', COUNT(*),
    'good_quality', COUNT(*) FILTER (WHERE classification = 'GOOD'),
    'minor_defects', COUNT(*) FILTER (WHERE classification = 'MINOR_DEFECT'),
    'major_defects', COUNT(*) FILTER (WHERE classification = 'MAJOR_DEFECT'),
    'good_percentage', ROUND(COUNT(*) FILTER (WHERE classification = 'GOOD')::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2),
    'minor_percentage', ROUND(COUNT(*) FILTER (WHERE classification = 'MINOR_DEFECT')::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2),
    'major_percentage', ROUND(COUNT(*) FILTER (WHERE classification = 'MAJOR_DEFECT')::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2),
    'pending_approval', COUNT(*) FILTER (WHERE final_status = 'PENDING')
  ) INTO v_summary
  FROM qc_inspection_items
  WHERE qc_inspection_id = p_inspection_id;
  
  RETURN v_summary;
END;
$$ LANGUAGE plpgsql;

-- Check for overdue QC inspections
CREATE OR REPLACE FUNCTION check_overdue_qc_inspections()
RETURNS TABLE(
  inspection_id UUID,
  shipment_id UUID,
  inspection_number VARCHAR,
  due_date TIMESTAMPTZ,
  days_overdue INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qi.id,
    qi.shipment_id,
    qi.inspection_number,
    qi.due_date,
    EXTRACT(DAY FROM (now() - qi.due_date))::INTEGER
  FROM qc_inspections qi
  WHERE qi.status IN ('PENDING', 'IN_PROGRESS')
    AND qi.due_date < now()
    AND qi.overdue_notification_sent = false;
END;
$$ LANGUAGE plpgsql;

-- ──────────────────────────────────────────────────────────────────────────
-- 9. TRIGGERS
-- ──────────────────────────────────────────────────────────────────────────

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_shipment_expected_items_updated_at ON shipment_expected_items;
CREATE TRIGGER update_shipment_expected_items_updated_at
  BEFORE UPDATE ON shipment_expected_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shipment_received_items_updated_at ON shipment_received_items;
CREATE TRIGGER update_shipment_received_items_updated_at
  BEFORE UPDATE ON shipment_received_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shipment_discrepancies_updated_at ON shipment_discrepancies;
CREATE TRIGGER update_shipment_discrepancies_updated_at
  BEFORE UPDATE ON shipment_discrepancies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_qc_inspections_updated_at ON qc_inspections;
CREATE TRIGGER update_qc_inspections_updated_at
  BEFORE UPDATE ON qc_inspections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_qc_inspection_items_updated_at ON qc_inspection_items;
CREATE TRIGGER update_qc_inspection_items_updated_at
  BEFORE UPDATE ON qc_inspection_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_defect_inventory_updated_at ON defect_inventory;
CREATE TRIGGER update_defect_inventory_updated_at
  BEFORE UPDATE ON defect_inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-set QC due date (15 days from ready_for_qc_date)
CREATE OR REPLACE FUNCTION set_qc_due_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ready_for_qc_date IS NOT NULL AND NEW.due_date IS NULL THEN
    NEW.due_date = NEW.ready_for_qc_date + INTERVAL '15 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_qc_inspection_due_date ON qc_inspections;
CREATE TRIGGER set_qc_inspection_due_date
  BEFORE INSERT OR UPDATE ON qc_inspections
  FOR EACH ROW EXECUTE FUNCTION set_qc_due_date();

-- Auto-update QC inspection status to OVERDUE
CREATE OR REPLACE FUNCTION check_qc_overdue_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.due_date < now() AND NEW.status IN ('PENDING', 'IN_PROGRESS') THEN
    NEW.status = 'OVERDUE';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_qc_inspection_overdue ON qc_inspections;
CREATE TRIGGER check_qc_inspection_overdue
  BEFORE UPDATE ON qc_inspections
  FOR EACH ROW EXECUTE FUNCTION check_qc_overdue_status();

-- ──────────────────────────────────────────────────────────────────────────
-- 10. RLS POLICIES
-- ──────────────────────────────────────────────────────────────────────────

ALTER TABLE shipment_expected_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_received_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_discrepancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE qc_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE qc_inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE defect_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_notifications ENABLE ROW LEVEL SECURITY;

-- Policies for operational staff, warehouse staff, managers, admins
DROP POLICY IF EXISTS "Staff can view shipment items" ON shipment_expected_items;
CREATE POLICY "Staff can view shipment items"
  ON shipment_expected_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('operational_staff', 'warehouse_staff', 'manager', 'admin')
    )
  );

DROP POLICY IF EXISTS "Staff can manage their work" ON qc_inspections;
CREATE POLICY "Staff can manage their work"
  ON qc_inspections FOR ALL
  TO authenticated
  USING (
    inspector_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('manager', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view their notifications" ON workflow_notifications;
CREATE POLICY "Users can view their notifications"
  ON workflow_notifications FOR SELECT
  TO authenticated
  USING (recipient_user_id = auth.uid());

-- ──────────────────────────────────────────────────────────────────────────
-- 11. SAMPLE DATA & VIEWS
-- ──────────────────────────────────────────────────────────────────────────

-- View for pending QC inspections dashboard
CREATE OR REPLACE VIEW pending_qc_inspections AS
SELECT 
  qi.id,
  qi.inspection_number,
  qi.shipment_id,
  s.shipment_number,
  qi.status,
  qi.due_date,
  CASE 
    WHEN qi.due_date < now() THEN EXTRACT(DAY FROM (now() - qi.due_date))::INTEGER
    ELSE NULL
  END AS days_overdue,
  CASE 
    WHEN qi.due_date < now() THEN true
    ELSE false
  END AS is_overdue,
  qi.total_items,
  qi.items_inspected,
  qi.inspection_progress,
  qi.inspector_id,
  u.full_name AS inspector_name,
  qi.created_at
FROM qc_inspections qi
LEFT JOIN shipments s ON s.id = qi.shipment_id
LEFT JOIN users u ON u.id = qi.inspector_id
WHERE qi.status IN ('PENDING', 'IN_PROGRESS', 'OVERDUE')
ORDER BY 
  CASE WHEN qi.due_date < now() THEN 0 ELSE 1 END,
  qi.due_date ASC;

-- View for discrepancy reports requiring manager approval
CREATE OR REPLACE VIEW pending_discrepancy_approvals AS
SELECT 
  sd.id,
  sd.shipment_id,
  s.shipment_number,
  sd.discrepancy_type,
  sd.product_id,
  CONCAT(p.brand, ' ', p.model, ' ', p.dimensions) AS product_name,
  sd.product_size,
  sd.expected_quantity,
  sd.received_quantity,
  sd.difference,
  sd.financial_impact,
  sd.reason,
  sd.reported_by,
  u.full_name AS reported_by_name,
  sd.reported_at,
  sd.manager_decision
FROM shipment_discrepancies sd
LEFT JOIN shipments s ON s.id = sd.shipment_id
LEFT JOIN products p ON p.id = sd.product_id
LEFT JOIN users u ON u.id = sd.reported_by
WHERE sd.manager_decision = 'PENDING'
ORDER BY sd.reported_at DESC;

-- ──────────────────────────────────────────────────────────────────────────
-- SUCCESS MESSAGE
-- ──────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  RAISE NOTICE '✅ Enhanced Receiving & QC Workflow Schema Created Successfully!';
  RAISE NOTICE '   ';
  RAISE NOTICE '   📦 Features Implemented:';
  RAISE NOTICE '   ├─ Shipment expected items (size breakdown)';
  RAISE NOTICE '   ├─ Receiving with scanning & quantity tracking';
  RAISE NOTICE '   ├─ Discrepancy detection & reporting';
  RAISE NOTICE '   ├─ Manager approval workflow';
  RAISE NOTICE '   ├─ QC inspection with 15-day deadline';
  RAISE NOTICE '   ├─ Defect classification (Good/Minor/Major)';
  RAISE NOTICE '   ├─ Photo documentation';
  RAISE NOTICE '   ├─ Defect inventory management';
  RAISE NOTICE '   ├─ Notification system';
  RAISE NOTICE '   └─ Comprehensive reporting';
  RAISE NOTICE '   ';
  RAISE NOTICE '   📊 Database Objects Created:';
  RAISE NOTICE '   ├─ 7 Tables';
  RAISE NOTICE '   ├─ 3 Helper Functions';
  RAISE NOTICE '   ├─ 2 Views';
  RAISE NOTICE '   ├─ 8 Triggers';
  RAISE NOTICE '   └─ RLS Policies';
  RAISE NOTICE '   ';
  RAISE NOTICE '   🚀 Ready for backend implementation!';
END $$;
