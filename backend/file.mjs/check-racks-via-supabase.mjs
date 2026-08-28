import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hbsynkxaadnximuytbor.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhic3lua3hhYWRueGltdXl0Ym9yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjM4NjYxNSwiZXhwIjoyMTAxOTYyNjE1fQ.jH9dKpo-m6HdPSlutMW6YQxtAr3pS8XEBIkuIuJEhWo'
);

async function checkRacks() {
  try {
    console.log('✅ Using Supabase client\n');

    // 1. Check ALL racks
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1️⃣  CHECKING ALL RACKS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const { data: allRacks, error: racksError } = await supabase
      .from('rack_configurations')
      .select('*')
      .order('rack_code');
    
    if (racksError) {
      console.error('❌ Error fetching racks:', racksError.message);
    } else {
      console.log(`Total racks in database: ${allRacks.length}`);
      if (allRacks.length > 0) {
        console.table(allRacks.map(r => ({
          id: r.id.substring(0, 8) + '...',
          warehouse_id: r.warehouse_id.substring(0, 8) + '...',
          rack_code: r.rack_code,
          size_category: r.size_category,
          status: r.status,
          capacity: r.total_capacity,
          current: r.current_count
        })));
      }
    }

    // 2. Check warehouses
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('2️⃣  CHECKING WAREHOUSES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const { data: warehouses, error: whError } = await supabase
      .from('warehouse_locations')
      .select('*')
      .eq('name', 'Main Warehouse')
      .limit(5);
    
    if (whError) {
      console.error('❌ Error fetching warehouses:', whError.message);
    } else {
      console.log(`Warehouses named "Main Warehouse": ${warehouses.length}`);
      if (warehouses.length > 0) {
        console.table(warehouses.map(w => ({
          id: w.id.substring(0, 8) + '...',
          name: w.name,
          code: w.code,
          zone: w.zone,
          aisle: w.aisle,
          rack: w.rack
        })));
        
        // Show full IDs
        console.log('\n📋 Full warehouse IDs:');
        warehouses.forEach((w, i) => {
          console.log(`   [${i}] ${w.id}`);
        });
      }
    }

    // 3. Check if warehouse IDs match
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('3️⃣  CHECKING WAREHOUSE ID MATCH');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (allRacks && allRacks.length > 0) {
      // Show full rack warehouse IDs
      console.log('📋 Full rack warehouse_ids:');
      allRacks.forEach((r, i) => {
        console.log(`   [${i}] ${r.warehouse_id} (${r.rack_code})`);
      });
      console.log('');
    }
    
    if (allRacks && allRacks.length > 0 && warehouses && warehouses.length > 0) {
      const rackWarehouseId = allRacks[0].warehouse_id;
      const mainWarehouseId = warehouses[0].id;
      
      console.log(`Rack warehouse_id:     ${rackWarehouseId}`);
      console.log(`Main warehouse id:     ${mainWarehouseId}`);
      console.log(`Match:                 ${rackWarehouseId === mainWarehouseId ? '✅ YES' : '❌ NO'}\n`);
      
      if (rackWarehouseId !== mainWarehouseId) {
        console.log('⚠️  MISMATCH DETECTED! This is why racks don\'t load!');
        console.log('💡 Need to update rack_configurations.warehouse_id to match warehouse_locations.id\n');
      }
    }

    // 4. Check with the warehouse_id used by frontend
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('4️⃣  CHECKING WITH FRONTEND WAREHOUSE_ID');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const frontendWarehouseId = 'b1eff6be-b968-4861-94c2-f220e4eeffed';
    console.log(`Frontend is querying with: ${frontendWarehouseId}\n`);
    
    const { data: racksForFrontendWarehouse, error: frontendRackError } = await supabase
      .from('rack_configurations')
      .select('*')
      .eq('warehouse_id', frontendWarehouseId);
    
    if (frontendRackError) {
      console.error('❌ Error:', frontendRackError.message);
    } else {
      console.log(`Racks found for this warehouse_id: ${racksForFrontendWarehouse.length}`);
      if (racksForFrontendWarehouse.length > 0) {
        console.table(racksForFrontendWarehouse.map(r => ({
          rack_code: r.rack_code,
          size_category: r.size_category,
          status: r.status
        })));
      } else {
        console.log('❌ NO RACKS FOUND - This is the problem!\n');
      }
    }

    // 5. Propose fix
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('5️⃣  PROPOSED FIX');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (warehouses && warehouses.length > 0 && allRacks && allRacks.length > 0) {
      const correctWarehouseId = warehouses[0].id;
      console.log('✅ SQL to fix the warehouse_id mismatch:\n');
      console.log(`UPDATE rack_configurations`);
      console.log(`SET warehouse_id = '${correctWarehouseId}'`);
      console.log(`WHERE warehouse_id != '${correctWarehouseId}';`);
      console.log('\n💡 This will align all racks to the Main Warehouse ID that the API returns.');
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkRacks();
