-- ============================================================================
-- WAREHOUSE OPERATIONS SCHEMA
-- ============================================================================
-- Complete schema for warehouse staff features:
-- Receiving, Picking, Packing, Inspection, Inventory Counts, Tasks
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────
-- 1. WAREHOUSE TASKS (General Task Tracking)
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS warehouse_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Task Details
  task_type TEXT NOT NULL CHECK (task_type IN (
    'RECEIVING',
    'PICKING',
    'PACKING',
    'INSPECTION',
    'COUNTING',
    'RELOCATION',
    'REPLENISHMENT'
  )),
  
  task_number TEXT UNIQUE NOT NULL,
  priority TEXT DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  
  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ,
  
  -- References
  shipment_id UUID REFERENCES shipments(id),
  order_id UUID, -- Reference to orders table if exists
  inventory_unit_id UUID REFERENCES inventory_units(id),
  
  -- Status
  status TEXT DEFAULT 'PENDING' CHECK (status IN (
    'PENDING',
    'ASSIGNED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'ON_HOLD'
  )),
  
  -- Details
  description TEXT,
  instructions JSONB DEFAULT '{}',
  notes TEXT,
  
  -- Timing
  due_date TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_warehouse_tasks_type ON warehouse_tasks(task_type);
CREATE INDEX idx_warehouse_tasks_status ON warehouse_tasks(status);
CREATE INDEX idx_warehouse_tasks_assigned_to ON warehouse_tasks(assigned_to);
CREATE INDEX idx_warehouse_tasks_created_at ON warehouse_tasks(created_at DESC);

-- ──────────────────────────────────────────────────────────────────────────
-- 2. PICKING TASKS
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS picking_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Pick Details
  pick_number TEXT UNIQUE NOT NULL,
  order_reference TEXT,
  customer_name TEXT,
  
  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'PENDING' CHECK (status IN (
    'PENDING',
    'ASSIGNED',
    'PICKING',
    'PICKED',
    'VERIFIED',
    'CANCELLED'
  )),
  
  -- Priority
  priority TEXT DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  shipping_method TEXT,
  
  -- Timing
  due_date TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Notes
  notes TEXT,
  picker_notes TEXT,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS picking_task_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  picking_task_id UUID REFERENCES picking_tasks(id) ON DELETE CASCADE,
  inventory_unit_id UUID REFERENCES inventory_units(id),
  product_id UUID REFERENCES products(id),
  
  -- Location
  warehouse_id UUID REFERENCES warehouses(id),
  rack_code TEXT,
  position_code TEXT,
  
  -- Quantity
  quantity_requested INTEGER NOT NULL DEFAULT 1,
  quantity_picked INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'PENDING' CHECK (status IN (
    'PENDING',
    'PICKED',
    'SHORT',      -- Not enough stock
    'DAMAGED',    -- Found damaged
    'MISSING'     -- Could not find
  )),
  
  -- FIFO
  batch_id UUID REFERENCES batches(id),
  manufacture_date DATE,
  expiry_date DATE,
  
  -- Picking
  picked_at TIMESTAMPTZ,
  picked_by UUID REFERENCES auth.users(id),
  scanned_barcode TEXT,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_picking_task_items_task ON picking_task_items(picking_task_id);
CREATE INDEX idx_picking_task_items_status ON picking_task_items(status);

-- ──────────────────────────────────────────────────────────────────────────
-- 3. PACKING TASKS
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS packing_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Packing Details
  packing_number TEXT UNIQUE NOT NULL,
  picking_task_id UUID REFERENCES picking_tasks(id),
  order_reference TEXT,
  
  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'PENDING' CHECK (status IN (
    'PENDING',
    'PACKING',
    'PACKED',
    'READY_TO_SHIP',
    'SHIPPED'
  )),
  
  -- Packing Details
  box_type TEXT,
  box_dimensions TEXT, -- e.g., "40x30x20cm"
  total_weight DECIMAL(10, 2), -- kg
  fragile BOOLEAN DEFAULT false,
  
  -- Shipping
  shipping_carrier TEXT,
  tracking_number TEXT,
  shipping_label_url TEXT,
  
  -- Timing
  packed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  
  notes TEXT,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS packing_task_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  packing_task_id UUID REFERENCES packing_tasks(id) ON DELETE CASCADE,
  inventory_unit_id UUID REFERENCES inventory_units(id),
  product_id UUID REFERENCES products(id),
  
  quantity INTEGER NOT NULL DEFAULT 1,
  scanned_barcode TEXT,
  packed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────────────────
