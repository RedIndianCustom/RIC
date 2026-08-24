/**
 * Debug script to check batch data with products
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

async function debugBatch() {
  console.log('🔍 Checking batch BATCH-2608-412...\n');
  
  // Query batch with products
  const { data: batch, error } = await supabase
    .from('batches')
    .select(`
      *,
      products:product_id (
        id,
        sku,
        brand,
        model,
        dimensions,
        category
      ),
      shipments:shipment_id (
        id,
        shipment_number,
        container_number,
        product_breakdown
      )
    `)
    .eq('batch_number', 'BATCH-2608-412')
    .single();

  if (error) {
    console.error('❌ Error fetching batch:', error);
    return;
  }

  console.log('✅ Batch found:');
  console.log(JSON.stringify(batch, null, 2));
  
  console.log('\n📦 Product info:');
  console.log('- Products object:', batch.products);
  console.log('- Product ID:', batch.product_id);
  
  if (!batch.products) {
    console.log('\n⚠️ Products field is NULL!');
    
    // Check if product exists separately
    if (batch.product_id) {
      console.log('\n🔍 Checking if product exists separately...');
      const { data: product, error: prodError } = await supabase
        .from('products')
        .select('*')
        .eq('id', batch.product_id)
        .single();
        
      if (prodError) {
        console.error('❌ Product not found:', prodError);
      } else {
        console.log('✅ Product exists:', product);
      }
    } else {
      console.log('⚠️ Batch has no product_id set!');
    }
  }
}

debugBatch().catch(console.error);
