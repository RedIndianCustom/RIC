import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const raw = readFileSync('.env', 'utf-8');
const env = Object.fromEntries(
  raw.split('\n')
     .filter(l => l.includes('=') && !l.startsWith('#'))
     .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log('Fixing missing user profiles and roles...\n');

// Step 1: Get all auth users
const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers();
if (authErr) { console.error('Cannot list users:', authErr); process.exit(1); }

// Step 2: Get existing public.users rows
const { data: existingUsers } = await supabase.from('users').select('id');
const existingIds = new Set((existingUsers || []).map(u => u.id));

// Step 3: Get all roles
const { data: roles } = await supabase.from('roles').select('id, name');
const roleMap = Object.fromEntries((roles || []).map(r => [r.name, r.id]));

for (const authUser of users) {
  const meta     = authUser.user_metadata || {};
  const position = meta.position || meta.employeeCode?.startsWith('EMP-1') ? 'admin' : null;
  const fullName = meta.fullName || meta.full_name || authUser.email;
  const empCode  = meta.employeeCode || null;

  console.log(`Processing: ${authUser.email} (position: ${position})`);

  // Step 4: Create/upsert public.users row
  if (!existingIds.has(authUser.id)) {
    const { error: upsertErr } = await supabase
      .from('users')
      .upsert({
        id:        authUser.id,
        email:     authUser.email,
        full_name: fullName,
        position:  position,
      }, { onConflict: 'id' });

    if (upsertErr) {
      console.error('  ❌ Failed to create user profile:', upsertErr.message);
      continue;
    }
    console.log('  ✅ Created public.users profile');
  } else {
    // Update position if missing
    await supabase.from('users')
      .update({ position, employee_code: empCode, updated_at: new Date().toISOString() })
      .eq('id', authUser.id)
      .is('position', null);
    console.log('  ℹ️  User profile already exists — updated position if missing');
  }

  // Step 5: Assign role
  if (position && roleMap[position]) {
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('user_id', authUser.id)
      .eq('role_id', roleMap[position])
      .maybeSingle();

    if (!existingRole) {
      const { error: roleErr } = await supabase
        .from('user_roles')
        .insert({ user_id: authUser.id, role_id: roleMap[position] });

      if (roleErr) {
        console.error(`  ❌ Failed to assign role "${position}":`, roleErr.message);
      } else {
        console.log(`  ✅ Assigned role: ${position}`);
      }
    } else {
      console.log(`  ℹ️  Role "${position}" already assigned`);
    }
  } else {
    console.log(`  ⚠️  No role assigned (position: ${position})`);
  }
}

// Step 6: Verify
const { data: finalUsers }     = await supabase.from('users').select('id, email, full_name, position, employee_code');
const { data: finalUserRoles } = await supabase.from('user_roles').select('user_id, roles(name)');

console.log('\n=== FINAL STATE ===');
for (const u of finalUsers || []) {
  const assigned = (finalUserRoles || [])
    .filter(r => r.user_id === u.id)
    .map(r => r.roles?.name)
    .filter(Boolean);
  const flag = assigned.length ? '✅' : '❌ NO ROLE';
  console.log(`${flag} | ${u.email} | position: ${u.position} | roles: [${assigned.join(', ')}]`);
}

console.log('\nDone! Log out and log back in to refresh your session.');
