/**
 * Check shipment product breakdown data
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

async function checkShipments() {
  console.log('🔍 Checking all shipments and their product breakdown...\n');
  
  const { data: shipments, error } = await supabase
    .from('shipments')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('❌ Error fetching shipments:', error);
    return;
  }
  
  console.log(`✅ Found ${shipments.length} shipments\n`);
  
  shipments.forEach((ship, idx) => {
    console.log(`\n${idx + 1}. ${ship.shipment_number} (${ship.container_number})`);
    console.log(`   Status: ${ship.status}`);
    console.log(`   Supplier ID: ${ship.supplier_id}`);
    
    if (ship.product_breakdown && Array.isArray(ship.product_breakdown) && ship.product_breakdown.length > 0) {
      console.log(`   ✅ Has ${ship.product_breakdown.length} products:`);
      ship.product_breakdown.forEach((prod, pidx) => {
        console.log(`      ${pidx + 1}. ${prod.category || 'Unknown'} - ${prod.size || 'Unknown'} (${prod.quantity || 0} units)`);
      });
    } else if (ship.product_breakdown) {
      console.log(`   ⚠️ product_breakdown exists but is empty or invalid:`, typeof ship.product_breakdown);
      console.log(`      Value:`, ship.product_breakdown);
    } else {
      console.log(`   ❌ NO product_breakdown field (NULL)`);
    }
  });
  
  // Summary
  const withProducts = shipments.filter(s => s.product_breakdown && Array.isArray(s.product_breakdown) && s.product_breakdown.length > 0);
  const withoutProducts = shipments.filter(s => !s.product_breakdown || !Array.isArray(s.product_breakdown) || s.product_breakdown.length === 0);
  
  console.log('\n\n📊 Summary:');
  console.log(`   ✅ Shipments WITH products: ${withProducts.length}`);
  console.log(`   ❌ Shipments WITHOUT products: ${withoutProducts.length}`);
  
  if (withoutProducts.length > 0) {
    console.log('\n\n⚠️ Shipments missing product breakdown:');
    withoutProducts.forEach(s => {
      console.log(`   - ${s.shipment_number} (${s.container_number})`);
    });
  }
}

checkShipments().catch(console.error);
