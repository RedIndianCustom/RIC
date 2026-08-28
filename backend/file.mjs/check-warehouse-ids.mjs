import 'dotenv/config';
import { supabaseAdmin } from './src/config/supabase.js';

async function checkWarehouseIds() {
  console.log('🔍 Checking warehouse IDs in inventory_units...\n');
  
  // Get inventory_units directly with their warehouse_id values
  const { data: units, error } = await supabaseAdmin
    .from('inventory_units')
    .select('id, warehouse_id, rack, position_code')
    .not('warehouse_id', 'is', null)
    .limit(3);
  
  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
  
  console.log(`Found ${units.length} inventory units with warehouse_id:\n`);
  units.forEach((u, i) => {
    console.log(`${i + 1}. Unit ${u.id.substring(0, 8)}...`);
    console.log(`   warehouse_id: ${u.warehouse_id}`);
    console.log(`   rack: ${u.rack || 'NULL'}`);
    console.log(`   position_code: ${u.position_code || 'NULL'}`);
  });
  
  // Check if these warehouse IDs exist in warehouses table
  console.log('\n' + '='.repeat(80));
  console.log('\n🔍 Checking if warehouses exist...\n');
  
  const warehouseIds = units.map(u => u.warehouse_id);
  const uniqueIds = [...new Set(warehouseIds)];
  
  for (const whId of uniqueIds) {
    const { data: warehouse, error: whError } = await supabaseAdmin
      .from('warehouses')
      .select('id, code, name')
      .eq('id', whId)
      .single();
    
    if (whError || !warehouse) {
      console.log(`❌ Warehouse ${whId} NOT FOUND in warehouses table`);
    } else {
      console.log(`✅ Warehouse ${whId} EXISTS: ${warehouse.code} - ${warehouse.name}`);
    }
  }
  
  // List all warehouses in the table
  console.log('\n' + '='.repeat(80));
  console.log('\n🔍 All warehouses in database:\n');
  
  const { data: allWarehouses, error: allError } = await supabaseAdmin
    .from('warehouses')
    .select('id, code, name');
  
  if (allError) {
    console.error('❌ Error:', allError);
  } else if (!allWarehouses || allWarehouses.length === 0) {
    console.log('⚠️ NO warehouses found in database!');
    console.log('\nYou need to create warehouses first:');
    console.log('  - WH1');
    console.log('  - WH2');
  } else {
    console.log(`Found ${allWarehouses.length} warehouse(s):\n`);
    allWarehouses.forEach((wh, i) => {
      console.log(`${i + 1}. ${wh.code} - ${wh.name}`);
      console.log(`   ID: ${wh.id}`);
      console.log('');
    });
  }
  
  process.exit(0);
}

checkWarehouseIds();
