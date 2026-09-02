#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('✅ Completing SHIP354 (already approved)...\n');

const { error } = await supabase
  .from('shipments')
  .update({ status: 'RECEIVED', updated_at: new Date().toISOString() })
  .eq('shipment_number', 'SHIP354');

if (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}

// Verify
const { data } = await supabase
  .from('shipments')
  .select('shipment_number, status')
  .eq('shipment_number', 'SHIP354')
  .single();

console.log(`✅ SHIP354 status: ${data.status}`);
console.log('\n📋 Refresh the Incoming Shipments page to see the change!');
