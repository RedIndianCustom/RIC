/**
 * Add assigned_location_id and product_breakdown columns to shipments table
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addColumns() {
  console.log('🔧 Adding columns to shipments table...\n');

  try {
    // Add assigned_location_id column
    console.log('1️⃣  Adding assigned_location_id column...');
    const { error: error1 } = await supabase.rpc('exec_sql', {
      query: `
        ALTER TABLE public.shipments 
        ADD COLUMN IF NOT EXISTS assigned_location_id UUID REFERENCES public.warehouse_locations(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_shipments_assigned_location 
        ON public.shipments(assigned_location_id);
      `
    });

    if (error1) {
      console.log('⚠️  Note:', error1.message);
    } else {
      console.log('✅ assigned_location_id column added');
    }

    // Add product_breakdown column
    console.log('\n2️⃣  Adding product_breakdown column...');
    const { error: error2 } = await supabase.rpc('exec_sql', {
      query: `
        ALTER TABLE public.shipments 
        ADD COLUMN IF NOT EXISTS product_breakdown JSONB DEFAULT '[]'::jsonb;
        
        CREATE INDEX IF NOT EXISTS idx_shipments_product_breakdown 
        ON public.shipments USING gin(product_breakdown);
      `
    });

    if (error2) {
      console.log('⚠️  Note:', error2.message);
    } else {
      console.log('✅ product_breakdown column added');
    }

    // Verify columns exist
    console.log('\n3️⃣  Verifying columns...');
    const { data: columns, error: error3 } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'shipments' 
          AND column_name IN ('assigned_location_id', 'product_breakdown')
          ORDER BY column_name;
        `
      });

    if (error3) {
      console.error('❌ Verification failed:', error3.message);
    } else {
      console.log('✅ Columns verified:', columns);
    }

    console.log('\n✅ Migration completed!');
    console.log('\n📝 Note: If you see errors above, you may need to run the SQL manually in Supabase SQL Editor.');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('\n📝 Please run this SQL manually in your Supabase SQL Editor:\n');
    console.log(`
-- Add assigned_location_id column
ALTER TABLE public.shipments 
ADD COLUMN IF NOT EXISTS assigned_location_id UUID REFERENCES public.warehouse_locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shipments_assigned_location 
ON public.shipments(assigned_location_id);

-- Add product_breakdown column
ALTER TABLE public.shipments 
ADD COLUMN IF NOT EXISTS product_breakdown JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_shipments_product_breakdown 
ON public.shipments USING gin(product_breakdown);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
    `);
  }
}

addColumns();
