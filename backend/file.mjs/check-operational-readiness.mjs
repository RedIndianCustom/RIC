#!/usr/bin/env node
/**
 * ============================================================================
 * OPERATIONAL WORKFLOW READINESS CHECK
 * ============================================================================
 * This script verifies that all prerequisites are met for operational staff
 * workflow testing.
 * ============================================================================
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function checkReadiness() {
  console.log('='.repeat(80));
  console.log('OPERATIONAL WORKFLOW READINESS CHECK');
  console.log('='.repeat(80));
  console.log();

  let allGood = true;

  // 1. Check Supabase Connection
  console.log('1. Checking Supabase Connection...');
  try {
    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    if (error) throw error;
    console.log('   ✅ Connected to Supabase');
  } catch (err) {
    console.log('   ❌ Failed to connect to Supabase:', err.message);
    allGood = false;
  }
  console.log();

  // 2. Check Operational Staff Users
  console.log('2. Checking Operational Staff Users...');
  try {
    const { data: authUsers, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;
    
    const opStaff = authUsers.users.filter(u => 
      u.user_metadata?.position === 'operational_staff'
    );
    
    if (opStaff.length === 0) {
      console.log('   ❌ No operational staff users found');
      allGood = false;
    } else {
      console.log(`   ✅ Found ${opStaff.length} operational staff user(s):`);
      opStaff.forEach(u => {
        console.log(`      - ${u.email} (${u.user_metadata?.fullName || 'No name'})`);
        console.log(`        Confirmed: ${u.confirmed_at ? 'YES' : 'NO'}`);
        console.log(`        Password set: ${u.encrypted_password ? 'YES' : 'UNKNOWN'}`);
      });
    }
  } catch (err) {
    console.log('   ❌ Failed to check users:', err.message);
    allGood = false;
  }
  console.log();

  // 3. Check Roles
  console.log('3. Checking Roles...');
  try {
    const { data: roles, error } = await supabase
      .from('roles')
      .select('id, name')
      .order('name');
    
    if (error) throw error;
    
    const opRole = roles.find(r => r.name === 'operational_staff');
    if (!opRole) {
      console.log('   ❌ operational_staff role not found');
      allGood = false;
    } else {
      console.log(`   ✅ Found ${roles.length} role(s):`);
      roles.forEach(r => console.log(`      - ${r.name}`));
    }
  } catch (err) {
    console.log('   ❌ Failed to check roles:', err.message);
    allGood = false;
  }
  console.log();

  // 4. Check User Role Assignments
  console.log('4. Checking User Role Assignments...');
  try {
    const { data: userRoles, error } = await supabase
      .from('user_roles')
      .select('user_id, roles(name)')
      .order('user_id');
    
    if (error) throw error;
    
    if (userRoles.length === 0) {
      console.log('   ⚠️  No user-role assignments found');
      console.log('       Users may still work via metadata fallback');
    } else {
      console.log(`   ✅ Found ${userRoles.length} user-role assignment(s)`);
    }
  } catch (err) {
    console.log('   ❌ Failed to check user roles:', err.message);
    allGood = false;
  }
  console.log();

  // 5. Check Required Tables
  console.log('5. Checking Required Tables...');
  const requiredTables = [
    'users',
    'suppliers',
    'shipments',
    'products',
    'batches',
    'inventory_units',
    'barcodes'
  ];
  
  for (const table of requiredTables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('count', { count: 'exact', head: true });
      
      if (error) throw error;
      console.log(`   ✅ Table exists: ${table}`);
    } catch (err) {
      console.log(`   ❌ Table missing or inaccessible: ${table}`);
      console.log(`      Error: ${err.message}`);
      allGood = false;
    }
  }
  console.log();

  // 6. Check Sample Data
  console.log('6. Checking Sample Data...');
  try {
    const { data: suppliers, error: suppliersError } = await supabase
      .from('suppliers')
      .select('count', { count: 'exact', head: true });
    
    if (suppliersError) throw suppliersError;
    
    if (suppliers === 0) {
      console.log('   ⚠️  No suppliers found (needed for shipment creation)');
      console.log('       Create suppliers via Admin dashboard');
    } else {
      console.log(`   ✅ Found suppliers in database`);
    }

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('count', { count: 'exact', head: true });
    
    if (productsError) throw productsError;
    
    if (products === 0) {
      console.log('   ⚠️  No products found (needed for batch creation)');
      console.log('       Create products via Product Registration page');
    } else {
      console.log(`   ✅ Found products in database`);
    }
  } catch (err) {
    console.log('   ❌ Failed to check sample data:', err.message);
  }
  console.log();

  // 7. Check Backend Environment
  console.log('7. Checking Backend Environment...');
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'PORT'
  ];
  
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`   ✅ ${envVar} is set`);
    } else {
      console.log(`   ❌ ${envVar} is missing`);
      allGood = false;
    }
  }
  console.log();

  // Summary
  console.log('='.repeat(80));
  if (allGood) {
    console.log('✅ ALL CHECKS PASSED - Ready for operational workflow testing!');
    console.log();
    console.log('Next Steps:');
    console.log('1. Set test passwords: Run backend/database/SET_TEST_PASSWORDS.sql');
    console.log('2. Start frontend: npm run dev (in frontend folder)');
    console.log('3. Login at: http://localhost:5174');
    console.log('   Email: sarah.williams@redindiancustoms.com');
    console.log('   Password: Password123!');
    console.log('4. Follow: OPERATIONAL_WORKFLOW_TEST_GUIDE.md');
  } else {
    console.log('❌ SOME CHECKS FAILED - Please fix issues above before testing');
    console.log();
    console.log('Common fixes:');
    console.log('- Missing users: Run employee registration scripts');
    console.log('- Missing tables: Run database migration scripts in order');
    console.log('- Missing roles: Run backend/database/009_admin_full_features.sql');
    console.log('- Missing env vars: Check backend/.env file');
  }
  console.log('='.repeat(80));
}

checkReadiness().catch(console.error);
