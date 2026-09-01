/**
 * Check if QC inspection was created after approval
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

async function checkQCInspection() {
  console.log('🔍 Checking QC inspections created from approved receiving reports...\n');

  try {
    // Get recently approved receiving reports
    console.log('1️⃣ Checking approved receiving reports...');
    const { data: reports, error: reportsError } = await supabase
      .from('receiving_reports')
      .select('id, report_number, status, shipment_id')
      .eq('status', 'APPROVED')
      .order('submitted_at', { ascending: false })
      .limit(5);

    if (reportsError) {
      console.error('❌ Error:', reportsError);
      return;
    }

    console.log(`✅ Found ${reports?.length || 0} approved reports\n`);

    // Check for QC inspections
    console.log('2️⃣ Checking QC inspections...');
    const { data: inspections, error: inspectionsError } = await supabase
      .from('qc_inspections')
      .select(`
        id,
        inspection_number,
        status,
        shipment_id,
        created_at,
        total_items,
        inspector_id
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (inspectionsError) {
      console.error('❌ Error:', inspectionsError);
      return;
    }

    console.log(`✅ Found ${inspections?.length || 0} QC inspections\n`);

    if (inspections && inspections.length > 0) {
      console.log('📋 Recent QC Inspections:');
      console.log('─────────────────────────────────────────────');
      inspections.forEach((inspection, idx) => {
        console.log(`\n${idx + 1}. ${inspection.inspection_number}`);
        console.log(`   Status: ${inspection.status}`);
        console.log(`   Shipment ID: ${inspection.shipment_id}`);
        console.log(`   Total Items: ${inspection.total_items}`);
        console.log(`   Inspector: ${inspection.inspector_id || 'Not assigned'}`);
        console.log(`   Created: ${new Date(inspection.created_at).toLocaleString()}`);
        
        // Check if linked to an approved report
        const linkedReport = reports?.find(r => r.shipment_id === inspection.shipment_id);
        if (linkedReport) {
          console.log(`   ✅ Linked to approved report: ${linkedReport.report_number}`);
        }
      });
    } else {
      console.log('📭 No QC inspections found');
      console.log('\n💡 QC inspections should be auto-created when receiving reports are approved');
    }

    // Check receiving_approvals table
    console.log('\n3️⃣ Checking receiving_approvals records...');
    const { data: approvals, error: approvalsError } = await supabase
      .from('receiving_approvals')
      .select(`
        report_id,
        decision,
        decided_at,
        qc_inspection_id
      `)
      .order('decided_at', { ascending: false })
      .limit(5);

    if (!approvalsError && approvals && approvals.length > 0) {
      console.log(`✅ Found ${approvals.length} approval records\n`);
      approvals.forEach((approval, idx) => {
        console.log(`${idx + 1}. Decision: ${approval.decision}`);
        console.log(`   QC Inspection ID: ${approval.qc_inspection_id || 'NOT CREATED'}`);
        console.log(`   Decided: ${new Date(approval.decided_at).toLocaleString()}\n`);
      });
    }

    console.log('─────────────────────────────────────────────');
    console.log('✅ Check completed!');

  } catch (error) {
    console.error('\n❌ Failed:', error.message);
    console.error(error);
  }
}

// Run
checkQCInspection();
