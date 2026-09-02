-- ============================================================================
-- FIX: get_pending_receiving_approvals() return type mismatch
-- ============================================================================
-- Issue: Function expects VARCHAR but table column is TEXT
-- Solution: Drop and recreate function with correct TEXT type for submitted_by_name
-- ============================================================================

-- Drop the existing function first (required when changing return type)
DROP FUNCTION IF EXISTS get_pending_receiving_approvals();

-- Recreate with correct type
CREATE OR REPLACE FUNCTION get_pending_receiving_approvals()
RETURNS TABLE (
  report_id UUID,
  report_number VARCHAR(50),
  shipment_id UUID,
  shipment_number VARCHAR(100),
  submitted_by_id UUID,
  submitted_by_name TEXT, -- Changed from VARCHAR(255) to TEXT
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

COMMENT ON FUNCTION get_pending_receiving_approvals IS 'Get all pending receiving reports awaiting manager approval (fixed type mismatch)';
