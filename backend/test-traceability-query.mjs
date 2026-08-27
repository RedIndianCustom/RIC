import 'dotenv/config';
import { supabaseAdmin } from './src/config/supabase.js';

async function testTraceabilityQuery() {
  console.log('🔍 Testing traceability query with fixed FK relationship...\n');
  
  // Get a barcode that exists
  const { data: sampleBarcode, error: sampleError } = await supabaseAdmin
    .from('barcodes')
    .select('barcode_value')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (sampleError || !sampleBarcode) {
    console.error('❌ No barcodes found in database');
    process.exit(1);
  }
  
  const barcodeValue = sampleBarcode.barcode_value;
  console.log(`Testing with barcode: ${barcodeValue}\n`);
  
  // Test the full traceability query (same as getTraceability function)
  const { data, error } = await supabaseAdmin
    .from('barcodes')
    .select(`
      id,
      barcode_value,
      barcode_type,
      traceability_url,
      qr_code_data,
      status,
      created_at,
      products (
        id,
        sku,
        brand,
        model,
        dimensions,
        category
      ),
      batches (
        id,
        batch_number,
        batch_month,
        batch_year,
        manufactured_date,
        expiry_date,
        status,
        shipments!batches_shipment_id_fkey (
          id,
          shipment_number,
          container_number,
          bl_number,
          expected_quantity,
          actual_quantity,
          expected_arrival_date,
          received_date,
          status,
          suppliers:supplier_id (
            id,
            name,
            contact_person,
            email,
            phone
          )
        )
      ),
      inventory_units!barcodes_inventory_unit_id_fkey (
        id,
        inventory_unit_code,
        quantity,
        status,
        warehouse_id,
        rack,
        shelf_number,
        section_number,
        subsection_number,
        position_code,
        assigned_at,
        received_at,
        last_scanned_at,
        warehouses (
          id,
          name,
          code,
          location
        )
      )
    `)
    .eq('barcode_value', barcodeValue)
    .single();
  
  if (error) {
    console.error('❌ Query Error:', error);
    process.exit(1);
  }
  
  console.log('✅ Query Successful!\n');
  console.log('Barcode:', data.barcode_value);
  console.log('Product:', data.products?.brand, data.products?.model);
  console.log('Batch:', data.batches?.batch_number);
  console.log('Warehouse:', data.inventory_units?.warehouses?.name || 'Not Assigned');
  console.log('Rack:', data.inventory_units?.rack || 'Not Assigned');
  console.log('Position:', data.inventory_units?.position_code || 'Not Assigned');
  
  console.log('\n' + '='.repeat(80));
  console.log('Full Response:\n');
  console.log(JSON.stringify(data, null, 2));
  
  process.exit(0);
}

testTraceabilityQuery();
