-- ============================================================
-- INVENTORY MANAGEMENT SYSTEM
-- FOUNDATION DATABASE SCHEMA
-- ============================================================
--
-- SIGN UP FORM:
--
-- Full Name
-- Email
-- Password
-- Confirm Password
-- Position
--
-- Password and Confirm Password are NOT stored in public.users.
-- Supabase Auth manages the password securely.
--
-- Position is stored in:
--     public.users.position
--
-- Role authorization is also maintained through:
--     public.user_roles
--     public.roles
--
-- ============================================================


-- ============================================================
-- 1. EXTENSIONS
-- ============================================================

create extension if not exists pgcrypto;


-- ============================================================
-- 2. ROLES TABLE
-- ============================================================

create table if not exists public.roles (
    id uuid primary key default gen_random_uuid(),

    name text unique not null,

    description text,

    created_at timestamptz not null default now()
);


-- ============================================================
-- 3. DEFAULT ROLES
-- ============================================================

insert into public.roles (
    name,
    description
)
values
(
    'admin',
    'Full system access'
),
(
    'manager',
    'Reporting, monitoring and approvals'
),
(
    'operational_staff',
    'Shipment/product registration, inventory registration and order validation'
),
(
    'warehouse_staff',
    'Receiving, inspection, picking and packing'
),
(
    'sales_staff',
    'Walk-in sales, payments, returns and refunds'
)
on conflict (name) do nothing;


-- ============================================================
-- 4. USERS TABLE
-- ============================================================
--
-- This mirrors Supabase auth.users.
--
-- IMPORTANT:
-- Password is NOT stored here.
--
-- Supabase Auth stores:
--     Email
--     Password
--
-- public.users stores:
--     Full Name
--     Position
--     Active status
--
-- ============================================================

create table if not exists public.users (
    id uuid primary key
        references auth.users(id)
        on delete cascade,

    email text unique not null,

    full_name text not null,

    position text,

    is_active boolean not null default true,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);


-- ============================================================
-- 5. IMPORTANT MIGRATION
-- ============================================================
--
-- If public.users already existed before position was added,
-- CREATE TABLE IF NOT EXISTS will NOT add the column.
--
-- This ALTER TABLE makes sure position exists.
--
-- ============================================================

alter table public.users
add column if not exists position text;


-- ============================================================
-- 6. USER <-> ROLE TABLE
-- ============================================================

create table if not exists public.user_roles (
    user_id uuid not null
        references public.users(id)
        on delete cascade,

    role_id uuid not null
        references public.roles(id)
        on delete cascade,

    created_at timestamptz not null default now(),

    primary key (user_id, role_id)
);


-- ============================================================
-- 7. AUDIT LOG TABLE
-- ============================================================

create table if not exists public.audit_logs (
    id uuid primary key default gen_random_uuid(),

    user_id uuid
        references public.users(id)
        on delete set null,

    action text not null,

    entity text,

    entity_id text,

    metadata jsonb,

    created_at timestamptz not null default now()
);


-- ============================================================
-- 8. UPDATED_AT FUNCTION
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();

    return new;
end;
$$;


-- ============================================================
-- 9. UPDATED_AT TRIGGER
-- ============================================================

drop trigger if exists trg_users_updated_at
on public.users;

create trigger trg_users_updated_at
before update on public.users
for each row
execute function public.set_updated_at();


-- ============================================================
-- 10. ROLE CHECK FUNCTION
-- ============================================================
--
-- Used by RLS policies.
--
-- Example:
--
-- has_role(array['admin'])
--
-- or:
--
-- has_role(array['admin', 'manager'])
--
-- ============================================================

create or replace function public.has_role(
    role_names text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.user_roles ur

        inner join public.roles r
            on r.id = ur.role_id

        where ur.user_id = auth.uid()

        and r.name = any(role_names)
    );
$$;


-- ============================================================
-- 11. ENABLE ROW LEVEL SECURITY
-- ============================================================

alter table public.users
enable row level security;

alter table public.roles
enable row level security;

alter table public.user_roles
enable row level security;

alter table public.audit_logs
enable row level security;


-- ============================================================
-- 12. REMOVE EXISTING POLICIES
-- ============================================================
--
-- This prevents:
--
-- ERROR:
-- policy already exists
--
-- ============================================================

drop policy if exists "users_select_self"
on public.users;

drop policy if exists "users_select_admin_manager"
on public.users;

drop policy if exists "roles_select_authenticated"
on public.roles;

drop policy if exists "user_roles_select_self"
on public.user_roles;

drop policy if exists "user_roles_select_admin_manager"
on public.user_roles;

drop policy if exists "audit_logs_select_admin"
on public.audit_logs;


-- ============================================================
-- 13. USERS RLS POLICIES
-- ============================================================

create policy "users_select_self"
on public.users
for select
to authenticated
using (
    auth.uid() = id
);


create policy "users_select_admin_manager"
on public.users
for select
to authenticated
using (
    public.has_role(
        array['admin', 'manager']
    )
);


-- ============================================================
-- 14. ROLES RLS POLICY
-- ============================================================
--
-- Authenticated users can read available roles.
--
-- This allows your Position dropdown to load roles.
--
-- ============================================================

create policy "roles_select_authenticated"
on public.roles
for select
to authenticated
using (
    true
);


-- ============================================================
-- 15. USER ROLES RLS POLICIES
-- ============================================================

create policy "user_roles_select_self"
on public.user_roles
for select
to authenticated
using (
    auth.uid() = user_id
);


create policy "user_roles_select_admin_manager"
on public.user_roles
for select
to authenticated
using (
    public.has_role(
        array['admin', 'manager']
    )
);


-- ============================================================
-- 16. AUDIT LOG RLS POLICY
-- ============================================================

create policy "audit_logs_select_admin"
on public.audit_logs
for select
to authenticated
using (
    public.has_role(
        array['admin']
    )
);


-- ============================================================
-- 17. RELOAD SUPABASE SCHEMA CACHE
-- ============================================================
--
-- This is important after adding the position column.
--
-- ============================================================

notify pgrst, 'reload schema';


-- ============================================================
-- 18. VERIFY ROLES
-- ============================================================

select
    id,
    name,
    description
from public.roles
order by name;


-- ============================================================
-- 19. VERIFY USERS TABLE
-- ============================================================

select
    id,
    email,
    full_name,
    position,
    is_active,
    created_at
from public.users
order by created_at desc;


-- ============================================================
-- 20. VERIFY USER ROLES
-- ============================================================

select
    ur.user_id,
    u.full_name,
    u.email,
    u.position,
    r.name as role,
    ur.created_at
from public.user_roles ur

inner join public.users u
    on u.id = ur.user_id

inner join public.roles r
    on r.id = ur.role_id

order by ur.created_at desc;