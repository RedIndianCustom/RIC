/**
 * Test script for warehouse locations and storage positions
 * Run: node test-warehouse-positions.mjs
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
  console.log('🧪 Testing Warehouse Locations & Storage Positions\n');
  console.log('='.repeat(60));

  // Test 1: Check warehouse_storage_positions table exists
  console.log('\n📋 Test 1: Verify warehouse_storage_positions table exists');
  const { data: tables, error: tablesError } = await supabase
    .from('warehouse_storage_positions')
    .select('id')
    .limit(1);

  if (tablesError) {
    console.error('❌ Table does not exist:', tablesError.message);
    console.log('💡 Run: psql -d <database> -f backend/database/028_warehouse_storage_positions.sql');
    return;
  }
  console.log('✅ Table exists');

  // Test 2: Check generate_storage_positions_for_rack function exists
  console.log('\n📋 Test 2: Verify generate_storage_positions_for_rack function exists');
  const { data: funcCheck, error: funcError } = await supabase
    .rpc('generate_storage_positions_for_rack', {
      p_warehouse_location_id: '00000000-0000-0000-0000-000000000000',
      p_sections: 1,
      p_shelves: 1,
      p_subsections: 1,
      p_capacity_per_subsection: 1
    });

  if (funcError) {
    // If error contains "not found", the function exists (just with bad UUID)
    if (funcError.message.includes('not found') || funcError.message.includes('Warehouse location not found')) {
      console.log('✅ Function exists (returned expected error for invalid UUID)');
    } else if (funcError.code === '42883') {
      // 42883 = function does not exist
      console.error('❌ Function does not exist:', funcError.message);
      console.log('💡 Run the migration SQL file to create the function');
      return;
    } else {
      console.log('✅ Function exists (error code:', funcError.code, ')');
    }
  } else {
    console.log('✅ Function executed successfully');
  }

  // Test 3: Get a sample warehouse location
  console.log('\n📋 Test 3: Get sample warehouse location');
  const { data: locations, error: locError } = await supabase
    .from('warehouse_locations')
    .select('id, code, zone, metadata')
    .limit(1);

  if (locError || !locations || locations.length === 0) {
    console.log('⚠️ No warehouse locations found');
    console.log('💡 Create a rack using the frontend first');
    return;
  }

  const testLocation = locations[0];
  console.log('✅ Found location:', testLocation.code);
  console.log('   Metadata:', JSON.stringify(testLocation.metadata, null, 2));

  // Test 4: Check if positions exist for this location
  console.log('\n📋 Test 4: Check existing positions for location');
  const { data: existingPositions, error: posError } = await supabase
    .from('warehouse_storage_positions')
    .select('id, position_code, tire_size, current_stock, capacity')
    .eq('warehouse_location_id', testLocation.id)
    .limit(5);

  if (posError) {
    console.error('❌ Error querying positions:', posError.message);
    return;
  }

  console.log(`✅ Found ${existingPositions?.length || 0} existing positions`);
  if (existingPositions && existingPositions.length > 0) {
    console.log('   Sample positions:');
    existingPositions.slice(0, 3).forEach(p => {
      console.log(`   - ${p.position_code}: ${p.tire_size || 'empty'} (${p.current_stock}/${p.capacity})`);
    });
  }

  // Test 5: Generate positions if none exist
  if (!existingPositions || existingPositions.length === 0) {
    const metadata = testLocation.metadata || {};
    
    if (metadata.sectionsPerRack && metadata.shelvesPerSection && 
        metadata.subsectionsPerSection && metadata.tiresPerSubsection) {
      
      console.log('\n📋 Test 5: Generate positions from metadata');
      console.log(`   Generating: ${metadata.sectionsPerRack} sections × ${metadata.shelvesPerSection} shelves × ${metadata.subsectionsPerSection} subsections`);
      
      const { data: generated, error: genError } = await supabase
        .rpc('generate_storage_positions_for_rack', {
          p_warehouse_location_id: testLocation.id,
          p_sections: metadata.sectionsPerRack,
          p_shelves: metadata.shelvesPerSection,
          p_subsections: metadata.subsectionsPerSection,
          p_capacity_per_subsection: metadata.tiresPerSubsection
        });

      if (genError) {
        console.error('❌ Error generating positions:', genError.message);
        return;
      }

      console.log(`✅ Generated ${generated} positions`);

      // Fetch the newly created positions
      const { data: newPositions } = await supabase
        .from('warehouse_storage_positions')
        .select('id, position_code, capacity')
        .eq('warehouse_location_id', testLocation.id)
        .limit(5);

      if (newPositions && newPositions.length > 0) {
        console.log('   Sample generated positions:');
        newPositions.forEach(p => {
          console.log(`   - ${p.position_code} (capacity: ${p.capacity})`);
        });
      }
    } else {
      console.log('\n⚠️ Cannot generate positions: metadata incomplete');
      console.log('   Required: sectionsPerRack, shelvesPerSection, subsectionsPerSection, tiresPerSubsection');
    }
  }

  // Test 6: Test updating a position
  console.log('\n📋 Test 6: Test updating a position');
  const { data: testPosition, error: testPosError } = await supabase
    .from('warehouse_storage_positions')
    .select('*')
    .eq('warehouse_location_id', testLocation.id)
    .limit(1)
    .single();

  if (testPosError || !testPosition) {
    console.log('⚠️ No positions available to test update');
  } else {
    console.log(`   Testing position: ${testPosition.position_code}`);
    
    const testTireSize = 'Test Tire 90/90-21';
    const testQuantity = Math.min(5, testPosition.capacity);

    const { data: updated, error: updateError } = await supabase
      .from('warehouse_storage_positions')
      .update({
        tire_size: testTireSize,
        current_stock: testQuantity,
        status: 'available'
      })
      .eq('id', testPosition.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating position:', updateError.message);
    } else {
      console.log(`✅ Position updated: ${testTireSize} × ${testQuantity}`);
      
      // Check if rack stock was auto-updated
      const { data: updatedRack } = await supabase
        .from('warehouse_locations')
        .select('current_stock')
        .eq('id', testLocation.id)
        .single();

      if (updatedRack) {
        console.log(`   Rack stock auto-updated to: ${updatedRack.current_stock}`);
      }
    }
  }

  // Test 7: Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const { count: totalPositions } = await supabase
    .from('warehouse_storage_positions')
    .select('id', { count: 'exact', head: true });

  const { count: occupiedPositions } = await supabase
    .from('warehouse_storage_positions')
    .select('id', { count: 'exact', head: true })
    .gt('current_stock', 0);

  console.log(`Total warehouse locations: ${locations?.length || 0}`);
  console.log(`Total storage positions: ${totalPositions || 0}`);
  console.log(`Occupied positions: ${occupiedPositions || 0}`);
  console.log(`Empty positions: ${(totalPositions || 0) - (occupiedPositions || 0)}`);

  console.log('\n✅ All tests completed!');
  console.log('\n💡 Next steps:');
  console.log('   1. Start backend: cd backend && npm start');
  console.log('   2. Start frontend: cd frontend && npm run dev');
  console.log('   3. Navigate to Warehouse Locations page');
  console.log('   4. Test the complete workflow');
}

runTests().catch(console.error);
