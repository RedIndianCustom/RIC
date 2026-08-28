#!/usr/bin/env node

/**
 * ============================================================================
 * APPLY CORRECTED DATA ARCHITECTURE
 * ============================================================================
 * Applies the corrected relationship chain migration to Supabase
 * 
 * Usage:
 *   node apply-architecture-fix.mjs
 * 
 * What this does:
 * - Reads 013_correct_data_architecture.sql
 * - Connects to your Supabase database
 * - Executes the migration
 * - Verifies the changes
 * - Shows traceability sample data
 * ============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

const MIGRATION_FILE = path.join(__dirname, 'database', '013_correct_data_architecture.sql');

// ============================================================================
// COLORS FOR CONSOLE OUTPUT
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'bright');
  console.log('='.repeat(80));
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  logSection('🔧 RIC ARCHITECTURE CORRECTION MIGRATION');
  
  // Step 1: Validate environment
  log('\n📋 Step 1: Validating environment...', 'cyan');
  
  if (!DATABASE_URL && (!SUPABASE_URL || !SUPABASE_SERVICE_KEY)) {
    log('❌ ERROR: Missing database credentials', 'red');
    log('Please set either DATABASE_URL or SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env', 'yellow');
    process.exit(1);
  }
  
  log('✅ Environment variables loaded', 'green');
  
  // Step 2: Read migration file
  log('\n📄 Step 2: Reading migration file...', 'cyan');
  
  if (!fs.existsSync(MIGRATION_FILE)) {
    log(`❌ ERROR: Migration file not found: ${MIGRATION_FILE}`, 'red');
    process.exit(1);
  }
  
  const migrationSQL = fs.readFileSync(MIGRATION_FILE, 'utf8');
  log(`✅ Loaded ${migrationSQL.length} characters from migration file`, 'green');
  
  // Step 3: Connect to database
  log('\n🔌 Step 3: Connecting to database...', 'cyan');
  
  let pool;
  try {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    // Test connection
    const testResult = await pool.query('SELECT NOW() as current_time');
    log(`✅ Connected to database at ${testResult.rows[0].current_time}`, 'green');
  } catch (error) {
    log('❌ ERROR: Could not connect to database', 'red');
    console.error(error.message);
    process.exit(1);
  }
  
  // Step 4: Run migration
  log('\n🚀 Step 4: Executing migration...', 'cyan');
  log('⚠️  This will modify your database schema and relationships', 'yellow');
  
  try {
    await pool.query(migrationSQL);
    log('✅ Migration executed successfully!', 'green');
  } catch (error) {
    log('❌ ERROR: Migration failed', 'red');
    console.error(error.message);
    await pool.end();
    process.exit(1);
  }
  
  // Step 5: Verify changes
  log('\n🔍 Step 5: Verifying changes...', 'cyan');
  
  try {
    // Check tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('suppliers', 'shipments', 'batches', 'products', 'inventory_units', 'barcodes')
      ORDER BY table_name
    `);
    
    log(`✅ Found ${tablesResult.rows.length} required tables:`, 'green');
    tablesResult.rows.forEach(row => {
      log(`   - ${row.table_name}`, 'blue');
    });
    
    // Check view exists
    const viewResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name = 'barcode_traceability'
    `);
    
    if (viewResult.rows.length > 0) {
      log('✅ Traceability view created successfully', 'green');
    } else {
      log('⚠️  WARNING: Traceability view not found', 'yellow');
    }
    
    // Check function exists
    const functionResult = await pool.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = 'validate_traceability_chain'
    `);
    
    if (functionResult.rows.length > 0) {
      log('✅ Validation function created successfully', 'green');
    } else {
      log('⚠️  WARNING: Validation function not found', 'yellow');
    }
    
  } catch (error) {
    log('⚠️  WARNING: Could not verify all changes', 'yellow');
    console.error(error.message);
  }
  
  // Step 6: Show sample data
  log('\n📊 Step 6: Checking traceability data...', 'cyan');
  
  try {
    // Count records
    const countsResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM suppliers) as suppliers,
        (SELECT COUNT(*) FROM shipments) as shipments,
        (SELECT COUNT(*) FROM batches) as batches,
        (SELECT COUNT(*) FROM inventory_units) as inventory_units,
        (SELECT COUNT(*) FROM barcodes) as barcodes,
        (SELECT COUNT(*) FROM products) as products
    `);
    
    const counts = countsResult.rows[0];
    log('📈 Record counts:', 'blue');
    log(`   - Suppliers: ${counts.suppliers}`, 'cyan');
    log(`   - Shipments: ${counts.shipments}`, 'cyan');
    log(`   - Batches: ${counts.batches}`, 'cyan');
    log(`   - Products: ${counts.products}`, 'cyan');
    log(`   - Inventory Units: ${counts.inventory_units}`, 'cyan');
    log(`   - Barcodes: ${counts.barcodes}`, 'cyan');
    
    // Show sample traceability
    if (counts.barcodes > 0) {
      const sampleResult = await pool.query(`
        SELECT 
          barcode_value,
          product_sku,
          batch_number,
          shipment_number,
          supplier_name,
          CASE 
            WHEN supplier_id IS NOT NULL THEN '✅ Complete'
            ELSE '⚠️  Incomplete'
          END as chain_status
        FROM barcode_traceability
        LIMIT 3
      `);
      
      if (sampleResult.rows.length > 0) {
        log('\n📋 Sample traceability chains:', 'blue');
        sampleResult.rows.forEach((row, idx) => {
          log(`\n   ${idx + 1}. Barcode: ${row.barcode_value}`, 'cyan');
          log(`      Product: ${row.product_sku || 'N/A'}`, 'reset');
          log(`      Batch: ${row.batch_number || 'N/A'}`, 'reset');
          log(`      Shipment: ${row.shipment_number || 'N/A'}`, 'reset');
          log(`      Supplier: ${row.supplier_name || 'N/A'}`, 'reset');
          log(`      Status: ${row.chain_status}`, row.chain_status.includes('Complete') ? 'green' : 'yellow');
        });
      }
    }
    
  } catch (error) {
    log('⚠️  WARNING: Could not retrieve sample data', 'yellow');
    console.error(error.message);
  }
  
  // Step 7: Close connection
  await pool.end();
  
  // Final summary
  logSection('✅ MIGRATION COMPLETED SUCCESSFULLY');
  
  log('\n📚 What changed:', 'bright');
  log('   1. ✅ Corrected foreign key relationships', 'green');
  log('   2. ✅ Added inventory_units as central linking table', 'green');
  log('   3. ✅ Created barcode_traceability view for easy queries', 'green');
  log('   4. ✅ Added validate_traceability_chain() function', 'green');
  log('   5. ✅ Migrated existing barcodes to use inventory_units', 'green');
  
  log('\n🔗 New relationship chain:', 'bright');
  log('   Supplier → Shipment → Batch → Product → Inventory Unit → Barcode → QR Code', 'cyan');
  
  log('\n📖 Next steps:', 'bright');
  log('   1. Review the README_CORRECTED_ARCHITECTURE.md for details', 'yellow');
  log('   2. Test traceability queries with: SELECT * FROM barcode_traceability LIMIT 10;', 'yellow');
  log('   3. Update your application code to use inventory_units when creating barcodes', 'yellow');
  log('   4. Verify all existing data migrated correctly', 'yellow');
  
  log('\n✨ Your database architecture is now corrected!', 'green');
  console.log('');
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

main().catch(error => {
  log('\n❌ FATAL ERROR:', 'red');
  console.error(error);
  process.exit(1);
});
