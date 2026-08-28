import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testProducts() {
  console.log('🔍 Testing products table...\n');

  try {
    const { data, error, count } = await supabase
      .from('products')
      .select('*', { count: 'exact' })
      .limit(5);

    if (error) {
      console.error('❌ Error:', error.message);
      console.log('\n⚠️  Please run SETUP_PRODUCTS_TABLE.sql in Supabase SQL Editor');
      process.exit(1);
    }

    console.log(`✅ Products table found!`);
    console.log(`📦 Total products: ${count}`);
    
    if (data && data.length > 0) {
      console.log('\n📋 Sample products:');
      data.forEach((p, i) => {
        console.log(`${i + 1}. ${p.brand} ${p.model} - ${p.dimensions} (${p.sku})`);
      });
    } else {
      console.log('\n⚠️  No products found. Run SETUP_PRODUCTS_TABLE.sql to insert sample data.');
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

testProducts();
