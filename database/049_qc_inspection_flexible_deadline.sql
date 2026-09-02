-- ============================================================================
-- QC INSPECTION FLEXIBLE DEADLINE ENHANCEMENT
-- ============================================================================
-- Purpose: Allow QC inspections to have flexible deadlines or no deadline
-- Who sets it: Operational Manager when approving shipment receiving
-- Options:
--   1. Custom deadline (specific date)
--   2. Standard deadline (15 days default)
--   3. No deadline (urgent/rush orders)
-- ============================================================================

-- Step 1: Add new columns to qc_inspections table
ALTER TABLE qc_inspections 
  ADD COLUMN IF NOT EXISTS has_deadline BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS deadline_type VARCHAR(50) DEFAULT 'STANDARD' CHECK (deadline_type IN ('STANDARD', 'CUSTOM', 'NONE')),
  ADD COLUMN IF NOT EXISTS deadline_set_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS deadline_set_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS custom_deadline_days INTEGER, -- For custom deadline (e.g., 7 days, 30 days)
  ADD COLUMN IF NOT EXISTS deadline_reason TEXT; -- Why this deadline was set

-- Step 2: Create helpful comments
COMMENT ON COLUMN qc_inspections.has_deadline IS 'Whether this inspection has a deadline or not';
COMMENT ON COLUMN qc_inspections.deadline_type IS 'Type of deadline: STANDARD (15 days), CUSTOM (manager specified), or NONE (no deadline)';
COMMENT ON COLUMN qc_inspections.deadline_set_by IS 'User (manager) who set the deadline';
COMMENT ON COLUMN qc_inspections.custom_deadline_days IS 'Number of days for custom deadline (if deadline_type = CUSTOM)';
COMMENT ON COLUMN qc_inspections.deadline_reason IS 'Reason for the deadline setting (e.g., urgent order, seasonal product)';

-- Step 3: Update the trigger function to handle flexible deadlines
CREATE OR REPLACE FUNCTION set_qc_due_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set due_date if inspection has a deadline
  IF NEW.has_deadline = true THEN
    -- If ready_for_qc_date is set and due_date is not yet set
    IF NEW.ready_for_qc_date IS NOT NULL AND NEW.due_date IS NULL THEN
      -- STANDARD: 15 days from ready date
      IF NEW.deadline_type = 'STANDARD' OR NEW.deadline_type IS NULL THEN
        NEW.due_date := NEW.ready_for_qc_date + INTERVAL '15 days';
        NEW.deadline_type := 'STANDARD';
      
      -- CUSTOM: Use custom_deadline_days
      ELSIF NEW.deadline_type = 'CUSTOM' AND NEW.custom_deadline_days IS NOT NULL THEN
        NEW.due_date := NEW.ready_for_qc_date + (NEW.custom_deadline_days || ' days')::INTERVAL;
      
      -- NONE: No deadline
      ELSIF NEW.deadline_type = 'NONE' THEN
        NEW.due_date := NULL;
      END IF;
    END IF;
  ELSE
    -- No deadline
    NEW.due_date := NULL;
    NEW.deadline_type := 'NONE';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS set_qc_inspection_due_date ON qc_inspections;
CREATE TRIGGER set_qc_inspection_due_date
  BEFORE INSERT OR UPDATE ON qc_inspections
  FOR EACH ROW EXECUTE FUNCTION set_qc_due_date();

-- Step 4: Update overdue check function to respect has_deadline flag
CREATE OR REPLACE FUNCTION check_qc_overdue_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check for overdue if inspection has a deadline
  IF NEW.has_deadline = true AND NEW.due_date IS NOT NULL THEN
    IF NEW.status IN ('PENDING', 'IN_PROGRESS', 'PAUSED') AND NEW.due_date < now() THEN
      NEW.status := 'OVERDUE';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS check_qc_inspection_overdue ON qc_inspections;
CREATE TRIGGER check_qc_inspection_overdue
  BEFORE UPDATE ON qc_inspections
  FOR EACH ROW EXECUTE FUNCTION check_qc_overdue_status();

-- Step 5: Update pending_qc_inspections view to include deadline info
-- Drop the existing view first to avoid column conflicts
DROP VIEW IF EXISTS pending_qc_inspections CASCADE;

CREATE VIEW pending_qc_inspections AS
SELECT 
  qi.id,
  qi.inspection_number,
  qi.shipment_id,
  qi.inspector_id,
  qi.status,
  qi.total_items,
  qi.items_inspected,
  qi.inspection_progress,
  qi.good_quality_count,
  qi.minor_defect_count,
  qi.major_defect_count,
  qi.ready_for_qc_date,
  qi.due_date,
  qi.has_deadline,
  qi.deadline_type,
  qi.deadline_set_by,
  qi.custom_deadline_days,
  qi.deadline_reason,
  
  -- Calculate days remaining (only if has deadline)
  CASE 
    WHEN qi.has_deadline = true AND qi.due_date IS NOT NULL THEN
      EXTRACT(DAY FROM (qi.due_date - now()))::INTEGER
    ELSE
      NULL
  END AS days_remaining,
  
  -- Urgency level
  CASE 
    WHEN qi.has_deadline = false OR qi.due_date IS NULL THEN 'NO_DEADLINE'
    WHEN qi.due_date < now() THEN 'OVERDUE'
    WHEN qi.due_date < (now() + INTERVAL '3 days') THEN 'URGENT'
    WHEN qi.due_date < (now() + INTERVAL '7 days') THEN 'SOON'
    ELSE 'NORMAL'
  END AS urgency_level,
  
  s.shipment_number,
  s.supplier_id,
  u.full_name AS inspector_name,
  qi.created_at
