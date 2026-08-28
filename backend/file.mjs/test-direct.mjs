import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

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

async function testDirect() {
  console.log('🔍 Testing direct SQL query...\n');

  try {
    // Try direct SQL query instead of REST API
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: 'SELECT COUNT(*) as count FROM public.products'
    }).catch(() => {
      // If exec_sql doesn't exist, try direct query
      return supabase.from('products').select('*', { count: 'exact', head: true });
    });

    if (error) {
      console.error('❌ Error:', error.message);
      console.log('\n💡 SOLUTION: Manually reload schema in Supabase:');
      console.log('   1. Go to Supabase Dashboard → Settings → API');
      console.log('   2. Click "Reload Schema" button');
      console.log('   3. Wait 10 seconds');
      console.log('   4. Refresh your frontend');
      process.exit(1);
    }

    console.log('✅ Query successful!');
    console.log('Data:', data);

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    console.log('\n💡 Try refreshing schema cache in Supabase Dashboard');
  }
}

testDirect();
