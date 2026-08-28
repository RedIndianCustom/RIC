import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function checkAll() {
  console.log('\n=== ALL Barcodes (including deleted/inactive) ===');
  const { data: allBarcodes, error } = await supabase
    .from('barcodes')
    .select('id, barcode_value, status, inventory_unit_id')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error:', error);
  } else {
    console.table(allBarcodes);
  }

  console.log('\n=== ALL Inventory Units with warehouse/rack ===');
  const { data: units, error: unitsError } = await supabase
    .from('inventory_units')
    .select('id, inventory_unit_code, warehouse_id, rack, status')
    .not('warehouse_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(20);

  if (unitsError) {
    console.error('Error:', unitsError);
  } else {
    console.table(units);
  }

  console.log('\n=== Orphaned inventory_units (no barcode referencing them) ===');
  const { data: orphans, error: orphansError } = await supabase.rpc('find_orphaned_units', {});
  
  // If RPC doesn't exist, do it manually
  const { data: allUnits } = await supabase
    .from('inventory_units')
    .select('id, inventory_unit_code, warehouse_id, rack');
  
  const { data: referencedUnits } = await supabase
    .from('barcodes')
    .select('inventory_unit_id');

  const referencedIds = new Set(referencedUnits.map(b => b.inventory_unit_id));
  const orphanedUnits = allUnits.filter(u => !referencedIds.has(u.id));

  console.log(`Found ${orphanedUnits.length} orphaned inventory units:`);
  console.table(orphanedUnits);
}

checkAll();
