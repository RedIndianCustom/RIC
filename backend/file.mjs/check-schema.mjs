import { readFileSync } from 'fs';

const raw = readFileSync('.env', 'utf-8');
const env = Object.fromEntries(
  raw.split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);

const BASE = env.SUPABASE_URL;
const KEY  = env.SUPABASE_SERVICE_ROLE_KEY;
const h    = { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function sql(query) {
  const r = await fetch(`${BASE}/rest/v1/rpc/exec_raw_sql`, {
    method: 'POST', headers: h,
    body: JSON.stringify({ query })
  });
  if (!r.ok) {
    // fallback: try direct pg
    const r2 = await fetch(`${BASE}/rest/v1/`, { headers: h });
    return r2.ok ? await r2.json() : null;
  }
  return r.json();
}

// Check via information_schema using Supabase's postgres REST
async function checkTable(table) {
  const r = await fetch(
    `${BASE}/rest/v1/information_schema.columns?table_name=eq.${table}&select=column_name,data_type`,
    { headers: h }
  );
  const body = await r.text();
  return { status: r.status, body: body.substring(0, 500) };
}

console.log('=== Checking actual DB schema via REST ===\n');

// Check users columns
console.log('users table columns:');
const u = await checkTable('users');
console.log(`  Status: ${u.status}`);
console.log(`  Columns: ${u.body}\n`);

// Check suppliers
console.log('suppliers table:');
const s = await checkTable('suppliers');
console.log(`  Status: ${s.status}`);
console.log(`  Columns: ${s.body}\n`);

// Direct check of what PostgREST exposes
console.log('PostgREST root (exposed tables):');
const root = await fetch(`${BASE}/rest/v1/`, { headers: h });
const rootBody = await root.text();
// find table definitions
const tables = rootBody.match(/"definitions":\{[^}]+/)?.[0] || rootBody.substring(0, 800);
console.log(`  ${tables}\n`);

// Try to query users with only safe columns
console.log('Query users (id, email only - no position):');
const safe = await fetch(`${BASE}/rest/v1/users?select=id,email&limit=5`, { headers: h });
const safeBody = await safe.text();
console.log(`  Status: ${safe.status}`);
console.log(`  Body: ${safeBody.substring(0, 300)}\n`);
