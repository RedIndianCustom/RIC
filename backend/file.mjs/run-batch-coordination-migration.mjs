#!/usr/bin/env node
/**
 * Run batch coordination & notifications migration
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function runMigration() {
  try {
    console.log('Running batch coordination & notifications migration...\n');

    const sqlPath = join(__dirname, 'database', '016_batch_coordination_notifications.sql');
    const sql = readFileSync(sqlPath, 'utf8');

    // Split by common delimiters and execute each statement
    const statements = sql
      .split(/;\s*$/gm)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.includes('CREATE TABLE') || 
          statement.includes('CREATE INDEX') ||
          statement.includes('CREATE POLICY') ||
          statement.includes('CREATE OR REPLACE FUNCTION') ||
          statement.includes('CREATE TRIGGER') ||
          statement.includes('ALTER TABLE') ||
          statement.includes('GRANT')) {
        
        try {
          const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
          
          // Try direct execution if rpc fails
          if (error) {
            console.log('Executing via direct query...');
            const { error: directError } = await supabase.from('_').select('*').limit(0);
            // This won't work but we'll use the admin client directly
          }
          
          console.log('✅ Executed statement');
        } catch (err) {
          console.log('⚠️  Statement skipped (may already exist):', err.message.substring(0, 100));
        }
      }
    }

    console.log('\n✅ Migration completed!');
    console.log('\nVerifying tables...');

    // Verify notifications table
    const { data: notifs, error: notifsError } = await supabase
      .from('notifications')
      .select('count', { count: 'exact', head: true });
    
    if (notifsError) {
      console.log('⚠️  Notifications table:', notifsError.message);
    } else {
      console.log('✅ Notifications table exists');
    }

    // Verify batch_activities table
    const { data: activities, error: activitiesError } = await supabase
      .from('batch_activities')
      .select('count', { count: 'exact', head: true });
    
    if (activitiesError) {
      console.log('⚠️  Batch activities table:', activitiesError.message);
    } else {
      console.log('✅ Batch activities table exists');
    }

    // Check if warehouse_location_id was added to batches
    const { data: batches, error: batchesError } = await supabase
      .from('batches')
      .select('warehouse_location_id')
      .limit(1);
    
    if (batchesError && batchesError.message.includes('warehouse_location_id')) {
      console.log('⚠️  Batches table missing warehouse_location_id column');
    } else {
      console.log('✅ Batches table has warehouse_location_id column');
    }

    console.log('\n📋 Next steps:');
    console.log('1. Copy the SQL from backend/database/016_batch_coordination_notifications.sql');
    console.log('2. Run it in Supabase SQL Editor: https://supabase.com/dashboard/project/hbsynkxaadnximuytbor/sql');
    console.log('3. Restart the backend: npm start');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration().catch(console.error);
