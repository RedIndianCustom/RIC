/**
 * Run RIC serial mapping table migration
 */

import { supabaseAdmin } from './src/config/supabase.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  console.log('🚀 Running RIC Serial Mapping Migration...\n');
  
  try {
    // Read migration file
    const migrationPath = join(__dirname, 'database', 'migrations', 'create_ric_serial_mapping.sql');
    const sql = readFileSync(migrationPath, 'utf-8');
    
    console.log('📄 Migration file loaded');
    console.log('📋 SQL length:', sql.length, 'characters\n');
    
    // Execute migration
    console.log('⚙️  Executing migration...\n');
    const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    }
    
    console.log('✅ Migration completed successfully!\n');
    
    // Verify table exists
    console.log('🔍 Verifying table exists...');
    const { data: tableCheck, error: checkError } = await supabaseAdmin
      .from('ric_serial_numbers')
      .select('*')
      .limit(1);
    
    if (checkError) {
      console.error('❌ Table verification failed:', checkError.message);
      console.log('\n💡 The migration may have run but the table might need a moment to be available.');
      console.log('   Try running test-ric-mapping.mjs in a few seconds.\n');
    } else {
      console.log('✅ Table ric_serial_numbers is accessible!\n');
      console.log('🎉 Migration successful! The automatic RIC serial mapping is now ready.\n');
      console.log('💡 Next steps:');
      console.log('   1. Generate barcodes in the Barcode Generation page');
      console.log('   2. Mappings will be created automatically');
      console.log('   3. Scan those barcodes in Receiving - they will be identified automatically!\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Failed:', err);
    process.exit(1);
  });
