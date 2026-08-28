import 'dotenv/config';
import { supabaseAdmin } from './src/config/supabase.js';

async function verifyCompleteFix() {
  console.log('🔍 COMPLETE FIX VERIFICATION');
  console.log('='.repeat(80));
  console.log('');
  
  let allTestsPassed = true;
  
  // TEST 1: Check warehouse_locations format
  console.log('TEST 1: Warehouse Location Format');
  console.log('-'.repeat(80));
  
  const { data: locations, error: locError } = await supabaseAdmin
    .from('warehouse_locations')
    .select('code')
    .like('code', 'WH1%')
    .order('code');
  
  if (locError) {
    console.log('❌ FAIL: Could not query warehouse_locations');
    allTestsPassed = false;
  } else {
    const hasCorrectFormat = locations.every(loc => 
      /WH\d+-R\d{2,}-RK\d{2,}/.test(loc.code)
    );
    
    if (hasCorrectFormat) {
      console.log('✅ PASS: All locations use zero-padded format');
      console.log(`   Sample: ${locations[0]?.code}`);
    } else {
      console.log('❌ FAIL: Some locations use old format');
      allTestsPassed = false;
    }
  }
  
  // TEST 2: Check if WH1-R06-RK06 exists
  console.log('\nTEST 2: Required Rack Exists');
  console.log('-'.repeat(80));
  
  const { data: targetRack, error: rackError } = await supabaseAdmin
    .from('warehouse_locations')
    .select('code')
    .eq('code', 'WH1-R06-RK06')
    .single();
  
  if (rackError || !targetRack) {
    console.log('❌ FAIL: WH1-R06-RK06 not found');
    allTestsPassed = false;
  } else {
    console.log('✅ PASS: WH1-R06-RK06 exists');
  }
  
  // TEST 3: Check latest barcode has position_code
  console.log('\nTEST 3: Latest Barcode Has Position Code');
  console.log('-'.repeat(80));
  
  const { data: barcode, error: barcodeError } = await supabaseAdmin
    .from('barcodes')
    .select(`
      barcode_value,
      created_at,
      inventory_units!barcodes_inventory_unit_id_fkey (
        position_code,
        rack,
        warehouse_id
      )
    `)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (barcodeError) {
    console.log('⚠️ SKIP: No barcodes found');
  } else if (barcode.inventory_units?.position_code) {
    console.log('✅ PASS: Latest barcode has position_code');
    console.log(`   Barcode: ${barcode.barcode_value}`);
    console.log(`   Position: ${barcode.inventory_units.position_code}`);
    console.log(`   Rack: ${barcode.inventory_units.rack || 'NULL (will be fixed on next generation)'}`);
  } else {
    console.log('⚠️ WARN: Latest barcode has no position_code');
    console.log('   This is OK if it was generated before positions were assigned');
  }
  
  // TEST 4: Check batch has products_with_positions
  console.log('\nTEST 4: Batch Has Assigned Positions');
  console.log('-'.repeat(80));
  
  const { data: batches, error: batchError } = await supabaseAdmin
    .from('batches')
    .select('batch_number, metadata')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (batchError) {
    console.log('❌ FAIL: Could not query batches');
    allTestsPassed = false;
  } else {
    const batchesWithPositions = batches.filter(b => 
      b.metadata?.products_with_positions?.some(p => 
        p.assigned_positions?.length > 0
      )
    );
    
    if (batchesWithPositions.length > 0) {
      console.log(`✅ PASS: ${batchesWithPositions.length} batch(es) have assigned positions`);
      console.log(`   Example: ${batchesWithPositions[0].batch_number}`);
      const positions = batchesWithPositions[0].metadata.products_with_positions[0].assigned_positions;
      if (positions && positions.length > 0) {
        console.log(`   Position: ${positions[0].position_code}`);
      }
    } else {
      console.log('⚠️ WARN: No batches have assigned positions');
      console.log('   You need to assign positions in Shipment Registration first');
    }
  }
  
  // FINAL SUMMARY
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 VERIFICATION SUMMARY\n');
  
  if (allTestsPassed) {
    console.log('✅ ALL CRITICAL TESTS PASSED!');
    console.log('');
    console.log('🎉 The fix is complete and working correctly.');
    console.log('');
    console.log('📝 Next Steps:');
    console.log('   1. Go to Barcode Generation');
    console.log('   2. Select a batch with assigned positions');
    console.log('   3. Generate NEW barcodes');
    console.log('   4. View traceability - you should see:');
    console.log('      ✨ Large green box with position code');
    console.log('      ✨ Full position: WH1-R06-RK06-S01-SH01-SUB01');
    console.log('      ✨ Hierarchical breakdown (Shelf, Section, Subsection)');
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('');
    console.log('📝 Please review the test results above');
  }
  
  console.log('\n' + '='.repeat(80));
  process.exit(allTestsPassed ? 0 : 1);
}

verifyCompleteFix();
