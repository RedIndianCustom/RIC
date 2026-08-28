#!/usr/bin/env node
/**
 * Set test passwords for operational staff users
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function setPasswords() {
  console.log('Setting test passwords for operational staff...\n');

  const testPassword = 'Password123!';
  const users = [
    { email: 'sarah.williams@redindiancustoms.com', name: 'Sarah Williams' },
    { email: 'emily.davis@redindiancustoms.com', name: 'Emily Davis' }
  ];

  for (const user of users) {
    try {
      // Get user by email
      const { data: authData } = await supabase.auth.admin.listUsers();
      const authUser = authData.users.find(u => u.email === user.email);
      
      if (!authUser) {
        console.log(`❌ User not found: ${user.email}`);
        continue;
      }

      // Update user password
      const { error } = await supabase.auth.admin.updateUserById(
        authUser.id,
        { password: testPassword }
      );

      if (error) {
        console.log(`❌ Failed to set password for ${user.email}:`, error.message);
      } else {
        console.log(`✅ Password set for ${user.name} (${user.email})`);
      }
    } catch (err) {
      console.log(`❌ Error setting password for ${user.email}:`, err.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test Credentials:');
  console.log('Email: sarah.williams@redindiancustoms.com');
  console.log('Password: Password123!');
  console.log('='.repeat(60));
}

setPasswords().catch(console.error);
