import 'dotenv/config';
import { supabaseAdmin } from './src/config/supabase.js';

async function checkRacks() {
  console.log('🔍 Checking rack_configurations table...\n');
  
  // Get all racks
  const { data: racks, error } = await supabaseAdmin
    .from('rack_configurations')
    .select('*')
    .order('rack_number');
  
  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
  
  if (!racks || racks.length === 0) {
    console.log('❌ NO RACKS FOUND IN rack_configurations TABLE!');
    console.log('\nThis is the problem! The barcodeService.js tries to find racks by:');
    console.log('  - warehouse_id');
    console.log('  - rack_number (extracted from position code like WH1-R05-RK05-S01-SH05-SUB01)');
    console.log('\nBut the table is empty, so it cannot assign warehouse location!');
    console.log('\nSolution: Create racks in rack_configurations table');
  } else {
    console.log(`✅ Found ${racks.length} rack(s):\n`);
    racks.forEach((rack, i) => {
      console.log(`${i + 1}. ${rack.rack_code || 'No code'}`);
      console.log(`   Warehouse ID: ${rack.warehouse_id}`);
      console.log(`   Rack Number: ${rack.rack_number}`);
      console.log(`   Capacity: ${rack.total_capacity || 0}`);
      console.log(`   Current Count: ${rack.current_count || 0}`);
      console.log('');
    });
  }
  
  // Check if warehouse_locations table has data (the old rack system)
  console.log('='.repeat(80));
  console.log('\n🔍 Checking warehouse_locations table (old rack system)...\n');
  
  const { data: locations, error: locError } = await supabaseAdmin
    .from('warehouse_locations')
    .select('id, code, zone, aisle, rack')
    .limit(10);
  
  if (locError) {
    console.error('❌ Error:', locError);
  } else if (!locations || locations.length === 0) {
    console.log('⚠️ No warehouse locations found');
  } else {
    console.log(`✅ Found ${locations.length} warehouse location(s):\n`);
    locations.forEach((loc, i) => {
      console.log(`${i + 1}. ${loc.code}`);
      console.log(`   Zone: ${loc.zone}, Aisle: ${loc.aisle}, Rack: ${loc.rack}`);
      console.log('');
    });
  }
  
  process.exit(0);
}

checkRacks();
