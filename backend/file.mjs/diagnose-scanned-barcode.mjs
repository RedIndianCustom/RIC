#!/usr/bin/env node

/**
 * ============================================================================
 * DIAGNOSE SCANNED BARCODE DATA
 * ============================================================================
 * This script retrieves a barcode's traceability data and shows exactly what
 * the backend API returns - helping diagnose why position_code isn't displaying.
 * ============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

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

// Terminal colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function diagnoseBarcode() {
  log('\n════════════════════════════════════════════════════════════════════════════', 'cyan');
  log('  🔍 Barcode Traceability Data Diagnosis', 'bright');
  log('════════════════════════════════════════════════════════════════════════════\n', 'cyan');

  try {
    // Step 1: Get a random active barcode
    log('📦 Step 1: Finding a recent barcode...', 'blue');
    
    const { data: barcodes, error: listError } = await supabase
      .from('barcodes')
      .select('id, barcode_value')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (listError) {
      throw listError;
    }
    
    if (!barcodes || barcodes.length === 0) {
      log('   ❌ No active barcodes found in database', 'red');
      return;
    }
    
    const testBarcode = barcodes[0];
    log(`   ✅ Testing barcode: ${testBarcode.barcode_value}`, 'green');
    
    // Step 2: Get full traceability data (exact same query as backend API)
    log('\n📊 Step 2: Fetching traceability data (API query)...', 'blue');
    
    const { data, error } = await supabase
      .from('barcodes')
      .select(`
        id,
        barcode_value,
        barcode_type,
        traceability_url,
        qr_code_data,
        status,
        created_at,
        products (
          id,
          sku,
          brand,
          model,
          dimensions,
          category
        ),
        batches (
          id,
          batch_number,
          batch_month,
          batch_year,
          manufactured_date,
          expiry_date,
          status
        ),
        inventory_units!barcodes_inventory_unit_id_fkey (
          id,
          inventory_unit_code,
          quantity,
          status,
          warehouse_id,
          rack,
          shelf_number,
          section_number,
          subsection_number,
          position_code,
          assigned_at,
          received_at,
          last_scanned_at,
          warehouses (
            id,
            name,
            code,
            location
          )
        )
      `)
      .eq('barcode_value', testBarcode.barcode_value)
      .single();
    
    if (error) {
      throw error;
    }
    
    if (!data) {
      log('   ❌ No data returned', 'red');
      return;
    }
    
    // Step 3: Display the data structure
    log('\n════════════════════════════════════════════════════════════════════════════', 'cyan');
    log('  📋 RETURNED DATA STRUCTURE', 'bright');
    log('════════════════════════════════════════════════════════════════════════════\n', 'cyan');
    
    log('🏷️  BARCODE INFO:', 'yellow');
    log(`   ID: ${data.id}`, 'cyan');
    log(`   Value: ${data.barcode_value}`, 'cyan');
    log(`   Type: ${data.barcode_type}`, 'cyan');
    log(`   Status: ${data.status}`, 'cyan');
    
    log('\n📦 PRODUCT INFO:', 'yellow');
    if (data.products) {
      log(`   SKU: ${data.products.sku}`, 'cyan');
      log(`   Brand: ${data.products.brand}`, 'cyan');
      log(`   Model: ${data.products.model}`, 'cyan');
      log(`   Dimensions: ${data.products.dimensions}`, 'cyan');
    } else {
      log(`   ❌ No product data`, 'red');
    }
    
    log('\n📦 BATCH INFO:', 'yellow');
    if (data.batches) {
      log(`   Batch Number: ${data.batches.batch_number}`, 'cyan');
      log(`   Status: ${data.batches.status}`, 'cyan');
    } else {
      log(`   ❌ No batch data`, 'red');
    }
    
    log('\n📍 INVENTORY UNIT & LOCATION (THIS IS THE KEY!):', 'yellow');
    if (data.inventory_units) {
      const unit = data.inventory_units;
      log(`   ID: ${unit.id}`, 'cyan');
      log(`   Unit Code: ${unit.inventory_unit_code || 'N/A'}`, 'cyan');
      log(`   Status: ${unit.status}`, 'cyan');
      log(`   Quantity: ${unit.quantity}`, 'cyan');
      
      log('\n   📍 LOCATION FIELDS:', 'yellow');
      log(`   warehouse_id: ${unit.warehouse_id || 'NULL'}`, unit.warehouse_id ? 'green' : 'red');
      log(`   rack: ${unit.rack || 'NULL'}`, unit.rack ? 'green' : 'red');
      log(`   shelf_number: ${unit.shelf_number || 'NULL'}`, unit.shelf_number ? 'green' : 'red');
      log(`   section_number: ${unit.section_number || 'NULL'}`, unit.section_number ? 'green' : 'red');
      log(`   subsection_number: ${unit.subsection_number || 'NULL'}`, unit.subsection_number ? 'green' : 'red');
      log(`   position_code: ${unit.position_code || 'NULL'}`, unit.position_code ? 'green' : 'red');
      
      log('\n   🏢 WAREHOUSE INFO (nested):', 'yellow');
      if (unit.warehouses) {
        log(`   Name: ${unit.warehouses.name}`, 'cyan');
        log(`   Code: ${unit.warehouses.code}`, 'cyan');
        log(`   Location: ${unit.warehouses.location || 'N/A'}`, 'cyan');
      } else {
        log(`   ❌ No warehouse data nested`, 'red');
      }
    } else {
      log(`   ❌ NO INVENTORY_UNITS DATA`, 'red');
    }
    
    // Step 4: Analysis
    log('\n════════════════════════════════════════════════════════════════════════════', 'cyan');
    log('  🔬 ANALYSIS', 'bright');
    log('════════════════════════════════════════════════════════════════════════════\n', 'cyan');
    
    const hasInventoryUnit = !!data.inventory_units;
    const hasWarehouseId = hasInventoryUnit && !!data.inventory_units.warehouse_id;
    const hasRack = hasInventoryUnit && !!data.inventory_units.rack;
    const hasPositionCode = hasInventoryUnit && !!data.inventory_units.position_code;
    const hasWarehouseName = hasInventoryUnit && !!data.inventory_units.warehouses?.name;
    const hasCompleteHierarchy = hasInventoryUnit && 
      data.inventory_units.shelf_number && 
      data.inventory_units.section_number && 
      data.inventory_units.subsection_number;
    
    log('Frontend expects:', 'yellow');
    log(`   ✓ scannedData.inventory_units.position_code`, 'cyan');
    log(`   ✓ scannedData.inventory_units.warehouses.name`, 'cyan');
    
    log('\nWhat we got:', hasInventoryUnit ? 'yellow' : 'red');
    log(`   ${hasInventoryUnit ? '✅' : '❌'} inventory_units exists`, hasInventoryUnit ? 'green' : 'red');
    log(`   ${hasWarehouseName ? '✅' : '❌'} inventory_units.warehouses.name exists`, hasWarehouseName ? 'green' : 'red');
    log(`   ${hasPositionCode ? '✅' : '❌'} inventory_units.position_code exists`, hasPositionCode ? 'green' : 'red');
    log(`   ${hasRack ? '✅' : '❌'} inventory_units.rack exists`, hasRack ? 'green' : 'red');
    log(`   ${hasCompleteHierarchy ? '✅' : '❌'} Complete hierarchy (shelf, section, subsection) exists`, hasCompleteHierarchy ? 'green' : 'red');
    
    log('\n🎯 CONCLUSION:', 'yellow');
    if (hasInventoryUnit && hasWarehouseName && hasPositionCode) {
      log('   ✅ Data structure is correct!', 'green');
      log('   ✅ Frontend should display the location properly.', 'green');
      log('   ✅ If it\'s not displaying, check browser console for errors.', 'green');
    } else if (hasInventoryUnit && hasWarehouseName && !hasPositionCode) {
      log('   ⚠️  ISSUE FOUND: position_code is NULL', 'yellow');
      log('   📌 This barcode was created before position codes were implemented.', 'yellow');
      if (hasRack && hasCompleteHierarchy) {
        log('   ✅ Good news: It has complete hierarchy data!', 'green');
        log('   🔧 Run: node backend/fix-position-codes.mjs', 'cyan');
      } else {
        log('   ❌ Problem: Missing rack or hierarchy data', 'red');
        log('   💡 This barcode needs to be manually assigned to a warehouse location.', 'yellow');
      }
    } else if (!hasInventoryUnit) {
      log('   ❌ CRITICAL: No inventory_unit linked to this barcode!', 'red');
      log('   💡 This is a data integrity issue - barcodes should always have inventory units.', 'yellow');
    } else if (!hasWarehouseName) {
      log('   ❌ No warehouse assigned to this barcode', 'red');
      log('   💡 This barcode needs to be assigned to a warehouse location.', 'yellow');
    }
    
    log('\n════════════════════════════════════════════════════════════════════════════\n', 'cyan');
    
    // Show raw JSON for debugging
    log('📄 RAW JSON (for debugging):', 'blue');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    log('\n❌ Error during diagnosis:', 'red');
    log(`   ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run the diagnosis
diagnoseBarcode().catch(err => {
  log('\n❌ Unexpected error:', 'red');
  console.error(err);
  process.exit(1);
});
