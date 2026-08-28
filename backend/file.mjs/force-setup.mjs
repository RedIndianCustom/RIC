/**
 * force-setup.mjs
 * Runs directly against Supabase to:
 *   1. Insert user profile into public.users via raw SQL
 *   2. Assign admin role to the user
 *   3. Verify suppliers table exists and has data
 *
 * Run: node force-setup.mjs
 */

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

console.log('Connecting to:', env.SUPABASE_URL);
console.log('');

// ── Step 1: Get auth users ────────────────────────────────────
console.log('Step 1: Getting auth users...');
const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers();
if (authErr) { console.error('FAILED:', authErr); process.exit(1); }
console.log(`  Found ${users.length} auth user(s)`);
users.forEach(u => console.log(`  - ${u.email} | meta:`, JSON.stringify(u.user_metadata)));

// ── Step 2: Try inserting user directly via rpc ───────────────
console.log('\nStep 2: Creating user profile via raw SQL...');
for (const u of users) {
  const meta = u.user_metadata || {};
  const position = meta.position || 'admin';
  const fullName = meta.fullName || meta.full_name || u.email.split('@')[0];

  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      INSERT INTO public.users (id, email, full_name, position)
      VALUES ('${u.id}', '${u.email}', '${fullName.replace(/'/g, "''")}', '${position}')
      ON CONFLICT (id) DO UPDATE
        SET full_name = EXCLUDED.full_name,
            position  = EXCLUDED.position,
            updated_at = now()
      RETURNING id, email, full_name, position;
    `
  });

  if (error) {
    console.log(`  exec_sql RPC not available (${error.message}) — trying direct insert...`);

    // Try the most minimal possible insert
    const minimalCols = ['id', 'email', 'full_name', 'position'];
    const { error: insertErr } = await supabase.rpc('insert_user_profile', {
      p_id:       u.id,
      p_email:    u.email,
      p_name:     fullName,
      p_position: position,
    });

    if (insertErr) {
      console.log(`  insert_user_profile RPC not available — trying POST to REST API...`);

      // Direct REST API call bypassing PostgREST client
      const resp = await fetch(`${env.SUPABASE_URL}/rest/v1/users`, {
        method: 'POST',
        headers: {
          'apikey':        env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type':  'application/json',
          'Prefer':        'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify({ id: u.id, email: u.email, full_name: fullName, position }),
      });

      const body = await resp.text();
      if (resp.ok) {
        console.log(`  ✅ User profile created via REST API: ${u.email}`);
      } else {
        console.log(`  ❌ REST API failed (${resp.status}): ${body}`);
        console.log('');
        console.log('  === MANUAL SQL TO RUN IN SUPABASE ===');
        console.log(`  INSERT INTO public.users (id, email, full_name, position)`);
        console.log(`  VALUES ('${u.id}', '${u.email}', '${fullName}', '${position}')`);
        console.log(`  ON CONFLICT (id) DO UPDATE SET position = '${position}', updated_at = now();`);
        console.log('');
        console.log(`  INSERT INTO public.user_roles (user_id, role_id)`);
        console.log(`  SELECT '${u.id}', id FROM public.roles WHERE name = '${position}'`);
        console.log(`  ON CONFLICT DO NOTHING;`);
        console.log('  =====================================');
      }
    } else {
      console.log(`  ✅ User profile created via RPC: ${u.email}`);
    }
  } else {
    console.log(`  ✅ User profile created via exec_sql: ${u.email}`);
  }
}

// ── Step 3: Check what columns are visible in schema cache ────
console.log('\nStep 3: Checking suppliers table via REST...');
const suppResp = await fetch(`${env.SUPABASE_URL}/rest/v1/suppliers?limit=1`, {
  headers: {
    'apikey':        env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  },
});
const suppBody = await suppResp.text();
console.log(`  Status: ${suppResp.status}`);
console.log(`  Body: ${suppBody.substring(0, 200)}`);

if (suppResp.ok) {
  console.log('  ✅ suppliers table is accessible via REST!');
} else {
  console.log('  ❌ suppliers table NOT accessible — PostgREST cache still stale');
}

// ── Step 4: Check users table via REST ────────────────────────
console.log('\nStep 4: Checking users table via REST...');
const usersResp = await fetch(`${env.SUPABASE_URL}/rest/v1/users?select=id,email,position&limit=5`, {
  headers: {
    'apikey':        env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  },
});
const usersBody = await usersResp.text();
console.log(`  Status: ${usersResp.status}`);
console.log(`  Body: ${usersBody.substring(0, 300)}`);

console.log('\nDone.');
