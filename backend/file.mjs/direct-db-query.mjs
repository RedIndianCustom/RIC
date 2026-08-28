import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

// Extract connection details from Supabase URL
const SUPABASE_URL = process.env.SUPABASE_URL;
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)[1];

// Supabase PostgreSQL connection string format
const connectionString = `postgresql://postgres.${projectRef}:${process.env.SUPABASE_DB_PASSWORD || 'FYEMP.xyzd8ShL#'}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;

console.log('🔌 Attempting direct PostgreSQL connection...\n');
console.log('Project:', projectRef);

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function queryDirect() {
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL!\n');

    // Query products directly
    const result = await client.query(`
      SELECT 
        sku, brand, model, dimensions, category, current_stock, status
      FROM public.products 
      ORDER BY category, sku 
      LIMIT 10
    `);

    console.log(`📦 Found ${result.rowCount} products:\n`);
    result.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.brand} ${row.model} - ${row.dimensions} (${row.sku})`);
    });

    console.log('\n✅ Direct database query works!');
    console.log('⚠️  But PostgREST API still has schema cache issue.\n');

    await client.end();

  } catch (err) {
    console.error('❌ Connection error:', err.message);
    console.log('\nTrying connection details. Check if DB password is correct.');
  }
}

queryDirect();
