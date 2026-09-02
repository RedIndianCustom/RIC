import { supabaseAdmin } from './src/config/supabase.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('📝 Reading SQL migration file...\n');

const sqlFile = path.join(__dirname, 'database', 'FIX_QC_INSPECTION_RLS.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

console.log('🚀 Executing SQL migration...\n');

try {
  const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.error('❌ Error executing SQL:', error);
    
    // If exec_sql function doesn't exist, try direct execution
    console.log('\n⚠️  Trying alternative method...\n');
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && !s.startsWith('/*'));
    
    console.log(`Found ${statements.length} SQL statements to execute\n`);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        const { error: stmtError } = await supabaseAdmin.rpc('exec_sql', { sql_query: stmt + ';' });
        if (stmtError) {
          console.error(`  ❌ Error:`, stmtError.message);
        } else {
          console.log(`  ✅ Success`);
        }
      }
    }
  } else {
    console.log('✅ SQL migration executed successfully!');
    console.log('Result:', data);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n🔍 Testing access to pending_qc_inspections...\n');
  
  const { data: testData, error: testError } = await supabaseAdmin
    .from('pending_qc_inspections')
    .select('*');
  
  if (testError) {
    console.error('❌ Error accessing view:', testError);
  } else {
    console.log(`✅ Found ${testData.length} pending QC inspection(s)`);
    console.log('Data:', JSON.stringify(testData, null, 2));
  }
  
} catch (error) {
  console.error('❌ Unexpected error:', error);
}

console.log('\n✅ Migration complete!');
process.exit(0);
