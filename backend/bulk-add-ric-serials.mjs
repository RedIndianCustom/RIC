/**
 * ============================================================================
 * BULK ADD RIC SERIAL MAPPINGS
 * ============================================================================
 * This script queries the database to find all existing barcodes and 
 * automatically creates the RIC serial mapping file.
 * 
 * This is a ONE-TIME operation to fix old QR codes.
 * New QR codes will use SKU directly and won't need this.
 * 
 * Usage: node bulk-add-ric-serials.mjs
 * ============================================================================
 */

import { writeFileSync } from 'fs';
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

async function bulkAddRICSerials() {
  try {
    console.log('🔍 Fetching all barcodes from database...\n');

    // Get all barcodes with their product information
    const { data: barcodes, error } = await supabase
      .from('barcodes')
      .select(`
        barcode_value,
        products (
          sku,
          brand,
          model,
          dimensions
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching barcodes:', error.message);
      process.exit(1);
    }

    if (!barcodes || barcodes.length === 0) {
      console.log('⚠️  No barcodes found in database');
      process.exit(0);
    }

    console.log(`✅ Found ${barcodes.length} barcodes in database\n`);

    // Build mapping object
    const mapping = {};
    let validCount = 0;
    let skippedCount = 0;

    for (const barcode of barcodes) {
      const barcodeValue = barcode.barcode_value;
      const product = barcode.products;

      // Check if it's a RIC serial format (RIC followed by numbers)
      if (barcodeValue && barcodeValue.match(/^RIC\d+$/i)) {
        if (product && product.sku) {
          mapping[barcodeValue] = {
            sku: product.sku,
            size: product.dimensions,
            brand: product.brand,
            model: product.model
          };
          validCount++;
          console.log(`✅ ${barcodeValue} → ${product.sku} (${product.brand} ${product.model} ${product.dimensions})`);
        } else {
          console.log(`⚠️  ${barcodeValue} → No product data found`);
          skippedCount++;
        }
      }
    }

    if (validCount === 0) {
      console.log('\n⚠️  No valid RIC serial numbers found to map');
      console.log('💡 This is normal if you haven\'t generated any barcodes yet');
      process.exit(0);
    }

    // Save mapping to file
    writeFileSync(mappingPath, JSON.stringify(mapping, null, 2), 'utf-8');

    console.log('\n========================================');
    console.log('✅ RIC SERIAL MAPPING CREATED!');
    console.log('========================================');
    console.log(`📝 Total barcodes found: ${barcodes.length}`);
    console.log(`✅ Valid RIC serials mapped: ${validCount}`);
    console.log(`⚠️  Skipped (no product): ${skippedCount}`);
    console.log(`📁 Mapping file: ${mappingPath}`);
    console.log('\n🔄 Next step: Restart your backend to load the mapping');
    console.log('   Command: cd backend && npm start');
    console.log('\n💡 TIP: New QR codes will use SKU directly and won\'t need this mapping!');
    console.log('   Generate new QR codes from Barcode Generation page for best results.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

bulkAddRICSerials();
