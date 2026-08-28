#!/usr/bin/env node

/**
 * Check if recently generated barcodes have position codes
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

async function checkRecentBarcodes() {
  console.log('\n🔍 Checking 10 most recently created barcodes...\n');
  
  const { data: barcodes, error } = await supabase
    .from('barcodes')
    .select(`
      barcode_value,
      created_at,
      inventory_units!barcodes_inventory_unit_id_fkey (
        position_code,
        rack,
        shelf_number,
        section_number,
        subsection_number,
        warehouses (name, code)
      )
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Barcode'.padEnd(25), 'Created', 'Warehouse'.padEnd(20), 'Position Code');
  console.log('─'.repeat(100));
  
  barcodes.forEach(b => {
    const warehouse = b.inventory_units?.warehouses?.name || 'N/A';
    const posCode = b.inventory_units?.position_code || '❌ NULL';
    const date = new Date(b.created_at).toLocaleString();
    
    console.log(
      b.barcode_value.padEnd(25),
      date.split(',')[0].padEnd(12),
      warehouse.padEnd(20),
      posCode
    );
  });
  
  const withPosition = barcodes.filter(b => b.inventory_units?.position_code).length;
  const withoutPosition = barcodes.filter(b => !b.inventory_units?.position_code).length;
  
  console.log('\n📊 Summary:');
  console.log(`   ✅ With position_code: ${withPosition}/${barcodes.length}`);
  console.log(`   ❌ Without position_code: ${withoutPosition}/${barcodes.length}`);
  
  if (withoutPosition > 0) {
    console.log('\n💡 TIP: Generate new barcodes using the form with rack/shelf/section/subsection selected.');
    console.log('   These new barcodes will have position codes and display properly when scanned.');
  }
}

checkRecentBarcodes();
