import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Checking RPC function...\n');

try {
  // Try to call the RPC function
  const { data, error } = await supabase.rpc('create_inventory_barcodes', {
    p_product_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
    p_batch_id: '00000000-0000-0000-0000-000000000000',
    p_shipment_id: '00000000-0000-0000-0000-000000000000',
    p_quantity: 1
  });

  if (error) {
    if (error.message.includes('not found') || error.message.includes('does not exist')) {
      console.log('❌ RPC FUNCTION DOES NOT EXIST!\n');
      console.log('📋 Solution:');
      console.log('   1. Open Supabase SQL Editor');
      console.log('   2. Run: backend/database/015_transaction_safe_barcode_rpc.sql');
      console.log('   3. This will create the create_inventory_barcodes function\n');
    } else {
      console.log('✅ RPC function EXISTS (got expected error for dummy data)\n');
      console.log('Error message:', error.message);
    }
  } else {
    console.log('✅ RPC function EXISTS and working!\n');
    console.log('Result:', data);
  }

  // Check how many barcodes exist
  const { data: barcodes, error: bcError } = await supabase
    .from('barcodes')
    .select('barcode_value', { count: 'exact', head: true });
  
  if (!bcError) {
    console.log('📊 Barcodes in database:', barcodes?.length || 0);
  }

} catch (err) {
  console.error('Error:', err.message);
}

process.exit(0);
