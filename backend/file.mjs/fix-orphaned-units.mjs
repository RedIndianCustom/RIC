import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function fixOrphanedUnits() {
  console.log('\n🔧 FIXING ORPHANED INVENTORY UNITS...\n');

  try {
    // Step 1: Find orphaned units
    console.log('1️⃣ Finding orphaned inventory units...');
    const { data: allUnits } = await supabase
      .from('inventory_units')
      .select('id, warehouse_id, rack')
      .not('warehouse_id', 'is', null)
      .not('rack', 'is', null);

    const { data: barcodes } = await supabase
      .from('barcodes')
      .select('inventory_unit_id');

    const referencedIds = new Set(barcodes.map(b => b.inventory_unit_id));
    const orphaned = allUnits.filter(u => !referencedIds.has(u.id));

    console.log(`   Found ${orphaned.length} orphaned units`);

    // Step 2: Clear orphaned units
    if (orphaned.length > 0) {
      console.log('\n2️⃣ Clearing warehouse assignments from orphaned units...');
      for (const unit of orphaned) {
        const { error } = await supabase
          .from('inventory_units')
          .update({ 
            warehouse_id: null,
            rack: null,
            assigned_at: null
          })
          .eq('id', unit.id);

        if (error) {
          console.error(`   ❌ Error clearing unit ${unit.id}:`, error.message);
        } else {
          console.log(`   ✅ Cleared ${unit.rack}`);
        }
      }
    }

    // Step 3: Reset all rack counts to 0
    console.log('\n3️⃣ Resetting all rack counts...');
    const { error: resetError } = await supabase
      .from('rack_configurations')
      .update({ current_count: 0 })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

    if (resetError) {
      console.error('   ❌ Error resetting counts:', resetError);
    } else {
      console.log('   ✅ All rack counts reset to 0');
    }

    // Step 4: Count actual barcodes per rack
    console.log('\n4️⃣ Counting active barcodes per rack...');
    const { data: activeBarcodes } = await supabase
      .from('barcodes')
      .select(`
        id,
        inventory_units!barcodes_inventory_unit_id_fkey (
          warehouse_id,
          rack
        )
      `)
      .eq('status', 'active');

    // Group by warehouse_id and rack
    const rackCounts = {};
    activeBarcodes.forEach(b => {
      const warehouseId = b.inventory_units?.warehouse_id;
      const rack = b.inventory_units?.rack;
      if (warehouseId && rack) {
        const key = `${warehouseId}|${rack}`;
        rackCounts[key] = (rackCounts[key] || 0) + 1;
      }
    });

    console.log(`   Found ${Object.keys(rackCounts).length} racks with barcodes`);

    // Step 5: Update rack counts
    console.log('\n5️⃣ Updating rack counts...');
    for (const [key, count] of Object.entries(rackCounts)) {
      const [warehouseId, rackCode] = key.split('|');
      
      const { error: updateError } = await supabase
        .from('rack_configurations')
        .update({ current_count: count })
        .eq('warehouse_id', warehouseId)
        .eq('rack_code', rackCode);

      if (updateError) {
        console.error(`   ❌ Error updating ${rackCode}:`, updateError.message);
      } else {
        console.log(`   ✅ ${rackCode}: ${count} barcodes`);
      }
    }

    // Step 6: Verify results
    console.log('\n6️⃣ Verification:');
    const { data: racks } = await supabase
      .from('rack_configurations')
      .select('rack_code, current_count, total_capacity')
      .eq('warehouse_id', 'b1eff6be-b968-4861-94c2-f220e4eeffed')
      .order('rack_code');

    console.table(racks);

    console.log('\n✅ DONE! All orphaned units cleared and rack counts updated.\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

fixOrphanedUnits();
