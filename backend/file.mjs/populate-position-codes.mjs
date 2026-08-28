#!/usr/bin/env node

/**
 * ============================================================================
 * POPULATE POSITION CODES FROM SHIPMENT METADATA
 * ============================================================================
 * This script populates the position_code field in inventory_units
 * by reading the position assignments from batches.metadata.products_with_positions
 * 
 * Background:
 * - Shipments have assigned positions in batch metadata
 * - But inventory_units.position_code is NULL for old barcodes
 * - This script distributes position codes to all barcodes based on their batch
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
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function populatePositionCodes() {
  console.log('🚀 Starting position_code population from shipment metadata...\n');

  try {
    // Step 1: Find all inventory units with NULL position_code
    console.log('📊 Step 1: Finding inventory units with NULL position_code...');
    const { data: unitsWithoutPosition, error: unitsError } = await supabase
      .from('inventory_units')
      .select(`
        id,
        inventory_unit_code,
        batch_id,
        product_id,
        quantity,
        warehouse_id,
        rack,
        shelf_number,
        section_number,
        subsection_number
      `)
      .is('position_code', null)
      .order('created_at', { ascending: false });

    if (unitsError) {
      throw new Error(`Failed to query units: ${unitsError.message}`);
    }

    console.log(`   Found ${unitsWithoutPosition?.length || 0} units without position_code\n`);

    if (!unitsWithoutPosition || unitsWithoutPosition.length === 0) {
      console.log('✅ All inventory units already have position_code!');
      return;
    }

    // Step 2: Group by batch and extract positions from metadata
    console.log('📦 Step 2: Fetching batch metadata...');
    
    // Get unique batch IDs
    const batchIds = [...new Set(unitsWithoutPosition.map(u => u.batch_id).filter(Boolean))];
    console.log(`   Found ${batchIds.length} unique batches to check\n`);
    
    if (batchIds.length === 0) {
      console.log('❌ No batches found for units without position_code');
      return;
    }
    
    // Fetch batch metadata
    const { data: batches, error: batchError } = await supabase
      .from('batches')
      .select('id, metadata, product_id')
      .in('id', batchIds);
    
    if (batchError) {
      throw new Error(`Failed to query batches: ${batchError.message}`);
    }
    
    console.log(`   Retrieved ${batches?.length || 0} batches\n`);
    
    const batchPositions = new Map();
    let metadataFoundCount = 0;
    let metadataMissingCount = 0;

    for (const batch of batches) {
      if (!batch || !batch.metadata) {
        metadataMissingCount++;
        continue;
      }

      const metadata = batch.metadata;
      
      // Check for products_with_positions in metadata (top level)
      if (metadata.products_with_positions && Array.isArray(metadata.products_with_positions)) {
        for (const productEntry of metadata.products_with_positions) {
          // Look inside assigned_positions array
          if (productEntry.assigned_positions && Array.isArray(productEntry.assigned_positions)) {
            for (const position of productEntry.assigned_positions) {
              if (position.position_code && productEntry.product_id) {
                if (!batchPositions.has(batch.id)) {
                  batchPositions.set(batch.id, []);
                }
                batchPositions.get(batch.id).push({
                  product_id: productEntry.product_id,
                  position_code: position.position_code,
                  quantity: position.quantity || 1
                });
                metadataFoundCount++;
              }
            }
          }
        }
      }
    }

    console.log('   ✅ Found metadata for ${metadataFoundCount} product positions');
    console.log(`   ⚠️  Missing metadata for ${metadataMissingCount} units\n`);

    // Step 3: Update inventory units with position codes
    console.log('💾 Step 3: Updating inventory_units with position codes...');
    
    let updateCount = 0;
    let skipCount = 0;
    const updates = [];

    for (const unit of unitsWithoutPosition) {
      const positions = batchPositions.get(unit.batch_id);
      
      if (!positions || positions.length === 0) {
        skipCount++;
        continue;
      }

      // Find matching position for this product
      const matchingPosition = positions.find(p => p.product_id === unit.product_id);
      
      if (matchingPosition) {
        updates.push({
          id: unit.id,
          position_code: matchingPosition.position_code,
          inventory_unit_code: unit.inventory_unit_code
        });
      } else {
        skipCount++;
      }
    }

    console.log(`   📋 Prepared ${updates.length} updates`);
    console.log(`   ⏭️  Skipping ${skipCount} units (no position data)\n`);

    // Perform batch updates
    if (updates.length > 0) {
      console.log('⚡ Executing batch update...');
      
      // Update in chunks of 100
      const chunkSize = 100;
      for (let i = 0; i < updates.length; i += chunkSize) {
        const chunk = updates.slice(i, i + chunkSize);
        
        for (const update of chunk) {
          const { error: updateError } = await supabase
            .from('inventory_units')
            .update({ position_code: update.position_code })
            .eq('id', update.id);

          if (updateError) {
            console.error(`   ❌ Failed to update ${update.inventory_unit_code}:`, updateError.message);
          } else {
            updateCount++;
            console.log(`   ✅ Updated ${update.inventory_unit_code} → ${update.position_code}`);
          }
        }
      }
    }

    // Step 4: Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 POPULATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total units processed:           ${unitsWithoutPosition.length}`);
    console.log(`Successfully updated:            ${updateCount}`);
    console.log(`Skipped (no position data):      ${skipCount}`);
    console.log(`Metadata found:                  ${metadataFoundCount}`);
    console.log(`Metadata missing:                ${metadataMissingCount}`);
    console.log('='.repeat(70));

    // Step 5: Verify updates
    console.log('\n🔍 Step 5: Verifying updates...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('inventory_units')
      .select('id, position_code')
      .not('position_code', 'is', null)
      .limit(10);

    if (verifyError) {
      console.error('   ❌ Verification query failed:', verifyError.message);
    } else {
      console.log(`   ✅ Sample of updated records (showing ${verifyData.length}):`);
      verifyData.forEach(record => {
        console.log(`      • ID ${record.id}: ${record.position_code}`);
      });
    }

    console.log('\n✨ Position code population complete!');

  } catch (error) {
    console.error('\n❌ Fatal error during population:', error);
    throw error;
  }
}

// Run the script
populatePositionCodes()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error.message);
    process.exit(1);
  });
