#!/usr/bin/env node

/**
 * ============================================================================
 * FIX POSITION CODES
 * ============================================================================
 * This script populates missing position_code values for existing inventory
 * units that have hierarchical location data (rack, shelf, section, subsection).
 * 
 * This fixes the issue where the warehouse location doesn't display when
 * scanning QR codes.
 * ============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Terminal colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function fixPositionCodes() {
  log('\n════════════════════════════════════════════════════════════════════════════', 'cyan');
  log('  🔧 Fixing Missing Position Codes', 'bright');
  log('════════════════════════════════════════════════════════════════════════════\n', 'cyan');

  try {
    // Step 1: Check current state
    log('📊 Step 1: Analyzing current state...', 'blue');
    
    const { data: allUnits, error: countError } = await supabase
      .from('inventory_units')
      .select('id, position_code, rack, shelf_number, section_number, subsection_number');
    
    if (countError) {
      throw countError;
    }
    
    const totalUnits = allUnits.length;
    const unitsWithPositionCode = allUnits.filter(u => u.position_code).length;
    const unitsWithCompleteLocation = allUnits.filter(u => 
      u.rack && u.shelf_number && u.section_number && u.subsection_number
    ).length;
    const unitsNeedingFix = allUnits.filter(u => 
      !u.position_code && u.rack && u.shelf_number && u.section_number && u.subsection_number
    );
    
    log(`   Total inventory units: ${totalUnits}`, 'cyan');
    log(`   Units with position_code: ${unitsWithPositionCode}`, 'green');
    log(`   Units with complete location data: ${unitsWithCompleteLocation}`, 'yellow');
    log(`   Units needing position_code: ${unitsNeedingFix.length}`, unitsNeedingFix.length > 0 ? 'red' : 'green');
    
    if (unitsNeedingFix.length === 0) {
      log('\n✅ All inventory units already have position codes!', 'green');
      log('   No fixes needed.', 'green');
      return;
    }
    
    // Step 2: Fix the units
    log(`\n⚙️  Step 2: Updating ${unitsNeedingFix.length} inventory units...`, 'blue');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const unit of unitsNeedingFix) {
      // Build position code: RACK-S##-SH##-SUB##
      const shelfPadded = unit.shelf_number.toString().padStart(2, '0');
      const sectionPadded = unit.section_number.toString().padStart(2, '0');
      const subsectionPadded = unit.subsection_number.toString().padStart(2, '0');
      const positionCode = `${unit.rack}-S${shelfPadded}-SH${sectionPadded}-SUB${subsectionPadded}`;
      
      const { error: updateError } = await supabase
        .from('inventory_units')
        .update({ position_code: positionCode })
        .eq('id', unit.id);
      
      if (updateError) {
        log(`   ❌ Failed to update unit ${unit.id}: ${updateError.message}`, 'red');
        errorCount++;
      } else {
        successCount++;
        if (successCount <= 5) {
          log(`   ✅ ${unit.id}: ${positionCode}`, 'green');
        }
      }
    }
    
    if (successCount > 5) {
      log(`   ... and ${successCount - 5} more`, 'cyan');
    }
    
    // Step 3: Verify
    log('\n📊 Step 3: Verifying results...', 'blue');
    
    const { data: verifyUnits, error: verifyError } = await supabase
      .from('inventory_units')
      .select('position_code');
    
    if (verifyError) {
      throw verifyError;
    }
    
    const finalWithPositionCode = verifyUnits.filter(u => u.position_code).length;
    const finalWithoutPositionCode = verifyUnits.filter(u => !u.position_code).length;
    
    log(`   Units with position_code: ${finalWithPositionCode}`, 'green');
    log(`   Units without position_code: ${finalWithoutPositionCode}`, finalWithoutPositionCode > 0 ? 'yellow' : 'green');
    
    // Summary
    log('\n════════════════════════════════════════════════════════════════════════════', 'cyan');
    log('  📋 Summary', 'bright');
    log('════════════════════════════════════════════════════════════════════════════', 'cyan');
    log(`   ✅ Successfully updated: ${successCount}`, 'green');
    if (errorCount > 0) {
      log(`   ❌ Errors: ${errorCount}`, 'red');
    }
    log(`   📊 Final count with position codes: ${finalWithPositionCode}/${verifyUnits.length}`, 'cyan');
    
    if (finalWithoutPositionCode > 0) {
      log(`\n   ℹ️  Note: ${finalWithoutPositionCode} units still don't have position codes.`, 'yellow');
      log(`      These units likely don't have complete location data assigned yet.`, 'yellow');
    }
    
    log('\n✅ Position code fix completed successfully!', 'green');
    log('   You can now scan QR codes and see the warehouse location display properly.', 'green');
    
  } catch (error) {
    log('\n❌ Error during fix:', 'red');
    log(`   ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run the fix
fixPositionCodes().catch(err => {
  log('\n❌ Unexpected error:', 'red');
  console.error(err);
  process.exit(1);
});