FROM qc_inspections qi
LEFT JOIN shipments s ON s.id = qi.shipment_id
LEFT JOIN users u ON u.id = qi.inspector_id
WHERE qi.status IN ('PENDING', 'IN_PROGRESS', 'OVERDUE', 'PAUSED');

-- Step 6: Create helper function for managers to set QC deadline when approving receiving
CREATE OR REPLACE FUNCTION set_qc_inspection_deadline(
  p_qc_inspection_id UUID,
  p_deadline_type VARCHAR(50), -- 'STANDARD', 'CUSTOM', or 'NONE'
  p_custom_deadline_days INTEGER DEFAULT NULL,
  p_deadline_reason TEXT DEFAULT NULL,
  p_manager_id UUID DEFAULT auth.uid()
)
RETURNS JSONB AS $$
DECLARE
  v_inspection RECORD;
  v_result JSONB;
BEGIN
  -- Get the inspection
  SELECT * INTO v_inspection
  FROM qc_inspections
  WHERE id = p_qc_inspection_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'QC inspection not found'
    );
  END IF;
  
  -- Update deadline settings
  UPDATE qc_inspections
  SET
    has_deadline = (p_deadline_type != 'NONE'),
    deadline_type = p_deadline_type,
    custom_deadline_days = p_custom_deadline_days,
    deadline_reason = p_deadline_reason,
    deadline_set_by = p_manager_id,
    deadline_set_at = now(),
    updated_at = now()
  WHERE id = p_qc_inspection_id
  RETURNING * INTO v_inspection;
  
  -- Build response
  v_result := jsonb_build_object(
    'success', true,
    'inspection', row_to_json(v_inspection),
    'message', 'QC inspection deadline updated successfully'
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION set_qc_inspection_deadline TO authenticated;

-- Step 7: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_qc_inspections_has_deadline ON qc_inspections(has_deadline);
CREATE INDEX IF NOT EXISTS idx_qc_inspections_deadline_type ON qc_inspections(deadline_type);

-- Step 8: Create example deadline presets for managers
CREATE TABLE IF NOT EXISTS qc_deadline_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  deadline_type VARCHAR(50) NOT NULL CHECK (deadline_type IN ('STANDARD', 'CUSTOM', 'NONE')),
  custom_days INTEGER,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default presets
INSERT INTO qc_deadline_presets (name, description, deadline_type, custom_days, sort_order) VALUES
  ('Standard (15 days)', 'Default inspection deadline - 15 business days', 'STANDARD', NULL, 1),
  ('Rush Order (3 days)', 'Urgent inspection needed within 3 days', 'CUSTOM', 3, 2),
  ('Express (1 day)', 'Critical - inspect within 24 hours', 'CUSTOM', 1, 3),
  ('Extended (30 days)', 'Non-urgent inspection - 30 days allowed', 'CUSTOM', 30, 4),
  ('Seasonal (7 days)', 'Seasonal product - inspect within 1 week', 'CUSTOM', 7, 5),
  ('No Deadline', 'No specific deadline required', 'NONE', NULL, 6)
ON CONFLICT DO NOTHING;

-- Grant access
GRANT SELECT ON qc_deadline_presets TO authenticated;

-- Step 9: Add helpful comments and documentation
COMMENT ON FUNCTION set_qc_inspection_deadline IS 'Allows operational managers to set flexible deadlines for QC inspections when approving shipment receiving';
COMMENT ON TABLE qc_deadline_presets IS 'Predefined deadline options for managers to choose from when setting QC inspection deadlines';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check the new columns
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'qc_inspections' 
  AND column_name IN ('has_deadline', 'deadline_type', 'custom_deadline_days', 'deadline_reason', 'deadline_set_by')
ORDER BY ordinal_position;

-- Check deadline presets
SELECT * FROM qc_deadline_presets ORDER BY sort_order;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

/*
-- Example 1: Set standard 15-day deadline
SELECT set_qc_inspection_deadline(
  'inspection-uuid-here',
  'STANDARD',
  NULL,
  'Regular inspection timeline'
);

-- Example 2: Set custom 3-day rush deadline
SELECT set_qc_inspection_deadline(
  'inspection-uuid-here',
  'CUSTOM',
  3,
  'Rush order - customer needs products ASAP'
);

-- Example 3: Set no deadline (urgent/special case)
SELECT set_qc_inspection_deadline(
  'inspection-uuid-here',
  'NONE',
  NULL,
  'VIP customer - no deadline, inspect as available'
);

-- Example 4: View all pending inspections with deadline info
SELECT 
  inspection_number,
  shipment_number,
  deadline_type,
  has_deadline,
  due_date,
  days_remaining,
  urgency_level,
  status
FROM pending_qc_inspections
ORDER BY 
  CASE urgency_level
    WHEN 'OVERDUE' THEN 1
    WHEN 'URGENT' THEN 2
    WHEN 'SOON' THEN 3
    WHEN 'NORMAL' THEN 4
    WHEN 'NO_DEADLINE' THEN 5
  END,
  due_date NULLS LAST;
*/
