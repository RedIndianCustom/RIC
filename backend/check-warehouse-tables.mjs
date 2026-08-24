/**
 * Check warehouse tables
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

async function checkTables() {
  console.log('🔍 Checking warehouse_locations table...\n');
  
  const { data: locations, error: locError } = await supabase
    .from('warehouse_locations')
    .select('*');
    
  if (locError) {
    console.error('❌ Error fetching warehouse_locations:', locError.message);
  } else {
    console.log(`✅ Found ${locations?.length || 0} warehouse_locations`);
    if (locations && locations.length > 0) {
      locations.forEach(loc => {
        console.log(`   - ${loc.name} (${loc.code}) - ID: ${loc.id}`);
      });
    }
  }
  
  console.log('\n🔍 Checking warehouses table...\n');
  
  const { data: warehouses, error: whError } = await supabase
    .from('warehouses')
    .select('*');
    
  if (whError) {
    console.error('❌ Error fetching warehouses:', whError.message);
  } else {
    console.log(`✅ Found ${warehouses?.length || 0} warehouses`);
    if (warehouses && warehouses.length > 0) {
      warehouses.forEach(wh => {
        console.log(`   - ${wh.name} (${wh.code}) - ID: ${wh.id}`);
      });
    }
  }
  
  console.log('\n💡 The rack_configurations table references warehouse_locations, not warehouses');
}

checkTables().catch(console.error);
