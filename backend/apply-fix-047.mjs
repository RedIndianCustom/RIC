/**
 * Apply migration 047 - Fix get_pending_receiving_approvals type mismatch
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
);

async function applyMigration() {
  console.log('🔧 Applying migration 047...\n');

  try {
    // Read the SQL file
    const sql = readFileSync('database/047_fix_get_pending_approvals_type.sql', 'utf-8');
    
    console.log('📄 Executing SQL...\n');

    // Execute the SQL directly
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If exec_sql doesn't exist, try the direct approach
      console.log('⚠️ exec_sql not available, using direct query...');
      
      // Create function directly
      const createFunctionSQL = `
CREATE OR REPLACE FUNCTION get_pending_receiving_approvals()
RETURNS TABLE (
  report_id UUID,
  report_number VARCHAR(50),
  shipment_id UUID,
  shipment_number VARCHAR(100),
  submitted_by_id UUID,
  submitted_by_name TEXT,
  submitted_at TIMESTAMPTZ,
  total_expected INTEGER,
  total_scanned INTEGER,
  total_discrepancy INTEGER,
  size_breakdown JSONB,
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.report_number,
    r.shipment_id,
    s.shipment_number,
    r.submitted_by,
    u.full_name,
    r.submitted_at,
    r.total_expected,
    r.total_scanned,
    r.total_discrepancy,
    r.size_breakdown,
    r.notes
  FROM receiving_reports r
  JOIN shipments s ON s.id = r.shipment_id
  JOIN users u ON u.id = r.submitted_by
  WHERE r.status = 'PENDING'
  ORDER BY r.submitted_at ASC;
END;
$$ LANGUAGE plpgsql;
`;

      // Use fetch to call the SQL endpoint directly
      const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ sql_query: createFunctionSQL })
      });

      if (!response.ok) {
        console.error('❌ HTTP Error:', response.status, response.statusText);
        const text = await response.text();
        console.error('Response:', text);
        return;
      }

      console.log('✅ Function recreated successfully!');
    } else {
      console.log('✅ Migration applied successfully!');
    }

    // Test the function
    console.log('\n🧪 Testing the function...');
    const { data: testData, error: testError } = await supabase.rpc('get_pending_receiving_approvals');

    if (testError) {
      console.error('❌ Test failed:', testError);
    } else {
      console.log('✅ Function works! Found', testData?.length || 0, 'pending approvals');
    }

  } catch (error) {
    console.error('\n❌ Failed:', error.message);
    console.error(error);
  }
}

// Run
applyMigration();
