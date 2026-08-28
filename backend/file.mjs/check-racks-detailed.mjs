import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.hbsynkxaadnximuytbor',
  password: 'FYEMP.xyzd8ShL#',
  ssl: { rejectUnauthorized: false }
});

async function checkRacks() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // 1. Check ALL racks
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1️⃣  CHECKING ALL RACKS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const allRacks = await client.query(`
      SELECT 
        id, 
        warehouse_id, 
        rack_code, 
        size_category,
        status,
        total_capacity,
        current_count
      FROM rack_configurations
      ORDER BY rack_code
    `);
    
    console.log(`Total racks in database: ${allRacks.rowCount}`);
    if (allRacks.rows.length > 0) {
      console.table(allRacks.rows);
    }

    // 2. Check warehouses
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('2️⃣  CHECKING WAREHOUSES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const warehouses = await client.query(`
      SELECT id, name, code, zone, aisle, rack
      FROM warehouse_locations
      WHERE name = 'Main Warehouse'
      LIMIT 5
    `);
    
    console.log(`Warehouses named "Main Warehouse": ${warehouses.rowCount}`);
    if (warehouses.rows.length > 0) {
      console.table(warehouses.rows);
    }

    // 3. Check if warehouse IDs match
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('3️⃣  CHECKING WAREHOUSE ID MATCH');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (allRacks.rows.length > 0 && warehouses.rows.length > 0) {
      const rackWarehouseId = allRacks.rows[0].warehouse_id;
      const mainWarehouseId = warehouses.rows[0].id;
      
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
    
    const racksForFrontendWarehouse = await client.query(`
      SELECT 
        id, 
        warehouse_id, 
        rack_code, 
        size_category,
        status
      FROM rack_configurations
      WHERE warehouse_id = $1
    `, [frontendWarehouseId]);
    
    console.log(`Racks found for this warehouse_id: ${racksForFrontendWarehouse.rowCount}`);
    if (racksForFrontendWarehouse.rows.length > 0) {
      console.table(racksForFrontendWarehouse.rows);
    } else {
      console.log('❌ NO RACKS FOUND - This is the problem!\n');
    }

    // 5. Propose fix
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('5️⃣  PROPOSED FIX');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (warehouses.rows.length > 0 && allRacks.rows.length > 0) {
      const correctWarehouseId = warehouses.rows[0].id;
      console.log('Run this SQL to fix the warehouse_id mismatch:\n');
      console.log(`UPDATE rack_configurations`);
      console.log(`SET warehouse_id = '${correctWarehouseId}'`);
      console.log(`WHERE warehouse_id != '${correctWarehouseId}';`);
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkRacks();
