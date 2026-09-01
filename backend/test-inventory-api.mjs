/**
 * Test Inventory API Endpoints
 * Checks if the low stock alerts RPC function exists and works
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Testing Inventory API endpoints...\n');

// Test 1: Check if RPC function exists
async function testRpcFunctionExists() {
  console.log('1️⃣ Checking if check_low_stock_alerts() RPC function exists...');
  try {
    const { data, error } = await supabase.rpc('check_low_stock_alerts');
    
    if (error) {
      console.error('❌ RPC function error:', error.message);
      console.error('   Code:', error.code);
      console.error('   Details:', error.details);
      console.error('   Hint:', error.hint);
      return false;
    }
    
    console.log('✅ RPC function exists and returned', data?.length || 0, 'alerts');
    if (data && data.length > 0) {
      console.log('   Sample alert:', JSON.stringify(data[0], null, 2));
    }
    return true;
  } catch (err) {
    console.error('❌ Exception calling RPC:', err.message);
    return false;
  }
}

// Test 2: Check inventory_units table
async function testInventoryUnitsTable() {
  console.log('\n2️⃣ Checking inventory_units table...');
  try {
    const { data, error, count } = await supabase
      .from('inventory_units')
      .select('status, warehouse_id', { count: 'exact', head: false })
      .limit(1);
    
    if (error) {
      console.error('❌ inventory_units table error:', error.message);
      return false;
    }
    
    console.log('✅ inventory_units table accessible');
    console.log('   Sample record:', data?.[0] || 'No records');
    return true;
  } catch (err) {
    console.error('❌ Exception querying inventory_units:', err.message);
    return false;
  }
}

// Test 3: Check stock_movements table
async function testStockMovementsTable() {
  console.log('\n3️⃣ Checking stock_movements table...');
  try {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('movement_type, executed_at')
      .limit(1);
    
    if (error) {
      console.error('❌ stock_movements table error:', error.message);
      return false;
    }
    
    console.log('✅ stock_movements table accessible');
    console.log('   Sample record:', data?.[0] || 'No records');
    return true;
  } catch (err) {
    console.error('❌ Exception querying stock_movements:', err.message);
    return false;
  }
}

// Test 4: Check low_stock_thresholds table
async function testLowStockThresholdsTable() {
  console.log('\n4️⃣ Checking low_stock_thresholds table...');
  try {
    const { data, error } = await supabase
      .from('low_stock_thresholds')
      .select('product_id, min_quantity')
      .limit(1);
    
    if (error) {
      console.error('❌ low_stock_thresholds table error:', error.message);
      return false;
    }
    
    console.log('✅ low_stock_thresholds table accessible');
    console.log('   Sample record:', data?.[0] || 'No records');
    return true;
  } catch (err) {
    console.error('❌ Exception querying low_stock_thresholds:', err.message);
    return false;
  }
}

// Test 5: Manual stats calculation
async function testManualStatsCalculation() {
  console.log('\n5️⃣ Testing manual stats calculation (fallback method)...');
  try {
    const { data: inventory, error } = await supabase
      .from('inventory_units')
      .select('status, warehouse_id');
    
    if (error) throw error;
    
    const stats = {
      totalUnits: inventory?.length || 0,
      available: inventory?.filter(i => ['NEW', 'AVAILABLE'].includes(i.status)).length || 0,
      sold: inventory?.filter(i => i.status === 'SOLD').length || 0,
      returned: inventory?.filter(i => i.status === 'RETURNED').length || 0,
      damaged: inventory?.filter(i => i.status === 'DAMAGED').length || 0,
    };
    
    console.log('✅ Manual calculation successful:');
    console.log('   ', stats);
    return true;
  } catch (err) {
    console.error('❌ Manual calculation failed:', err.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  const results = {
    rpcFunction: await testRpcFunctionExists(),
    inventoryUnits: await testInventoryUnitsTable(),
    stockMovements: await testStockMovementsTable(),
    lowStockThresholds: await testLowStockThresholdsTable(),
    manualCalculation: await testManualStatsCalculation()
  };
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log('RPC Function (check_low_stock_alerts):', results.rpcFunction ? '✅ PASS' : '❌ FAIL');
  console.log('inventory_units table:                ', results.inventoryUnits ? '✅ PASS' : '❌ FAIL');
  console.log('stock_movements table:                ', results.stockMovements ? '✅ PASS' : '❌ FAIL');
  console.log('low_stock_thresholds table:           ', results.lowStockThresholds ? '✅ PASS' : '❌ FAIL');
  console.log('Manual stats calculation:             ', results.manualCalculation ? '✅ PASS' : '❌ FAIL');
  console.log('='.repeat(60));
  
  // Recommendations
  console.log('\n📋 RECOMMENDATIONS:');
  if (!results.rpcFunction) {
    console.log('⚠️  Execute: backend/database/036_inventory_advanced_features.sql');
  }
  if (!results.stockMovements) {
    console.log('⚠️  Execute: backend/database/037_warehouse_operations.sql');
  }
  if (!results.lowStockThresholds) {
    console.log('⚠️  Execute: backend/database/036_inventory_advanced_features.sql');
  }
  if (results.inventoryUnits && results.manualCalculation) {
    console.log('✅ Basic inventory stats will work (with fallback)');
  }
  
  console.log('\n✨ Test complete!\n');
}

runAllTests().catch(console.error);