-- 4. INSPECTION RECORDS
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inspection_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Inspection Details
  inspection_number TEXT UNIQUE NOT NULL,
  inspection_type TEXT NOT NULL CHECK (inspection_type IN (
    'RECEIVING',      -- Incoming goods
    'QUALITY',        -- Random quality check
    'RETURN',         -- Customer return
    'DAMAGE',         -- Damage inspection
    'PERIODIC'        -- Scheduled inspection
  )),
  
  -- Item
  inventory_unit_id UUID REFERENCES inventory_units(id),
  product_id UUID REFERENCES products(id),
  batch_id UUID REFERENCES batches(id),
  shipment_id UUID REFERENCES shipments(id),
  
  -- Inspector
  inspector_id UUID REFERENCES auth.users(id),
  inspected_at TIMESTAMPTZ DEFAULT now(),
  
  -- Results
  result TEXT NOT NULL CHECK (result IN ('PASS', 'FAIL', 'CONDITIONAL')),
  
  -- Defects Found
  defects JSONB DEFAULT '[]', -- Array of defect descriptions
  defect_severity TEXT CHECK (defect_severity IN ('MINOR', 'MAJOR', 'CRITICAL')),
  
  -- Actions
  action_taken TEXT CHECK (action_taken IN (
    'ACCEPTED',
    'REJECTED',
    'REWORK',
    'RETURN_TO_SUPPLIER',
    'DISCOUNT',
    'DISPOSE'
  )),
  
  -- Documentation
  photos TEXT[], -- URLs to photos
  notes TEXT,
  inspector_signature TEXT, -- Base64 signature
  
  -- Approval (for conditional/failed inspections)
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_inspection_records_type ON inspection_records(inspection_type);
CREATE INDEX idx_inspection_records_result ON inspection_records(result);
CREATE INDEX idx_inspection_records_inspector ON inspection_records(inspector_id);
CREATE INDEX idx_inspection_records_date ON inspection_records(inspected_at DESC);

-- ──────────────────────────────────────────────────────────────────────────
-- 5. INVENTORY COUNT SESSIONS
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory_count_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Session Details
  count_number TEXT UNIQUE NOT NULL,
  count_type TEXT NOT NULL CHECK (count_type IN (
    'FULL',          -- Complete warehouse count
    'CYCLE',         -- Regular cycle count
    'SPOT',          -- Random spot check
    'LOCATION',      -- Specific location
    'PRODUCT'        -- Specific product
  )),
  
  -- Scope
  warehouse_id UUID REFERENCES warehouses(id),
  rack_codes TEXT[], -- Specific racks to count
  product_ids UUID[], -- Specific products to count
  
  -- Assignment
  assigned_to UUID[] DEFAULT '{}', -- Multiple counters
  
  -- Status
  status TEXT DEFAULT 'PLANNED' CHECK (status IN (
    'PLANNED',
    'IN_PROGRESS',
    'REVIEW',
    'APPROVED',
    'REJECTED',
    'COMPLETED'
  )),
  
  -- Timing
  scheduled_date DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Results Summary
  total_items_counted INTEGER DEFAULT 0,
  total_discrepancies INTEGER DEFAULT 0,
  discrepancy_value DECIMAL(15, 2),
  accuracy_percentage DECIMAL(5, 2),
  
  -- Approval
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,
  
  notes TEXT,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_count_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  count_session_id UUID REFERENCES inventory_count_sessions(id) ON DELETE CASCADE,
  
  -- Item
  inventory_unit_id UUID REFERENCES inventory_units(id),
  product_id UUID REFERENCES products(id),
  
  -- Location
  warehouse_id UUID REFERENCES warehouses(id),
  rack_code TEXT,
  position_code TEXT,
  
  -- Count Data
  system_quantity INTEGER NOT NULL DEFAULT 0,
  counted_quantity INTEGER,
  discrepancy INTEGER GENERATED ALWAYS AS (counted_quantity - system_quantity) STORED,
  
  -- Status
  status TEXT DEFAULT 'PENDING' CHECK (status IN (
    'PENDING',
    'COUNTED',
    'VERIFIED',
    'ADJUSTED',
    'DISPUTED'
  )),
  
  -- Counter
  counted_by UUID REFERENCES auth.users(id),
  counted_at TIMESTAMPTZ,
  
  -- Verification (second count)
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  verified_quantity INTEGER,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_count_items_session ON inventory_count_items(count_session_id);
CREATE INDEX idx_count_items_status ON inventory_count_items(status);

-- ──────────────────────────────────────────────────────────────────────────
-- 6. WAYBILL ATTACHMENTS
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS waybill_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference
  shipment_id UUID REFERENCES shipments(id),
  packing_task_id UUID REFERENCES packing_tasks(id),
  order_reference TEXT,
  
  -- Waybill Details
  waybill_number TEXT NOT NULL,
  carrier TEXT,
  tracking_number TEXT,
  
  -- Document
  document_type TEXT CHECK (document_type IN ('PDF', 'IMAGE', 'SCAN')),
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER, -- bytes
  
  -- Upload
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  
  -- Verification
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_waybill_shipment ON waybill_attachments(shipment_id);
CREATE INDEX idx_waybill_number ON waybill_attachments(waybill_number);

