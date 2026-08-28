/**
 * Quick script to run a single migration file
 * Usage: node run-single-migration.mjs database/030_add_shipment_location_and_breakdown.sql
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration(filePath) {
  try {
    console.log(`\n📄 Reading migration: ${filePath}`);
    const sql = readFileSync(resolve(__dirname, filePath), 'utf8');
    
    console.log('🚀 Executing migration...\n');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // Try direct execution via REST API if RPC doesn't work
      console.log('⚠️  RPC method failed, trying direct execution...');
      
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ sql_query: sql })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Migration executed successfully!');
      console.log('Result:', result);
    } else {
      console.log('✅ Migration executed successfully!');
      if (data) console.log('Result:', data);
    }
    
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

// Get file path from command line argument
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('❌ Please provide a migration file path');
  console.log('Usage: node run-single-migration.mjs <path-to-migration.sql>');
  process.exit(1);
}

runMigration(migrationFile);
