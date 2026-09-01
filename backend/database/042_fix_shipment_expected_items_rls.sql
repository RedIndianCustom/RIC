-- ============================================================================
-- Fix RLS Policies for Shipment Expected Items
-- ============================================================================
-- Add missing INSERT, UPDATE, DELETE policies for shipment_expected_items
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Staff can view shipment items" ON public.shipment_expected_items;
DROP POLICY IF EXISTS "Staff can insert shipment items" ON public.shipment_expected_items;
DROP POLICY IF EXISTS "Staff can update shipment items" ON public.shipment_expected_items;
DROP POLICY IF EXISTS "Staff can delete shipment items" ON public.shipment_expected_items;

-- SELECT policy
CREATE POLICY "Staff can view shipment items"
  ON public.shipment_expected_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('operational_staff', 'warehouse_staff', 'manager', 'admin')
    )
  );

-- INSERT policy
CREATE POLICY "Staff can insert shipment items"
  ON public.shipment_expected_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('operational_staff', 'manager', 'admin')
    )
  );

-- UPDATE policy
CREATE POLICY "Staff can update shipment items"
  ON public.shipment_expected_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('operational_staff', 'manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('operational_staff', 'manager', 'admin')
    )
  );

-- DELETE policy
CREATE POLICY "Staff can delete shipment items"
  ON public.shipment_expected_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('operational_staff', 'manager', 'admin')
    )
  );

-- Also fix policies for related tables
-- ============================================================================
-- shipment_received_items
-- ============================================================================

DROP POLICY IF EXISTS "Staff can view received items" ON public.shipment_received_items;
DROP POLICY IF EXISTS "Staff can insert received items" ON public.shipment_received_items;
DROP POLICY IF EXISTS "Staff can update received items" ON public.shipment_received_items;

CREATE POLICY "Staff can view received items"
  ON public.shipment_received_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('warehouse_staff', 'manager', 'admin')
    )
  );

CREATE POLICY "Staff can insert received items"
  ON public.shipment_received_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('warehouse_staff', 'manager', 'admin')
    )
  );

CREATE POLICY "Staff can update received items"
  ON public.shipment_received_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('warehouse_staff', 'manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('warehouse_staff', 'manager', 'admin')
    )
  );

-- ============================================================================
-- shipment_discrepancies
-- ============================================================================

DROP POLICY IF EXISTS "Staff can view discrepancies" ON public.shipment_discrepancies;
DROP POLICY IF EXISTS "Staff can insert discrepancies" ON public.shipment_discrepancies;
DROP POLICY IF EXISTS "Staff can update discrepancies" ON public.shipment_discrepancies;

CREATE POLICY "Staff can view discrepancies"
  ON public.shipment_discrepancies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('warehouse_staff', 'manager', 'admin')
    )
  );

CREATE POLICY "Staff can insert discrepancies"
  ON public.shipment_discrepancies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('warehouse_staff', 'manager', 'admin')
    )
  );

CREATE POLICY "Staff can update discrepancies"
  ON public.shipment_discrepancies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('manager', 'admin')
    )
  );

-- ============================================================================
-- qc_inspection_items
-- ============================================================================

DROP POLICY IF EXISTS "Staff can manage inspection items" ON public.qc_inspection_items;

CREATE POLICY "Staff can manage inspection items"
  ON public.qc_inspection_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.qc_inspections qi
      WHERE qi.id = qc_inspection_items.qc_inspection_id
      AND (
        qi.inspector_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.roles r ON r.id = ur.role_id
          WHERE ur.user_id = auth.uid()
          AND r.name IN ('manager', 'admin')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.qc_inspections qi
      WHERE qi.id = qc_inspection_items.qc_inspection_id
      AND (
        qi.inspector_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.roles r ON r.id = ur.role_id
          WHERE ur.user_id = auth.uid()
          AND r.name IN ('manager', 'admin')
        )
      )
    )
  );

-- ============================================================================
-- defect_inventory
-- ============================================================================

DROP POLICY IF EXISTS "Staff can view defects" ON public.defect_inventory;
DROP POLICY IF EXISTS "Staff can insert defects" ON public.defect_inventory;
DROP POLICY IF EXISTS "Staff can update defects" ON public.defect_inventory;

CREATE POLICY "Staff can view defects"
  ON public.defect_inventory FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('warehouse_staff', 'manager', 'admin')
    )
  );

CREATE POLICY "Staff can insert defects"
  ON public.defect_inventory FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('warehouse_staff', 'manager', 'admin')
    )
  );

CREATE POLICY "Staff can update defects"
  ON public.defect_inventory FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('warehouse_staff', 'manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('warehouse_staff', 'manager', 'admin')
    )
  );

-- ============================================================================
-- workflow_notifications
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their notifications" ON public.workflow_notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.workflow_notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON public.workflow_notifications;

CREATE POLICY "Users can view their notifications"
  ON public.workflow_notifications FOR SELECT
  TO authenticated
  USING (recipient_user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON public.workflow_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Any authenticated user can create notifications

CREATE POLICY "Users can update their notifications"
  ON public.workflow_notifications FOR UPDATE
  TO authenticated
  USING (recipient_user_id = auth.uid())
  WITH CHECK (recipient_user_id = auth.uid());

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify policies are created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename IN (
    'shipment_expected_items',
    'shipment_received_items',
    'shipment_discrepancies',
    'qc_inspections',
    'qc_inspection_items',
    'defect_inventory',
    'workflow_notifications'
)
ORDER BY tablename, cmd;
