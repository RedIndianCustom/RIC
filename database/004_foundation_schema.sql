-- ============================================================
-- INVENTORY MANAGEMENT SYSTEM
-- COMPLETE AUTHENTICATION + USER + ROLE FOUNDATION
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
-- ============================================================
--
-- SECURITY MODEL:
--
-- Supabase Auth
--      |
--      +--> Email + Password
--      |
--      +--> Email Verification
--
-- public.users
--      |
--      +--> Full Name
--      +--> Position
--      +--> Active Status
--      +--> Email Verification Status
--
-- public.user_roles
--      |
--      +--> User -> Role
--
-- public.roles
--      |
--      +--> admin
--      +--> manager
--      +--> operational_staff
--      +--> warehouse_staff
--      +--> sales_staff
--
-- IMPORTANT:
-- Password and Confirm Password are NEVER stored in
-- public.users.
--
-- Supabase Auth manages passwords.
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
-- Mirrors auth.users.
--
-- Password is NOT stored here.
--
-- ============================================================

create table if not exists public.users (
    id uuid primary key
        references auth.users(id)
        on delete cascade,

    email text unique not null,

    full_name text not null,

    position text,

    is_active boolean not null default false,

    email_verified boolean not null default false,

    email_verified_at timestamptz,

    last_login_at timestamptz,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);


-- ============================================================
-- 5. MIGRATE EXISTING USERS TABLE
-- ============================================================
--
-- These statements make the script safe if the table already
-- existed before these columns were added.
--
-- ============================================================

alter table public.users
add column if not exists position text;

alter table public.users
add column if not exists is_active boolean;

alter table public.users
add column if not exists email_verified boolean;

alter table public.users
add column if not exists email_verified_at timestamptz;

alter table public.users
add column if not exists last_login_at timestamptz;

alter table public.users
add column if not exists created_at timestamptz;

alter table public.users
add column if not exists updated_at timestamptz;


-- ============================================================
-- 6. SET DEFAULTS
-- ============================================================

alter table public.users
alter column is_active
set default false;

alter table public.users
alter column email_verified
set default false;

alter table public.users
alter column created_at
set default now();

alter table public.users
alter column updated_at
set default now();


-- ============================================================
-- 7. USER <-> ROLE TABLE
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
-- 8. AUDIT LOG TABLE
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
-- 9. UPDATED_AT FUNCTION
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
-- 10. UPDATED_AT TRIGGER
-- ============================================================

drop trigger if exists trg_users_updated_at
on public.users;

create trigger trg_users_updated_at
before update on public.users
for each row
execute function public.set_updated_at();


-- ============================================================
-- 11. ROLE CHECK FUNCTION
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
-- 12. ENABLE ROW LEVEL SECURITY
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
-- 13. DROP EXISTING POLICIES
-- ============================================================
--
-- Prevents:
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
-- 14. USERS POLICIES
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
-- 15. ROLES POLICY
-- ============================================================
--
-- Authenticated users can read roles.
--
-- This allows the Position dropdown to load role options.
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
-- 16. USER ROLES POLICIES
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
-- 17. AUDIT LOG POLICY
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
-- 18. AUTOMATIC USER PROFILE CREATION
-- ============================================================
--
-- When a user signs up through Supabase Auth:
--
-- auth.users
--      |
--      ▼
-- this trigger
--      |
--      ▼
-- public.users
--
-- It also assigns the selected position as a role.
--
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare

    selected_position text;

    selected_role_id uuid;

    user_full_name text;

begin

    -- Get signup information
    selected_position :=
        new.raw_user_meta_data ->> 'position';


    user_full_name :=
        coalesce(
            new.raw_user_meta_data ->> 'full_name',
            ''
        );


    -- ========================================================
    -- CREATE USER PROFILE
    -- ========================================================

    insert into public.users (
        id,
        email,
        full_name,
        position,
        is_active,
        email_verified
    )

    values (
        new.id,
        new.email,
        user_full_name,
        selected_position,
        false,
        false
    )

    on conflict (id)
    do update set

        email = excluded.email,

        full_name = excluded.full_name,

        position = excluded.position;


    -- ========================================================
    -- FIND SELECTED ROLE
    -- ========================================================

    select id
    into selected_role_id

    from public.roles

    where name = selected_position

    limit 1;


    -- ========================================================
    -- ASSIGN ROLE
    -- ========================================================

    if selected_role_id is not null then

        insert into public.user_roles (
            user_id,
            role_id
        )

        values (
            new.id,
            selected_role_id
        )

        on conflict (
            user_id,
            role_id
        )

        do nothing;

    end if;


    return new;

end;
$$;


-- ============================================================
-- 19. CREATE AUTH USER TRIGGER
-- ============================================================

drop trigger if exists on_auth_user_created
on auth.users;


create trigger on_auth_user_created

after insert on auth.users

for each row

execute function public.handle_new_user();


-- ============================================================
-- 20. EMAIL VERIFICATION SYNC FUNCTION
-- ============================================================
--
-- This function checks auth.users.email_confirmed_at.
--
-- If the email is verified:
--
-- email_verified = TRUE
-- email_verified_at = confirmation timestamp
-- is_active = TRUE
--
-- ============================================================

create or replace function public.sync_email_verification(
    user_uuid uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare

    confirmed_at timestamptz;

begin

    select email_confirmed_at

    into confirmed_at

    from auth.users

    where id = user_uuid;


    if confirmed_at is not null then

        update public.users

        set
            email_verified = true,

            email_verified_at = confirmed_at,

            is_active = true,

            updated_at = now()

        where id = user_uuid;

    end if;

end;
$$;


-- ============================================================
-- 21. LOGIN TRACKING FUNCTION
-- ============================================================

create or replace function public.update_last_login()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin

    update public.users

    set
        last_login_at = now(),

        updated_at = now()

    where id = auth.uid();

end;
$$;


-- ============================================================
-- 22. RELOAD SUPABASE SCHEMA CACHE
-- ============================================================

notify pgrst, 'reload schema';


-- ============================================================
-- 23. VERIFY ROLES
-- ============================================================

select
    id,
    name,
    description,
    created_at

from public.roles

order by name;


-- ============================================================
-- 24. VERIFY USERS
-- ============================================================

select
    id,
    email,
    full_name,
    position,
    is_active,
    email_verified,
    email_verified_at,
    last_login_at,
    created_at,
    updated_at

from public.users

order by created_at desc;


-- ============================================================
-- 25. VERIFY USER ROLES
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