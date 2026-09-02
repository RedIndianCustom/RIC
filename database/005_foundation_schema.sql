-- ============================================================
-- INVENTORY MANAGEMENT SYSTEM
-- AUTHENTICATION + USERS + ROLES
-- UPDATED VERSION
-- ============================================================
--
-- SIGN UP FORM
--
-- Full Name
-- Email
-- Password
-- Confirm Password
-- Position
--
-- PASSWORDS ARE HANDLED BY SUPABASE AUTH.
-- DO NOT STORE PASSWORDS IN public.users.
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
-- 5. ADD MISSING COLUMNS TO EXISTING USERS TABLE
-- ============================================================

alter table public.users
add column if not exists position text;

alter table public.users
add column if not exists is_active boolean
default false;

alter table public.users
add column if not exists email_verified boolean
default false;

alter table public.users
add column if not exists email_verified_at timestamptz;

alter table public.users
add column if not exists last_login_at timestamptz;

alter table public.users
add column if not exists created_at timestamptz
default now();

alter table public.users
add column if not exists updated_at timestamptz
default now();


-- ============================================================
-- 6. USER ROLES
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
-- 7. AUDIT LOGS
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
-- 11. ENABLE RLS
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
-- 12. REMOVE OLD POLICIES
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
-- 13. USERS POLICIES
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
-- 14. ROLES POLICY
-- ============================================================

create policy "roles_select_authenticated"

on public.roles

for select

to authenticated

using (
    true
);


-- ============================================================
-- 15. USER ROLES POLICIES
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
-- 16. AUDIT LOG POLICY
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
-- 17. CREATE USER PROFILE AUTOMATICALLY
-- ============================================================
--
-- IMPORTANT:
--
-- THIS TRIGGER IS THE ONLY PLACE THAT CREATES:
--
-- public.users
-- public.user_roles
--
-- DO NOT INSERT INTO public.users AGAIN FROM THE BACKEND.
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

    -- ========================================================
    -- GET SIGNUP DATA
    -- ========================================================

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
    --
    -- ON CONFLICT prevents duplicate-key errors if this
    -- trigger is accidentally invoked again.
    --
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

        position = excluded.position,

        updated_at = now();


    -- ========================================================
    -- FIND ROLE
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
-- 18. AUTH USER TRIGGER
-- ============================================================
--
-- This runs when Supabase Auth creates auth.users.
--
-- ============================================================

drop trigger if exists on_auth_user_created
on auth.users;


create trigger on_auth_user_created

after insert on auth.users

for each row

execute function public.handle_new_user();


-- ============================================================
-- 19. EMAIL VERIFICATION SYNC
-- ============================================================
--
-- auth.users.email_confirmed_at is the actual source of truth.
--
-- This function updates public.users after verification.
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
-- 20. UPDATE LAST LOGIN
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
-- 21. RELOAD POSTGREST SCHEMA
-- ============================================================

notify pgrst, 'reload schema';


-- ============================================================
-- 22. CHECK ROLES
-- ============================================================

select
    id,
    name,
    description,
    created_at
from public.roles
order by name;


-- ============================================================
-- 23. CHECK USERS
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
-- 24. CHECK USER ROLES
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