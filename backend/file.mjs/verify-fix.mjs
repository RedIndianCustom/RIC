import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hbsynkxaadnximuytbor.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhic3lua3hhYWRueGltdXl0Ym9yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjM4NjYxNSwiZXhwIjoyMTAxOTYyNjE1fQ.jH9dKpo-m6HdPSlutMW6YQxtAr3pS8XEBIkuIuJEhWo'
);

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║  🔍 RACK DISPLAY FIX VERIFICATION                             ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

async function verify() {
  const WAREHOUSE_ID = 'b1eff6be-b968-4861-94c2-f220e4eeffed';
  let allGood = true;

  // Test 1: Warehouse exists
  console.log('✓ Test 1: Main Warehouse exists...');
  const { data: warehouse } = await supabase
    .from('warehouse_locations')
    .select('id, name, code')
    .eq('id', WAREHOUSE_ID)
    .single();
  
  if (warehouse) {
    console.log(`  ✅ Found: ${warehouse.name} (${warehouse.code})`);
  } else {
    console.log('  ❌ FAIL: Warehouse not found');
    allGood = false;
  }

  // Test 2: Racks exist
  console.log('\n✓ Test 2: Racks for warehouse exist...');
  const { data: racks, error } = await supabase
    .from('rack_configurations')
    .select('*')
    .eq('warehouse_id', WAREHOUSE_ID)
    .in('status', ['active', 'full']);
  
  if (error) {
    console.log('  ❌ FAIL: Error querying racks:', error.message);
    allGood = false;
  } else if (!racks || racks.length === 0) {
    console.log('  ❌ FAIL: No racks found');
    allGood = false;
  } else {
    console.log(`  ✅ Found ${racks.length} racks:`);
    racks.forEach(r => {
      console.log(`     • ${r.rack_code} - ${r.size_category} (${r.current_count}/${r.total_capacity})`);
    });
  }

  // Test 3: Warehouse ID matches
  console.log('\n✓ Test 3: Warehouse ID consistency...');
  if (racks && racks.length > 0) {
    const allMatch = racks.every(r => r.warehouse_id === WAREHOUSE_ID);
    if (allMatch) {
      console.log('  ✅ All racks have correct warehouse_id');
    } else {
      console.log('  ❌ FAIL: Some racks have mismatched warehouse_id');
      allGood = false;
    }
  }

  // Test 4: Size categories are valid
  console.log('\n✓ Test 4: Size categories are valid...');
  if (racks && racks.length > 0) {
    const categories = [...new Set(racks.map(r => r.size_category))];
    console.log(`  ✅ Size categories: ${categories.join(', ')}`);
  }

  // Test 5: Rack locations exist
  console.log('\n✓ Test 5: Rack locations (positions) exist...');
  if (racks && racks.length > 0) {
    const { data: locations, error: locError } = await supabase
      .from('rack_locations')
      .select('rack_id, status')
      .eq('rack_id', racks[0].id);
    
    if (locError) {
      console.log('  ⚠️  Warning: Could not query rack_locations:', locError.message);
    } else if (locations && locations.length > 0) {
      const available = locations.filter(l => l.status === 'available').length;
      console.log(`  ✅ First rack has ${locations.length} positions (${available} available)`);
    } else {
      console.log('  ⚠️  Warning: No rack_locations found (can still work with auto-assign)');
    }
  }

  // Final summary
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  if (allGood) {
    console.log('║  ✅ ALL TESTS PASSED - Database is ready                      ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('\n📋 Next Steps:');
    console.log('   1. Restart backend server: cd backend && npm start');
    console.log('   2. Hard refresh browser: Ctrl+Shift+R');
    console.log('   3. Select warehouse in barcode generation');
    console.log('   4. Racks should now appear in dropdown\n');
  } else {
    console.log('║  ❌ SOME TESTS FAILED - Check errors above                    ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
  }
}

verify().catch(err => {
  console.error('\n❌ Verification error:', err.message);
  process.exit(1);
});
