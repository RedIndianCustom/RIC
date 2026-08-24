/**
 * Check if racks exist in database
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkRacks() {
  console.log('🔍 Checking warehouses...\n');
  
  // Get warehouses
  const { data: warehouses, error: whError } = await supabase
    .from('warehouses')
    .select('*');
    
  if (whError) {
    console.error('❌ Error fetching warehouses:', whError);
    return;
  }
  
  console.log(`✅ Found ${warehouses.length} warehouses:`);
  warehouses.forEach(wh => {
    console.log(`  - ${wh.name} (${wh.code}) - ID: ${wh.id}`);
  });
  
  console.log('\n🔍 Checking rack_configurations...\n');
  
  // Get all racks
  const { data: racks, error: rackError } = await supabase
    .from('rack_configurations')
    .select('*');
    
  if (rackError) {
    console.error('❌ Error fetching racks:', rackError);
    return;
  }
  
  console.log(`✅ Found ${racks?.length || 0} racks in total`);
  
  if (!racks || racks.length === 0) {
    console.warn('\n⚠️ NO RACKS FOUND IN DATABASE!');
    console.warn('💡 You need to create racks in the Warehouse Locations page first');
    return;
  }
  
  // Group by warehouse
  const racksByWarehouse = {};
  racks.forEach(rack => {
    if (!racksByWarehouse[rack.warehouse_id]) {
      racksByWarehouse[rack.warehouse_id] = [];
    }
    racksByWarehouse[rack.warehouse_id].push(rack);
  });
  
  console.log('\n📊 Racks by Warehouse:\n');
  
  for (const [warehouseId, warehouseRacks] of Object.entries(racksByWarehouse)) {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    console.log(`\n🏭 ${warehouse?.name || 'Unknown'} (${warehouseId}):`);
    console.log(`   Total racks: ${warehouseRacks.length}`);
    
    warehouseRacks.forEach((rack, idx) => {
      console.log(`   ${idx + 1}. ${rack.rack_code} - ${rack.designated_size}`);
      console.log(`      Capacity: ${rack.current_count}/${rack.total_capacity} used`);
      console.log(`      Config: ${rack.total_shelves} shelves, ${rack.sections_per_shelf} sections, ${rack.subsections_per_section} subsections`);
    });
  }
}

checkRacks().catch(console.error);
