import fetch from 'node-fetch';

const API_URL = 'http://localhost:4000';
const WAREHOUSE_ID = 'b1eff6be-b968-4861-94c2-f220e4eeffed';

async function testRacksAPI() {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 TESTING RACKS API DIRECTLY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Test 1: Get warehouses
    console.log('1️⃣  GET /api/warehouses\n');
    const warehousesRes = await fetch(`${API_URL}/api/warehouses`);
    const warehousesData = await warehousesRes.json();
    
    console.log(`Status: ${warehousesRes.status} ${warehousesRes.statusText}`);
    console.log(`Warehouses returned: ${warehousesData.warehouses?.length || 0}`);
    
    if (warehousesData.warehouses && warehousesData.warehouses.length > 0) {
      console.table(warehousesData.warehouses.map(w => ({
        id: w.id.substring(0, 8) + '...',
        name: w.name,
        code: w.code
      })));
      
      console.log('\n📋 Full warehouse ID:');
      console.log(`   ${warehousesData.warehouses[0].id}\n`);
    }

    // Test 2: Get racks for warehouse
    console.log('\n2️⃣  GET /api/racks?warehouse_id=' + WAREHOUSE_ID + '\n');
    const racksRes = await fetch(`${API_URL}/api/racks?warehouse_id=${WAREHOUSE_ID}`);
    const racksData = await racksRes.json();
    
    console.log(`Status: ${racksRes.status} ${racksRes.statusText}`);
    console.log(`Racks returned: ${racksData.racks?.length || 0}`);
    
    if (racksData.racks && racksData.racks.length > 0) {
      console.table(racksData.racks.map(r => ({
        rack_code: r.rack_code,
        size_category: r.size_category,
        status: r.status,
        capacity: r.total_capacity,
        current: r.current_count
      })));
    } else {
      console.log('❌ NO RACKS RETURNED!\n');
      console.log('Full response:', JSON.stringify(racksData, null, 2));
    }

    // Test 3: Get racks with size_category filter
    console.log('\n3️⃣  GET /api/racks?warehouse_id=' + WAREHOUSE_ID + '&size_category=Sawtooth\n');
    const sawtoothRacksRes = await fetch(`${API_URL}/api/racks?warehouse_id=${WAREHOUSE_ID}&size_category=Sawtooth`);
    const sawtoothRacksData = await sawtoothRacksRes.json();
    
    console.log(`Status: ${sawtoothRacksRes.status} ${sawtoothRacksRes.statusText}`);
    console.log(`Sawtooth racks returned: ${sawtoothRacksData.racks?.length || 0}`);
    
    if (sawtoothRacksData.racks && sawtoothRacksData.racks.length > 0) {
      console.table(sawtoothRacksData.racks.map(r => ({
        rack_code: r.rack_code,
        size_category: r.size_category,
        status: r.status
      })));
    }

    // Test 4: Get all racks (no filter)
    console.log('\n4️⃣  GET /api/racks (no filters)\n');
    const allRacksRes = await fetch(`${API_URL}/api/racks`);
    const allRacksData = await allRacksRes.json();
    
    console.log(`Status: ${allRacksRes.status} ${allRacksRes.statusText}`);
    console.log(`All racks returned: ${allRacksData.racks?.length || 0}`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ TESTS COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (racksData.racks && racksData.racks.length > 0) {
      console.log('✅ Backend API is working correctly!');
      console.log('💡 Problem is likely:');
      console.log('   1. Browser cache (hard refresh with Ctrl+Shift+R)');
      console.log('   2. Frontend not passing warehouse_id correctly');
      console.log('   3. CORS issue preventing frontend from getting response\n');
    } else {
      console.log('❌ Backend API is NOT returning racks');
      console.log('💡 Check backend server logs for errors\n');
    }

  } catch (error) {
    console.error('❌ API Test Error:', error.message);
    console.error('\n💡 Is the backend server running on port 4000?');
    console.error('   Run: cd backend && npm start\n');
  }
}

testRacksAPI();
