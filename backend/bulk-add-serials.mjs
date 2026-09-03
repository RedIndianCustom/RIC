/**
 * Bulk add RIC serial numbers
 * Usage: Create serials.txt with format:
 * RIC000000006090,DSXT-17-100/90
 * RIC000000006091,DSXT-17-100/90
 * RIC000000006092,SAW-17-90/90
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const mappingPath = join(__dirname, 'ric-serial-mapping.json');
const serialsFile = process.argv[2] || join(__dirname, 'serials.txt');

async function bulkAdd() {
  try {
    console.log(`📁 Reading serials from: ${serialsFile}`);
    
    // Read serials file
    const content = readFileSync(serialsFile, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    
    console.log(`📋 Found ${lines.length} serials to add\n`);

    // Load existing mapping
    let mapping = {};
    try {
      const data = readFileSync(mappingPath, 'utf-8');
      mapping = JSON.parse(data);
      console.log(`📦 Loaded ${Object.keys(mapping).length} existing mappings\n`);
    } catch (error) {
      console.log('📝 Creating new mapping file...\n');
    }

    let added = 0;
    let skipped = 0;
    let failed = 0;

    for (const line of lines) {
      const [serial, sku] = line.split(',').map(s => s.trim());
      
      if (!serial || !sku) {
        console.log(`⚠️  Skipping invalid line: ${line}`);
        failed++;
        continue;
      }

      // Check if already exists
      if (mapping[serial]) {
        console.log(`⏭️  ${serial} already mapped to ${mapping[serial].sku}`);
        skipped++;
        continue;
      }

      // Look up product
      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('sku', sku)
        .single();

      if (error || !product) {
        console.log(`❌ ${serial}: Product not found with SKU ${sku}`);
        failed++;
        continue;
      }

      // Add to mapping
      mapping[serial] = {
        sku: product.sku,
        size: product.dimensions,
        brand: product.brand,
        model: product.model
      };

      console.log(`✅ ${serial} → ${product.brand} ${product.model} ${product.dimensions}`);
      added++;
    }

    // Save mapping
    writeFileSync(mappingPath, JSON.stringify(mapping, null, 2), 'utf-8');

    console.log('\n========================================');
    console.log('📊 BULK IMPORT SUMMARY');
    console.log('========================================');
    console.log(`✅ Added: ${added}`);
    console.log(`⏭️  Skipped: ${skipped} (already existed)`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📝 Total in mapping: ${Object.keys(mapping).length}`);
    console.log('========================================\n');
    console.log('🔄 Restart the backend to apply changes\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Show usage if no file
if (process.argv.length < 3) {
  console.log('Usage: node bulk-add-serials.mjs [serials-file.txt]');
  console.log('\nCreate serials.txt with format (one per line):');
  console.log('RIC000000006090,DSXT-17-100/90');
  console.log('RIC000000006091,DSXT-17-100/90');
  console.log('RIC000000006092,SAW-17-90/90');
  console.log('\nOr use default serials.txt in backend folder\n');
}

bulkAdd();
