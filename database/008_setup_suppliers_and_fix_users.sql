-- ============================================================
-- COMPLETE SETUP: Suppliers Table + Fix Missing User Profiles
-- ============================================================
-- Run this entire script in Supabase SQL Editor
-- This does EVERYTHING in one shot:
--   1. Creates the suppliers table
--   2. Inserts 5 sample suppliers
--   3. Creates missing user profiles in public.users
--   4. Assigns correct roles
--   5. Reloads the PostgREST schema cache
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- PART 1: SUPPLIERS TABLE
-- ════════════════════════════════════════════════════════════

create table if not exists public.suppliers (
    id             uuid        primary key default gen_random_uuid(),
    name           text        not null,
    contact_person text,
    email          text,
    phone          text,
    address        text,
    city           text,
    state          text,
    zip_code       text,
    country        text,
    payment_terms  text,
    tax_id         text,
    status         text        not null default 'active'
                               check (status in ('active', 'inactive', 'suspended')),
    notes          text,
    total_orders   integer     not null default 0,
    total_value    numeric(15,2) not null default 0,
    created_by     uuid        references public.users(id) on delete set null,
    updated_by     uuid        references public.users(id) on delete set null,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now()
);

comment on table public.suppliers is 'Supplier records for the inventory management system';

-- Indexes
create index if not exists idx_suppliers_name   on public.suppliers (lower(name));
create index if not exists idx_suppliers_status on public.suppliers (status);
create index if not exists idx_suppliers_email
    on public.suppliers (lower(email)) where email is not null;

-- updated_at trigger
drop trigger if exists trg_suppliers_updated_at on public.suppliers;
create trigger trg_suppliers_updated_at
    before update on public.suppliers
    for each row execute function public.set_updated_at();

-- ── Row Level Security ────────────────────────────────────────
alter table public.suppliers enable row level security;

drop policy if exists "suppliers_select_authenticated"   on public.suppliers;
drop policy if exists "suppliers_insert_admin_manager_ops" on public.suppliers;
drop policy if exists "suppliers_update_admin_manager_ops" on public.suppliers;
drop policy if exists "suppliers_delete_admin"           on public.suppliers;

-- All authenticated users can view
create policy "suppliers_select_authenticated"
    on public.suppliers for select to authenticated using (true);

-- Admin, Manager, Operational Staff can create/update
create policy "suppliers_insert_admin_manager_ops"
    on public.suppliers for insert to authenticated
    with check (public.has_role(array['admin', 'manager', 'operational_staff']));

create policy "suppliers_update_admin_manager_ops"
    on public.suppliers for update to authenticated
    using (public.has_role(array['admin', 'manager', 'operational_staff']));

-- Admin only can delete
create policy "suppliers_delete_admin"
    on public.suppliers for delete to authenticated
    using (public.has_role(array['admin']));

-- ── Sample data ───────────────────────────────────────────────
insert into public.suppliers (
    name, contact_person, email, phone,
    address, city, state, zip_code, country,
    payment_terms, tax_id, status, notes,
    total_orders, total_value
)
values
(
    'Pacific Tire Distributors', 'James Reyes',
    'james.reyes@pacifictire.com', '+63-2-8888-0001',
    '123 EDSA, Mandaluyong', 'Mandaluyong', 'Metro Manila', '1550', 'Philippines',
    'Net 30', 'PH-VAT-001', 'active',
    'Primary supplier for Bridgestone and Michelin brands.', 245, 3850000
),
(
    'Asian Auto Parts Corp', 'Maria Cruz',
    'maria.cruz@asianautops.com', '+63-32-234-0002',
    '456 M.J. Cuenco Ave', 'Cebu City', 'Cebu', '6000', 'Philippines',
    'Net 45', 'PH-VAT-002', 'active',
    'Handles Continental and Goodyear imports.', 178, 2340000
),
(
    'Global Rubber Holdings', 'Carlos Santos',
    'c.santos@globalrubber.ph', '+63-2-8777-0003',
    '789 Commonwealth Ave', 'Quezon City', 'Metro Manila', '1121', 'Philippines',
    'Net 60', 'PH-VAT-003', 'active',
    'Bulk supplier for off-road and truck tires.', 89, 1250000
),
(
    'Metro Wheel & Tire Supply', 'Ana Villanueva',
    'ana@metrowheels.ph', '+63-46-432-0004',
    '12 Emilio Aguinaldo Hwy', 'Imus', 'Cavite', '4103', 'Philippines',
    'Net 30', 'PH-VAT-004', 'active',
    'Local supplier for OEM and aftermarket rims.', 56, 780000
),
(
    'Southstar Logistics & Supply', 'Roberto Tan',
    'r.tan@southstar.com.ph', '+63-82-297-0005',
    '34 Quimpo Blvd', 'Davao City', 'Davao del Sur', '8000', 'Philippines',
    'Net 30', 'PH-VAT-005', 'inactive',
    'Mindanao distributor — on hold due to delivery delays.', 12, 145000
)
on conflict do nothing;

-- ════════════════════════════════════════════════════════════
-- PART 2: FIX MISSING USER PROFILES + ROLES
-- ════════════════════════════════════════════════════════════

-- Create public.users row for every auth user that doesn't have one
insert into public.users (id, email, full_name, position)
select
    au.id,
    au.email,
    coalesce(
        au.raw_user_meta_data->>'fullName',
        au.raw_user_meta_data->>'full_name',
        split_part(au.email, '@', 1)
    ) as full_name,
    coalesce(
        au.raw_user_meta_data->>'position',
        'operational_staff'
    ) as position
from auth.users au
where not exists (
    select 1 from public.users pu where pu.id = au.id
)
on conflict (id) do update
set
    full_name  = excluded.full_name,
    position   = excluded.position,
    updated_at = now();

-- Fix any rows with NULL/empty position
update public.users pu
set
    position   = coalesce(au.raw_user_meta_data->>'position', 'operational_staff'),
    updated_at = now()
from auth.users au
where au.id = pu.id
  and (pu.position is null or pu.position = '');

-- Assign role to every user who has a position but no role
insert into public.user_roles (user_id, role_id)
select distinct u.id, r.id
from public.users u
join public.roles r on r.name = u.position
where not exists (
    select 1 from public.user_roles ur where ur.user_id = u.id
)
on conflict do nothing;

-- ════════════════════════════════════════════════════════════
-- PART 3: RELOAD SCHEMA CACHE
-- ════════════════════════════════════════════════════════════

notify pgrst, 'reload schema';

-- ════════════════════════════════════════════════════════════
-- VERIFICATION
-- ════════════════════════════════════════════════════════════

-- Show all suppliers
select
    name,
    contact_person,
    city,
    status,
    total_orders,
    total_value
from public.suppliers
order by name;

-- Show all users with their roles
select
    u.email,
    u.full_name,
    u.position,
    coalesce(r.name, '❌ NO ROLE') as assigned_role
from public.users u
left join public.user_roles ur on ur.user_id = u.id
left join public.roles r on r.id = ur.role_id
order by u.created_at desc;

-- ============================================================
-- EXPECTED RESULTS:
-- 1. 5 suppliers listed
-- 2. Your user: daisyreydaguplo18@gmail.com | admin | admin
--
-- AFTER RUNNING:
-- 1. Refresh your browser
-- 2. The Suppliers page will show real data from Supabase
-- 3. No more 403/503 errors
-- ============================================================
