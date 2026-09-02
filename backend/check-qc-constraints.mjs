/**
 * Check QC Inspection Items Constraints
 * Verifies that the unique constraint exists to prevent duplicate barcode inspections
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkConstraints() {
  console.log('🔍 Checking QC Inspection Items Constraints...\n');

  try {
    // Check if table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('qc_inspection_items')
      .select('id')
      .limit(1);

    if (tableError) {
      console.error('❌ Error: qc_inspection_items table not found or not accessible');
      console.error(tableError.message);
      return;
    }

    console.log('✅ Table qc_inspection_items exists\n');

    // Check for duplicate barcodes in the same inspection
    const { data: duplicates, error: dupError } = await supabase
      .rpc('check_qc_duplicates', {}, { count: 'exact' });

    // If RPC doesn't exist, do manual check
    const { data: inspectionItems, error: itemsError } = await supabase
      .from('qc_inspection_items')
      .select('qc_inspection_id, barcode, id, created_at')
      .order('created_at', { ascending: true });

    if (itemsError) {
      console.error('❌ Error querying inspection items:', itemsError.message);
      return;
    }

    // Group by inspection + barcode to find duplicates
    const grouped = {};
    inspectionItems.forEach(item => {
      const key = `${item.qc_inspection_id}::${item.barcode}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });

    const dupsFound = Object.entries(grouped).filter(([key, items]) => items.length > 1);

    if (dupsFound.length > 0) {
      console.log('⚠️  WARNING: Found duplicate barcode inspections in database:');
      console.log('');
      
      dupsFound.forEach(([key, items]) => {
        const [inspectionId, barcode] = key.split('::');
        console.log(`  Inspection: ${inspectionId}`);
        console.log(`  Barcode: ${barcode}`);
        console.log(`  Duplicate count: ${items.length}`);
        items.forEach((item, idx) => {
          console.log(`    ${idx + 1}. ID: ${item.id}, Created: ${item.created_at}`);
        });
        console.log('');
      });

      console.log('📋 Recommendation: Add unique constraint to prevent future duplicates\n');
    } else {
      console.log('✅ No duplicate barcodes found in inspections\n');
    }

    // Check if we can detect the unique constraint
    // Note: Direct pg_constraint queries require database access, not available via Supabase JS
    console.log('💡 To add unique constraint (run in Supabase SQL Editor):');
    console.log('');
    console.log('-- Prevent duplicate barcode scans in same inspection');
    console.log('ALTER TABLE qc_inspection_items');
    console.log('ADD CONSTRAINT qc_inspection_items_inspection_barcode_unique');
    console.log('UNIQUE (qc_inspection_id, barcode);');
    console.log('');

    // Test current data
    console.log('📊 Current Statistics:');
    const { count: totalItems } = await supabase
      .from('qc_inspection_items')
      .select('*', { count: 'exact', head: true });
    
    const uniqueInspections = new Set(inspectionItems.map(i => i.qc_inspection_id)).size;
    const uniqueBarcodes = new Set(inspectionItems.map(i => i.barcode)).size;

    console.log(`  Total inspection items: ${totalItems || 0}`);
    console.log(`  Unique inspections: ${uniqueInspections}`);
    console.log(`  Unique barcodes: ${uniqueBarcodes}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

checkConstraints()
  .then(() => {
    console.log('✅ Check complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
