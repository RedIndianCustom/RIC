-- ============================================================
-- INVENTORY MANAGEMENT SYSTEM — FOUNDATION SCHEMA
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- Later modules (inventory, receiving, orders, sales, returns...)
-- get their own migration files that build on this one.
-- ============================================================

-- ---------- ROLES ----------
create table if not exists roles (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,               -- e.g. 'admin', 'manager', 'operational_staff', 'warehouse_staff', 'sales_staff'
  description text,
  created_at  timestamptz not null default now()
);

insert into roles (name, description) values
  ('admin', 'Full system access'),
  ('manager', 'Reporting and approvals'),
  ('operational_staff', 'Shipment/product registration, order validation'),
  ('warehouse_staff', 'Receiving, inspection, picking, packing'),
  ('sales_staff', 'Walk-in sales, payments, returns/refunds at point of sale')
on conflict (name) do nothing;

-- ---------- USER PROFILES ----------
-- Mirrors auth.users (managed by Supabase Auth) with app-specific fields.
create table if not exists users (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text unique not null,
  full_name  text not null,
  position   text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- USER <-> ROLE ----------
create table if not exists user_roles (
  user_id    uuid not null references users (id) on delete cascade,
  role_id    uuid not null references roles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

-- ---------- AUDIT LOG ----------
create table if not exists audit_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references users (id) on delete set null,
  action     text not null,          -- e.g. 'user.role_assigned', 'order.picked'
  entity     text,                   -- e.g. 'orders'
  entity_id  text,
  metadata   jsonb,
  created_at timestamptz not null default now()
);

-- ---------- updated_at trigger ----------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_users_updated_at on users;
create trigger trg_users_updated_at
  before update on users
  for each row execute function set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table users enable row level security;
alter table roles enable row level security;
alter table user_roles enable row level security;
alter table audit_logs enable row level security;

-- Helper: does the current auth.uid() have one of the given role names?
create or replace function has_role(role_names text[])
returns boolean as $$
  select exists (
    select 1
    from user_roles ur
    join roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.name = any(role_names)
  );
$$ language sql stable;

-- USERS: everyone can read their own profile; admins/managers can read all;
-- only admins (via the backend's service-role key) manage writes.
create policy "users_select_self" on users
  for select using (auth.uid() = id);

create policy "users_select_admin_manager" on users
  for select using (has_role(array['admin','manager']));

-- ROLES: readable by any authenticated user (needed for dropdowns/UI labels).
create policy "roles_select_authenticated" on roles
  for select using (auth.role() = 'authenticated');

-- USER_ROLES: users can see their own roles; admins/managers can see all.
create policy "user_roles_select_self" on user_roles
  for select using (auth.uid() = user_id);

create policy "user_roles_select_admin_manager" on user_roles
  for select using (has_role(array['admin','manager']));

-- AUDIT_LOGS: admins only.
create policy "audit_logs_select_admin" on audit_logs
  for select using (has_role(array['admin']));

-- Note: INSERT/UPDATE/DELETE on these tables is done exclusively through the
-- backend using the Supabase service-role key, which bypasses RLS by design.
-- This keeps role assignment and user activation as controlled server actions
-- rather than something any authenticated client could attempt directly.
