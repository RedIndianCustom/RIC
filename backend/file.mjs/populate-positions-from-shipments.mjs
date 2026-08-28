#!/usr/bin/env node

/**
 * ============================================================================
 * POPULATE POSITION CODES FROM SHIPMENT METADATA
 * ============================================================================
 * This script populates position_code for barcodes that were created from
 * shipments with assigned positions, but don't have position_code set.
 * ============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

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

async function populatePositionCodes() {
  log('\n════════════════════════════════════════════════════════════════════════════', 'cyan');
  log('  🔧 Populating Position Codes from Shipment Metadata', 'bright');
  log('════════════════════════════════════════════════════════════════════════════\n', 'cyan');

  try {
    // Step 1: Get all batches with shipment metadata that have assigned positions
    log('📦 Step 1: Finding batches with assigned positions...', 'blue');
    
    const { data: batches, error: batchError } = await supabase
      .from('batches')
      .select(`
        id,
        batch_number,
        shipment_id,
        metadata,
        shipments:shipment_id (
          shipment_number,
          product_breakdown
        )
      `)
      .not('metadata', 'is', null);
    
    if (batchError) {
      throw batchError;
    }
    
    // Filter batches that have products_with_positions in metadata
    const batchesWithPositions = batches.filter(b => 
      b.metadata?.products_with_positions?.length > 0
    );
    
    log(`   Found ${batches.length} batches total`, 'cyan');
    log(`   ${batchesWithPositions.length} batches have assigned positions in metadata`, 'green');
    
    if (batchesWithPositions.length === 0) {
      log('\n✅ No batches with assigned positions found.', 'yellow');
      log('   Generate barcodes from shipments with position assignments first.', 'yellow');
      return;
    }
    
    // Step 2: For each batch, get barcodes and update their position codes
    let totalUpdated = 0;
    let totalSkipped = 0;
    
    for (const batch of batchesWithPositions) {
      log(`\n📦 Processing batch: ${batch.batch_number}`, 'cyan');
      
      const productsWithPositions = batch.metadata.products_with_positions;
      log(`   Products: ${productsWithPositions.length}`, 'cyan');
      
      // Get all barcodes for this batch
      const { data: barcodes, error: barcodeError } = await supabase
        .from('barcodes')
        .select(`
          id,
          barcode_value,
          inventory_unit_id,
          inventory_units!barcodes_inventory_unit_id_fkey (
            id,
            position_code,
            warehouse_id,
            rack
          )
        `)
        .eq('batch_id', batch.id);
      
      if (barcodeError) {
        log(`   ❌ Error fetching barcodes: ${barcodeError.message}`, 'red');
        continue;
      }
      
      log(`   Barcodes found: ${barcodes.length}`, 'cyan');
      
      // Count how many need updates
      const needsUpdate = barcodes.filter(b => 
        b.inventory_units && !b.inventory_units.position_code
      );
      
      if (needsUpdate.length === 0) {
        log(`   ✅ All barcodes already have position codes`, 'green');
        totalSkipped += barcodes.length;
        continue;
      }
      
      log(`   🔧 ${needsUpdate.length} barcodes need position codes`, 'yellow');
      
      // Build a map of position codes from metadata
      // We need to distribute barcodes across positions based on quantity
      const positionMap = [];
      for (const product of productsWithPositions) {
        for (const position of (product.assigned_positions || [])) {
          for (let i = 0; i < position.quantity; i++) {
            positionMap.push({
              position_code: position.position_code,
              product_id: product.product_id
            });
          }
        }
      }
      
      log(`   📍 Total position codes available: ${positionMap.length}`, 'cyan');
      
      // Assign position codes to barcodes
      let updated = 0;
      for (let i = 0; i < needsUpdate.length && i < positionMap.length; i++) {
        const barcode = needsUpdate[i];
        const position = positionMap[i];
        
        // Extract hierarchical data from position_code
        // Format: WH1-R06-RK06-S01-SH02-SUB01
        const parts = position.position_code.split('-');
        if (parts.length >= 6) {
          const sectionNum = parseInt(parts[3].replace('S', ''));
          const shelfNum = parseInt(parts[4].replace('SH', ''));
          const subsectionNum = parseInt(parts[5].replace('SUB', ''));
          const rackCode = `${parts[0]}-${parts[1]}-${parts[2]}`;
          
          // Update inventory_unit
          const { error: updateError } = await supabase
            .from('inventory_units')
            .update({
              rack: rackCode,
              shelf_number: shelfNum,
              section_number: sectionNum,
              subsection_number: subsectionNum,
              position_code: position.position_code
            })
            .eq('id', barcode.inventory_unit_id);
          
          if (updateError) {
            log(`   ❌ Failed to update ${barcode.barcode_value}: ${updateError.message}`, 'red');
          } else {
            updated++;
            if (updated <= 3) {
              log(`   ✅ ${barcode.barcode_value} → ${position.position_code}`, 'green');
            }
          }
        }
      }
      
      if (updated > 3) {
        log(`   ... and ${updated - 3} more`, 'cyan');
      }
      
      log(`   ✅ Updated ${updated} barcodes for this batch`, 'green');
      totalUpdated += updated;
    }
    
    // Summary
    log('\n════════════════════════════════════════════════════════════════════════════', 'cyan');
    log('  📋 Summary', 'bright');
    log('════════════════════════════════════════════════════════════════════════════', 'cyan');
    log(`   ✅ Total barcodes updated: ${totalUpdated}`, 'green');
    log(`   ⏭️  Total barcodes skipped (already had position codes): ${totalSkipped}`, 'yellow');
    
    log('\n✅ Position code population completed successfully!', 'green');
    log('   Scan QR codes now to see the warehouse location display properly.', 'green');
    
  } catch (error) {
    log('\n❌ Error during population:', 'red');
    log(`   ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

populatePositionCodes();
