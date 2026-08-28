import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hbsynkxaadnximuytbor.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhic3lua3hhYWRueGltdXl0Ym9yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjM4NjYxNSwiZXhwIjoyMTAxOTYyNjE1fQ.jH9dKpo-m6HdPSlutMW6YQxtAr3pS8XEBIkuIuJEhWo'
);

console.log('Testing EXACT query that backend controller uses...\n');

// Test 1: Without join
console.log('Test 1: Simple query (no join)');
const { data: simple, error: err1 } = await supabase
  .from('rack_configurations')
  .select('*')
  .in('status', ['active', 'full'])
  .order('rack_number');

if (err1) {
  console.log('ERROR:', err1.message);
} else {
  console.log(`Result: ${simple.length} racks`);
  if (simple.length > 0) {
    console.log('First rack:', simple[0].rack_code, simple[0].size_category);
  }
}

// Test 2: With join (like backend does)
console.log('\nTest 2: Query with warehouse join');
const { data: withJoin, error: err2 } = await supabase
  .from('rack_configurations')
  .select(`
    *,
    warehouse:warehouse_locations(id, name, code)
  `)
  .in('status', ['active', 'full'])
  .order('rack_number');

if (err2) {
  console.log('ERROR:', err2.message);
  console.log('Full error:', JSON.stringify(err2, null, 2));
} else {
  console.log(`Result: ${withJoin.length} racks`);
  if (withJoin.length > 0) {
    console.log('First rack:', withJoin[0].rack_code, withJoin[0].size_category);
    console.log('Warehouse data:', withJoin[0].warehouse);
  }
}

// Test 3: With filter
console.log('\nTest 3: With warehouse_id filter');
const warehouseId = 'b1eff6be-b968-4861-94c2-f220e4eeffed';
const { data: filtered, error: err3 } = await supabase
  .from('rack_configurations')
  .select(`
    *,
    warehouse:warehouse_locations(id, name, code)
  `)
  .in('status', ['active', 'full'])
  .eq('warehouse_id', warehouseId)
  .order('rack_number');

if (err3) {
  console.log('ERROR:', err3.message);
} else {
  console.log(`Result: ${filtered.length} racks`);
  if (filtered.length > 0) {
    filtered.forEach(r => {
      console.log(`  - ${r.rack_code} (${r.size_category})`);
    });
  }
}

// Test 4: Check if table is exposed to API
console.log('\nTest 4: Checking table accessibility...');
const { data: meta, error: err4 } = await supabase
  .from('rack_configurations')
  .select('count');

if (err4) {
  console.log('❌ Table NOT accessible:', err4.message);
  console.log('💡 Need to expose rack_configurations table in Supabase API settings');
} else {
  console.log('✅ Table is accessible');
}
