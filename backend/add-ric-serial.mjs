/**
 * Add RIC serial number mapping
 * Usage: node add-ric-serial.mjs RIC000000006038 SAW-17-90/90
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

// Get arguments
const serialNumber = process.argv[2];
const sku = process.argv[3];

if (!serialNumber || !sku) {
  console.error('Usage: node add-ric-serial.mjs RIC000000006060 ARXT-17-100/80');
  process.exit(1);
}

async function addSerial() {
  try {
    // Load existing mapping
    let mapping = {};
    try {
      const data = readFileSync(mappingPath, 'utf-8');
      mapping = JSON.parse(data);
    } catch (error) {
      console.log('Creating new mapping file...');
    }

    // Look up product by SKU
    console.log(`Looking up product with SKU: ${sku}...`);
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('sku', sku)
      .single();

    if (error || !product) {
      console.error(`❌ Product not found with SKU: ${sku}`);
      console.log('\n💡 Available products:');
      
      const { data: products } = await supabase
        .from('products')
        .select('sku, brand, model, dimensions')
        .order('sku')
        .limit(20);
      
      products?.forEach(p => {
        console.log(`   ${p.sku} - ${p.brand} ${p.model} ${p.dimensions}`);
      });
      
      process.exit(1);
    }

    // Add to mapping
    mapping[serialNumber] = {
      sku: product.sku,
      size: product.dimensions,
      brand: product.brand,
      model: product.model
    };

    // Save mapping
    writeFileSync(mappingPath, JSON.stringify(mapping, null, 2), 'utf-8');

    console.log('\n✅ Serial number added successfully!');
    console.log(`\nSerial: ${serialNumber}`);
    console.log(`Product: ${product.brand} ${product.model}`);
    console.log(`Size: ${product.dimensions}`);
    console.log(`SKU: ${product.sku}`);
    console.log(`\n📝 Total serials in mapping: ${Object.keys(mapping).length}`);
    console.log('\n🔄 Restart the backend to apply changes');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addSerial();
