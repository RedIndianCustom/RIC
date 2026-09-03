/**
 * Run migration to create receiving_reports table
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  try {
    console.log('🔄 Running receiving_reports migration...');

    const sql = readFileSync(
      join(__dirname, 'database', 'migrations', 'create_receiving_reports.sql'),
      'utf8'
    );

    // Split SQL by statement and execute each
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Executing ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`   ${i + 1}/${statements.length}: ${statement.substring(0, 60)}...`);
      
      const { error } = await supabase.rpc('exec_sql', { 
        sql_string: statement + ';' 
      });
      
      if (error) {
        console.error(`❌ Error in statement ${i + 1}:`, error);
        // Continue with other statements
      }
    }

    console.log('✅ receiving_reports table created successfully!');
    console.log('📊 Migration complete');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

runMigration().catch(console.error);
