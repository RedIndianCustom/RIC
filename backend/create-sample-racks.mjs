/**
 * Create sample racks for testing
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

async function createSampleRacks() {
  console.log('🔍 Getting Main Warehouse ID...\n');
  
  // Get Main Warehouse
  const { data: warehouse, error: whError } = await supabase
    .from('warehouses')
    .select('*')
    .eq('code', 'WH1')
    .single();
    
  if (whError || !warehouse) {
    console.error('❌ Main Warehouse not found:', whError);
    return;
  }
  
  console.log(`✅ Found Main Warehouse: ${warehouse.name} (${warehouse.id})\n`);
  
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
      current_count: 0,
      status: 'active',
      notes: 'Sample rack for Sawtooth tires 90/90-18'
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
      current_count: 0,
      status: 'active',
      notes: 'Sample rack for Dual Sport tires 100/90-17'
    },
    {
      warehouse_id: warehouse.id,
      rack_number: 'RACK-3',
      rack_code: 'WH1-RACK-3',
      designated_size: '110/90-17',
      size_category: 'Sawtooth',
      total_shelves: 4,
      sections_per_shelf: 5,
      subsections_per_section: 2,
      capacity_per_subsection: 15,
      current_count: 0,
      status: 'active',
      notes: 'Sample rack for Sawtooth tires 110/90-17'
    },
    {
      warehouse_id: warehouse.id,
      rack_number: 'RACK-4',
      rack_code: 'WH1-RACK-4',
      designated_size: '120/80-17',
      size_category: 'Enduro',
      total_shelves: 4,
      sections_per_shelf: 4,
      subsections_per_section: 2,
      capacity_per_subsection: 15,
      current_count: 0,
      status: 'active',
      notes: 'Sample rack for Enduro tires 120/80-17'
    },
    {
      warehouse_id: warehouse.id,
      rack_number: 'RACK-5',
      rack_code: 'WH1-RACK-5',
      designated_size: 'General',
      size_category: 'General',
      total_shelves: 5,
      sections_per_shelf: 6,
      subsections_per_section: 2,
      capacity_per_subsection: 15,
      current_count: 0,
      status: 'active',
      notes: 'General purpose rack for all tire sizes'
    }
  ];
  
  console.log('📦 Creating sample racks...\n');
  
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
  
  console.log('\n🎉 Sample racks created successfully!');
  
  // Get final count
  const { data: finalRacks } = await supabase
    .from('rack_configurations')
    .select('*')
    .eq('warehouse_id', warehouse.id);
    
  console.log('\n📊 Summary:');
  console.log(`   - ${finalRacks?.length || 0} racks now in Main Warehouse`);
  if (finalRacks && finalRacks.length > 0) {
    const totalCap = finalRacks.reduce((sum, r) => sum + (r.total_capacity || 0), 0);
    console.log(`   - Total capacity: ${totalCap} tires`);
  }
  console.log(`   - Rack structure: 4-5 shelves, 4-6 sections per shelf, 2 subsections per section`);
}

createSampleRacks().catch(console.error);
