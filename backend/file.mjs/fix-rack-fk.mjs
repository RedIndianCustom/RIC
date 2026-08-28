/**
 * Fix rack_configurations foreign key to reference warehouses
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixFK() {
  console.log('🔧 Fixing rack_configurations foreign key...\n');
  
  // Read SQL file
  const sql = fs.readFileSync('database/FIX_RACK_FK.sql', 'utf8');
  
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.error('❌ Error:', error.message);
    
    // Try direct queries
    console.log('\n🔧 Trying direct approach...\n');
    
    // Drop constraint
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql_query: 'ALTER TABLE rack_configurations DROP CONSTRAINT IF EXISTS rack_configurations_warehouse_id_fkey;'
    });
    
    if (dropError) {
      console.error('❌ Drop constraint error:', dropError.message);
    } else {
      console.log('✅ Dropped old foreign key constraint');
    }
    
    // Add new constraint
    const { error: addError } = await supabase.rpc('exec_sql', {
      sql_query: `ALTER TABLE rack_configurations 
                  ADD CONSTRAINT rack_configurations_warehouse_id_fkey 
                  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE;`
    });
    
    if (addError) {
      console.error('❌ Add constraint error:', addError.message);
    } else {
      console.log('✅ Added new foreign key constraint to warehouses table');
    }
  } else {
    console.log('✅ Foreign key fixed successfully');
  }
}

fixFK().catch(console.error);
