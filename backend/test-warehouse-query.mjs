import 'dotenv/config';
import { supabaseAdmin } from './src/config/supabase.js';

async function testWarehouseQuery() {
  console.log('🔍 Testing warehouse location query...\n');
  
  // Test 1: Get inventory_units with warehouses using the correct FK name
  console.log('Test 1: Query inventory_units with warehouse data');
  const { data: test1, error: error1 } = await supabaseAdmin
    .from('inventory_units')
    .select(`
      id,
      warehouse_id,
      rack,
      position_code,
      warehouses!fk_inventory_units_warehouse (
        id,
        name,
        code
      )
    `)
    .not('warehouse_id', 'is', null)
    .limit(3);
  
  if (error1) {
    console.error('❌ Test 1 Error:', error1);
  } else {
    console.log('✅ Test 1 Success! Found', test1?.length || 0, 'inventory units with warehouse');
    if (test1 && test1.length > 0) {
      console.log('Sample:', JSON.stringify(test1[0], null, 2));
    }
  }
  
  console.log('\n' + '='.repeat(80) + '\n');
  
  // Test 2: Get barcodes with full traceability including warehouse
  console.log('Test 2: Get latest barcode with full traceability');
  const { data: test2, error: error2 } = await supabaseAdmin
    .from('barcodes')
    .select(`
      id,
      barcode_value,
      inventory_units!barcodes_inventory_unit_id_fkey (
        id,
        warehouse_id,
        rack,
        position_code,
        warehouses!fk_inventory_units_warehouse (
          id,
          name,
          code
        )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (error2) {
    console.error('❌ Test 2 Error:', error2);
  } else {
    console.log('✅ Test 2 Success!');
    console.log('Barcode data:', JSON.stringify(test2, null, 2));
  }
  
  console.log('\n' + '='.repeat(80) + '\n');
  
  // Test 3: Count barcodes with warehouse data
  console.log('Test 3: Count barcodes with/without warehouse data');
  const { count: withWarehouse, error: error3a } = await supabaseAdmin
    .from('barcodes')
    .select('id', { count: 'exact', head: true })
    .not('inventory_units.warehouse_id', 'is', null);
  
  const { count: total, error: error3b } = await supabaseAdmin
    .from('barcodes')
    .select('id', { count: 'exact', head: true });
  
  if (error3a || error3b) {
    console.error('❌ Test 3 Error:', error3a || error3b);
  } else {
    console.log('✅ Test 3 Success!');
    console.log(`  Total barcodes: ${total}`);
    console.log(`  With warehouse: ${withWarehouse || 0}`);
    console.log(`  Without warehouse: ${(total || 0) - (withWarehouse || 0)}`);
  }
  
  process.exit(0);
}

testWarehouseQuery();
