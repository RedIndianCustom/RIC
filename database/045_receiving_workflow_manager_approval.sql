-- ============================================================================
-- RECEIVING WORKFLOW - MANAGER APPROVAL SYSTEM
-- ============================================================================
-- Creates tables and functions for the new receiving workflow:
-- 1. Warehouse staff scan items by size
-- 2. System generates discrepancy report
-- 3. Manager reviews and approves/rejects
-- 4. Auto-creates QC batch after approval
-- ============================================================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS receiving_approvals CASCADE;
DROP TABLE IF EXISTS receiving_reports CASCADE;

-- ============================================================================
-- TABLE: receiving_reports
-- ============================================================================
-- Stores detailed receiving reports with discrepancies per size
CREATE TABLE receiving_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  
  -- Report metadata
  report_number VARCHAR(50) UNIQUE NOT NULL,
  submitted_by UUID NOT NULL REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Receiving data
  size_breakdown JSONB NOT NULL, -- Array of {size, expected, scanned, discrepancy}
  total_expected INTEGER NOT NULL,
  total_scanned INTEGER NOT NULL,
  total_discrepancy INTEGER NOT NULL,
  
  -- Notes and metadata
  notes TEXT,
  scan_details JSONB, -- Stores barcode scans per size for audit trail
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_receiving_reports_shipment ON receiving_reports(shipment_id);
CREATE INDEX idx_receiving_reports_status ON receiving_reports(status);
CREATE INDEX idx_receiving_reports_submitted_by ON receiving_reports(submitted_by);
CREATE INDEX idx_receiving_reports_submitted_at ON receiving_reports(submitted_at);

-- ============================================================================
-- TABLE: receiving_approvals
-- ============================================================================
-- Stores manager approval/rejection records
CREATE TABLE receiving_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES receiving_reports(id) ON DELETE CASCADE,
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  
  -- Approval decision
  approved_by UUID NOT NULL REFERENCES auth.users(id),
  decision VARCHAR(20) NOT NULL, -- APPROVED, REJECTED
  decision_notes TEXT,
  
  -- Actions taken (populated after approval)
  qc_inspection_id UUID REFERENCES qc_inspections(id),
  actions_taken JSONB, -- Stores what happened: {qc_inspection_created: true, notifications_sent: 3, etc}
  
  -- Timestamps
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_receiving_approvals_report ON receiving_approvals(report_id);
CREATE INDEX idx_receiving_approvals_shipment ON receiving_approvals(shipment_id);
CREATE INDEX idx_receiving_approvals_approved_by ON receiving_approvals(approved_by);
CREATE INDEX idx_receiving_approvals_decided_at ON receiving_approvals(decided_at);

-- ============================================================================
-- FUNCTION: Generate unique report number
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_report_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  new_number VARCHAR(50);
  counter INTEGER;
BEGIN
  -- Format: RR-YYYYMMDD-NNNN (e.g., RR-20260826-0001)
  counter := (
    SELECT COUNT(*) + 1
    FROM receiving_reports
    WHERE DATE(created_at) = CURRENT_DATE
  );
  
  new_number := 'RR-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Submit receiving report
