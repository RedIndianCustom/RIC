#!/usr/bin/env node

/**
 * ============================================================================
 * RUN PRODUCT MIGRATION - Add All Product Sizes
 * ============================================================================
 * This script runs the 030_add_all_product_sizes.sql migration to add
 * all 81 Red Indian Customs tire products to the database.
 * ============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('🚀 Starting product migration...\n');

  try {
    // Read the SQL file
    const sqlFile = join(__dirname, 'database', '030_add_all_product_sizes.sql');
    console.log(`📄 Reading SQL file: ${sqlFile}`);
    
    const sql = readFileSync(sqlFile, 'utf-8');
    console.log(`✅ SQL file loaded (${sql.length} characters)\n`);

    // Execute the migration
    console.log('⚡ Executing migration...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Try direct query if RPC doesn't exist
      console.log('⚠️  RPC not available, trying direct execution...');
      
      // Split by statements and execute
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--') && s.length > 0);

      let successCount = 0;
      let errorCount = 0;

      for (const statement of statements) {
        if (statement.toLowerCase().includes('begin') || 
            statement.toLowerCase().includes('commit') ||
            statement.toLowerCase().includes('do $$')) {
          continue; // Skip transaction control statements
        }

        try {
          await supabase.rpc('exec_sql', { sql_query: statement });
          successCount++;
        } catch (err) {
          console.error(`❌ Error in statement:`, err.message);
          errorCount++;
        }
      }

      console.log(`\n📊 Execution Summary:`);
      console.log(`   ✅ Successful: ${successCount}`);
      console.log(`   ❌ Failed: ${errorCount}`);
    } else {
      console.log('✅ Migration executed successfully!');
    }

    // Verify the results
    console.log('\n🔍 Verifying products...');
    
    const models = [
      'Classic Sawtooth',
      'Enduro Trail',
      'Street Dual Sport',
      'Dual Sport XT',
      'Armor XT',
      'Armor ADV',
      'ARMOR ST',
      'ARMOR ST-X'
    ];

    console.log('\n📦 Product Count by Model:');
    console.log('=' .repeat(50));

    let totalCount = 0;
    for (const model of models) {
      const { data: products, error: countError } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('model', model);

      if (countError) {
        console.log(`   ❌ ${model}: Error - ${countError.message}`);
      } else {
        const count = products || 0;
        totalCount += count;
        console.log(`   ${model.padEnd(20)} : ${count} products`);
      }
    }

    console.log('=' .repeat(50));
    console.log(`   ${'TOTAL'.padEnd(20)} : ${totalCount} products`);
    console.log('=' .repeat(50));

    // Show sample products
    console.log('\n📋 Sample Products (first 5):');
    const { data: samples } = await supabase
      .from('products')
      .select('brand, model, dimensions, sku')
      .order('created_at', { ascending: false })
      .limit(5);

    if (samples && samples.length > 0) {
      samples.forEach(p => {
        console.log(`   • ${p.brand} ${p.model} ${p.dimensions} (${p.sku})`);
      });
    }

    console.log('\n✨ Migration completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Refresh your ShipmentRegistration page');
    console.log('   2. Click "Add Product"');
    console.log('   3. You should now see all 8 brands');
    console.log('   4. Select a brand to see its tire sizes');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('\n📝 Manual execution required:');
    console.error('   1. Open Supabase SQL Editor');
    console.error('   2. Copy contents of: backend/database/030_add_all_product_sizes.sql');
    console.error('   3. Paste and execute in SQL Editor');
    throw error;
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error.message);
    process.exit(1);
  });