-- ──────────────────────────────────────────────────────────────────────────
-- 7. STAFF PERFORMANCE TRACKING
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS warehouse_staff_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Staff
  user_id UUID REFERENCES auth.users(id),
  
  -- Date
  performance_date DATE NOT NULL,
  shift TEXT CHECK (shift IN ('MORNING', 'AFTERNOON', 'NIGHT')),
  
  -- Tasks
  tasks_assigned INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  tasks_in_progress INTEGER DEFAULT 0,
  
  -- Specific Activities
  items_received INTEGER DEFAULT 0,
  items_picked INTEGER DEFAULT 0,
  items_packed INTEGER DEFAULT 0,
  items_inspected INTEGER DEFAULT 0,
  items_counted INTEGER DEFAULT 0,
  
  -- Efficiency
  average_pick_time INTERVAL, -- Time per pick
  average_pack_time INTERVAL, -- Time per pack
  accuracy_rate DECIMAL(5, 2), -- Percentage
  
  -- Quality
  errors_reported INTEGER DEFAULT 0,
  discrepancies_found INTEGER DEFAULT 0,
  damaged_items_found INTEGER DEFAULT 0,
  
  -- Hours
  hours_worked DECIMAL(5, 2),
  
  -- Calculated Metrics
  productivity_score DECIMAL(5, 2), -- Calculated score
  efficiency_rating TEXT CHECK (efficiency_rating IN ('EXCELLENT', 'GOOD', 'AVERAGE', 'NEEDS_IMPROVEMENT')),
  
  -- Notes
  supervisor_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, performance_date, shift)
);

CREATE INDEX idx_performance_user ON warehouse_staff_performance(user_id);
CREATE INDEX idx_performance_date ON warehouse_staff_performance(performance_date DESC);

-- ──────────────────────────────────────────────────────────────────────────
-- 8. FUNCTIONS
-- ──────────────────────────────────────────────────────────────────────────

-- Get warehouse dashboard stats
CREATE OR REPLACE FUNCTION get_warehouse_dashboard_stats(p_user_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'pendingReceiving', (
      SELECT COUNT(*) FROM shipments 
      WHERE status IN ('IN_TRANSIT', 'ARRIVED')
    ),
    'pendingTasks', (
      SELECT COUNT(*) FROM warehouse_tasks 
      WHERE status IN ('PENDING', 'ASSIGNED')
      AND (p_user_id IS NULL OR assigned_to = p_user_id)
    ),
    'pickingTasks', (
      SELECT COUNT(*) FROM picking_tasks 
      WHERE status IN ('PENDING', 'ASSIGNED', 'PICKING')
      AND (p_user_id IS NULL OR assigned_to = p_user_id)
    ),
    'packingTasks', (
      SELECT COUNT(*) FROM packing_tasks 
      WHERE status IN ('PENDING', 'PACKING')
      AND (p_user_id IS NULL OR assigned_to = p_user_id)
    ),
    'inspectionQueue', (
      SELECT COUNT(*) FROM inspection_records 
      WHERE result IS NULL OR requires_approval = true
    ),
    'tasksCompletedToday', (
      SELECT COUNT(*) FROM warehouse_tasks 
      WHERE status = 'COMPLETED'
      AND completed_at >= CURRENT_DATE
      AND (p_user_id IS NULL OR assigned_to = p_user_id)
    )
  ) INTO v_stats;
  
  RETURN v_stats;
END;
$$ LANGUAGE plpgsql;

-- ──────────────────────────────────────────────────────────────────────────
-- 9. RLS POLICIES
-- ──────────────────────────────────────────────────────────────────────────

ALTER TABLE warehouse_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE picking_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE packing_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_count_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE waybill_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_staff_performance ENABLE ROW LEVEL SECURITY;

-- Warehouse staff can view and update their assigned tasks
CREATE POLICY "Warehouse staff can view tasks"
  ON warehouse_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('warehouse_staff', 'admin', 'manager')
    )
  );

CREATE POLICY "Warehouse staff can update assigned tasks"
  ON warehouse_tasks FOR UPDATE
  TO authenticated
  USING (
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'manager')
    )
  );

-- Similar policies for other tables...
CREATE POLICY "Warehouse staff can view picking tasks"
  ON picking_tasks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('warehouse_staff', 'admin', 'manager')
    )
  );

CREATE POLICY "Warehouse staff can view performance"
  ON warehouse_staff_performance FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'manager')
    )
  );

-- ──────────────────────────────────────────────────────────────────────────
-- SUCCESS MESSAGE
-- ──────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  RAISE NOTICE '✅ Warehouse Operations Schema Created Successfully!';
  RAISE NOTICE '   - Warehouse Tasks tracking';
  RAISE NOTICE '   - Picking Tasks with items';
  RAISE NOTICE '   - Packing Tasks with items';
  RAISE NOTICE '   - Inspection Records';
  RAISE NOTICE '   - Inventory Count Sessions';
  RAISE NOTICE '   - Waybill Attachments';
  RAISE NOTICE '   - Staff Performance tracking';
  RAISE NOTICE '   - Dashboard stats function';
  RAISE NOTICE '   - RLS policies applied';
END $$;