-- ============================================================================
CREATE OR REPLACE FUNCTION submit_receiving_report(
  p_shipment_id UUID,
  p_submitted_by UUID,
  p_size_breakdown JSONB,
  p_total_expected INTEGER,
  p_total_scanned INTEGER,
  p_total_discrepancy INTEGER,
  p_notes TEXT DEFAULT NULL,
  p_scan_details JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_report_id UUID;
  v_report_number VARCHAR(50);
  v_result JSONB;
BEGIN
  -- Generate report number
  v_report_number := generate_report_number();
  
  -- Insert report
  INSERT INTO receiving_reports (
    shipment_id,
    report_number,
    submitted_by,
    size_breakdown,
    total_expected,
    total_scanned,
    total_discrepancy,
    notes,
    scan_details,
    status
  ) VALUES (
    p_shipment_id,
    v_report_number,
    p_submitted_by,
    p_size_breakdown,
    p_total_expected,
    p_total_scanned,
    p_total_discrepancy,
    p_notes,
    p_scan_details,
    'PENDING'
  )
  RETURNING id INTO v_report_id;
  
  -- Update shipment status to AWAITING_APPROVAL
  UPDATE shipments
  SET 
    status = 'AWAITING_APPROVAL',
    updated_at = NOW()
  WHERE id = p_shipment_id;
  
  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'report_id', v_report_id,
    'report_number', v_report_number,
    'message', 'Receiving report submitted successfully'
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Approve receiving report
-- ============================================================================
CREATE OR REPLACE FUNCTION approve_receiving_report(
  p_report_id UUID,
  p_approved_by UUID,
  p_decision VARCHAR(20), -- 'APPROVED' or 'REJECTED'
  p_decision_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_shipment_id UUID;
  v_approval_id UUID;
  v_qc_batch_id UUID;
  v_qc_batch_number VARCHAR(50);
  v_actions JSONB;
  v_result JSONB;
  v_report_data RECORD;
BEGIN
  -- Get report and shipment data
  SELECT r.shipment_id, r.size_breakdown, r.total_expected, r.total_scanned, s.shipment_number
  INTO v_report_data
  FROM receiving_reports r
  JOIN shipments s ON s.id = r.shipment_id
  WHERE r.id = p_report_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Report not found');
  END IF;
  
  v_shipment_id := v_report_data.shipment_id;
  v_actions := '{}'::jsonb;
  
  -- Insert approval record
  INSERT INTO receiving_approvals (
    report_id,
    shipment_id,
    approved_by,
    decision,
    decision_notes
  ) VALUES (
    p_report_id,
    v_shipment_id,
    p_approved_by,
    p_decision,
    p_decision_notes
  )
  RETURNING id INTO v_approval_id;
  
  -- Update report status
  UPDATE receiving_reports
  SET 
    status = p_decision,
    updated_at = NOW()
  WHERE id = p_report_id;
  
  -- If approved, create QC inspection and update shipment status
  IF p_decision = 'APPROVED' THEN
    -- Generate QC inspection number
    v_qc_batch_number := 'QC-' || v_report_data.shipment_number || '-' || TO_CHAR(NOW(), 'YYYYMMDD');
    
    -- Create QC inspection
    INSERT INTO qc_inspections (
      inspection_number,
      shipment_id,
      total_items,
      status,
      inspector_id,
      ready_for_qc_date
    ) VALUES (
      v_qc_batch_number,
      v_shipment_id,
      v_report_data.total_scanned, -- Use actual scanned quantity
      'PENDING',
      p_approved_by,
      NOW()
    )
    RETURNING id INTO v_qc_batch_id;
    
    -- Update approval with QC inspection ID
    UPDATE receiving_approvals
    SET 
      qc_inspection_id = v_qc_batch_id,
      actions_taken = jsonb_build_object(
        'qc_inspection_created', true,
        'qc_inspection_id', v_qc_batch_id,
        'qc_inspection_number', v_qc_batch_number
      )
    WHERE id = v_approval_id;
    
    -- Update shipment status to READY_FOR_QC
    UPDATE shipments
    SET 
      status = 'READY_FOR_QC',
      updated_at = NOW()
    WHERE id = v_shipment_id;
    
    v_actions := jsonb_build_object(
      'qc_inspection_created', true,
      'qc_inspection_id', v_qc_batch_id,
      'qc_inspection_number', v_qc_batch_number,
      'shipment_status', 'READY_FOR_QC'
    );
  ELSE
    -- If rejected, update shipment status back to INSPECTING for re-scanning
    UPDATE shipments
    SET 
      status = 'INSPECTING',
      updated_at = NOW()
    WHERE id = v_shipment_id;
    
    v_actions := jsonb_build_object(
      'shipment_status', 'INSPECTING',
      'rejection_reason', p_decision_notes
    );
  END IF;
  
  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'approval_id', v_approval_id,
    'decision', p_decision,
    'actions', v_actions,
    'message', CASE 
      WHEN p_decision = 'APPROVED' THEN 'Report approved and QC inspection created'
      ELSE 'Report rejected. Shipment returned to inspection.'
    END
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Get pending approvals (for managers)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_pending_receiving_approvals()
RETURNS TABLE (
  report_id UUID,
  report_number VARCHAR(50),
  shipment_id UUID,
  shipment_number VARCHAR(100),
  submitted_by_id UUID,
  submitted_by_name VARCHAR(255),
  submitted_at TIMESTAMPTZ,
  total_expected INTEGER,
  total_scanned INTEGER,
  total_discrepancy INTEGER,
  size_breakdown JSONB,
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.report_number,
    r.shipment_id,
    s.shipment_number,
    r.submitted_by,
    u.full_name,
    r.submitted_at,
    r.total_expected,
    r.total_scanned,
    r.total_discrepancy,
    r.size_breakdown,
    r.notes
  FROM receiving_reports r
  JOIN shipments s ON s.id = r.shipment_id
  JOIN users u ON u.id = r.submitted_by
  WHERE r.status = 'PENDING'
  ORDER BY r.submitted_at ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Get approval history for a shipment
-- ============================================================================
CREATE OR REPLACE FUNCTION get_shipment_approval_history(p_shipment_id UUID)
RETURNS TABLE (
  report_id UUID,
  report_number VARCHAR(50),
  submitted_by VARCHAR(255),
  submitted_at TIMESTAMPTZ,
  approved_by VARCHAR(255),
  decided_at TIMESTAMPTZ,
  decision VARCHAR(20),
  decision_notes TEXT,
  qc_batch_number VARCHAR(50),
  total_expected INTEGER,
  total_scanned INTEGER,
  total_discrepancy INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.report_number,
    u1.full_name,
    r.submitted_at,
    u2.full_name,
    a.decided_at,
    a.decision,
    a.decision_notes,
    qc.inspection_number,
    r.total_expected,
    r.total_scanned,
    r.total_discrepancy
  FROM receiving_reports r
  LEFT JOIN receiving_approvals a ON a.report_id = r.id
  LEFT JOIN users u1 ON u1.id = r.submitted_by
  LEFT JOIN users u2 ON u2.id = a.approved_by
  LEFT JOIN qc_inspections qc ON qc.id = a.qc_inspection_id
  WHERE r.shipment_id = p_shipment_id
  ORDER BY r.submitted_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE receiving_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE receiving_approvals ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view reports
CREATE POLICY "Users can view receiving reports"
  ON receiving_reports FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Warehouse staff can insert reports
CREATE POLICY "Warehouse staff can submit reports"
  ON receiving_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('warehouse_staff', 'admin')
    )
  );

-- Policy: All authenticated users can view approvals
CREATE POLICY "Users can view approvals"
  ON receiving_approvals FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Managers can approve/reject
CREATE POLICY "Managers can create approvals"
  ON receiving_approvals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('manager', 'admin')
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE receiving_reports IS 'Stores receiving reports with discrepancies per size for manager approval';
COMMENT ON TABLE receiving_approvals IS 'Stores manager approval/rejection decisions for receiving reports';
COMMENT ON FUNCTION submit_receiving_report IS 'Submit a receiving report for manager approval';
COMMENT ON FUNCTION approve_receiving_report IS 'Approve or reject a receiving report (auto-creates QC inspection if approved)';
COMMENT ON FUNCTION get_pending_receiving_approvals IS 'Get all pending receiving reports awaiting manager approval';
COMMENT ON FUNCTION get_shipment_approval_history IS 'Get full approval history for a shipment';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Receiving workflow schema created successfully!';
  RAISE NOTICE '📋 Tables: receiving_reports, receiving_approvals';
  RAISE NOTICE '⚡ Functions: submit_receiving_report, approve_receiving_report';
  RAISE NOTICE '🔐 RLS policies enabled for security';
END $$;
