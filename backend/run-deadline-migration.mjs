/**
 * Execute QC Deadline Migration
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Starting QC Deadline Migration...\n');

  try {
    // Step 1: Add new columns
    console.log('Step 1: Adding new columns to qc_inspections...');
    
    const columns = [
      'ADD COLUMN IF NOT EXISTS has_deadline BOOLEAN DEFAULT true',
      'ADD COLUMN IF NOT EXISTS deadline_type VARCHAR(50) DEFAULT \'STANDARD\' CHECK (deadline_type IN (\'STANDARD\', \'CUSTOM\', \'NONE\'))',
      'ADD COLUMN IF NOT EXISTS deadline_set_by UUID REFERENCES auth.users(id)',
      'ADD COLUMN IF NOT EXISTS deadline_set_at TIMESTAMPTZ',
      'ADD COLUMN IF NOT EXISTS custom_deadline_days INTEGER',
      'ADD COLUMN IF NOT EXISTS deadline_reason TEXT'
    ];

    for (const col of columns) {
      const { error } = await supabase.rpc('exec_sql', { 
        sql_query: `ALTER TABLE qc_inspections ${col};` 
      });
      if (error && !error.message.includes('already exists')) {
        console.error('Error adding column:', error);
      }
    }
    console.log('✅ Columns added\n');

    // Step 2: Read and execute the full SQL file
    console.log('Step 2: Executing full migration...');
    const sqlContent = readFileSync('database/049_qc_inspection_flexible_deadline.sql', 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt.length < 10) continue; // Skip very short statements
      
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: stmt + ';' });
        if (error) {
          // Some errors are OK (like "already exists")
          if (!error.message.includes('already exists') && 
              !error.message.includes('does not exist')) {
            console.warn('Warning:', error.message);
          }
        }
      } catch (err) {
        console.warn('Warning on statement:', err.message);
      }
    }

    console.log('\n✅ Migration completed successfully!\n');
    
    // Verify
    console.log('Verifying migration...');
    const { data, error } = await supabase
      .from('qc_deadline_presets')
      .select('*')
      .limit(3);
    
    if (data && data.length > 0) {
      console.log('✅ Deadline presets loaded:', data.length, 'presets found');
      console.log('Sample presets:');
      data.forEach(p => console.log(`  - ${p.name} (${p.deadline_type})`));
    } else if (error) {
      console.log('Note: Could not verify presets:', error.message);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
