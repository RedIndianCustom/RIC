/**
 * Check specific shipment SHIP-312321
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkShipment() {
  console.log('🔍 Checking SHIP-312321 in detail...\n');
  
  const { data, error } = await supabase
    .from('shipments')
    .select('*')
    .eq('shipment_number', 'SHIP-312321')
    .single();
    
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('✅ Shipment found:\n');
  console.log('Shipment Number:', data.shipment_number);
  console.log('Container:', data.container_number);
  console.log('Expected Quantity:', data.expected_quantity);
  console.log('Status:', data.status);
  console.log('\n📦 product_breakdown field:');
  console.log('Type:', typeof data.product_breakdown);
  console.log('Is Array:', Array.isArray(data.product_breakdown));
  console.log('Length:', data.product_breakdown?.length);
  console.log('Content:', JSON.stringify(data.product_breakdown, null, 2));
  
  if (data.product_breakdown && data.product_breakdown.length > 0) {
    console.log('\n✅ Products in database:');
    data.product_breakdown.forEach((prod, idx) => {
      console.log(`  ${idx + 1}. ${prod.category} - ${prod.size} (${prod.quantity} units)`);
    });
  } else {
    console.log('\n❌ NO PRODUCTS in database!');
    console.log('   Expected Quantity shows 48, but product_breakdown is empty');
    console.log('   This means the products were never saved, or expected_quantity was set manually');
  }
}

checkShipment().catch(console.error);
