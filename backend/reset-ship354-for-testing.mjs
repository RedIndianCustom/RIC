#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔄 Resetting SHIP354 for QC Approval testing...\n');

// Step 1: Get SHIP354
const { data: shipment, error: shipError } = await supabase
  .from('shipments')
  .select('id, shipment_number, status')
  .eq('shipment_number', 'SHIP354')
  .single();

if (shipError) {
  console.error('❌ Error finding shipment:', shipError);
  process.exit(1);
}

console.log(`📦 Found shipment: ${shipment.shipment_number} (Status: ${shipment.status})`);

// Step 2: Get QC inspection
const { data: qcInspection, error: qcError } = await supabase
  .from('qc_inspections')
  .select('id, inspection_number, status, manager_decision')
  .eq('shipment_id', shipment.id)
  .single();

if (qcError) {
  console.error('❌ Error finding QC inspection:', qcError);
  process.exit(1);
}

console.log(`🔬 Found QC inspection: ${qcInspection.inspection_number || qcInspection.id.substring(0, 8)}`);
console.log(`   Current status: ${qcInspection.status}`);
console.log(`   Manager decision: ${qcInspection.manager_decision || 'NOT SET'}`);

// Step 3: Clear manager approval from QC inspection
console.log('\n🔄 Clearing manager approval...');
const { error: clearError } = await supabase
  .from('qc_inspections')
  .update({
    manager_decision: null,
    manager_notes: null,
    manager_reviewed_by: null,
    manager_reviewed_at: null,
    status: 'COMPLETED' // Ensure it's COMPLETED
  })
  .eq('id', qcInspection.id);

if (clearError) {
  console.error('❌ Error clearing approval:', clearError);
  process.exit(1);
}

console.log('✅ Cleared manager approval from QC inspection');

// Step 4: Update shipment status back to READY_FOR_QC
console.log('🔄 Updating shipment status...');
const { error: shipUpdateError } = await supabase
  .from('shipments')
  .update({
    status: 'READY_FOR_QC'
  })
  .eq('id', shipment.id);

if (shipUpdateError) {
  console.error('❌ Error updating shipment:', shipUpdateError);
  process.exit(1);
}

console.log('✅ Updated shipment status to READY_FOR_QC');

// Step 5: Delete any inventory units that were created
console.log('🔄 Cleaning up inventory units...');
const { data: deletedUnits, error: deleteError } = await supabase
  .from('inventory_units')
  .delete()
  .eq('shipment_id', shipment.id)
  .select();

if (deleteError) {
  console.warn('⚠️  Warning: Could not delete inventory units:', deleteError);
} else {
  console.log(`✅ Deleted ${deletedUnits?.length || 0} inventory unit(s)`);
}

// Step 6: Verify reset
console.log('\n📊 Verification:');
const { data: verifyInspection } = await supabase
  .from('qc_inspections')
  .select('status, manager_decision, manager_reviewed_by')
  .eq('id', qcInspection.id)
  .single();

const { data: verifyShipment } = await supabase
  .from('shipments')
  .select('status')
  .eq('id', shipment.id)
  .single();

console.log(`   QC Inspection status: ${verifyInspection.status}`);
console.log(`   Manager decision: ${verifyInspection.manager_decision || 'NULL ✅'}`);
console.log(`   Manager reviewed: ${verifyInspection.manager_reviewed_by ? 'YES' : 'NO ✅'}`);
console.log(`   Shipment status: ${verifyShipment.status}`);

// Check if should appear
const shouldAppear = 
  verifyInspection.status === 'COMPLETED' && 
  !verifyInspection.manager_decision &&
  !verifyInspection.manager_reviewed_by;

console.log('\n' + '═'.repeat(70));
if (shouldAppear) {
  console.log('✅ SUCCESS! SHIP354 should now appear in QC Approval queue');
  console.log('\n📋 Next steps:');
  console.log('   1. Log in as Manager (Maria Santos)');
  console.log('   2. Go to: Approvals Center → QC Inspection tab');
  console.log('   3. You should see SHIP354 ready for approval');
  console.log('   4. Click "Approve" to test the auto-completion workflow\n');
} else {
  console.log('⚠️  Warning: SHIP354 may not appear yet. Check the conditions above.');
}
