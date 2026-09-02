-- ============================================================================
-- 011: BARCODE SEQUENCE INCREMENT FUNCTION
-- ============================================================================
-- Creates a PostgreSQL function for atomic, concurrent-safe barcode sequence increment
-- This function ensures no duplicate barcodes are generated even under high concurrency
-- ============================================================================

-- Drop function if exists
DROP FUNCTION IF EXISTS public.increment_barcode_sequence(TEXT);

-- Create atomic increment function
CREATE OR REPLACE FUNCTION public.increment_barcode_sequence(seq_name TEXT)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_value BIGINT;
BEGIN
  -- Use SELECT FOR UPDATE to lock the row (prevents race conditions)
  UPDATE public.barcode_sequences
  SET current_value = current_value + 1,
      updated_at = NOW()
  WHERE sequence_name = seq_name
  RETURNING current_value INTO next_value;

  -- If sequence doesn't exist, create it
  IF NOT FOUND THEN
    INSERT INTO public.barcode_sequences (sequence_name, current_value)
    VALUES (seq_name, 200000000001)
    RETURNING current_value INTO next_value;
  END IF;

  RETURN next_value;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.increment_barcode_sequence(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_barcode_sequence(TEXT) TO service_role;

-- Comment
COMMENT ON FUNCTION public.increment_barcode_sequence(TEXT) IS 
'Atomically increments barcode sequence counter - prevents duplicate barcodes under concurrent requests';

-- Verify function exists
SELECT 
  '✅ Barcode sequence function created successfully!' as status,
  proname as function_name,
  prokind as function_type
FROM pg_proc
WHERE proname = 'increment_barcode_sequence';
