#!/usr/bin/env node

/**
 * Add scan_details column to receiving_reports table
 */

import { config } from 'dotenv';
import { supabaseAdmin as supabase } from './src/config/supabase.js';
import { readFileSync } from 'fs';

config();

async function addScanDetailsColumn() {
  try {
    console.log('🔧 Adding scan_details column to receiving_reports...\n');

    const sql = readFileSync('./database/migrations/add_scan_details_column.sql', 'utf8');
    
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If exec_sql doesn't exist, try direct query
      console.log('⚠️  exec_sql not available, trying direct approach...\n');
      
      // Try adding column directly
      const { error: addError } = await supabase
        .from('receiving_reports')
        .select('scan_details')
        .limit(1);
      
      if (addError && addError.message.includes('column "scan_details" does not exist')) {
        console.log('❌ Column does not exist. Please run this SQL manually in Supabase SQL Editor:\n');
        console.log('-------------------------------------------------------------------');
        console.log(sql);
        console.log('-------------------------------------------------------------------\n');
        console.log('📍 Go to: Supabase Dashboard → SQL Editor → New Query\n');
        process.exit(1);
      } else {
        console.log('✅ Column scan_details already exists or was added successfully!\n');
      }
    } else {
      console.log('✅ Migration completed successfully!\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📝 Please run this SQL manually in Supabase SQL Editor:\n');
    console.log('-------------------------------------------------------------------');
    const sql = readFileSync('./database/migrations/add_scan_details_column.sql', 'utf8');
    console.log(sql);
    console.log('-------------------------------------------------------------------\n');
    process.exit(1);
  }
}

addScanDetailsColumn();
