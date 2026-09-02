-- ============================================================================
-- COMPLETE BARCODE SYSTEM SETUP
-- ============================================================================
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- This creates all necessary tables and functions for barcode/QR generation
-- ============================================================================

-- 1. Create barcode_sequences table
CREATE TABLE IF NOT EXISTS public.barcode_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_name VARCHAR(50) UNIQUE NOT NULL,
  current_value BIGINT NOT NULL DEFAULT 200000000000,
  prefix VARCHAR(20) DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default sequence
INSERT INTO public.barcode_sequences (sequence_name, current_value, prefix)
VALUES ('default', 200000000000, '')
ON CONFLICT (sequence_name) DO NOTHING;

-- 2. Create barcodes table
CREATE TABLE IF NOT EXISTS public.barcodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode_value VARCHAR(100) UNIQUE NOT NULL,
  barcode_type VARCHAR(50) NOT NULL DEFAULT 'CODE128',
  product_id UUID,
  batch_id UUID,
  inventory_unit_id UUID,
  qr_code_data TEXT,
  qr_code_url TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  generated_by UUID,
  printed_count INTEGER NOT NULL DEFAULT 0,
  last_printed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT check_barcode_value_not_empty CHECK (LENGTH(barcode_value) > 0)
);

-- Indexes for performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_barcodes_value_unique ON public.barcodes(barcode_value);
CREATE INDEX IF NOT EXISTS idx_barcodes_product ON public.barcodes(product_id);
CREATE INDEX IF NOT EXISTS idx_barcodes_status ON public.barcodes(status);
CREATE INDEX IF NOT EXISTS idx_barcodes_type ON public.barcodes(barcode_type);

-- 3. Create barcode_configurations table
CREATE TABLE IF NOT EXISTS public.barcode_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  format VARCHAR(50) NOT NULL DEFAULT 'CODE128',
  prefix VARCHAR(20) DEFAULT '',
  include_date_stamp BOOLEAN DEFAULT false,
  include_checksum BOOLEAN DEFAULT true,
  serial_length INTEGER DEFAULT 12,
  label_size VARCHAR(20) DEFAULT '4x2',
  printer_dpi INTEGER DEFAULT 300,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default configuration
INSERT INTO public.barcode_configurations (format, prefix, include_checksum, is_active)
VALUES ('CODE128', '', true, true)
ON CONFLICT DO NOTHING;

-- 4. Create increment function (concurrent-safe)
CREATE OR REPLACE FUNCTION public.increment_barcode_sequence(seq_name TEXT)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_value BIGINT;
BEGIN
  UPDATE public.barcode_sequences
  SET current_value = current_value + 1,
      updated_at = NOW()
  WHERE sequence_name = seq_name
  RETURNING current_value INTO next_value;

  IF NOT FOUND THEN
    INSERT INTO public.barcode_sequences (sequence_name, current_value)
    VALUES (seq_name, 200000000001)
    RETURNING current_value INTO next_value;
  END IF;

  RETURN next_value;
END;
$$;

-- 5. Enable Row Level Security
ALTER TABLE public.barcode_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barcode_configurations ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies (allow authenticated users)
DROP POLICY IF EXISTS "Allow authenticated read barcode_sequences" ON public.barcode_sequences;
CREATE POLICY "Allow authenticated read barcode_sequences" 
ON public.barcode_sequences FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow staff write barcode_sequences" ON public.barcode_sequences;
CREATE POLICY "Allow staff write barcode_sequences" 
ON public.barcode_sequences FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated read barcodes" ON public.barcodes;
CREATE POLICY "Allow authenticated read barcodes" 
ON public.barcodes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow staff write barcodes" ON public.barcodes;
CREATE POLICY "Allow staff write barcodes" 
ON public.barcodes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated read barcode_configurations" ON public.barcode_configurations;
CREATE POLICY "Allow authenticated read barcode_configurations" 
ON public.barcode_configurations FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow staff write barcode_configurations" ON public.barcode_configurations;
CREATE POLICY "Allow staff write barcode_configurations" 
ON public.barcode_configurations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Grant permissions
GRANT ALL ON public.barcode_sequences TO authenticated;
GRANT ALL ON public.barcodes TO authenticated;
GRANT ALL ON public.barcode_configurations TO authenticated;

GRANT ALL ON public.barcode_sequences TO service_role;
GRANT ALL ON public.barcodes TO service_role;
GRANT ALL ON public.barcode_configurations TO service_role;

GRANT EXECUTE ON FUNCTION public.increment_barcode_sequence(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_barcode_sequence(TEXT) TO service_role;

-- 8. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- 9. Verification query
SELECT 
  '✅ Barcode system setup complete!' as status,
  (SELECT COUNT(*) FROM public.barcodes) as barcodes_count,
  (SELECT current_value FROM public.barcode_sequences WHERE sequence_name = 'default') as next_sequence,
  (SELECT format || ' (' || COALESCE(prefix, 'no prefix') || ')' FROM public.barcode_configurations WHERE is_active = true LIMIT 1) as config;
