#!/usr/bin/env node
/**
 * Direct SQL execution via Supabase REST API
 * This bypasses the schema cache and creates tables directly
 */
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function executeSQL(sql, description) {
  console.log(`\n📄 ${description}`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    console.log('   ✅ Success!');
    return true;
  } catch (error) {
    // Try alternative: use query parameter
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ query: sql })
      });
      
      if (response.ok) {
        console.log('   ✅ Success!');
        return true;
      }
    } catch (e) {
      // Ignore
    }
    
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function createTablesManually() {
  console.log('🔧 Setting up Barcode System Tables Manually...\n');

  // Create barcode_sequences table
  await executeSQL(`
    CREATE TABLE IF NOT EXISTS public.barcode_sequences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sequence_name VARCHAR(50) UNIQUE NOT NULL,
      current_value BIGINT NOT NULL DEFAULT 200000000000,
      prefix VARCHAR(20) DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    INSERT INTO public.barcode_sequences (sequence_name, current_value, prefix)
    VALUES ('default', 200000000000, '')
    ON CONFLICT (sequence_name) DO NOTHING;
    
    ALTER TABLE public.barcode_sequences ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Allow authenticated read barcode_sequences" ON public.barcode_sequences;
    CREATE POLICY "Allow authenticated read barcode_sequences" 
    ON public.barcode_sequences FOR SELECT TO authenticated USING (true);
    
    DROP POLICY IF EXISTS "Allow staff write barcode_sequences" ON public.barcode_sequences;
    CREATE POLICY "Allow staff write barcode_sequences" 
    ON public.barcode_sequences FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    
    GRANT ALL ON public.barcode_sequences TO authenticated;
    GRANT ALL ON public.barcode_sequences TO service_role;
  `, 'Creating barcode_sequences table');

  // Create barcodes table
  await executeSQL(`
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
    
    CREATE UNIQUE INDEX IF NOT EXISTS idx_barcodes_value_unique ON public.barcodes(barcode_value);
    CREATE INDEX IF NOT EXISTS idx_barcodes_product ON public.barcodes(product_id);
    CREATE INDEX IF NOT EXISTS idx_barcodes_status ON public.barcodes(status);
    CREATE INDEX IF NOT EXISTS idx_barcodes_type ON public.barcodes(barcode_type);
    
    ALTER TABLE public.barcodes ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Allow authenticated read barcodes" ON public.barcodes;
    CREATE POLICY "Allow authenticated read barcodes" 
    ON public.barcodes FOR SELECT TO authenticated USING (true);
    
    DROP POLICY IF EXISTS "Allow staff write barcodes" ON public.barcodes;
    CREATE POLICY "Allow staff write barcodes" 
    ON public.barcodes FOR ALL TO authenticated USING (true) WITH CHECK (true);
    
    GRANT ALL ON public.barcodes TO authenticated;
    GRANT ALL ON public.barcodes TO service_role;
  `, 'Creating barcodes table');

  // Create increment function
  await executeSQL(`
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
    
    GRANT EXECUTE ON FUNCTION public.increment_barcode_sequence(TEXT) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.increment_barcode_sequence(TEXT) TO service_role;
  `, 'Creating increment_barcode_sequence function');

  // Create barcode_configurations table
  await executeSQL(`
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
    
    ALTER TABLE public.barcode_configurations ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Allow authenticated read barcode_configurations" ON public.barcode_configurations;
    CREATE POLICY "Allow authenticated read barcode_configurations" 
    ON public.barcode_configurations FOR SELECT TO authenticated USING (true);
    
    DROP POLICY IF EXISTS "Allow staff write barcode_configurations" ON public.barcode_configurations;
    CREATE POLICY "Allow staff write barcode_configurations" 
    ON public.barcode_configurations FOR ALL TO authenticated USING (true) WITH CHECK (true);
    
    GRANT ALL ON public.barcode_configurations TO authenticated;
    GRANT ALL ON public.barcode_configurations TO service_role;
    
    INSERT INTO public.barcode_configurations (format, prefix, include_checksum, is_active)
    VALUES ('CODE128', '', true, true)
    ON CONFLICT DO NOTHING;
  `, 'Creating barcode_configurations table');

  // Reload schema
  await executeSQL(`
    NOTIFY pgrst, 'reload schema';
  `, 'Reloading PostgREST schema cache');

  console.log('\n✅ Setup complete!');
  console.log('\n⏳ Wait 10-30 seconds for PostgREST schema cache to reload.');
  console.log('   Then test with: node test-barcode-endpoints.mjs\n');
}

createTablesManually();
