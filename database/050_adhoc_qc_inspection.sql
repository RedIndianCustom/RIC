-- Allow warehouse staff to submit a QC defect report when no shipment is active.
ALTER TABLE qc_inspections
  ALTER COLUMN shipment_id DROP NOT NULL;

ALTER TABLE qc_inspection_items
  ALTER COLUMN product_id DROP NOT NULL;

COMMENT ON COLUMN qc_inspections.shipment_id IS
  'Shipment being inspected; NULL for an ad hoc warehouse defect report.';

COMMENT ON COLUMN qc_inspection_items.product_id IS
  'Product reference; NULL is allowed when a scanned barcode is not registered yet.';

-- Remove abandoned ad hoc drafts created before the UI saved only submitted reports.
DELETE FROM qc_inspections
WHERE inspection_number LIKE 'QC-ADHOC-%'
  AND COALESCE(items_inspected, 0) = 0
  AND status IN ('PENDING', 'IN_PROGRESS', 'PAUSED', 'OVERDUE');