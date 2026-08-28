/**
 * ============================================================================
 * EXECUTE BATCH METADATA MIGRATION DIRECTLY
 * ============================================================================
 * Runs the migration using Supabase's SQL query method
 * ============================================================================
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase connection
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

async function runMigration() {
  console.log('🚀 Executing batch metadata migration...\n');

  try {
    // Simple SQL to add metadata column
    const migrationSQL = `
      -- Add metadata column if it doesn't exist
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'batches' 
          AND column_name = 'metadata'
        ) THEN
          ALTER TABLE public.batches 
          ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
          
          RAISE NOTICE 'Added metadata column to batches table';
        ELSE
          RAISE NOTICE 'metadata column already exists in batches table';
        END IF;
      END $$;

      -- Add index for efficient JSON queries
      CREATE INDEX IF NOT EXISTS idx_batches_metadata ON public.batches USING GIN (metadata);
    `;

    console.log('📄 Executing SQL migration...');
    console.log('━'.repeat(60));

    // Use RPC to execute raw SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      query: migrationSQL
    });

    if (error) {
      console.error('❌ Migration error:', error);
      console.log('\n⚠️ The exec_sql RPC function may not exist.');
      console.log('\n📝 Please run the migration manually:');
      console.log('1. Open Supabase Dashboard → SQL Editor');
      console.log('2. Copy backend/database/025_add_batch_metadata.sql');
      console.log('3. Paste and execute\n');
      process.exit(1);
    }

    console.log('\n✅ Migration executed successfully!');
    console.log('\n📊 Metadata column added to batches table');
    console.log('   - warehouse_code');
    console.log('   - warehouse_name');
    console.log('   - products_with_positions (array)\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n📝 Manual migration required:');
    console.log('1. Open Supabase Dashboard → SQL Editor');
    console.log('2. Copy backend/database/025_add_batch_metadata.sql');
    console.log('3. Paste and execute\n');
    process.exit(1);
  }
}

runMigration();
