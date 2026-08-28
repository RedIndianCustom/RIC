import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

const sql = fs.readFileSync(join(__dirname, 'database', 'CHECK_SHIPMENTS_CONSTRAINT.sql'), 'utf8');

console.log('🔍 Checking shipments table constraints...\n');

const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

if (error) {
  console.error('❌ Error:', error);
  
  // Try direct query
  console.log('\n📋 Trying direct column check...');
  const { data: columns, error: colError } = await supabase
    .from('shipments')
    .select('*')
    .limit(0);
    
  if (colError) {
    console.error('❌ Column check error:', colError);
  } else {
    console.log('✅ Columns exist');
  }
  
  process.exit(1);
}

console.log('✅ Result:', JSON.stringify(data, null, 2));
