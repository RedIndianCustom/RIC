/**
 * Fix SHIP-312321 by adding sample products
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

async function fixShipment() {
  console.log('🔧 Adding products to SHIP-312321...\n');
  
  // Sample products totaling 48 units
  const products = [
    { category: 'Dual Sport', size: '90/90-17', quantity: 20 },
    { category: 'Sawtooth', size: '110/90-17', quantity: 15 },
    { category: 'Enduro', size: '120/80-17', quantity: 13 }
  ];
  
  const total = products.reduce((sum, p) => sum + p.quantity, 0);
  console.log(`📦 Adding ${products.length} products (total: ${total} units):\n`);
  products.forEach((p, idx) => {
    console.log(`  ${idx + 1}. ${p.category} - ${p.size} (${p.quantity} units)`);
  });
  
  const { data, error } = await supabase
    .from('shipments')
    .update({
      product_breakdown: products
    })
    .eq('shipment_number', 'SHIP-312321')
    .select()
    .single();
    
  if (error) {
    console.error('\n❌ Error updating shipment:', error);
    return;
  }
  
  console.log('\n✅ Shipment updated successfully!');
  console.log('📦 product_breakdown:', data.product_breakdown);
  console.log('📊 Product count:', data.product_breakdown?.length);
  console.log('\n🎉 Now refresh your browser and edit SHIP-312321 - products should appear!');
}

fixShipment().catch(console.error);
