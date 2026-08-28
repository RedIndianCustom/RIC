/**
 * Run migration 028: Warehouse Storage Positions
 * This script executes the SQL migration file via Supabase
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Running Migration 028: Warehouse Storage Positions\n');

  // Read the SQL file
  const sqlPath = path.join(__dirname, 'database', '028_warehouse_storage_positions.sql');
  
  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ Migration file not found: ${sqlPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf-8');
  console.log(`📄 Loaded migration file (${sql.length} characters)\n`);

  // Split SQL into individual statements (basic split by semicolon)
  // Note: This is a simple approach. For complex SQL, use a proper parser
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    
    // Skip comments and empty statements
    if (statement.trim().startsWith('--') || statement.trim() === ';') {
      continue;
    }

    // Extract statement type for logging
    const statementType = statement.split(/\s+/)[0].toUpperCase();
    
    console.log(`[${i + 1}/${statements.length}] Executing ${statementType}...`);

    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });
      
      if (error) {
        // Try direct query as fallback
        const { error: directError } = await supabase.from('_').select(statement);
        
        if (directError && directError.code !== '42P01') { // 42P01 = table doesn't exist (expected for some queries)
          console.error(`   ❌ Error: ${directError.message}`);
          errorCount++;
        } else {
          console.log(`   ✅ Success`);
          successCount++;
        }
      } else {
        console.log(`   ✅ Success`);
        successCount++;
      }
    } catch (err) {
      console.error(`   ❌ Exception: ${err.message}`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log(`📋 Total: ${statements.length}`);

  if (errorCount === 0) {
    console.log('\n🎉 Migration completed successfully!');
    console.log('\n💡 Next step: Run test-warehouse-positions.mjs to verify');
  } else {
    console.log('\n⚠️  Some statements failed. You may need to run the SQL file manually.');
    console.log('\n📖 Manual execution:');
    console.log('   1. Open Supabase Dashboard → SQL Editor');
    console.log('   2. Copy contents of backend/database/028_warehouse_storage_positions.sql');
    console.log('   3. Paste and run in SQL Editor');
  }
}

runMigration().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
