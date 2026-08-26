import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Checking shipment status constraint...');
console.log('Supabase URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConstraint() {
  try {
    console.log('\n📋 Checking ALL constraints on shipments table:');
    
    const { data: constraints, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          conname AS constraint_name,
          contype AS type,
          pg_get_constraintdef(c.oid) AS constraint_definition
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        JOIN pg_class cl ON cl.oid = c.conrelid
        WHERE cl.relname = 'shipments'
        AND n.nspname = 'public'
        ORDER BY conname;
      `
    });
    
    if (error) {
      console.log('❌ Query error, trying direct query...');
      
      // Try a simpler approach - attempt to insert with various status values
      const testStatuses = ['PENDING', 'IN_TRANSIT', 'RECEIVED', 'INSPECTING', 'APPROVED', 'REJECTED', 'CANCELLED'];
      
      console.log('\n🧪 Testing which status values are accepted:');
      for (const status of testStatuses) {
        console.log(`\nTesting status: ${status}`);
        
        // Try inserting with minimal data (will fail but shows constraint)
        const { error: insertError } = await supabase
          .from('shipments')
          .insert({
            shipment_number: `TEST-${Date.now()}`,
            status: status,
            expected_quantity: 0,
            actual_quantity: 0
          });
        
        if (insertError) {
          if (insertError.code === '23514') {
            console.log(`  ❌ ${status} - REJECTED by constraint`);
            console.log(`     Error: ${insertError.message}`);
          } else if (insertError.code === '23502') {
            console.log(`  ✅ ${status} - ACCEPTED (failed on NULL constraint, not status)`);
          } else {
            console.log(`  ⚠️ ${status} - Other error: ${insertError.message}`);
          }
        } else {
          console.log(`  ✅ ${status} - ACCEPTED`);
          // Clean up test record
          await supabase
            .from('shipments')
            .delete()
            .eq('shipment_number', `TEST-${Date.now()}`);
        }
      }
      
    } else {
      console.log('\n✅ Constraints found:');
      console.log(JSON.stringify(constraints, null, 2));
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkConstraint();
