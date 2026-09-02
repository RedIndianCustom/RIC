-- ============================================================================
-- QUICK SETUP: Barcode Configuration Table
-- Copy and paste this entire file into Supabase SQL Editor and run it
-- ============================================================================

-- Create barcode configurations table
CREATE TABLE IF NOT EXISTS public.barcode_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    format VARCHAR(50) NOT NULL DEFAULT 'CODE128',
    prefix VARCHAR(20) NOT NULL DEFAULT 'RIC-TR',
    include_date_stamp BOOLEAN NOT NULL DEFAULT true,
    include_checksum BOOLEAN NOT NULL DEFAULT true,
    serial_length INTEGER NOT NULL DEFAULT 6,
    label_size VARCHAR(20) DEFAULT '4x2',
    printer_dpi INTEGER DEFAULT 300,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_barcode_config_active 
ON public.barcode_configurations(is_active) WHERE is_active = true;

-- Insert default configuration
INSERT INTO public.barcode_configurations (
    format, prefix, include_date_stamp, include_checksum, 
    serial_length, label_size, printer_dpi, is_active
) VALUES (
    'CODE128', 'RIC-TR', true, true, 6, '4x2', 300, true
) ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.barcode_configurations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage barcode configs" ON public.barcode_configurations;
DROP POLICY IF EXISTS "Authenticated users can read active config" ON public.barcode_configurations;

-- Create policies
CREATE POLICY "Admins can manage barcode configs"
ON public.barcode_configurations FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
    )
);

CREATE POLICY "Authenticated users can read active config"
ON public.barcode_configurations FOR SELECT TO authenticated
USING (is_active = true);

-- Grant permissions
GRANT SELECT ON public.barcode_configurations TO authenticated;
GRANT ALL ON public.barcode_configurations TO service_role;

-- IMPORTANT: Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Verify setup
SELECT 
    'Barcode configuration table created successfully!' as message,
    COUNT(*) as config_count,
    format, prefix, is_active
FROM public.barcode_configurations
WHERE is_active = true
GROUP BY format, prefix, is_active;
