#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Checking Manager user roles...\n');

// Get all users with their roles via user_roles join
const { data: userRoles, error } = await supabase
  .from('user_roles')
  .select(`
    user_id,
    role_id,
    users (
      email,
      full_name,
      created_at
    ),
    roles (
      name
    )
  `)
  .eq('roles.name', 'manager');

if (error) {
  console.error('❌ Error fetching user roles:', error);
  process.exit(1);
}

console.log(`Found ${userRoles.length} Manager user(s):\n`);

userRoles.forEach(ur => {
  console.log(`📧 Email: ${ur.users?.email || 'N/A'}`);
  console.log(`👤 Name: ${ur.users?.full_name || 'N/A'}`);
  console.log(`🎭 Role: ${ur.roles?.name || 'N/A'}`);
  console.log(`🆔 User ID: ${ur.user_id}`);
  console.log(`📅 Created: ${ur.users?.created_at ? new Date(ur.users.created_at).toLocaleString() : 'N/A'}`);
  console.log('─'.repeat(60));
});

// Now check if ANY manager has multiple roles (that would explain the issue)
console.log('\n🔍 Checking for users with MULTIPLE roles...\n');

const { data: allUserRoles, error: error2 } = await supabase
  .from('user_roles')
  .select(`
    user_id,
    users(email, full_name),
    roles(name)
  `)
  .order('user_id');

if (error2) {
  console.error('❌ Error:', error2);
} else {
  const rolesByUser = {};
  allUserRoles.forEach(ur => {
    if (!rolesByUser[ur.user_id]) {
      rolesByUser[ur.user_id] = {
        email: ur.users?.email || 'N/A',
        full_name: ur.users?.full_name || 'N/A',
        roles: []
      };
    }
    rolesByUser[ur.user_id].roles.push(ur.roles?.name || 'unknown');
  });

  let foundMultiRole = false;
  Object.entries(rolesByUser).forEach(([userId, data]) => {
    if (data.roles.length > 1) {
      foundMultiRole = true;
      console.log(`⚠️  User has MULTIPLE ROLES:`);
      console.log(`   📧 ${data.email}`);
      console.log(`   👤 ${data.full_name}`);
      console.log(`   🎭 Roles: ${data.roles.join(', ')}`);
      
      // Check if they have both manager and warehouse_staff
      if (data.roles.includes('manager') && data.roles.includes('warehouse_staff')) {
        console.log(`   🚨 THIS IS THE ISSUE! Manager + Warehouse Staff = Can see both sidebars!`);
      }
      console.log('─'.repeat(60));
    }
  });

  if (!foundMultiRole) {
    console.log('✅ No users found with multiple roles');
  }
}

console.log('\n✅ Check complete!');
console.log('\n💡 POSSIBLE SOLUTIONS:');
console.log('   1. If user has multiple roles: Remove warehouse_staff role from Manager');
console.log('   2. Clear browser cache (Ctrl+Shift+Delete)');
console.log('   3. Hard refresh (Ctrl+F5)');
console.log('   4. Restart the frontend dev server');
console.log('   5. Log out and log back in\n');
