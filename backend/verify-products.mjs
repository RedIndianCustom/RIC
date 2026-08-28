#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyProducts() {
  console.log('🔍 Verifying products...\n');

  // Get all Red Indian Customs products
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('brand', 'Red Indian Customs')
    .order('model', { ascending: true })
    .order('dimensions', { ascending: true });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`✅ Total Red Indian Customs products: ${products.length}\n`);

  // Group by model
  const byModel = {};
  products.forEach(p => {
    if (!byModel[p.model]) {
      byModel[p.model] = [];
    }
    byModel[p.model].push(p);
  });

  console.log('📦 Products by Model:');
  console.log('='.repeat(70));
  
  Object.keys(byModel).sort().forEach(model => {
    console.log(`\n${model} (${byModel[model].length} sizes):`);
    byModel[model].forEach(p => {
      const imperial = p.imperial_size ? ` [${p.imperial_size}]` : '';
      console.log(`  • ${p.dimensions}${imperial} - ${p.sku}`);
    });
  });

  console.log('\n' + '='.repeat(70));
  console.log(`\n✨ Total: ${products.length} products across ${Object.keys(byModel).length} models`);
}

verifyProducts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Error:', error);
    process.exit(1);
  });
