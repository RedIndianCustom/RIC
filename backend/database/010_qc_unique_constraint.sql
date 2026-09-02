-- ============================================================================
-- QC INSPECTION UNIQUE CONSTRAINT
-- ============================================================================
-- Prevents duplicate barcode scans within the same QC inspection
-- Created: 2026-08-19
-- ============================================================================

-- First, remove any existing duplicates (keep the oldest entry)
-- This is a safety measure in case duplicates exist

DO $$
DECLARE
  dup_record RECORD;
  ids_to_delete UUID[];
BEGIN
  FOR dup_record IN
    SELECT qc_inspection_id, barcode, array_agg(id ORDER BY created_at) as ids
    FROM qc_inspection_items
    GROUP BY qc_inspection_id, barcode
    HAVING COUNT(*) > 1
  LOOP
    -- Keep first (oldest), delete the rest
    ids_to_delete := dup_record.ids[2:];
    
    IF array_length(ids_to_delete, 1) > 0 THEN
      RAISE NOTICE 'Removing % duplicate(s) for inspection %, barcode %', 
        array_length(ids_to_delete, 1), 
        dup_record.qc_inspection_id, 
        dup_record.barcode;
      
      DELETE FROM qc_inspection_items
      WHERE id = ANY(ids_to_delete);
    END IF;
  END LOOP;
END $$;

-- Add unique constraint to prevent future duplicates
-- This ensures each barcode can only be inspected once per QC inspection

-- Drop constraint if it exists (idempotent)
ALTER TABLE qc_inspection_items
DROP CONSTRAINT IF EXISTS qc_inspection_items_inspection_barcode_unique;

-- Add the constraint
ALTER TABLE qc_inspection_items
ADD CONSTRAINT qc_inspection_items_inspection_barcode_unique
UNIQUE (qc_inspection_id, barcode);

-- Add helpful comment
COMMENT ON CONSTRAINT qc_inspection_items_inspection_barcode_unique 
ON qc_inspection_items 
IS 'Ensures each barcode can only be inspected once per QC inspection to prevent duplicate entries';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_qc_inspection_items_barcode 
ON qc_inspection_items (barcode);

CREATE INDEX IF NOT EXISTS idx_qc_inspection_items_inspection_id 
ON qc_inspection_items (qc_inspection_id);

-- Verify constraint was added
DO $$
DECLARE
  constraint_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO constraint_count
  FROM pg_constraint
  WHERE conname = 'qc_inspection_items_inspection_barcode_unique'
  AND conrelid = 'qc_inspection_items'::regclass;
  
  IF constraint_count > 0 THEN
    RAISE NOTICE '✅ Unique constraint successfully created';
  ELSE
    RAISE EXCEPTION '❌ Failed to create unique constraint';
  END IF;
END $$;

-- Show current statistics
DO $$
DECLARE
  total_items INTEGER;
  unique_combos INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_items FROM qc_inspection_items;
  SELECT COUNT(DISTINCT (qc_inspection_id, barcode)) INTO unique_combos FROM qc_inspection_items;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 QC Inspection Items Statistics:';
  RAISE NOTICE '  Total items: %', total_items;
  RAISE NOTICE '  Unique (inspection + barcode) combinations: %', unique_combos;
  RAISE NOTICE '';
END $$;
