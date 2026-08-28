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

// List all auth users
const { data: { users }, error } = await supabase.auth.admin.listUsers();

if (error) { console.error('Error:', error); process.exit(1); }

console.log('\n=== AUTH USERS ===');
for (const u of users) {
  const meta = u.user_metadata || {};
  console.log(`ID: ${u.id}`);
  console.log(`  email:        ${u.email}`);
  console.log(`  confirmed:    ${u.email_confirmed_at ? 'YES' : 'NO'}`);
  console.log(`  metadata:     ${JSON.stringify(meta)}`);
  console.log('');
}
console.log(`Total: ${users.length} auth user(s)`);
