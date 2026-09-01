-- ============================================================================
-- CREATE TEST QC INSPECTION DATA
-- ============================================================================
-- This script creates a test QC inspection for testing the QC Inspection page
-- ============================================================================

-- First, check if we have any received shipments
SELECT 
  id, 
  shipment_number, 
  status,
  total_quantity
FROM shipments 
WHERE status IN ('RECEIVED', 'QC_IN_PROGRESS')
LIMIT 5;

-- Create a QC inspection manually for the most recent received shipment
-- Replace the shipment_id with an actual ID from the query above
INSERT INTO qc_inspections (
  inspection_number,
  shipment_id,
  status,
  due_date,
  total_items,
  items_inspected,
  good_quality_count,
  minor_defect_count,
  major_defect_count,
  inspection_progress,
  created_by,
  created_at,
  updated_at
)
VALUES (
  'QC-SHIP354-' || TO_CHAR(NOW(), 'YYYYMMDD'),
  (SELECT id FROM shipments WHERE status = 'RECEIVED' OR status = 'QC_IN_PROGRESS' ORDER BY received_at DESC LIMIT 1),
  'PENDING',
  NOW() + INTERVAL '15 days',
  5,  -- total items to inspect
  0,  -- items inspected so far
  0,  -- good quality count
  0,  -- minor defect count
  0,  -- major defect count
  0,  -- 0% progress
  (SELECT id FROM auth.users WHERE email LIKE '%anderson%' OR role = 'warehouse_staff' LIMIT 1),
  NOW(),
  NOW()
)
RETURNING *;

-- Verify the QC inspection was created
SELECT * FROM pending_qc_inspections;

-- Check if the warehouse staff user can see it
SELECT 
  qi.*,
  s.shipment_number
FROM qc_inspections qi
LEFT JOIN shipments s ON s.id = qi.shipment_id
WHERE qi.status IN ('PENDING', 'IN_PROGRESS', 'OVERDUE')
ORDER BY qi.created_at DESC;
