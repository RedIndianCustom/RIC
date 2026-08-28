#!/usr/bin/env node

/**
 * Verify that position_code is now populated
 */

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

async function verifyFix() {
  console.log('🔍 Verifying position_code population...\n');

  try {
    // Check recent barcodes with position_code
    const { data: withPosition, error: err1 } = await supabase
      .from('inventory_units')
      .select('id, inventory_unit_code, position_code')
      .not('position_code', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5);

    if (err1) throw new Error(`Query failed: ${err1.message}`);

    console.log(`✅ Sample barcodes WITH position_code (showing ${withPosition.length}):`);
    withPosition.forEach(unit => {
      console.log(`   • ${unit.inventory_unit_code}: ${unit.position_code}`);
    });

    // Check how many total have position_code now
    const { count: withCount, error: err2 } = await supabase
      .from('inventory_units')
      .select('id', { count: 'exact', head: true })
      .not('position_code', 'is', null);

    if (err2) throw new Error(`Count failed: ${err2.message}`);

    const { count: nullCount, error: err3 } = await supabase
      .from('inventory_units')
      .select('id', { count: 'exact', head: true })
      .is('position_code', null);

    if (err3) throw new Error(`Count failed: ${err3.message}`);

    console.log(`\n📊 Statistics:`);
    console.log(`   ✅ WITH position_code: ${withCount}`);
    console.log(`   ❌ WITHOUT position_code: ${nullCount}`);
    console.log(`   📦 Total: ${withCount + nullCount}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

verifyFix()
  .then(() => {
    console.log('\n✅ Verification complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Verification failed:', error.message);
    process.exit(1);
  });
