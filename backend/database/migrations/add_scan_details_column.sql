-- ============================================================================
-- ADD scan_details COLUMN TO receiving_reports
-- ============================================================================
-- This column stores the full scan history/details for the receiving session
-- ============================================================================

-- Add scan_details column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'receiving_reports' 
    AND column_name = 'scan_details'
  ) THEN
    ALTER TABLE receiving_reports 
    ADD COLUMN scan_details JSONB DEFAULT NULL;
    
    COMMENT ON COLUMN receiving_reports.scan_details IS 'Full scan history/details from receiving session';
    
    RAISE NOTICE 'Column scan_details added to receiving_reports';
  ELSE
    RAISE NOTICE 'Column scan_details already exists';
  END IF;
END $$;
