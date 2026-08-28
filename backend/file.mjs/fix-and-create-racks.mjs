/**
 * Fix rack_configurations to use warehouses table and create sample racks
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

async function fixAndCreateRacks() {
  console.log('🔧 Step 1: Fixing foreign key constraint...\n');
  
  try {
    // Drop old constraint (if exists)
    await supabase.rpc('exec_sql', {
      sql_query: 'ALTER TABLE IF EXISTS rack_configurations DROP CONSTRAINT IF EXISTS rack_configurations_warehouse_id_fkey;'
    });
    console.log('✅ Dropped old foreign key constraint (if it existed)');
  } catch (err) {
    console.log('ℹ️ Could not drop old constraint (may not exist):', err.message);
  }
  
  try {
    // Add new constraint pointing to warehouses
    await supabase.rpc('exec_sql', {
      sql_query: `ALTER TABLE rack_configurations 
                  ADD CONSTRAINT rack_configurations_warehouse_id_fkey 
                  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE;`
    });
    console.log('✅ Added new foreign key constraint pointing to warehouses table\n');
  } catch (err) {
    console.log('ℹ️ Constraint may already exist:', err.message, '\n');
  }
  
  console.log('📦 Step 2: Creating sample racks...\n');
  
  // Get Main Warehouse
  const { data: warehouse, error: whError } = await supabase
    .from('warehouses')
    .select('*')
    .eq('code', 'WH1')
    .single();
    
  if (whError || !warehouse) {
    console.error('❌ Main Warehouse not found');
    return;
  }
  
  console.log(`✅ Found: ${warehouse.name} (${warehouse.id})\n`);
  
  // Create sample racks
  const sampleRacks = [
    {
      warehouse_id: warehouse.id,
      rack_number: 'RACK-1',
      rack_code: 'WH1-RACK-1',
      designated_size: '90/90-18',
      size_category: 'Sawtooth',
      total_shelves: 4,
      sections_per_shelf: 5,
      subsections_per_section: 2,
      capacity_per_subsection: 15,
      status: 'active',
      notes: 'Rack for Sawtooth 90/90-18'
    },
    {
      warehouse_id: warehouse.id,
      rack_number: 'RACK-2',
      rack_code: 'WH1-RACK-2',
      designated_size: '100/90-17',
      size_category: 'Dual Sport',
      total_shelves: 4,
      sections_per_shelf: 5,
      subsections_per_section: 2,
      capacity_per_subsection: 15,
      status: 'active',
      notes: 'Rack for Dual Sport 100/90-17'
    },
    {
      warehouse_id: warehouse.id,
      rack_number: 'RACK-3',
      rack_code: 'WH1-RACK-3',
      designated_size: 'General',
      size_category: 'General',
      total_shelves: 5,
      sections_per_shelf: 6,
      subsections_per_section: 2,
      capacity_per_subsection: 15,
      status: 'active',
      notes: 'General purpose rack for all sizes'
    }
  ];
  
  for (const rack of sampleRacks) {
    const { data, error } = await supabase
      .from('rack_configurations')
      .insert(rack)
      .select()
      .single();
      
    if (error) {
      console.error(`❌ Failed to create ${rack.rack_code}:`, error.message);
    } else {
      console.log(`✅ Created: ${rack.rack_code} - ${rack.designated_size} (Capacity: ${data.total_capacity})`);
    }
  }
  
  console.log('\n🎉 Setup complete!');
  console.log('\n📊 You can now:');
  console.log('   1. Refresh your frontend');
  console.log('   2. Select Main Warehouse');
  console.log('   3. See the racks in the dropdown!');
}

fixAndCreateRacks().catch(console.error);
