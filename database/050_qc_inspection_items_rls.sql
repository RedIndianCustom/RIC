-- Allow warehouse staff, managers, and admins to record and review QC inspection items.
-- qc_inspection_items has RLS enabled in the QC workflow schema but previously had no policy.

ALTER TABLE public.qc_inspection_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "QC staff can manage inspection items" ON public.qc_inspection_items;
CREATE POLICY "QC staff can manage inspection items"
  ON public.qc_inspection_items FOR ALL
  TO authenticated
  USING (
    inspected_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.name IN ('warehouse_staff', 'manager', 'admin')
    )
  )
  WITH CHECK (
    inspected_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.name IN ('warehouse_staff', 'manager', 'admin')
    )
  );

DROP POLICY IF EXISTS "Backend can manage inspection items" ON public.qc_inspection_items;
CREATE POLICY "Backend can manage inspection items"
  ON public.qc_inspection_items FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
