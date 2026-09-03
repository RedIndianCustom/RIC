-- ============================================================================
-- FIX submit_receiving_report FUNCTION - Add session_id parameter
-- ============================================================================

CREATE OR REPLACE FUNCTION submit_receiving_report(
  p_shipment_id UUID,
  p_session_id VARCHAR DEFAULT NULL,
  p_submitted_by UUID DEFAULT NULL,
  p_size_breakdown JSONB DEFAULT '[]'::jsonb,
  p_total_expected INTEGER DEFAULT 0,
  p_total_scanned INTEGER DEFAULT 0,
  p_total_discrepancy INTEGER DEFAULT 0,
  p_notes TEXT DEFAULT NULL,
  p_scan_details JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_report_id UUID;
  v_report_number VARCHAR(50);
  v_result JSONB;
  v_has_discrepancies BOOLEAN;
BEGIN
  -- Generate report number
  v_report_number := 'RR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  
  -- Determine if there are discrepancies
  v_has_discrepancies := (p_total_discrepancy != 0);
  
  -- Insert report
  INSERT INTO receiving_reports (
    shipment_id,
    session_id,
    report_number,
    submitted_by,
    size_breakdown,
    total_expected,
    total_scanned,
    total_discrepancy,
    notes,
    scan_details,
    has_discrepancies,
    status
  ) VALUES (
    p_shipment_id,
    COALESCE(p_session_id, 'SESSION-' || EXTRACT(EPOCH FROM NOW())::TEXT),
    v_report_number,
    p_submitted_by,
    p_size_breakdown,
    p_total_expected,
    p_total_scanned,
    p_total_discrepancy,
    p_notes,
    p_scan_details,
    v_has_discrepancies,
    CASE 
      WHEN v_has_discrepancies THEN 'PENDING_APPROVAL'
      ELSE 'APPROVED'
    END
  )
  RETURNING id INTO v_report_id;
  
  -- Update shipment status
  UPDATE shipments
  SET 
    status = CASE 
      WHEN v_has_discrepancies THEN 'AWAITING_APPROVAL'
      ELSE 'QC_READY'
    END,
    updated_at = NOW()
  WHERE id = p_shipment_id;
  
  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'report_id', v_report_id,
    'report_number', v_report_number,
    'has_discrepancies', v_has_discrepancies,
    'message', CASE 
      WHEN v_has_discrepancies THEN 'Receiving report submitted for manager approval'
      ELSE 'Receiving report approved automatically (no discrepancies)'
    END
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION submit_receiving_report IS 'Submit a receiving report with optional session_id, auto-approves if no discrepancies';
