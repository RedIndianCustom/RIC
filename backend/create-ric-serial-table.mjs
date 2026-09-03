/**
 * Create RIC serial number mapping table
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTable() {
  try {
    console.log('📝 Creating RIC serial numbers table...');

    const sql = readFileSync(
      join(__dirname, 'database/migrations/create_ric_serial_mapping.sql'),
      'utf-8'
    );

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Error:', error.message);
      throw error;
    }

    console.log('✅ RIC serial numbers table created successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

createTable()
  .then(() => {
    console.log('\n🎉 Migration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
