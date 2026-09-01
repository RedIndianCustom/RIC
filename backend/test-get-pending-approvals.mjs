/**
 * Test script to verify get_pending_receiving_approvals() function
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
);

async function testGetPendingApprovals() {
  console.log('🧪 Testing get_pending_receiving_approvals() function...\n');

  try {
    console.log('1️⃣ Calling RPC function...');
    
    const { data, error } = await supabase.rpc('get_pending_receiving_approvals');

    if (error) {
      console.error('❌ RPC Error:', error);
      return;
    }

    console.log('\n✅ Function executed successfully');
    console.log('─────────────────────────────────────────────');
    console.log('Records returned:', data?.length || 0);
    
    if (data && data.length > 0) {
      console.log('\n📋 Sample record structure:');
      console.log(JSON.stringify(data[0], null, 2));
      
      console.log('\n📋 All pending reports:');
      data.forEach((report, idx) => {
        console.log(`\n  ${idx + 1}. Report: ${report.report_number}`);
        console.log(`     Shipment: ${report.shipment_number}`);
        console.log(`     Submitted by: ${report.submitted_by_name}`);
        console.log(`     Date: ${new Date(report.submitted_at).toLocaleString()}`);
        console.log(`     Expected: ${report.total_expected}`);
        console.log(`     Scanned: ${report.total_scanned}`);
        console.log(`     Discrepancy: ${report.total_discrepancy}`);
      });
    } else {
      console.log('\n📭 No pending approvals found');
      console.log('\n💡 To create test data, submit a receiving report from the warehouse interface');
    }

    console.log('\n─────────────────────────────────────────────');
    console.log('✅ Test completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed with exception:', error.message);
    console.error(error);
  }
}

// Run the test
testGetPendingApprovals();
