-- ============================================================================
-- FIX QC INSPECTION RLS POLICY
-- Allow warehouse staff to see ALL pending QC inspections, not just their own
-- ============================================================================

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Staff can manage their work" ON qc_inspections;

-- Create new policy: warehouse_staff can see all pending/in-progress inspections
-- but can only UPDATE inspections assigned to them
CREATE POLICY "Warehouse staff can view all pending inspections"
  ON qc_inspections FOR SELECT
  TO authenticated
  USING (
    -- Allow viewing all inspections in these statuses
    status IN ('PENDING', 'IN_PROGRESS', 'OVERDUE') OR
    -- Or if it's assigned to them (can see completed ones too)
    inspector_id = auth.uid() OR
    -- Or if they're manager/admin (can see everything)
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('manager', 'admin')
    )
  );

-- Create policy for INSERT (managers/admin can create)
CREATE POLICY "Managers can create inspections"
  ON qc_inspections FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('manager', 'admin', 'operational_staff')
    )
  );

-- Create policy for UPDATE (can only update their own inspections)
CREATE POLICY "Staff can update their assigned inspections"
  ON qc_inspections FOR UPDATE
  TO authenticated
  USING (
    inspector_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('manager', 'admin')
    )
  )
  WITH CHECK (
    inspector_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('manager', 'admin')
    )
  );

-- Create policy for DELETE (only managers/admin)
CREATE POLICY "Managers can delete inspections"
  ON qc_inspections FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('manager', 'admin')
    )
  );

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ QC Inspection RLS Policy Fixed!';
  RAISE NOTICE '';
  RAISE NOTICE '   📋 Changes Applied:';
  RAISE NOTICE '   ├─ Warehouse staff can now view ALL pending/in-progress inspections';
  RAISE NOTICE '   ├─ Staff can still only UPDATE inspections assigned to them';
  RAISE NOTICE '   ├─ Managers/admin maintain full access';
  RAISE NOTICE '   └─ Separate policies for SELECT, INSERT, UPDATE, DELETE';
  RAISE NOTICE '';
  RAISE NOTICE '   🔒 Security Maintained:';
  RAISE NOTICE '   ├─ Staff cannot modify other people''s inspections';
  RAISE NOTICE '   ├─ Only authorized roles can create inspections';
  RAISE NOTICE '   └─ Only managers/admin can delete inspections';
  RAISE NOTICE '';
END $$;
