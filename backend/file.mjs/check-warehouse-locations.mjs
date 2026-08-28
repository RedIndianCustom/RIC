import 'dotenv/config';
import { supabaseAdmin } from './src/config/supabase.js';

async function checkWarehouseLocations() {
  console.log('🔍 Checking warehouse_locations table...\n');
  console.log('='.repeat(80));
  
  const { data: locations, error } = await supabaseAdmin
    .from('warehouse_locations')
    .select('*')
    .order('code', { ascending: true });
  
  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
  
  console.log(`\n📦 Found ${locations.length} warehouse locations:\n`);
  
  if (locations.length === 0) {
    console.log('⚠️ The warehouse_locations table is EMPTY!');
    console.log('');
    console.log('💡 This explains why rack lookups are failing.');
    console.log('');
    console.log('📝 To fix:');
    console.log('   Run a migration to populate warehouse_locations with all racks');
    process.exit(0);
  }
  
  // Group by warehouse
  const byWarehouse = {};
  locations.forEach(loc => {
    const whCode = loc.code.split('-')[0];
    if (!byWarehouse[whCode]) byWarehouse[whCode] = [];
    byWarehouse[whCode].push(loc);
  });
  
  Object.keys(byWarehouse).forEach(whCode => {
    console.log(`\n${whCode}:`);
    byWarehouse[whCode].forEach(loc => {
      console.log(`  ${loc.code}`);
      if (loc.metadata) {
        console.log(`    Capacity: ${loc.metadata.total_capacity || 'N/A'}`);
      }
    });
  });
  
  // Check if WH1-R06-RK06 exists
  console.log('\n' + '='.repeat(80));
  console.log('\n🔍 Checking for WH1-R06-RK06...\n');
  
  const target = locations.find(l => l.code === 'WH1-R06-RK06');
  if (target) {
    console.log('✅ FOUND: WH1-R06-RK06');
    console.log(JSON.stringify(target, null, 2));
  } else {
    console.log('❌ NOT FOUND: WH1-R06-RK06');
    console.log('');
    console.log('📝 This rack needs to be created in warehouse_locations');
  }
  
  console.log('\n' + '='.repeat(80));
  process.exit(0);
}

checkWarehouseLocations();
