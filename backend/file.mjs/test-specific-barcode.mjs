#!/usr/bin/env node

/**
 * Test a specific barcode to see if it now has position_code
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

async function testBarcode() {
  // Test with one of the barcodes we recently updated
  const testBarcodes = [
    'RIC000000004634',  // User's example
    'RIC000000004635',
    'RIC000000004636'
  ];

  console.log('🔍 Testing specific barcodes...\n');

  for (const barcodeValue of testBarcodes) {
    try {
      const { data, error } = await supabase
        .from('barcodes')
        .select(`
          barcode_value,
          status,
          inventory_unit_id,
          batch_id
        `)
        .eq('barcode_value', barcodeValue)
        .single();

      if (error) {
        console.log(`❌ ${barcodeValue}: Not found (${error.message})`);
        continue;
      }

      console.log(`\n📦 Barcode: ${data.barcode_value}`);
      console.log(`   Status: ${data.status}`);
      console.log(`   Inventory Unit ID: ${data.inventory_unit_id || 'NULL'}`);
      console.log(`   Batch ID: ${data.batch_id || 'NULL'}`);

      if (data.inventory_unit_id) {
        const { data: unit, error: unitErr } = await supabase
          .from('inventory_units')
          .select('inventory_unit_code, position_code')
          .eq('id', data.inventory_unit_id)
          .single();

        if (!unitErr && unit) {
          console.log(`   📍 Position Code: ${unit.position_code || 'NULL'}`);
          if (unit.position_code) {
            console.log(`   ✅ HAS POSITION CODE!`);
          } else {
            console.log(`   ⚠️  No position code yet`);
          }
        }
      }
    } catch (err) {
      console.log(`❌ ${barcodeValue}: Error - ${err.message}`);
    }
  }
}

testBarcode()
  .then(() => {
    console.log('\n✅ Test complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  });
