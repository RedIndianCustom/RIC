import 'dotenv/config';
import { supabaseAdmin } from './src/config/supabase.js';

async function findBarcodesWithLocation() {
  console.log('🔍 Searching for barcodes WITH warehouse location data...\n');
  
  // Find barcodes that have warehouse location data
  const { data, error } = await supabaseAdmin
    .from('barcodes')
    .select(`
      barcode_value,
      created_at,
      inventory_units!barcodes_inventory_unit_id_fkey (
        warehouse_id,
        rack,
        position_code,
        warehouses (
          name,
          code
        )
      ),
      batches (
        batch_number,
        metadata
      )
    `)
    .not('inventory_units.warehouse_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
  
  if (!data || data.length === 0) {
    console.log('⚠️ NO barcodes found with warehouse location data');
    console.log('\nThis means all barcodes were generated WITHOUT warehouse assignment.');
    console.log('\nTo generate barcodes WITH warehouse location:');
    console.log('  1. In Batch Management, assign warehouse positions to products');
    console.log('  2. Save the batch with assigned positions');
    console.log('  3. Generate barcodes from that batch');
    console.log('  4. The barcodes will automatically have warehouse location data');
  } else {
    console.log(`✅ Found ${data.length} barcode(s) WITH warehouse location:\n`);
    data.forEach((barcode, index) => {
      console.log(`${index + 1}. ${barcode.barcode_value}`);
      console.log(`   Warehouse: ${barcode.inventory_units?.warehouses?.name || 'N/A'}`);
      console.log(`   Rack: ${barcode.inventory_units?.rack || 'N/A'}`);
      console.log(`   Position: ${barcode.inventory_units?.position_code || 'N/A'}`);
      console.log(`   Batch: ${barcode.batches?.batch_number}`);
      console.log(`   Has metadata: ${barcode.batches?.metadata ? 'Yes' : 'No'}`);
      console.log('');
    });
  }
  
  // Check if there are batches with assigned positions metadata
  console.log('='.repeat(80));
  console.log('\n🔍 Checking batches with assigned positions metadata...\n');
  
  const { data: batchesData, error: batchesError } = await supabaseAdmin
    .from('batches')
    .select('batch_number, metadata, created_at')
    .not('metadata->products_with_positions', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (batchesError) {
    console.error('❌ Error:', batchesError);
  } else if (!batchesData || batchesData.length === 0) {
    console.log('⚠️ NO batches found with assigned positions metadata');
  } else {
    console.log(`✅ Found ${batchesData.length} batch(es) with assigned positions:\n`);
    batchesData.forEach((batch, index) => {
      const products = batch.metadata?.products_with_positions || [];
      console.log(`${index + 1}. ${batch.batch_number}`);
      console.log(`   Products: ${products.length}`);
      console.log(`   Warehouse: ${batch.metadata?.warehouse_code || 'N/A'}`);
      console.log(`   Created: ${new Date(batch.created_at).toLocaleString()}`);
      console.log('');
    });
  }
  
  process.exit(0);
}

findBarcodesWithLocation();
