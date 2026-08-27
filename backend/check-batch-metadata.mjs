import 'dotenv/config';
import { supabaseAdmin } from './src/config/supabase.js';

async function checkBatchMetadata() {
  console.log('🔍 Checking batch metadata...\n');
  console.log('='.repeat(80));
  
  // Get all batches with metadata
  const { data: batches, error } = await supabaseAdmin
    .from('batches')
    .select('id, batch_number, metadata, shipment_id')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
  
  if (!batches || batches.length === 0) {
    console.log('⚠️ No batches found');
    process.exit(0);
  }
  
  console.log(`\n📦 Found ${batches.length} recent batches\n`);
  
  batches.forEach((batch, index) => {
    console.log(`\n${index + 1}. Batch: ${batch.batch_number}`);
    console.log(`   ID: ${batch.id}`);
    console.log(`   Shipment ID: ${batch.shipment_id}`);
    
    if (!batch.metadata) {
      console.log('   ❌ No metadata');
      return;
    }
    
    console.log('   ✅ Has metadata');
    
    if (batch.metadata.products_with_positions) {
      const products = batch.metadata.products_with_positions;
      console.log(`   📦 Products with positions: ${products.length}`);
      
      products.forEach((product, i) => {
        console.log(`\n      Product ${i + 1}: ${product.product_name || 'N/A'}`);
        console.log(`         Product ID: ${product.product_id}`);
        console.log(`         Quantity: ${product.quantity}`);
        
        if (product.assigned_positions && product.assigned_positions.length > 0) {
          console.log(`         ✅ Assigned Positions: ${product.assigned_positions.length}`);
          product.assigned_positions.forEach((pos, j) => {
            console.log(`            ${j + 1}. ${pos.position_code} (×${pos.quantity})`);
          });
        } else {
          console.log(`         ❌ No assigned positions`);
        }
      });
      
      console.log(`\n   Warehouse Code: ${batch.metadata.warehouse_code || 'N/A'}`);
      console.log(`   Warehouse Name: ${batch.metadata.warehouse_name || 'N/A'}`);
    } else {
      console.log('   ⚠️ No products_with_positions in metadata');
      console.log('   Metadata keys:', Object.keys(batch.metadata));
    }
    
    console.log('\n' + '-'.repeat(80));
  });
  
  // Now check latest barcode position
  console.log('\n' + '='.repeat(80));
  console.log('\n📍 Latest Barcode Position Check\n');
  
  const { data: latestBarcode, error: barcodeError } = await supabaseAdmin
    .from('barcodes')
    .select(`
      barcode_value,
      batch_id,
      created_at,
      inventory_units!barcodes_inventory_unit_id_fkey (
        warehouse_id,
        rack,
        position_code,
        shelf_number,
        section_number,
        subsection_number,
        warehouses (
          code,
          name
        )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (barcodeError) {
    console.error('❌ Error fetching barcode:', barcodeError);
  } else {
    console.log(`Barcode: ${latestBarcode.barcode_value}`);
    console.log(`Batch ID: ${latestBarcode.batch_id}`);
    console.log(`Created: ${new Date(latestBarcode.created_at).toLocaleString()}`);
    console.log('');
    
    if (latestBarcode.inventory_units?.position_code) {
      console.log('✅ SUCCESS: Position code assigned!');
      console.log(`   Position: ${latestBarcode.inventory_units.position_code}`);
      console.log(`   Warehouse: ${latestBarcode.inventory_units.warehouses?.name || 'N/A'}`);
      console.log(`   Rack: ${latestBarcode.inventory_units.rack || 'N/A'}`);
    } else {
      console.log('❌ FAIL: No position code');
      console.log(`   Warehouse ID: ${latestBarcode.inventory_units?.warehouse_id || 'N/A'}`);
      console.log(`   Rack: ${latestBarcode.inventory_units?.rack || 'N/A'}`);
    }
    
    // Check if this barcode's batch has metadata
    const barcodeBatch = batches.find(b => b.id === latestBarcode.batch_id);
    if (barcodeBatch) {
      console.log('\n📦 This barcode belongs to batch:', barcodeBatch.batch_number);
      if (barcodeBatch.metadata?.products_with_positions) {
        console.log('   ✅ Batch HAS products_with_positions metadata');
      } else {
        console.log('   ❌ Batch MISSING products_with_positions metadata');
        console.log('   💡 This is why position_code is null!');
      }
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n💡 Summary\n');
  
  const batchesWithPositions = batches.filter(b => 
    b.metadata?.products_with_positions?.some(p => 
      p.assigned_positions?.length > 0
    )
  );
  
  console.log(`Batches with assigned positions: ${batchesWithPositions.length}/${batches.length}`);
  
  if (batchesWithPositions.length === 0) {
    console.log('\n⚠️ No batches have assigned positions!');
    console.log('\n📝 To fix:');
    console.log('   1. Go to Shipment Registration');
    console.log('   2. Click "Edit Shipment"');
    console.log('   3. Assign positions to products (click map pin icon)');
    console.log('   4. Save the shipment');
    console.log('   5. Generate barcodes from that batch');
  } else {
    console.log('\n✅ Some batches have assigned positions');
    console.log('\n💡 Next step: Generate barcodes from one of these batches:');
    batchesWithPositions.forEach(b => {
      console.log(`   - ${b.batch_number}`);
    });
  }
  
  process.exit(0);
}

checkBatchMetadata();
