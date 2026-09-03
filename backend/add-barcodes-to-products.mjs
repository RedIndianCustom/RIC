/**
 * Add barcodes to all products
 * This script will set the barcode field to match the SKU
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addBarcodes() {
  console.log('\n========================================');
  console.log('📝 ADDING BARCODES TO PRODUCTS');
  console.log('========================================\n');

  // Get all products
  const { data: products, error } = await supabase
    .from('products')
    .select('id, brand, model, dimensions, sku, barcode');

  if (error) {
    console.error('❌ Error fetching products:', error.message);
    process.exit(1);
  }

  console.log(`Found ${products.length} products\n`);

  let updated = 0;
  let skipped = 0;

  for (const product of products) {
    if (product.barcode) {
      console.log(`⏭️  Skipping ${product.sku} - already has barcode: ${product.barcode}`);
      skipped++;
      continue;
    }

    // Set barcode to SKU (or generate a barcode based on size + brand)
    const newBarcode = product.sku || `RIC-${product.brand?.substring(0, 3).toUpperCase()}-${product.dimensions}`;

    const { error: updateError } = await supabase
      .from('products')
      .update({ barcode: newBarcode })
      .eq('id', product.id);

    if (updateError) {
      console.error(`❌ Failed to update ${product.sku}:`, updateError.message);
    } else {
      console.log(`✅ Updated ${product.brand} ${product.model} (${product.dimensions})`);
      console.log(`   Barcode set to: ${newBarcode}`);
      updated++;
    }
  }

  console.log('\n========================================');
  console.log(`✅ Updated: ${updated} products`);
  console.log(`⏭️  Skipped: ${skipped} products (already had barcodes)`);
  console.log('========================================\n');

  console.log('💡 Now you can:');
  console.log('   1. Generate QR codes with these barcode values');
  console.log('   2. Or use SKU values in QR codes (e.g., SAW-15-130/90)');
  console.log('   3. Or use size values in QR codes (e.g., 130/90-15)\n');

  process.exit(0);
}

addBarcodes().catch(console.error);
