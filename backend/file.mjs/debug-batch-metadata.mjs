#!/usr/bin/env node

/**
 * Check batch metadata to see if it has position information
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

async function checkBatchMetadata() {
  console.log('🔍 Checking batch metadata for position information...\n');

  try {
    // Get recent batches
    const { data: batches, error } = await supabase
      .from('batches')
      .select('id, created_at, metadata, product_id')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      throw new Error(`Failed to query batches: ${error.message}`);
    }

    console.log(`Found ${batches.length} recent batches:\n`);

    for (const batch of batches) {
      console.log(`📦 Batch ID: ${batch.id}`);
      console.log(`   Created: ${batch.created_at}`);
      console.log(`   Product ID: ${batch.product_id || 'NULL'}`);
      console.log(`   Metadata:`, JSON.stringify(batch.metadata, null, 2));
      console.log('---\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

checkBatchMetadata()
  .then(() => {
    console.log('✅ Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed:', error.message);
    process.exit(1);
  });
