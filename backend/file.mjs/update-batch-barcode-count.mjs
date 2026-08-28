/**
 * ============================================================================
 * UPDATE BATCH BARCODE COUNT
 * ============================================================================
 * Runs the SQL script to add barcode_count column and trigger
 * Execute this script to enable automatic barcode counting
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Parse Supabase connection string
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error('❌ Error: DATABASE_URL or SUPABASE_DB_URL not found in .env file');
  process.exit(1);
}

// Create connection pool
const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runScript() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting batch barcode count enhancement...\n');
    
    // Read SQL file
    const sqlPath = path.join(__dirname, 'database', '016_batch_barcode_count.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Loaded SQL script: 016_batch_barcode_count.sql');
    console.log('⚙️  Executing...\n');
    
    // Execute SQL
    const result = await client.query(sql);
    
    console.log('\n✅ Script executed successfully!');
    console.log('\n📊 Summary:');
    console.log('   • barcode_count column added to batches table');
    console.log('   • Trigger created for automatic updates');
    console.log('   • Existing batches initialized with current counts');
    console.log('   • Index created for performance');
    
    console.log('\n🎉 Enhancement complete! Barcode counts will now update automatically.\n');
    
  } catch (error) {
    console.error('\n❌ Error executing script:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
runScript();
