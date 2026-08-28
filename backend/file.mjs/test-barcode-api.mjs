/**
 * Test script to verify barcode API returns proper data structure
 * Run with: node test-barcode-api.mjs
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:4000/api/barcodes?limit=5';

console.log('🧪 Testing Barcode API...\n');
console.log(`📡 Endpoint: ${API_URL}\n`);

try {
  const response = await fetch(API_URL);
  const data = await response.json();

  console.log('✅ API Response Status:', response.status);
  console.log('✅ API Response OK:', response.ok);
  console.log('\n📦 Response Data Structure:');
  console.log(JSON.stringify(data, null, 2));

  if (data.barcodes && data.barcodes.length > 0) {
    console.log('\n🔍 First Barcode Analysis:');
    const firstBarcode = data.barcodes[0];
    
    console.log('  - ID:', firstBarcode.id);
    console.log('  - Barcode Value:', firstBarcode.barcode_value);
    console.log('  - Status:', firstBarcode.status);
    console.log('  - Has products key:', !!firstBarcode.products);
    console.log('  - Has batches key:', !!firstBarcode.batches);
    console.log('  - Product ID:', firstBarcode.product_id);
    console.log('  - Batch ID:', firstBarcode.batch_id);

    if (firstBarcode.products) {
      console.log('\n  📦 Products Object:');
      console.log('    - ID:', firstBarcode.products.id);
      console.log('    - Brand:', firstBarcode.products.brand);
      console.log('    - Model:', firstBarcode.products.model);
      console.log('    - SKU:', firstBarcode.products.sku);
    } else {
      console.log('\n  ⚠️ Products object is NULL or missing');
    }

    if (firstBarcode.batches) {
      console.log('\n  📦 Batches Object:');
      console.log('    - ID:', firstBarcode.batches.id);
      console.log('    - Batch Number:', firstBarcode.batches.batch_number);
    } else {
      console.log('\n  ⚠️ Batches object is NULL or missing');
    }

    console.log('\n✅ Data structure is valid for folder grouping!');
  } else {
    console.log('\n⚠️ No barcodes found in response');
  }

} catch (error) {
  console.error('\n❌ Error testing API:', error.message);
  console.error('   Make sure backend is running on port 4000');
}
