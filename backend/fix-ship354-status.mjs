#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔧 Fixing SHIP354 status...\n');

// Get shipment
const { data: shipment, error: shipError } = await supabase
  .from('shipments')
  .select('id, shipment_number, status')
  .eq('shipment_number', 'SHIP354')
  .single();

if (shipError) {
  console.error('❌ Error:', shipError);
  process.exit(1);
}

console.log(`📦 Current shipment status: ${shipment.status}`);

// Get QC inspection
const { data: qcInspection, error: qcError } = await supabase
  .from('qc_inspections')
  .select('id, status, manager_decision, manager_reviewed_by, manager_reviewed_at')
  .eq('shipment_id', shipment.id)
  .single();

if (qcError) {
  console.error('❌ Error fetching QC inspection:', qcError);
  process.exit(1);
}

console.log(`🔬 QC Inspection status: ${qcInspection.status}`);
console.log(`   Manager decision: ${qcInspection.manager_decision || 'Not set'}`);
console.log(`   Manager reviewed by: ${qcInspection.manager_reviewed_by || 'Not reviewed'}`);
console.log(`   Manager reviewed at: ${qcInspection.manager_reviewed_at || 'Not reviewed'}`);

// Determine correct shipment status
let newStatus = null;

if (qcInspection.status === 'COMPLETED' && qcInspection.manager_reviewed_by) {
  // QC is complete AND manager has reviewed it
  if (qcInspection.manager_decision === 'APPROVED') {
    newStatus = 'APPROVED';
  } else if (qcInspection.manager_decision === 'REJECTED') {
    newStatus = 'REJECTED';
  } else {
    // Manager reviewed but no decision set - assume approved since they reviewed
    newStatus = 'APPROVED';
  }
} else if (qcInspection.status === 'COMPLETED' && !qcInspection.manager_reviewed_by) {
  // QC complete but manager hasn't reviewed
  console.log('\n⚠️  QC inspection is complete but NOT approved by manager yet');
  console.log('   Current shipment status (READY_FOR_QC) is CORRECT');
  console.log('   👉 Manager needs to approve in /manager/qc-approval\n');
  process.exit(0);
}

if (!newStatus) {
  console.log('\n⚠️  Cannot determine correct status. Current status is appropriate.\n');
  process.exit(0);
}

// Update shipment status
console.log(`\n🔄 Updating shipment status from "${shipment.status}" to "${newStatus}"...`);

const { data: updated, error: updateError } = await supabase
  .from('shipments')
  .update({ 
    status: newStatus,
    updated_at: new Date().toISOString()
  })
  .eq('id', shipment.id)
  .select()
  .single();

if (updateError) {
  console.error('❌ Error updating shipment:', updateError);
  process.exit(1);
}

console.log(`✅ Successfully updated ${shipment.shipment_number} status to ${newStatus}!`);
console.log(`\n📋 Next steps:`);
if (newStatus === 'APPROVED') {
  console.log('   1. Warehouse can now assign storage positions');
  console.log('   2. Once stored, status will change to COMPLETED');
}
console.log('');
