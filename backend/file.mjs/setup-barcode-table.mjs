import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupBarcodeTable() {
  try {
    console.log('📦 Setting up barcode configurations table...\n');

    // Read SQL file
    const sqlPath = join(__dirname, 'database', '010_barcode_configurations.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    console.log('📄 Executing SQL migration...');
    
    // Execute SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(async () => {
      // If RPC doesn't exist, try direct query
      return await supabase.from('_sql').insert({ query: sql });
    });

    // Try alternative method if RPC fails
    if (error) {
      console.log('⚠️  RPC method failed, trying direct execution...');
      
      // Split SQL into individual statements and execute
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

      for (const statement of statements) {
        if (statement.includes('CREATE TABLE') || statement.includes('INSERT') || 
            statement.includes('CREATE INDEX') || statement.includes('CREATE POLICY')) {
          const { error: execError } = await supabase.rpc('exec', { sql: statement });
          if (execError) {
            console.error(`Error executing statement: ${statement.substring(0, 100)}...`);
            console.error(execError);
          }
        }
      }
    }

    // Verify table was created
    const { data: tables, error: checkError } = await supabase
      .from('barcode_configurations')
      .select('*')
      .limit(1);

    if (checkError) {
      console.error('❌ Error verifying table creation:', checkError);
      console.log('\n📋 Please run the SQL file manually in Supabase SQL Editor:');
      console.log('   Location: backend/database/010_barcode_configurations.sql\n');
      process.exit(1);
    }

    console.log('✅ Barcode configurations table setup complete!');
    console.log('✅ Default configuration created');
    console.log('\n📊 Current configuration:');
    console.log(JSON.stringify(tables, null, 2));
    
  } catch (err) {
    console.error('❌ Error setting up barcode table:', err);
    console.log('\n📋 Please run the SQL file manually in Supabase SQL Editor:');
    console.log('   1. Go to your Supabase project dashboard');
    console.log('   2. Navigate to SQL Editor');
    console.log('   3. Open and run: backend/database/010_barcode_configurations.sql\n');
    process.exit(1);
  }
}

setupBarcodeTable();
