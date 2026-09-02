#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Detailed SHIP354 check...\n');

// Get shipment
const { data: shipment } = await supabase
  .from('shipments')
  .select('id, shipment_number, status, product_breakdown')
  .eq('shipment_number', 'SHIP354')
  .single();

console.log('📦 Shipment:');
console.log(`   Number: ${shipment.shipment_number}`);
console.log(`   Status: ${shipment.status}`);
console.log(`   Has product_breakdown: ${shipment.product_breakdown ? 'YES' : 'NO'}`);

if (shipment.product_breakdown) {
  const breakdown = shipment.product_breakdown;
  console.log(`   Products: ${breakdown.length}`);
  breakdown.forEach((prod, idx) => {
    console.log(`   Product ${idx + 1}:`);
    console.log(`      Name: ${prod.product_name}`);
    console.log(`      Quantity: ${prod.quantity}`);
    console.log(`      Has assigned_positions: ${prod.assigned_positions ? 'YES' : 'NO'}`);
    if (prod.assigned_positions) {
      console.log(`      Positions: ${prod.assigned_positions.length}`);
      prod.assigned_positions.forEach(pos => {
        console.log(`         - ${pos.position_code} (qty: ${pos.quantity})`);
      });
    }
  });
}

// Get QC inspection with ALL approval fields
const { data: qc } = await supabase
  .from('qc_inspections')
  .select('id, inspection_number, status, manager_decision, manager_notes, manager_reviewed_by, manager_reviewed_at')
  .eq('shipment_id', shipment.id)
  .single();

console.log('\n🔬 QC Inspection:');
console.log(`   ID: ${qc.id}`);
console.log(`   Number: ${qc.inspection_number}`);
console.log(`   Status: ${qc.status}`);
console.log(`   Manager Decision: ${qc.manager_decision || 'NULL'}`);
console.log(`   Manager Notes: ${qc.manager_notes || 'NULL'}`);
console.log(`   Manager Reviewed By: ${qc.manager_reviewed_by || 'NULL'}`);
console.log(`   Manager Reviewed At: ${qc.manager_reviewed_at || 'NULL'}`);

// Check if approved
const isApproved = qc.manager_decision === 'APPROVED' && qc.manager_reviewed_by;
console.log(`\n   ${isApproved ? '✅ APPROVED' : '❌ NOT APPROVED YET'}`);

// Check inventory units
const { data: invUnits, error: invError } = await supabase
  .from('inventory_units')
  .select('id, position_code, quantity, status')
  .eq('shipment_id', shipment.id);

console.log('\n📦 Inventory Units:');
if (invError) {
  console.log(`   Error: ${invError.message}`);
} else {
  console.log(`   Count: ${invUnits?.length || 0}`);
  if (invUnits && invUnits.length > 0) {
    invUnits.forEach(unit => {
      console.log(`   - ${unit.position_code} (qty: ${unit.quantity}, status: ${unit.status})`);
    });
  }
}
