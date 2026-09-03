/**
 * Diagnostic script to check barcode setup
 * Run this to see what's in your database
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: join(__dirname, '.env') });

console.log('Loading config from:', join(__dirname, '.env'));
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Not set');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Not set');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('\n❌ Missing environment variables!');
  console.error('Make sure backend/.env has:');
  console.error('  SUPABASE_URL=your_url');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=your_key\n');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnose() {
  console.log('\n========================================');
  console.log('🔍 BARCODE DIAGNOSTIC TOOL');
  console.log('========================================\n');

  // 1. Check products
  console.log('1️⃣  Checking products table...');
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, brand, model, dimensions, sku, barcode')
    .limit(10);

  if (prodError) {
    console.error('❌ Error fetching products:', prodError.message);
  } else {
    console.log(`✅ Found ${products.length} products (showing first 10):`);
    products.forEach((p, idx) => {
      console.log(`\n   ${idx + 1}. ${p.brand} ${p.model}`);
      console.log(`      Size: ${p.dimensions || 'N/A'}`);
      console.log(`      SKU: ${p.sku || 'N/A'}`);
      console.log(`      Barcode: ${p.barcode || '❌ NOT SET'}`);
    });
  }

  // 2. Check shipments
  console.log('\n\n2️⃣  Checking active shipments...');
  const { data: shipments, error: shipError } = await supabase
    .from('shipments')
    .select('id, shipment_number, status')
    .in('status', ['IN_TRANSIT', 'ARRIVED', 'INSPECTING'])
    .limit(5);

  if (shipError) {
    console.error('❌ Error fetching shipments:', shipError.message);
  } else {
    console.log(`✅ Found ${shipments.length} active shipments:`);
    shipments.forEach((s, idx) => {
      console.log(`   ${idx + 1}. ${s.shipment_number} - Status: ${s.status}`);
    });

    // Check expected items for first shipment
    if (shipments.length > 0) {
      const firstShipment = shipments[0];
      console.log(`\n   📦 Checking expected items for ${firstShipment.shipment_number}...`);
      
      const { data: expectedItems, error: itemsError } = await supabase
        .from('expected_items')
        .select(`
          id,
          product_id,
          product_size,
          expected_quantity,
          products (brand, model, dimensions, sku, barcode)
        `)
        .eq('shipment_id', firstShipment.id);

      if (itemsError) {
        console.error('   ❌ Error:', itemsError.message);
      } else {
        console.log(`   ✅ Found ${expectedItems.length} expected items:`);
        expectedItems.forEach((item, idx) => {
          const product = item.products;
          console.log(`\n      ${idx + 1}. ${product?.brand} ${product?.model}`);
          console.log(`         Size: ${item.product_size || product?.dimensions || 'N/A'}`);
          console.log(`         Quantity: ${item.expected_quantity}`);
          console.log(`         SKU: ${product?.sku || 'N/A'}`);
          console.log(`         Barcode: ${product?.barcode || '❌ NOT SET'}`);
        });
      }
    }
  }

  // 3. Recommendations
  console.log('\n\n========================================');
  console.log('💡 RECOMMENDATIONS');
  console.log('========================================');

  const productsWithoutBarcodes = products?.filter(p => !p.barcode).length || 0;
  
  if (productsWithoutBarcodes > 0) {
    console.log('\n⚠️  Some products don\'t have barcodes set!');
    console.log('   Solution options:');
    console.log('   1. Add barcodes to products in the database');
    console.log('   2. Use RIC format: RIC-BRAND-90-90-19-SERIAL');
    console.log('   3. QR codes with tire size: 90/90-19 or 90-90-19');
    console.log('   4. Use the "smart fallback" (works if only 1 product expected)');
  } else {
    console.log('\n✅ All products have barcodes set!');
  }

  console.log('\n\n🔍 TEST YOUR BARCODE:');
  console.log('   When you scan, check the backend logs for:');
  console.log('   - "Barcode scanned: YOUR_VALUE_HERE"');
  console.log('   - Which strategies were attempted');
  console.log('   - Why each strategy failed\n');

  process.exit(0);
}

diagnose().catch(console.error);
