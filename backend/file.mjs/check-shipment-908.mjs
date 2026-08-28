import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkShipment() {
  console.log('🔍 Checking SHIP-908...\n');
  
  const { data, error } = await supabase
    .from('shipments')
    .select('*')
    .eq('shipment_number', 'SHIP-908')
    .single();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('📦 Shipment found:');
  console.log('   ID:', data.id);
  console.log('   Number:', data.shipment_number);
  console.log('   Container:', data.container_number);
  console.log('   Expected Qty:', data.expected_quantity);
  console.log('\n📊 Product Breakdown:');
  console.log('   Type:', typeof data.product_breakdown);
  console.log('   Is Array:', Array.isArray(data.product_breakdown));
  console.log('   Length:', data.product_breakdown?.length);
  console.log('   Content:', JSON.stringify(data.product_breakdown, null, 2));
  
  if (!data.product_breakdown || data.product_breakdown.length === 0) {
    console.log('\n⚠️  SHIP-908 has NO products in database!');
    console.log('   This is expected if it was created before the backend fix.');
    console.log('   Solution: Edit it and add products, or create a new shipment.');
  } else {
    console.log('\n✅ SHIP-908 has', data.product_breakdown.length, 'products');
  }
}

checkShipment();
