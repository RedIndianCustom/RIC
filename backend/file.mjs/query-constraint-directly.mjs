import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

// Extract connection details from Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const password = process.env.SUPABASE_DB_PASSWORD;

// Parse the URL to get the project ref
const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');

const client = new Client({
  host: `db.${projectRef}.supabase.co`,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: password,
  ssl: { rejectUnauthorized: false }
});

async function queryConstraints() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    console.log('📋 Querying shipments table constraints...\n');
    
    const query = `
      SELECT 
        conname AS constraint_name,
        contype AS constraint_type,
        pg_get_constraintdef(c.oid) AS constraint_definition
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      JOIN pg_class cl ON cl.oid = c.conrelid
      WHERE cl.relname = 'shipments'
      AND n.nspname = 'public'
      ORDER BY conname;
    `;
    
    const result = await client.query(query);
    
    console.log(`Found ${result.rows.length} constraints:\n`);
    
    result.rows.forEach(row => {
      console.log(`Constraint: ${row.constraint_name}`);
      console.log(`Type: ${row.constraint_type}`);
      console.log(`Definition: ${row.constraint_definition}`);
      console.log('---');
    });
    
    // Find status constraints specifically
    const statusConstraints = result.rows.filter(r => 
      r.constraint_name.toLowerCase().includes('status') ||
      r.constraint_definition.toLowerCase().includes('status')
    );
    
    if (statusConstraints.length > 0) {
      console.log('\n🔍 Status-related constraints:');
      statusConstraints.forEach(c => {
        console.log(`\n  Name: ${c.constraint_name}`);
        console.log(`  Definition: ${c.constraint_definition}`);
      });
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

queryConstraints();
