import https from 'https';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Attempting to reload schema via Supabase Management API...\n');

// Extract project ref from URL
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)[1];
console.log('Project Ref:', projectRef);

async function reloadSchemaViaAPI() {
  try {
    // Method 1: Try sending admin command via REST API
    console.log('\n📡 Method 1: Sending schema reload via REST endpoint...');
    
    const restEndpoint = `${SUPABASE_URL}/rest/v1/`;
    const response1 = await fetch(restEndpoint, {
      method: 'HEAD',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'X-Schema-Reload': 'true',
        'Accept': 'application/vnd.pgrst.object+json'
      }
    }).catch(e => null);

    if (response1) {
      console.log('   Status:', response1.status, response1.statusText);
    }

    // Method 2: Query the API to trigger cache refresh
    console.log('\n📡 Method 2: Querying PostgREST to trigger discovery...');
    
    const response2 = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Accept-Profile': 'public'
      }
    }).catch(e => null);

    if (response2) {
      console.log('   Status:', response2.status);
    }

    // Method 3: Try to query products table directly
    console.log('\n📡 Method 3: Direct products table query...');
    
    const response3 = await fetch(`${SUPABASE_URL}/rest/v1/products?limit=1`, {
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Accept': 'application/json'
      }
    });

    const data = await response3.json();
    
    if (response3.ok && Array.isArray(data)) {
      console.log('   ✅ SUCCESS! Products table is accessible!');
      console.log('   📦 Sample:', data[0] ? `${data[0].brand} ${data[0].model}` : 'No data');
      console.log('\n🎉 Schema cache is now active!');
      console.log('💡 Refresh your browser at: http://192.168.120.26:5174\n');
      return true;
    } else {
      console.log('   ❌ Error:', data);
      return false;
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    return false;
  }
}

const success = await reloadSchemaViaAPI();

if (!success) {
  console.log('\n' + '='.repeat(70));
  console.log('⚠️  AUTOMATED RELOAD FAILED');
  console.log('='.repeat(70));
  console.log('\n You MUST manually reload the schema in Supabase Dashboard:');
  console.log('\n 1. Go to: https://supabase.com/dashboard/project/' + projectRef);
  console.log(' 2. Click Settings → API');
  console.log(' 3. Find and click "Reload Schema" button');
  console.log(' 4. Wait 15 seconds');
  console.log(' 5. Refresh your browser\n');
  console.log('='.repeat(70) + '\n');
}
