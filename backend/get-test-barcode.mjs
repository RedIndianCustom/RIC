#!/usr/bin/env node

/**
 * Get a test barcode with position_code for scanning
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

async function getTestBarcode() {
  console.log('🔍 Getting test barcode with position_code...\n');

  try {
    // Query from barcodes directly, joining to inventory_units
    const { data: result, error } = await supabase
      .rpc('get_barcode_with_position', {});

    // If RPC doesn't exist, try direct query
    if (error) {
      // Try a simpler approach - get from barcodes table with raw query
      const { data: barcodes, error: err } = await supabase
        .from('barcodes')
        .select('barcode_value, inventory_unit_id')
        .eq('status', 'ACTIVE')
        .limit(100);

      if (err) throw new Error(`Query failed: ${err.message}`);

      // Check each barcode's inventory_unit for position_code
      for (const bc of barcodes) {
        const { data: unit, error: unitErr } = await supabase
          .from('inventory_units')
          .select('position_code')
          .eq('id', bc.inventory_unit_id)
          .not('position_code', 'is', null)
          .single();

        if (!unitErr && unit && unit.position_code) {
          console.log('✅ Test Barcode Found:');
          console.log(`   📦 Barcode: ${bc.barcode_value}`);
          console.log(`   📍 Position: ${unit.position_code}`);
          console.log(`\n🎯 SCAN THIS BARCODE TO TEST: ${bc.barcode_value}`);
          return;
        }
      }

      throw new Error('No barcode found with position_code');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

getTestBarcode()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error.message);
    process.exit(1);
  });
