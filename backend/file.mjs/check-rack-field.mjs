import 'dotenv/config';
import { supabaseAdmin } from './src/config/supabase.js';

async function checkRackField() {
  console.log('🔍 Checking rack field in inventory_units...\n');
  
  // Get latest barcode with full inventory_unit data
  const { data: barcode, error } = await supabaseAdmin
    .from('barcodes')
    .select(`
      barcode_value,
      created_at,
      inventory_units!barcodes_inventory_unit_id_fkey (
        id,
        warehouse_id,
        rack,
        position_code,
        shelf_number,
        section_number,
        subsection_number,
        assigned_at,
        warehouses (
          id,
          name,
          code
        )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
  
  console.log('📊 Latest Barcode Analysis\n');
  console.log('Barcode:', barcode.barcode_value);
  console.log('Created:', new Date(barcode.created_at).toLocaleString());
  console.log('');
  
  const iu = barcode.inventory_units;
  
  console.log('🗃️ Inventory Unit Data:\n');
  console.log('  ID:', iu.id);
  console.log('  Warehouse ID:', iu.warehouse_id || '❌ NULL');
  console.log('  Warehouse Code:', iu.warehouses?.code || 'N/A');
  console.log('  Warehouse Name:', iu.warehouses?.name || 'N/A');
  console.log('  Rack:', iu.rack || '❌ NULL');
  console.log('  Position Code:', iu.position_code || '❌ NULL');
  console.log('  Shelf:', iu.shelf_number || 'N/A');
  console.log('  Section:', iu.section_number || 'N/A');
  console.log('  Subsection:', iu.subsection_number || 'N/A');
  console.log('  Assigned At:', iu.assigned_at ? new Date(iu.assigned_at).toLocaleString() : 'N/A');
  
  console.log('\n' + '='.repeat(80));
  
  if (!iu.rack && iu.position_code) {
    console.log('\n⚠️ ISSUE FOUND: Position code exists but rack is NULL!');
    console.log('');
    console.log('Expected rack code (from position):', iu.position_code.split('-').slice(0, 3).join('-'));
    console.log('Actual rack field:', iu.rack || 'NULL');
    console.log('');
    console.log('💡 This means the warehouse_location lookup is failing.');
    console.log('');
    
    // Check if the warehouse location exists
    const expectedRackCode = iu.position_code.split('-').slice(0, 3).join('-');
    console.log(`🔍 Searching for warehouse_location with code: ${expectedRackCode}\n`);
    
    const { data: location, error: locError } = await supabaseAdmin
      .from('warehouse_locations')
      .select('*')
      .eq('code', expectedRackCode);
    
    if (locError) {
      console.error('❌ Error querying warehouse_locations:', locError);
    } else if (!location || location.length === 0) {
      console.log('❌ NOT FOUND in warehouse_locations table!');
      console.log('');
      console.log('📝 This is the root cause:');
      console.log('   The position code exists in batch metadata, but the corresponding');
      console.log('   warehouse_location record does not exist in the database.');
      console.log('');
      console.log('💡 Solution: Create warehouse_locations for all racks being used');
    } else {
      console.log('✅ FOUND in warehouse_locations:');
      console.log(JSON.stringify(location[0], null, 2));
      console.log('');
      console.log('⚠️ Strange: The warehouse_location exists but the rack field is still NULL.');
      console.log('   This suggests the lookup in barcodeService.js is failing.');
    }
  } else if (iu.rack && iu.position_code) {
    console.log('\n✅ SUCCESS: Both rack and position_code are populated!');
    console.log('');
    console.log(`   Rack: ${iu.rack}`);
    console.log(`   Position: ${iu.position_code}`);
    console.log('');
    console.log('🎉 Everything is working correctly!');
  } else if (!iu.position_code) {
    console.log('\n⚠️ No position code assigned');
    console.log('   This barcode was generated without position assignment.');
  }
  
  console.log('\n' + '='.repeat(80));
  process.exit(0);
}

checkRackField();
