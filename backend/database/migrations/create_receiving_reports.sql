-- ============================================================================
-- CREATE RECEIVING_REPORTS TABLE
-- ============================================================================
-- Stores receiving reports from scan-driven receiving workflow
-- Tracks all scans, discrepancies, and approval status
-- ============================================================================

-- Drop table if exists (for clean re-run)
DROP TABLE IF EXISTS receiving_reports CASCADE;

-- Create receiving_reports table
CREATE TABLE receiving_reports (
  id BIGSERIAL PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  session_id VARCHAR(100) NOT NULL,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Size breakdown (JSON array of product/size/counts)
  size_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Summary totals
  total_expected INTEGER NOT NULL DEFAULT 0,
  total_scanned INTEGER NOT NULL DEFAULT 0,
  total_discrepancy INTEGER NOT NULL DEFAULT 0,
  
  -- Notes and scan history
  notes TEXT,
  scan_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  scan_details JSONB DEFAULT NULL, -- Full scan details/history for reference
  
  -- Discrepancy tracking
  has_discrepancies BOOLEAN NOT NULL DEFAULT false,
  
  -- Report status: PENDING_APPROVAL, APPROVED, REJECTED
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
  
  -- Report number for reference
  report_number VARCHAR(100) UNIQUE NOT NULL,
  
  -- Approval tracking
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_receiving_reports_shipment_id ON receiving_reports(shipment_id);
CREATE INDEX idx_receiving_reports_status ON receiving_reports(status);
CREATE INDEX idx_receiving_reports_submitted_by ON receiving_reports(submitted_by);
CREATE INDEX idx_receiving_reports_has_discrepancies ON receiving_reports(has_discrepancies);
CREATE INDEX idx_receiving_reports_report_number ON receiving_reports(report_number);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_receiving_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER receiving_reports_updated_at
  BEFORE UPDATE ON receiving_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_receiving_reports_updated_at();

-- Add table comment
COMMENT ON TABLE receiving_reports IS 'Stores receiving reports from scan-driven receiving workflow with discrepancy tracking';

-- Enable RLS
ALTER TABLE receiving_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow warehouse staff and managers to view all reports
CREATE POLICY "Warehouse staff can view receiving reports"
  ON receiving_reports FOR SELECT
  USING (
    auth.uid() IN (
      SELECT ur.user_id 
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE r.name IN ('warehouse_manager', 'warehouse_staff', 'admin', 'manager')
    )
  );

-- RLS Policy: Allow warehouse staff to create reports
CREATE POLICY "Warehouse staff can create receiving reports"
  ON receiving_reports FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT ur.user_id 
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE r.name IN ('warehouse_manager', 'warehouse_staff', 'admin')
    )
  );

-- RLS Policy: Allow managers to update reports (for approval/rejection)
CREATE POLICY "Managers can update receiving reports"
  ON receiving_reports FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT ur.user_id 
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE r.name IN ('warehouse_manager', 'admin', 'manager')
    )
  );

-- Grant permissions to service role
GRANT ALL ON receiving_reports TO service_role;
GRANT USAGE, SELECT ON SEQUENCE receiving_reports_id_seq TO service_role;
