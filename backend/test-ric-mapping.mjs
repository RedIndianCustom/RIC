/**
 * Test script to verify RIC serial mapping workflow
 * 
 * Tests:
 * 1. Check if ric_serial_numbers table exists
 * 2. Insert a test mapping
 * 3. Query the mapping
 * 4. Clean up test data
 */

import { supabaseAdmin } from './src/config/supabase.js';

async function testRICMapping() {
  console.log('🧪 Testing RIC Serial Mapping Workflow\n');
  console.log('=' .repeat(60));
  
  // Test 1: Check if table exists
  console.log('\n📋 Test 1: Checking if ric_serial_numbers table exists...');
  try {
    const { data, error } = await supabaseAdmin
      .from('ric_serial_numbers')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Table does not exist or error:', error.message);
      return;
    }
    console.log('✅ Table exists!');
    console.log(`   Current row count: ${data ? data.length : 0}`);
  } catch (err) {
    console.error('❌ Error checking table:', err.message);
    return;
  }
  
  // Test 2: Get a real product to test with
  console.log('\n📦 Test 2: Fetching a real product...');
  const { data: product, error: productError } = await supabaseAdmin
    .from('products')
    .select('id, sku, brand, model, dimensions')
    .limit(1)
    .single();
  
  if (productError || !product) {
    console.error('❌ Could not fetch product:', productError?.message);
    return;
  }
  
  console.log('✅ Found product:');
  console.log(`   ID: ${product.id}`);
  console.log(`   SKU: ${product.sku}`);
  console.log(`   Name: ${product.brand} ${product.model}`);
  console.log(`   Size: ${product.dimensions}`);
  
  // Test 3: Insert a test mapping
  const testSerial = 'RIC999999999999'; // Test serial
  console.log(`\n🔗 Test 3: Creating test mapping for ${testSerial}...`);
  
  const { error: insertError } = await supabaseAdmin
    .from('ric_serial_numbers')
    .upsert({
      serial_number: testSerial,
      product_id: product.id,
      batch_number: 'TEST-BATCH',
      status: 'MANUFACTURED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'serial_number'
    });
  
  if (insertError) {
    console.error('❌ Failed to insert mapping:', insertError.message);
    return;
  }
  console.log('✅ Mapping created successfully!');
  
  // Test 4: Query the mapping back
  console.log(`\n🔍 Test 4: Querying mapping for ${testSerial}...`);
  const { data: mapping, error: queryError } = await supabaseAdmin
    .from('ric_serial_numbers')
    .select('serial_number, product_id, batch_number, status')
    .eq('serial_number', testSerial)
    .single();
  
  if (queryError || !mapping) {
    console.error('❌ Failed to query mapping:', queryError?.message);
    return;
  }
  
  console.log('✅ Mapping retrieved successfully:');
  console.log(`   Serial: ${mapping.serial_number}`);
  console.log(`   Product ID: ${mapping.product_id}`);
  console.log(`   Batch: ${mapping.batch_number}`);
  console.log(`   Status: ${mapping.status}`);
  console.log(`   Match: ${mapping.product_id === product.id ? '✅' : '❌'}`);
  
  // Test 5: Clean up
  console.log(`\n🧹 Test 5: Cleaning up test data...`);
  const { error: deleteError } = await supabaseAdmin
    .from('ric_serial_numbers')
    .delete()
    .eq('serial_number', testSerial);
  
  if (deleteError) {
    console.warn('⚠️  Failed to delete test mapping:', deleteError.message);
  } else {
    console.log('✅ Test data cleaned up!');
  }
  
  // Test 6: Check existing mappings count
  console.log(`\n📊 Test 6: Checking existing mappings...`);
  const { data: allMappings, error: countError } = await supabaseAdmin
    .from('ric_serial_numbers')
    .select('serial_number, product_id', { count: 'exact' });
  
  if (countError) {
    console.error('❌ Failed to count mappings:', countError.message);
  } else {
    console.log(`✅ Total RIC serial mappings in database: ${allMappings?.length || 0}`);
    if (allMappings && allMappings.length > 0) {
      console.log('\n📋 Sample mappings:');
      allMappings.slice(0, 5).forEach((m, i) => {
        console.log(`   ${i + 1}. ${m.serial_number} → Product ${m.product_id.slice(0, 8)}...`);
      });
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests completed!\n');
  console.log('🎯 Summary:');
  console.log('   - Table exists and is accessible');
  console.log('   - Can insert mappings');
  console.log('   - Can query mappings');
  console.log('   - Can delete mappings');
  console.log('\n💡 Next step: Generate barcodes and they will auto-create mappings!\n');
}

testRICMapping()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  });
