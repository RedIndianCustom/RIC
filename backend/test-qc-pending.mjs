import { supabaseAdmin } from './src/config/supabase.js';

console.log('🔍 Checking pending_qc_inspections view...\n');

try {
  // Check the view
  const { data: viewData, error: viewError } = await supabaseAdmin
    .from('pending_qc_inspections')
    .select('*');
  
  console.log('📊 View Results:');
  console.log('Count:', viewData?.length || 0);
  if (viewError) {
    console.log('❌ View Error:', viewError);
  } else {
    console.log('✅ View Data:', JSON.stringify(viewData, null, 2));
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Check the table directly
  console.log('🔍 Checking qc_inspections table directly...\n');
  const { data: tableData, error: tableError} = await supabaseAdmin
    .from('qc_inspections')
    .select(`
      *,
      shipment:shipments(shipment_number),
      inspector:users(full_name)
    `)
    .in('status', ['PENDING', 'IN_PROGRESS', 'OVERDUE']);
  
  console.log('📊 Table Results:');
  console.log('Count:', tableData?.length || 0);
  if (tableError) {
    console.log('❌ Table Error:', tableError);
  } else {
    console.log('✅ Table Data:', JSON.stringify(tableData, null, 2));
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Check ALL records in qc_inspections
  console.log('🔍 Checking ALL qc_inspections...\n');
  const { data: allData, error: allError } = await supabaseAdmin
    .from('qc_inspections')
    .select('id, inspection_number, status, shipment_id, created_at');
  
  console.log('📊 All QC Inspections:');
  console.log('Count:', allData?.length || 0);
  if (allError) {
    console.log('❌ Error:', allError);
  } else {
    console.log('✅ Data:', JSON.stringify(allData, null, 2));
  }
  
} catch (error) {
  console.error('❌ Error:', error);
}

process.exit(0);
