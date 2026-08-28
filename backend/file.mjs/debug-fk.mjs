/**
 * Debug foreign key issue
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function debugFK() {
  console.log('🔍 Checking foreign key constraints on rack_configurations...\n');
  
  // Check current foreign key constraint
  const { data: constraints, error: fkError } = await supabase.rpc('exec_sql', {
    sql_query: `
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'rack_configurations' 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'warehouse_id';
    `
  });
  
  if (fkError) {
    console.error('❌ Error checking constraints:', fkError.message);
  } else {
    console.log('✅ Current foreign key constraints:');
    console.log(JSON.stringify(constraints, null, 2));
  }
  
  console.log('\n🔍 Checking if Main Warehouse exists in warehouses table...\n');
  
  const { data: warehouse, error: whError } = await supabase
    .from('warehouses')
    .select('*')
    .eq('code', 'WH1')
    .single();
    
  if (whError) {
    console.error('❌ Error:', whError);
  } else {
    console.log('✅ Main Warehouse exists:');
    console.log('   ID:', warehouse.id);
    console.log('   Name:', warehouse.name);
    console.log('   Code:', warehouse.code);
  }
  
  console.log('\n🔍 Attempting direct INSERT to test FK...\n');
  
  const testRack = {
    warehouse_id: warehouse.id,
    rack_number: 'TEST-RACK',
    rack_code: 'WH1-TEST-RACK',
    designated_size: 'Test',
    size_category: 'Test',
    total_shelves: 4,
    sections_per_shelf: 5,
    subsections_per_section: 2,
    capacity_per_subsection: 15,
    status: 'active'
  };
  
  console.log('Test rack data:', testRack);
  
  const { data: insertData, error: insertError } = await supabase
    .from('rack_configurations')
    .insert(testRack)
    .select();
    
  if (insertError) {
    console.error('\n❌ Insert failed:', insertError.message);
    console.error('❌ Error code:', insertError.code);
    console.error('❌ Error details:', insertError.details);
    console.error('❌ Error hint:', insertError.hint);
    
    // Check if the FK still points to warehouse_locations
    console.log('\n🔍 The FK might still be pointing to warehouse_locations table');
    console.log('💡 Let me check if we need to drop the table and recreate it...\n');
  } else {
    console.log('\n✅ Test rack inserted successfully!');
    console.log('Generated ID:', insertData[0]?.id);
    console.log('Total capacity:', insertData[0]?.total_capacity);
    
    // Clean up test rack
    await supabase
      .from('rack_configurations')
      .delete()
      .eq('id', insertData[0].id);
    console.log('\n🧹 Test rack cleaned up');
  }
}

debugFK().catch(console.error);
