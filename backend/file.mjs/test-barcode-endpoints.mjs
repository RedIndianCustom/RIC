#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Testing Barcode System...\n');

// Test 1: Check if barcodes table exists
console.log('1. Checking barcodes table...');
const { data: barcodesTest, error: barcodesError } = await supabase
  .from('barcodes')
  .select('count')
  .limit(1);

if (barcodesError) {
  console.log('❌ Barcodes table error:', barcodesError.message);
  if (barcodesError.message.includes('schema cache')) {
    console.log('⚠️  PostgREST schema cache not updated. Run: NOTIFY pgrst, \'reload schema\';');
  }
} else {
  console.log('✅ Barcodes table accessible');
}

// Test 2: Check if barcode_sequences table exists
console.log('\n2. Checking barcode_sequences table...');
const { data: seqTest, error: seqError } = await supabase
  .from('barcode_sequences')
  .select('*')
  .eq('sequence_name', 'default')
  .maybeSingle();

if (seqError) {
  console.log('❌ Barcode sequences error:', seqError.message);
} else if (seqTest) {
  console.log('✅ Barcode sequence exists:', seqTest.current_value);
} else {
  console.log('⚠️  No default sequence found, creating...');
  const { data: newSeq, error: insertError } = await supabase
    .from('barcode_sequences')
    .insert({ sequence_name: 'default', current_value: 200000000000 })
    .select()
    .single();
  
  if (insertError) {
    console.log('❌ Failed to create sequence:', insertError.message);
  } else {
    console.log('✅ Created default sequence:', newSeq.current_value);
  }
}

// Test 3: Check if RPC function exists
console.log('\n3. Testing increment_barcode_sequence RPC...');
const { data: rpcTest, error: rpcError } = await supabase
  .rpc('increment_barcode_sequence', { seq_name: 'default' });

if (rpcError) {
  console.log('❌ RPC function error:', rpcError.message);
  if (rpcError.code === 'PGRST202' || rpcError.code === '42883') {
    console.log('⚠️  RPC function not found. Please run 011_barcode_sequence_function.sql');
  }
} else {
  console.log('✅ RPC function works! Next value:', rpcTest);
}

// Test 4: Check products table
console.log('\n4. Checking products table...');
const { data: products, error: productsError } = await supabase
  .from('products')
  .select('id, sku, brand, model')
  .limit(5);

if (productsError) {
  console.log('❌ Products table error:', productsError.message);
} else {
  console.log(`✅ Products table accessible (${products.length} products found)`);
  if (products.length > 0) {
    console.log('   Sample product:', products[0].sku || products[0].id);
  } else {
    console.log('⚠️  No products found - you may need to seed products');
  }
}

// Test 5: Check barcode_configurations table
console.log('\n5. Checking barcode_configurations table...');
const { data: config, error: configError } = await supabase
  .from('barcode_configurations')
  .select('*')
  .eq('is_active', true)
  .maybeSingle();

if (configError) {
  console.log('❌ Config table error:', configError.message);
} else if (config) {
  console.log('✅ Barcode config exists:', config.format, config.prefix || '(no prefix)');
} else {
  console.log('⚠️  No active config found. Using defaults.');
}

console.log('\n✅ Test complete!');
process.exit(0);
