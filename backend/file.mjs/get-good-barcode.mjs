#!/usr/bin/env node

/**
 * Get a barcode from the batch that has position metadata
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

async function getGoodBarcode() {
  console.log('🔍 Finding barcode from batch with position data...\n');

  try {
    // Get batch with position metadata
    const goodBatchId = 'ce031b39-5d21-4084-879f-d05fbd63578c';

    // Get barcodes from this batch
    const { data: barcodes, error } = await supabase
      .from('barcodes')
      .select('barcode_value, inventory_unit_id')
      .eq('batch_id', goodBatchId)
      .limit(5);

    if (error) throw new Error(`Query failed: ${error.message}`);

    console.log(`Found ${barcodes.length} barcodes from batch with position data:\n`);

    for (const bc of barcodes) {
      const { data: unit, error: unitErr } = await supabase
        .from('inventory_units')
        .select('inventory_unit_code, position_code')
        .eq('id', bc.inventory_unit_id)
        .single();

      if (!unitErr && unit) {
        console.log(`📦 Barcode: ${bc.barcode_value}`);
        console.log(`   📍 Position: ${unit.position_code || 'NULL'}`);
        
        if (unit.position_code) {
          console.log(`\n🎯 ✅ SCAN THIS BARCODE: ${bc.barcode_value}`);
          console.log(`   Expected position: ${unit.position_code}\n`);
          break;
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

getGoodBarcode()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed:', error.message);
    process.exit(1);
  });
