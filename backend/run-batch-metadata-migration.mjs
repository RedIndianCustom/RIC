/**
 * ============================================================================
 * RUN BATCH METADATA MIGRATION
 * ============================================================================
 * Adds metadata JSONB column to batches table for storing:
 * - warehouse_code
 * - warehouse_name  
 * - products_with_positions (array of products with assigned_positions)
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
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Running batch metadata migration...\n');

  try {
    // Read migration file
    const migrationPath = join(__dirname, 'database', '025_add_batch_metadata.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Executing migration: 025_add_batch_metadata.sql');
    console.log('━'.repeat(60));

    // Execute migration using Supabase RPC or direct SQL
    // Note: Supabase doesn't have a direct SQL execution method via client library
    // We'll need to use the database connection string
    console.log('\n⚠️ Manual migration required:');
    console.log('\nPlease run the following SQL in Supabase SQL Editor:');
    console.log('━'.repeat(60));
    console.log(migrationSQL);
    console.log('━'.repeat(60));

    // Alternative: Check if metadata column exists
    const { data, error } = await supabase
      .from('batches')
      .select('*')
      .limit(1);

    if (error) {
      console.error('\n❌ Failed to query batches table:', error);
    } else {
      console.log('\n✅ Batches table is accessible');
      console.log('\n📝 Next steps:');
      console.log('1. Copy the SQL migration code above');
      console.log('2. Open Supabase Dashboard → SQL Editor');
      console.log('3. Paste and run the migration');
      console.log('4. Verify metadata column exists\n');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run migration
runMigration();
