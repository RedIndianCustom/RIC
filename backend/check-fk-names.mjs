import 'dotenv/config';
import { supabaseAdmin } from './src/config/supabase.js';

async function checkForeignKeys() {
  console.log('🔍 Checking foreign key constraints...\n');
  
  const { data, error } = await supabaseAdmin
    .rpc('exec_sql', {
      sql: `
        SELECT
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'inventory_units'
          AND ccu.table_name = 'warehouses'
        ORDER BY tc.constraint_name;
      `
    });
  
  if (error) {
    console.error('❌ Error:', error);
    
    // Try direct SQL query instead
    console.log('\nTrying alternative approach...\n');
    const { data: altData, error: altError } = await supabaseAdmin
      .from('inventory_units')
      .select('warehouse_id')
      .limit(1);
    
    if (altError) {
      console.error('❌ Alt Error:', altError);
    } else {
      console.log('✅ inventory_units table exists and has warehouse_id column');
    }
  } else {
    console.log('✅ Foreign Key Constraints:');
    console.log(JSON.stringify(data, null, 2));
  }
  
  // Try querying with just the column name (let PostgREST auto-detect)
  console.log('\n' + '='.repeat(80) + '\n');
  console.log('Testing auto-detect foreign key (no hint)...\n');
  
  const { data: autoData, error: autoError } = await supabaseAdmin
    .from('inventory_units')
    .select(`
      id,
      warehouse_id,
      rack,
      warehouses (
        id,
        name,
        code
      )
    `)
    .not('warehouse_id', 'is', null)
    .limit(1);
  
  if (autoError) {
    console.error('❌ Auto-detect Error:', autoError);
  } else {
    console.log('✅ Auto-detect Success!');
    console.log(JSON.stringify(autoData, null, 2));
  }
  
  process.exit(0);
}

checkForeignKeys();
