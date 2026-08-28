import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConstraint() {
  console.log('🔍 Checking shipments table constraints...\n');
  
  // Direct query to get constraint definition
  const query = `
    SELECT 
      conname AS constraint_name,
      pg_get_constraintdef(c.oid) AS constraint_definition
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    JOIN pg_class cl ON cl.oid = c.conrelid
    WHERE cl.relname = 'shipments'
    AND n.nspname = 'public'
    AND contype = 'c'
    AND conname LIKE '%status%'
    ORDER BY conname;
  `;
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ query })
    });
    
    if (!response.ok) {
      console.log('❌ Cannot query constraints via RPC, trying alternative...\n');
      
      // Try inserting a test record to see the actual constraint
      const { data, error } = await supabase
        .from('shipments')
        .insert({
          shipment_number: `TEST-${Date.now()}`,
          container_number: `CNT-${Date.now()}`,
          supplier_id: 'b9ecd4a1-208b-47e5-a948-046398002c58', // Use actual supplier ID from log
          status: 'PENDING',
          expected_quantity: 0,
          actual_quantity: 0
        })
        .select()
        .single();
      
      if (error) {
        console.log('❌ Insert test failed with:');
        console.log('   Code:', error.code);
        console.log('   Message:', error.message);
        console.log('   Details:', error.details);
        console.log('   Hint:', error.hint);
        
        if (error.code === '23514') {
          console.log('\n🚨 CONSTRAINT VIOLATION CONFIRMED');
          console.log('   The constraint is rejecting "PENDING" status');
          console.log('\n💡 This means the constraint definition is different from what we expect.');
          console.log('   We need to check the actual constraint in Supabase dashboard.');
        }
      } else {
        console.log('✅ Insert succeeded! Constraint accepts PENDING');
        console.log('   Created shipment:', data);
        
        // Clean up
        await supabase.from('shipments').delete().eq('id', data.id);
      }
    } else {
      const data = await response.json();
      console.log('📋 Constraints found:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkConstraint();
