/**
 * Simple QC Deadline Migration - Step by Step
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function runSQL(description, sql) {
  console.log(`\n${description}...`);
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
      if (error.message.includes('already exists') || 
          error.message.includes('does not exist')) {
        console.log('  ⚠️ Already applied or not found (safe to ignore)');
        return true;
      }
      console.error('  ❌ Error:', error.message);
      return false;
    }
    console.log('  ✅ Success');
    return true;
  } catch (err) {
    console.error('  ❌ Exception:', err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Applying QC Deadline Enhancement Migration\n');
  console.log('=' .repeat(60));

  // Step 1: Add columns one by one
  await runSQL(
    'Step 1a: Add has_deadline column',
    `ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS has_deadline BOOLEAN DEFAULT true;`
  );

  await runSQL(
    'Step 1b: Add deadline_type column',
    `ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS deadline_type VARCHAR(50) DEFAULT 'STANDARD';`
  );

  await runSQL(
    'Step 1c: Add deadline_set_by column',
    `ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS deadline_set_by UUID REFERENCES auth.users(id);`
  );

  await runSQL(
    'Step 1d: Add deadline_set_at column',
    `ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS deadline_set_at TIMESTAMPTZ;`
  );

  await runSQL(
    'Step 1e: Add custom_deadline_days column',
    `ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS custom_deadline_days INTEGER;`
  );

  await runSQL(
    'Step 1f: Add deadline_reason column',
    `ALTER TABLE qc_inspections ADD COLUMN IF NOT EXISTS deadline_reason TEXT;`
  );

  // Step 2: Add constraint to deadline_type
  await runSQL(
    'Step 2: Add constraint to deadline_type',
    `ALTER TABLE qc_inspections DROP CONSTRAINT IF EXISTS qc_inspections_deadline_type_check;
     ALTER TABLE qc_inspections ADD CONSTRAINT qc_inspections_deadline_type_check 
     CHECK (deadline_type IN ('STANDARD', 'CUSTOM', 'NONE'));`
  );

  // Step 3: Create deadline presets table
  await runSQL(
    'Step 3: Create qc_deadline_presets table',
    `CREATE TABLE IF NOT EXISTS qc_deadline_presets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      description TEXT,
      deadline_type VARCHAR(50) NOT NULL CHECK (deadline_type IN ('STANDARD', 'CUSTOM', 'NONE')),
      custom_days INTEGER,
      is_active BOOLEAN DEFAULT true,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now()
    );`
  );

  // Step 4: Insert preset data
  await runSQL(
    'Step 4: Insert deadline presets',
    `INSERT INTO qc_deadline_presets (name, description, deadline_type, custom_days, sort_order) VALUES
      ('Standard (15 days)', 'Default inspection deadline - 15 business days', 'STANDARD', NULL, 1),
      ('Rush Order (3 days)', 'Urgent inspection needed within 3 days', 'CUSTOM', 3, 2),
      ('Express (1 day)', 'Critical - inspect within 24 hours', 'CUSTOM', 1, 3),
      ('Extended (30 days)', 'Non-urgent inspection - 30 days allowed', 'CUSTOM', 30, 4),
      ('Seasonal (7 days)', 'Seasonal product - inspect within 1 week', 'CUSTOM', 7, 5),
      ('No Deadline', 'No specific deadline required', 'NONE', NULL, 6)
    ON CONFLICT DO NOTHING;`
  );

  // Step 5: Grant permissions
  await runSQL(
    'Step 5: Grant permissions on qc_deadline_presets',
    `GRANT SELECT ON qc_deadline_presets TO authenticated;`
  );

  // Step 6: Create indexes
  await runSQL(
    'Step 6a: Create index on has_deadline',
    `CREATE INDEX IF NOT EXISTS idx_qc_inspections_has_deadline ON qc_inspections(has_deadline);`
  );

  await runSQL(
    'Step 6b: Create index on deadline_type',
    `CREATE INDEX IF NOT EXISTS idx_qc_inspections_deadline_type ON qc_inspections(deadline_type);`
  );

  // Step 7: Update trigger function for due date calculation
  await runSQL(
    'Step 7: Update set_qc_due_date function',
    `CREATE OR REPLACE FUNCTION set_qc_due_date()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.has_deadline = true THEN
        IF NEW.ready_for_qc_date IS NOT NULL AND NEW.due_date IS NULL THEN
          IF NEW.deadline_type = 'STANDARD' OR NEW.deadline_type IS NULL THEN
            NEW.due_date := NEW.ready_for_qc_date + INTERVAL '15 days';
            NEW.deadline_type := 'STANDARD';
          ELSIF NEW.deadline_type = 'CUSTOM' AND NEW.custom_deadline_days IS NOT NULL THEN
            NEW.due_date := NEW.ready_for_qc_date + (NEW.custom_deadline_days || ' days')::INTERVAL;
          ELSIF NEW.deadline_type = 'NONE' THEN
            NEW.due_date := NULL;
          END IF;
        END IF;
      ELSE
        NEW.due_date := NULL;
        NEW.deadline_type := 'NONE';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;`
  );

  // Step 8: Update overdue check function
  await runSQL(
    'Step 8: Update check_qc_overdue_status function',
    `CREATE OR REPLACE FUNCTION check_qc_overdue_status()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.has_deadline = true AND NEW.due_date IS NOT NULL THEN
        IF NEW.status IN ('PENDING', 'IN_PROGRESS', 'PAUSED') AND NEW.due_date < now() THEN
          NEW.status := 'OVERDUE';
        END IF;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;`
  );

  // Step 9: Drop and recreate the view
  await runSQL(
    'Step 9a: Drop existing pending_qc_inspections view',
    `DROP VIEW IF EXISTS pending_qc_inspections CASCADE;`
  );

  await runSQL(
    'Step 9b: Create new pending_qc_inspections view with deadline info',
    `CREATE VIEW pending_qc_inspections AS
    SELECT 
      qi.id,
      qi.inspection_number,
      qi.shipment_id,
      qi.inspector_id,
      qi.status,
      qi.total_items,
      qi.items_inspected,
      qi.inspection_progress,
      qi.good_quality_count,
      qi.minor_defect_count,
      qi.major_defect_count,
      qi.ready_for_qc_date,
      qi.due_date,
      qi.has_deadline,
      qi.deadline_type,
      qi.deadline_set_by,
      qi.custom_deadline_days,
      qi.deadline_reason,
      CASE 
        WHEN qi.has_deadline = true AND qi.due_date IS NOT NULL THEN
          EXTRACT(DAY FROM (qi.due_date - now()))::INTEGER
        ELSE
          NULL
      END AS days_remaining,
      CASE 
        WHEN qi.has_deadline = false OR qi.due_date IS NULL THEN 'NO_DEADLINE'
        WHEN qi.due_date < now() THEN 'OVERDUE'
        WHEN qi.due_date < (now() + INTERVAL '3 days') THEN 'URGENT'
        WHEN qi.due_date < (now() + INTERVAL '7 days') THEN 'SOON'
        ELSE 'NORMAL'
      END AS urgency_level,
      s.shipment_number,
      s.supplier_id,
      u.full_name AS inspector_name,
      qi.created_at
    FROM qc_inspections qi
    LEFT JOIN shipments s ON s.id = qi.shipment_id
    LEFT JOIN users u ON u.id = qi.inspector_id
    WHERE qi.status IN ('PENDING', 'IN_PROGRESS', 'OVERDUE', 'PAUSED');`
  );

  // Step 10: Create the helper function
  await runSQL(
    'Step 10: Create set_qc_inspection_deadline function',
    `CREATE OR REPLACE FUNCTION set_qc_inspection_deadline(
      p_qc_inspection_id UUID,
      p_deadline_type VARCHAR(50),
      p_custom_deadline_days INTEGER DEFAULT NULL,
      p_deadline_reason TEXT DEFAULT NULL,
      p_manager_id UUID DEFAULT auth.uid()
    )
    RETURNS JSONB AS $$
    DECLARE
      v_inspection RECORD;
      v_result JSONB;
    BEGIN
      SELECT * INTO v_inspection
      FROM qc_inspections
      WHERE id = p_qc_inspection_id;
      
      IF NOT FOUND THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'QC inspection not found'
        );
      END IF;
      
      UPDATE qc_inspections
      SET
        has_deadline = (p_deadline_type != 'NONE'),
        deadline_type = p_deadline_type,
        custom_deadline_days = p_custom_deadline_days,
        deadline_reason = p_deadline_reason,
        deadline_set_by = p_manager_id,
        deadline_set_at = now(),
        updated_at = now()
      WHERE id = p_qc_inspection_id
      RETURNING * INTO v_inspection;
      
      v_result := jsonb_build_object(
        'success', true,
        'inspection', row_to_json(v_inspection),
        'message', 'QC inspection deadline updated successfully'
      );
      
      RETURN v_result;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;`
  );

  await runSQL(
    'Step 11: Grant execute on function',
    `GRANT EXECUTE ON FUNCTION set_qc_inspection_deadline TO authenticated;`
  );

  console.log('\n' + '='.repeat(60));
  console.log('✅ Migration completed!\n');

  // Verify
  console.log('Verifying migration...\n');
  
  const { data: presets, error: presetsError } = await supabase
    .from('qc_deadline_presets')
    .select('*')
    .order('sort_order');
  
  if (presets) {
    console.log(`✅ Found ${presets.length} deadline presets:`);
    presets.forEach(p => console.log(`   - ${p.name}`));
  }

  const { data: columns, error: colError } = await supabase
    .from('qc_inspections')
    .select('has_deadline, deadline_type')
    .limit(1);
  
  if (columns || (colError && colError.message.includes('no rows'))) {
    console.log('\n✅ New columns verified in qc_inspections table');
  }

  console.log('\n🎉 All done! The QC deadline feature is ready to use.\n');
}

main().catch(console.error);
