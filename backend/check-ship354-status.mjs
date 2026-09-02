#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Checking SHIP354 status...\n');

// Get shipment details
const { data: shipment, error: shipError } = await supabase
  .from('shipments')
  .select('*')
  .eq('shipment_number', 'SHIP354')
  .single();

if (shipError) {
  console.error('❌ Error fetching shipment:', shipError);
  process.exit(1);
}

console.log('📦 Shipment Details:');
console.log(`   Shipment Number: ${shipment.shipment_number}`);
console.log(`   Status: ${shipment.status}`);
console.log(`   Container: ${shipment.container_number}`);
console.log(`   Expected Qty: ${shipment.expected_quantity}`);
console.log('─'.repeat(60));

// Check QC inspections
console.log('\n🔬 QC Inspection Records:');
const { data: qcRecords, error: qcError } = await supabase
  .from('qc_inspections')
  .select('*')
  .eq('shipment_id', shipment.id)
  .order('created_at', { ascending: false });

if (qcError) {
  console.error('❌ Error fetching QC records:', qcError);
} else if (qcRecords && qcRecords.length > 0) {
  qcRecords.forEach((qc, idx) => {
    console.log(`\n   QC Record #${idx + 1}:`);
    console.log(`   ID: ${qc.id}`);
    console.log(`   Status: ${qc.status}`);
    console.log(`   Approved By: ${qc.approved_by || 'Not approved'}`);
    console.log(`   Approved At: ${qc.approved_at || 'Not approved'}`);
    console.log(`   Created: ${new Date(qc.created_at).toLocaleString()}`);
  });
} else {
  console.log('   No QC inspection records found');
}

// Check receiving records
console.log('\n📥 Receiving Records:');
const { data: receivingRecords, error: recError } = await supabase
  .from('receiving_records')
  .select('*')
  .eq('shipment_id', shipment.id)
  .order('created_at', { ascending: false });

if (recError) {
  console.error('❌ Error fetching receiving records:', recError);
} else if (receivingRecords && receivingRecords.length > 0) {
  receivingRecords.forEach((rec, idx) => {
    console.log(`\n   Receiving Record #${idx + 1}:`);
    console.log(`   ID: ${rec.id}`);
    console.log(`   Status: ${rec.status}`);
    console.log(`   Received By: ${rec.received_by}`);
    console.log(`   Created: ${new Date(rec.created_at).toLocaleString()}`);
  });
} else {
  console.log('   No receiving records found');
}

console.log('\n─'.repeat(60));
console.log('\n💡 RECOMMENDATION:');

if (qcRecords && qcRecords.length > 0) {
  const latestQC = qcRecords[0];
  if (latestQC.approved_by && latestQC.approved_at) {
    console.log('   ✅ QC inspection was APPROVED by manager');
    console.log(`   ⚠️  But shipment status is still: ${shipment.status}`);
    console.log('   🔧 Should be: APPROVED or COMPLETED');
    console.log('\n   Run fix script: node backend/fix-ship354-status.mjs');
  } else {
    console.log('   ⚠️  QC inspection exists but NOT approved yet');
    console.log('   👉 Manager needs to approve in /manager/qc-approval');
  }
} else {
  console.log('   ⚠️  No QC inspection record found');
  console.log('   👉 Shipment may need to go through receiving/QC workflow');
}

console.log('');
