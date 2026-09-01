/**
 * Execute SQL Migration File
 * Usage: node execute-migration.mjs <path-to-sql-file>
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function executeMigration(filePath) {
  try {
    console.log('📄 Reading SQL file:', filePath);
    const sqlContent = readFileSync(filePath, 'utf8');
    
    console.log('📊 File size:', (sqlContent.length / 1024).toFixed(2), 'KB');
    console.log('🚀 Executing migration...\n');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sqlContent });
    
    if (error) {
      console.error('❌ Migration failed:', error.message);
      console.error('   Code:', error.code);
      console.error('   Details:', error.details);
      console.error('   Hint:', error.hint);
      process.exit(1);
    }
    
    console.log('✅ Migration executed successfully!');
    if (data) {
      console.log('   Result:', data);
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

// Get file path from command line
const filePath = process.argv[2];

if (!filePath) {
  console.error('❌ Usage: node execute-migration.mjs <path-to-sql-file>');
  console.error('   Example: node execute-migration.mjs database/036_inventory_advanced_features.sql');
  process.exit(1);
}

const resolvedPath = resolve(filePath);
console.log('🔧 Executing migration...\n');
executeMigration(resolvedPath);
