-- ============================================================================
-- FIX QC MANAGER APPROVAL VIEW
-- ============================================================================
-- Issue: Manager cannot see completed QC inspections awaiting approval
-- Cause: pending_qc_inspections view only shows PENDING/IN_PROGRESS/OVERDUE
-- Solution: Create separate view for completed inspections awaiting manager approval
-- ============================================================================

-- Drop existing view if needed for modification
-- DROP VIEW IF EXISTS pending_qc_inspections CASCADE;

-- Create view for completed QC inspections awaiting manager approval
CREATE OR REPLACE VIEW qc_inspections_awaiting_approval AS
SELECT 
  qi.id,
  qi.inspection_number,
  qi.shipment_id,
  s.shipment_number,
  s.container_number,
  qi.status,
  qi.total_items,
  qi.items_inspected,
  qi.good_quality_count,
  qi.minor_defect_count,
  qi.major_defect_count,
  qi.good_quality_percentage,
  qi.minor_defect_percentage,
  qi.major_defect_percentage,
  qi.inspector_id,
  qi.inspector_notes,
  qi.overall_assessment,
  qi.recommendations,
  qi.inspection_start_date,
  qi.inspection_end_date,
  qi.manager_decision,
  qi.manager_notes,
  qi.manager_reviewed_by,
  qi.manager_reviewed_at,
  qi.created_at,
  -- Join user info for inspector
  inspector.email AS inspector_email,
  inspector.full_name AS inspector_name,
  -- Join reviewer info
  reviewer.email AS reviewer_email,
  reviewer.full_name AS reviewer_name,
  -- Calculate days since completion
  EXTRACT(DAY FROM (now() - qi.inspection_end_date))::INTEGER AS days_since_completion
FROM qc_inspections qi
LEFT JOIN shipments s ON s.id = qi.shipment_id
LEFT JOIN users inspector ON inspector.id = qi.inspector_id
LEFT JOIN users reviewer ON reviewer.id = qi.manager_reviewed_by
WHERE qi.status = 'COMPLETED' 
  AND (qi.manager_decision IS NULL OR qi.manager_decision = 'PENDING')
ORDER BY qi.inspection_end_date ASC;

-- Grant access to authenticated users (managers)
GRANT SELECT ON qc_inspections_awaiting_approval TO authenticated;

-- Add comment
COMMENT ON VIEW qc_inspections_awaiting_approval IS 
'QC inspections that have been completed by warehouse staff and are awaiting manager approval/decision';

-- ============================================================================
-- Also update pending_qc_inspections to be more inclusive for warehouse staff
-- ============================================================================

CREATE OR REPLACE VIEW pending_qc_inspections AS
SELECT 
  qi.id,
  qi.inspection_number,
  qi.shipment_id,
  s.shipment_number,
  s.container_number,
  qi.status,
  qi.due_date,
  CASE 
    WHEN qi.due_date < now() AND qi.status IN ('PENDING', 'IN_PROGRESS') THEN EXTRACT(DAY FROM (now() - qi.due_date))::INTEGER
    ELSE NULL
  END AS days_overdue,
  CASE 
    WHEN qi.due_date < now() AND qi.status IN ('PENDING', 'IN_PROGRESS') THEN true
    ELSE false
  END AS is_overdue,
  qi.total_items,
  qi.items_inspected,
  qi.inspection_progress,
  qi.good_quality_count,
  qi.minor_defect_count,
  qi.major_defect_count,
  qi.inspector_id,
  u.full_name AS inspector_name,
  qi.ready_for_qc_date,
  qi.created_at
FROM qc_inspections qi
LEFT JOIN shipments s ON s.id = qi.shipment_id
LEFT JOIN users u ON u.id = qi.inspector_id
WHERE qi.status IN ('PENDING', 'IN_PROGRESS', 'OVERDUE')
ORDER BY 
  CASE WHEN qi.due_date < now() THEN 0 ELSE 1 END,
  qi.due_date ASC;

-- Grant access
GRANT SELECT ON pending_qc_inspections TO authenticated;

-- ============================================================================
-- RLS Policies for qc_inspections_awaiting_approval
-- ============================================================================

-- Managers and admins can view all completed inspections awaiting approval
CREATE POLICY "Managers can view completed inspections"
  ON qc_inspections FOR SELECT
  TO authenticated
  USING (
    status = 'COMPLETED' 
    AND (manager_decision IS NULL OR manager_decision = 'PENDING')
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      INNER JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('manager', 'admin')
    )
  );

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Test: Check completed inspections
DO $$
DECLARE
  completed_count INTEGER;
  awaiting_count INTEGER;
BEGIN
  -- Count completed inspections
  SELECT COUNT(*) INTO completed_count
  FROM qc_inspections
  WHERE status = 'COMPLETED';
  
  -- Count from new view
  SELECT COUNT(*) INTO awaiting_count
  FROM qc_inspections_awaiting_approval;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 QC Inspection Status:';
  RAISE NOTICE '  Total COMPLETED inspections: %', completed_count;
  RAISE NOTICE '  Awaiting manager approval: %', awaiting_count;
  RAISE NOTICE '';
  
  IF completed_count > 0 AND awaiting_count = 0 THEN
    RAISE WARNING '⚠️  Completed inspections exist but none awaiting approval!';
    RAISE NOTICE '  This might mean manager_decision is already set.';
  ELSIF awaiting_count > 0 THEN
    RAISE NOTICE '✅ Manager approval view is working correctly';
  END IF;
END $$;

-- Show sample data
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 Sample completed inspections:';
END $$;

SELECT 
  inspection_number,
  shipment_number,
  status,
  items_inspected,
  good_quality_count,
  minor_defect_count,
  major_defect_count,
  manager_decision,
  TO_CHAR(inspection_end_date, 'YYYY-MM-DD HH24:MI') AS completed_at
FROM qc_inspections_awaiting_approval
LIMIT 5;
