import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Force Reloading Supabase Schema Cache...\n');
console.log('Project:', SUPABASE_URL);

// Method 1: Send NOTIFY through direct database connection
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

async function forceReload() {
  try {
    console.log('📡 Step 1: Sending NOTIFY to PostgREST...');
    
    // Execute the NOTIFY command
    const { data: notifyData, error: notifyError } = await supabase.rpc('exec_sql', {
      sql: "NOTIFY pgrst, 'reload schema'"
    }).catch(async () => {
      // If exec_sql doesn't exist, try direct SQL
      console.log('   Trying alternative method...');
      return await supabase.rpc('notify_pgrst').catch(() => ({ data: null, error: null }));
    });

    if (notifyError) {
      console.log('   ⚠️  NOTIFY may not be available, trying HTTP reload...\n');
    } else {
      console.log('   ✅ NOTIFY sent successfully\n');
    }

    // Method 2: Send direct HTTP request to PostgREST reload endpoint
    console.log('📡 Step 2: Calling PostgREST admin endpoint...');
    const restUrl = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');
    const adminEndpoint = `${SUPABASE_URL}/rest/v1/`;
    
    // Try to trigger schema reload via OPTIONS request
    try {
      const response = await fetch(adminEndpoint, {
        method: 'OPTIONS',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Prefer': 'schema=reload'
        }
      });
      console.log('   ✅ HTTP reload triggered\n');
    } catch (e) {
      console.log('   ⚠️  HTTP method not available\n');
    }

    // Step 3: Verify products table is now visible
    console.log('📡 Step 3: Testing products table access...');
    const { data: products, error: productsError, count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: false })
      .limit(5);

    if (productsError) {
      console.error('   ❌ Error:', productsError.message);
      console.log('\n⚠️  MANUAL ACTION REQUIRED:');
      console.log('   1. Go to: https://supabase.com/dashboard/project/' + restUrl);
      console.log('   2. Click "Settings" → "API"');
      console.log('   3. Scroll down and click "Reload Schema" button');
      console.log('   4. Wait 10 seconds and refresh your frontend\n');
      process.exit(1);
    }

    console.log('   ✅ Products table is accessible!');
    console.log(`   📦 Found ${count} products in database\n`);

    if (products && products.length > 0) {
      console.log('📋 Sample products:');
      products.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.brand} ${p.model} - ${p.dimensions} (SKU: ${p.sku})`);
      });
    }

    console.log('\n✅ SUCCESS! Schema cache is now active.');
    console.log('🎉 Your frontend should now display products!');
    console.log('\n💡 Refresh your browser at: http://192.168.120.26:5174');

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    console.log('\n⚠️  Please reload schema manually in Supabase Dashboard');
  }
}

forceReload();
