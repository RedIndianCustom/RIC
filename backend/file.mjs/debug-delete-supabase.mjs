import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function debugDelete() {
  try {
    console.log('\n=== 1. Current Active Barcodes with Inventory Units ===');
    const { data: barcodes, error: barcodesError } = await supabase
      .from('barcodes')
      .select(`
        id,
        barcode_value,
        inventory_unit_id,
        inventory_units!barcodes_inventory_unit_id_fkey (
          warehouse_id,
          rack,
          warehouses (
            code,
            name
          )
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(10);

    if (barcodesError) {
      console.error('Error fetching barcodes:', barcodesError);
    } else {
      console.log('Barcodes:', JSON.stringify(barcodes, null, 2));
    }

    console.log('\n=== 2. Rack Configurations ===');
    const { data: racks, error: racksError } = await supabase
      .from('rack_configurations')
      .select('*')
      .eq('warehouse_id', 'b1eff6be-b968-4861-94c2-f220e4eeffed')
      .order('rack_code');

    if (racksError) {
      console.error('Error fetching racks:', racksError);
    } else {
      console.table(racks);
    }

    console.log('\n=== 3. Count Actual Units Per Rack ===');
    // Manual count by fetching all inventory units
    const { data: units, error: unitsError } = await supabase
      .from('inventory_units')
      .select('warehouse_id, rack')
      .not('warehouse_id', 'is', null)
      .not('rack', 'is', null);

    if (unitsError) {
      console.error('Error fetching units:', unitsError);
    } else {
      // Group and count
      const counts = units.reduce((acc, unit) => {
        const key = `${unit.warehouse_id}|${unit.rack}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      console.log('Actual counts by warehouse|rack:');
      Object.entries(counts).forEach(([key, count]) => {
        const [warehouseId, rackCode] = key.split('|');
        console.log(`  ${rackCode}: ${count} units`);
      });
    }

    console.log('\n=== 4. Check if there are multiple FK relationships ===');
    const { data: fkTest, error: fkError } = await supabase
      .from('barcodes')
      .select(`
        id,
        inventory_units!barcodes_inventory_unit_id_fkey (
          warehouse_id,
          rack
        )
      `)
      .limit(1);

    if (fkError) {
      console.error('❌ FK query error:', fkError);
    } else {
      console.log('✅ FK query successful:', JSON.stringify(fkTest, null, 2));
    }

  } catch (error) {
    console.error('Debug error:', error);
  }
}

debugDelete();
