#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Checking ALL QC inspections...\n');

const { data: inspections, error } = await supabase
  .from('qc_inspections')
  .select(`
    id,
    inspection_number,
    shipment_id,
    status,
    manager_decision,
    manager_reviewed_by,
    manager_reviewed_at,
    created_at,
    shipments (shipment_number, status)
  `)
  .order('created_at', { ascending: false })
  .limit(10);

if (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}

console.log(`Found ${inspections.length} QC inspections:\n`);

inspections.forEach((insp, idx) => {
  console.log(`${idx + 1}. QC Inspection: ${insp.inspection_number || insp.id.substring(0, 8)}`);
  console.log(`   Shipment: ${insp.shipments?.shipment_number || 'N/A'} (Status: ${insp.shipments?.status || 'N/A'})`);
  console.log(`   QC Status: ${insp.status}`);
  console.log(`   Manager Decision: ${insp.manager_decision || 'NOT SET'}`);
  console.log(`   Manager Reviewed: ${insp.manager_reviewed_by ? 'YES' : 'NO'}`);
  console.log(`   Created: ${new Date(insp.created_at).toLocaleString()}`);
  
  // Check if should appear in approval queue
  const shouldAppear = 
    insp.status === 'COMPLETED' && 
    (!insp.manager_decision || insp.manager_decision === 'PENDING');
  
  console.log(`   ${shouldAppear ? '✅ SHOULD APPEAR IN APPROVAL QUEUE' : '❌ Already processed/not ready'}`);
  console.log('─'.repeat(70));
});

console.log('\n💡 For QC inspection to appear in Manager QC Approval:');
console.log('   - status must be "COMPLETED"');
console.log('   - manager_decision must be NULL or "PENDING"');
console.log('   - manager_reviewed_by must be NULL\n');
