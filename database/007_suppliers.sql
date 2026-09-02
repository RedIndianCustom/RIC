-- ============================================================
-- SUPPLIERS TABLE
-- ============================================================
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── 1. Create suppliers table ────────────────────────────────
create table if not exists public.suppliers (
    id              uuid primary key default gen_random_uuid(),

    -- Core info
    name            text not null,
    contact_person  text,
    email           text,
    phone           text,
    
    -- Address
    address         text,
    city            text,
    state           text,
    zip_code        text,
    country         text,
    
    -- Business info
    payment_terms   text,
    tax_id          text,
    status          text not null default 'active'
                    check (status in ('active', 'inactive', 'suspended')),
    notes           text,

    -- Computed / aggregate fields (updated by triggers or app logic)
    total_orders    integer not null default 0,
    total_value     numeric(15,2) not null default 0,

    -- Audit
    created_by      uuid references public.users(id) on delete set null,
    updated_by      uuid references public.users(id) on delete set null,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

comment on table public.suppliers is
  'Supplier records for inventory management';

-- ── 2. Indexes ────────────────────────────────────────────────
create index if not exists idx_suppliers_name
    on public.suppliers (lower(name));

create index if not exists idx_suppliers_status
    on public.suppliers (status);

create index if not exists idx_suppliers_email
    on public.suppliers (lower(email))
    where email is not null;

-- ── 3. updated_at trigger ─────────────────────────────────────
drop trigger if exists trg_suppliers_updated_at on public.suppliers;

create trigger trg_suppliers_updated_at
    before update on public.suppliers
    for each row
    execute function public.set_updated_at();

-- ── 4. Row Level Security ─────────────────────────────────────
alter table public.suppliers enable row level security;

-- Drop existing policies
drop policy if exists "suppliers_select_authenticated" on public.suppliers;
drop policy if exists "suppliers_insert_admin_manager_ops"  on public.suppliers;
drop policy if exists "suppliers_update_admin_manager_ops"  on public.suppliers;
drop policy if exists "suppliers_delete_admin"              on public.suppliers;

-- All authenticated users can read suppliers (per permission matrix: everyone has View access)
create policy "suppliers_select_authenticated"
    on public.suppliers for select
    to authenticated
    using (true);

-- Admin, Manager, Operational Staff can create
create policy "suppliers_insert_admin_manager_ops"
    on public.suppliers for insert
    to authenticated
    with check (public.has_role(array['admin', 'manager', 'operational_staff']));

-- Admin, Manager, Operational Staff can update
create policy "suppliers_update_admin_manager_ops"
    on public.suppliers for update
    to authenticated
    using (public.has_role(array['admin', 'manager', 'operational_staff']));

-- Admin only can delete
create policy "suppliers_delete_admin"
    on public.suppliers for delete
    to authenticated
    using (public.has_role(array['admin']));

-- ── 5. Reload PostgREST schema ────────────────────────────────
notify pgrst, 'reload schema';

-- ── 6. Insert sample suppliers ────────────────────────────────
insert into public.suppliers (
    name, contact_person, email, phone,
    address, city, state, zip_code, country,
    payment_terms, tax_id, status, notes,
    total_orders, total_value
)
values
(
    'Pacific Tire Distributors',
    'James Reyes',
    'james.reyes@pacifictire.com',
    '+63-2-8888-0001',
    '123 EDSA, Mandaluyong',
    'Mandaluyong', 'Metro Manila', '1550', 'Philippines',
    'Net 30', 'PH-VAT-001', 'active',
    'Primary tire supplier for Bridgestone and Michelin brands.',
    245, 3850000
),
(
    'Asian Auto Parts Corp',
    'Maria Cruz',
    'maria.cruz@asianautops.com',
    '+63-32-234-0002',
    '456 M.J. Cuenco Ave, Cebu City',
    'Cebu City', 'Cebu', '6000', 'Philippines',
    'Net 45', 'PH-VAT-002', 'active',
    'Handles continental and Goodyear imports.',
    178, 2340000
),
(
    'Global Rubber Holdings',
    'Carlos Santos',
    'c.santos@globalrubber.ph',
    '+63-2-8777-0003',
    '789 Commonwealth Ave, Quezon City',
    'Quezon City', 'Metro Manila', '1121', 'Philippines',
    'Net 60', 'PH-VAT-003', 'active',
    'Bulk supplier for off-road and truck tires.',
    89, 1250000
),
(
    'Metro Wheel & Tire Supply',
    'Ana Villanueva',
    'ana@metrowheels.ph',
    '+63-46-432-0004',
    '12 Emilio Aguinaldo Hwy, Imus',
    'Imus', 'Cavite', '4103', 'Philippines',
    'Net 30', 'PH-VAT-004', 'active',
    'Local supplier for OEM and aftermarket rims.',
    56, 780000
),
(
    'Southstar Logistics & Supply',
    'Roberto Tan',
    'r.tan@southstar.com.ph',
    '+63-82-297-0005',
    '34 Quimpo Blvd, Davao City',
    'Davao City', 'Davao del Sur', '8000', 'Philippines',
    'Net 30', 'PH-VAT-005', 'inactive',
    'Mindanao-based distributor. Currently on hold due to delivery delays.',
    12, 145000
)
on conflict do nothing;

-- ── 7. Verify ────────────────────────────────────────────────
select
    id,
    name,
    contact_person,
    email,
    city,
    status,
    total_orders,
    total_value,
    created_at
from public.suppliers
order by name;

-- ============================================================
-- SUCCESS
-- ============================================================
-- ✅ suppliers table created with RLS
-- ✅ 5 sample suppliers inserted
-- ✅ PostgREST schema reloaded
-- ============================================================
