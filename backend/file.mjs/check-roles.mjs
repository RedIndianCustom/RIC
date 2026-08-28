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

const { data: users }     = await supabase.from('users').select('id, email, full_name, position, employee_code');
const { data: userRoles } = await supabase.from('user_roles').select('user_id, roles(name)');
const { data: roles }     = await supabase.from('roles').select('id, name');

console.log('\n=== AVAILABLE ROLES ===');
(roles || []).forEach(r => console.log(' -', r.name, '|', r.id));

console.log('\n=== USERS & THEIR ROLES ===');
for (const u of users || []) {
  const assigned = (userRoles || []).filter(r => r.user_id === u.id).map(r => r.roles?.name).filter(Boolean);
  const flag = assigned.length ? '✅' : '❌ NO ROLE';
  console.log(`${flag} | ${u.email} | position: ${u.position ?? 'NULL'} | emp_code: ${u.employee_code ?? 'NULL'} | roles: [${assigned.join(', ')}]`);
}
