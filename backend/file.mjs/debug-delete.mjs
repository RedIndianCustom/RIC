import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function debugDelete() {
  const client = await pool.connect();
  
  try {
    console.log('\n=== 1. Current Barcodes with Inventory Units ===');
    const barcodesQuery = await client.query(`
      SELECT 
        b.id as barcode_id,
        b.barcode_value,
        b.inventory_unit_id,
        iu.warehouse_id,
        iu.rack as rack_code,
        w.code as warehouse_code,
        w.name as warehouse_name
      FROM barcodes b
      LEFT JOIN inventory_units iu ON b.inventory_unit_id = iu.id
      LEFT JOIN warehouses w ON iu.warehouse_id = w.id
      WHERE b.status = 'active'
      ORDER BY b.created_at DESC
      LIMIT 10
    `);
    console.table(barcodesQuery.rows);

    console.log('\n=== 2. Rack Configurations ===');
    const racksQuery = await client.query(`
      SELECT 
        id,
        warehouse_id,
        rack_code,
        rack_number,
        current_count,
        total_capacity,
        designated_size
      FROM rack_configurations
      WHERE warehouse_id = 'b1eff6be-b968-4861-94c2-f220e4eeffed'
      ORDER BY rack_code
    `);
    console.table(racksQuery.rows);

    console.log('\n=== 3. Actual Unit Count Per Rack ===');
    const countQuery = await client.query(`
      SELECT 
        iu.warehouse_id,
        iu.rack as rack_code,
        w.code as warehouse_code,
        COUNT(*) as actual_unit_count
      FROM inventory_units iu
      LEFT JOIN warehouses w ON iu.warehouse_id = w.id
      WHERE iu.warehouse_id IS NOT NULL 
        AND iu.rack IS NOT NULL
      GROUP BY iu.warehouse_id, iu.rack, w.code
      ORDER BY iu.rack
    `);
    console.table(countQuery.rows);

    console.log('\n=== 4. Foreign Key Constraints (barcodes -> inventory_units) ===');
    const fkQuery = await client.query(`
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'barcodes'
        AND ccu.table_name = 'inventory_units'
    `);
    console.table(fkQuery.rows);

  } finally {
    client.release();
    await pool.end();
  }
}

debugDelete().catch(console.error);
