import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Testing Supabase Connection and Schema...\n');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function test() {
  try {
    // Direct test of products table
    console.log('📡 Attempting to query products table directly...\n');
    
    const { data, error, count } = await supabase
      .from('products')
      .select('*', { count: 'exact' })
      .limit(5);

    if (error) {
      console.error('❌ ERROR:', error.message);
      console.error('Code:', error.code);
      console.error('Details:', error.details);
      console.error('Hint:', error.hint);
      
      console.log('\n' + '='.repeat(70));
      console.log('🚨 SCHEMA CACHE ISSUE DETECTED');
      console.log('='.repeat(70));
      console.log('\n📝 MANUAL FIX REQUIRED:\n');
      console.log('1. Open your browser and go to:');
      console.log('   https://supabase.com/dashboard/project/vsucdxobztcioyyxbbrx\n');
      console.log('2. Click "Settings" (⚙️ gear icon) in the left sidebar\n');
      console.log('3. Click "API" under Settings\n');
      console.log('4. Scroll down to find "Schema Cache" section\n');
      console.log('5. Click the "Reload Schema" or "Reload API Schema" button\n');
      console.log('6. Wait 10-15 seconds\n');
      console.log('7. Run this script again to verify\n');
      console.log('8. Refresh your frontend at: http://192.168.120.26:5174\n');
      console.log('='.repeat(70));
      
      return;
    }

    console.log('✅ SUCCESS! Products table is accessible!\n');
    console.log(`📦 Total products in database: ${count}\n`);

    if (data && data.length > 0) {
      console.log('📋 Sample products:');
      data.forEach((p, i) => {
        const name = p.brand && p.model ? `${p.brand} ${p.model}` : (p.name || 'Unknown');
        const dims = p.dimensions ? ` - ${p.dimensions}` : '';
        console.log(`   ${i + 1}. ${name}${dims} (SKU: ${p.sku})`);
      });
      
      console.log('\n✅ Your backend can access the products!');
      console.log('🎉 The frontend should now work!');
      console.log('\n💡 If frontend still shows "No products found":');
      console.log('   - Hard refresh your browser (Ctrl + Shift + R)');
      console.log('   - Check browser console for errors');
      console.log('   - Verify backend is running on port 4000');
    } else {
      console.log('⚠️  Table is accessible but empty. Run the products SQL insert script.');
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

test();
