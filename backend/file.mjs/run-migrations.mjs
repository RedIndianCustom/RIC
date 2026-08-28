#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

console.log('🔧 Running Database Migrations for Barcode System...\n');

// Get direct database URL for running raw SQL
const dbPassword = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD);
const dbUrl = process.env.SUPABASE_URL.replace('https://', '');
const projectRef = dbUrl.split('.')[0];

// Use pg client for direct SQL execution
import pg from 'pg';
const { Client } = pg;

const connectionString = `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`;

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function runMigration(filename, description) {
  console.log(`📄 Running: ${filename}`);
  console.log(`   ${description}`);
  
  try {
    const sqlPath = join(__dirname, 'database', filename);
    const sql = readFileSync(sqlPath, 'utf8');
    
    await client.query(sql);
    
    console.log(`   ✅ Success!\n`);
    return true;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
    
    // Some errors are not critical
    if (error.message.includes('already exists') || 
        error.message.includes('duplicate key')) {
      console.log(`   ⚠️  Already exists, continuing...\n`);
      return true;
    }
    
    return false;
  }
}

async function main() {
  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected!\n');

    // Run migrations in order
    const migrations = [
      { file: '010_barcode_qr_traceability_schema.sql', desc: 'Create barcode tables and schema' },
      { file: '011_barcode_sequence_function.sql', desc: 'Create sequence increment function' },
      { file: '012_barcode_rpc_functions.sql', desc: 'Create RPC helper functions' },
    ];

    for (const migration of migrations) {
      const success = await runMigration(migration.file, migration.desc);
      if (!success) {
        console.log('⚠️  Migration had errors but continuing...\n');
      }
    }

    // Notify PostgREST to reload schema
    console.log('🔄 Reloading PostgREST schema cache...');
    await client.query("NOTIFY pgrst, 'reload schema'");
    console.log('✅ Schema cache reload requested\n');

    // Verify tables exist
    console.log('🔍 Verifying tables...');
    const { rows } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('barcodes', 'barcode_sequences', 'batches', 'products')
      ORDER BY table_name
    `);

    console.log(`Found ${rows.length} tables:`);
    rows.forEach(row => console.log(`   • ${row.table_name}`));
    console.log();

    // Check sequence
    const { rows: seqRows } = await client.query(`
      SELECT sequence_name, current_value 
      FROM barcode_sequences 
      WHERE sequence_name = 'default'
    `);

    if (seqRows.length > 0) {
      console.log(`✅ Default barcode sequence: ${seqRows[0].current_value}`);
    } else {
      console.log('⚠️  No default sequence found');
    }

    console.log('\n✅ Migration complete!');
    console.log('\n⏳ Please wait 10-30 seconds for PostgREST to reload its schema cache.');
    console.log('   Then the API endpoints will be available.\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
