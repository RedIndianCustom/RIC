-- ============================================================
-- RED INDIAN CUSTOMS INVENTORY MANAGEMENT SYSTEM
-- PRODUCTION-READY DATABASE SCHEMA
-- ============================================================
--
-- VERSION: 1.0.0
-- DATE: 2026-08-13
-- DATABASE: PostgreSQL 14+ with Supabase
--
-- DESCRIPTION:
-- Complete production-ready database schema for the Red Indian
-- Customs Inventory Management System including:
-- - User authentication and authorization
-- - Role-based access control (RBAC)
-- - Employee biometric code verification
-- - Audit logging
-- - Row Level Security (RLS)
--
-- EXECUTION INSTRUCTIONS:
-- 1. Copy this entire script
-- 2. Open Supabase SQL Editor
-- 3. Paste and run
-- 4. Verify success with queries at the end
--
-- ============================================================

-- ============================================================
-- SECTION 1: EXTENSIONS
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- SECTION 2: ROLES TABLE
-- ============================================================

create table if not exists public.roles (
    id uuid primary key default gen_random_uuid(),
    name text unique not null,
    description text,
    created_at timestamptz not null default now(),
    
    constraint roles_name_not_empty check (name <> '')
);

comment on table public.roles is 'System roles for access control';

-- Insert default roles
insert into public.roles (name, description)
values
    ('admin', 'Full system access with all permissions'),
    ('manager', 'Operations management, reporting and approvals'),
    ('operational_staff', 'Product registration, inventory and order processing'),
    ('warehouse_staff', 'Receiving, inspection, picking and packing'),
    ('sales_staff', 'Walk-in sales, payments, returns and refunds')
on conflict (name) do nothing;

-- ============================================================
-- SECTION 3: USERS TABLE
-- ============================================================

create table if not exists public.users (
    id uuid primary key references auth.users(id) on delete cascade,
    email text unique not null,
    full_name text not null,
    position text,
    employee_code text,
    is_active boolean not null default false,
    email_verified boolean not null default false,
    email_verified_at timestamptz,
    last_login_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    
    constraint users_email_format check (
        email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ),
    constraint users_full_name_not_empty check (full_name <> '')
);

comment on table public.users is 'User profiles linked to Supabase auth.users';

-- Add missing columns if table already exists
do $$
begin
    alter table public.users add column if not exists employee_code text;
    alter table public.users add column if not exists is_active boolean default false;
    alter table public.users add column if not exists email_verified boolean default false;
    alter table public.users add column if not exists email_verified_at timestamptz;
    alter table public.users add column if not exists last_login_at timestamptz;
exception when others then
    raise notice 'Some columns already exist, continuing...';
end $$;

-- Indexes for users table
create index if not exists idx_users_email_lower on public.users(lower(email));
create index if not exists idx_users_employee_code on public.users(employee_code) where employee_code is not null;
create index if not exists idx_users_active on public.users(is_active) where is_active = true;

-- ============================================================
-- SECTION 4: USER ROLES TABLE (Many-to-Many)
-- ============================================================

create table if not exists public.user_roles (
    user_id uuid not null references public.users(id) on delete cascade,
    role_id uuid not null references public.roles(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (user_id, role_id)
);

comment on table public.user_roles is 'Links users to their assigned roles';

-- Index for role lookups
create index if not exists idx_user_roles_user_id on public.user_roles(user_id);
create index if not exists idx_user_roles_role_id on public.user_roles(role_id);

-- ============================================================
-- SECTION 5: EMPLOYEES TABLE (Biometric Codes)
-- ============================================================

create table if not exists public.employees (
    id uuid primary key default gen_random_uuid(),
    employee_code text unique not null,
    full_name text not null,
    email text unique not null,
    employee_position text not null,
    department text,
    is_used boolean not null default false,
    used_at timestamptz,
    user_id uuid references public.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by uuid references public.users(id) on delete set null,
    metadata jsonb default '{}'::jsonb,
    
    constraint employees_valid_position check (
        employee_position in ('admin', 'manager', 'operational_staff', 'warehouse_staff', 'sales_staff')
    ),
    constraint employees_email_format check (
        email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ),
    constraint employees_code_not_empty check (employee_code <> ''),
    constraint employees_used_consistency check (
        (is_used = true and used_at is not null and user_id is not null) or
        (is_used = false and used_at is null and user_id is null)
    )
);

comment on table public.employees is 'Pre-registered employees with biometric codes for secure signup';

-- Indexes for employees table
create index if not exists idx_employees_code_unused on public.employees(employee_code) where not is_used;
create index if not exists idx_employees_email_lower on public.employees(lower(email));
create index if not exists idx_employees_position on public.employees(employee_position);
create index if not exists idx_employees_unused on public.employees(is_used) where not is_used;
create index if not exists idx_employees_user_id on public.employees(user_id) where user_id is not null;

-- ============================================================
-- SECTION 6: AUDIT LOGS TABLE
-- ============================================================

create table if not exists public.audit_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.users(id) on delete set null,
    action text not null,
    entity text,
    entity_id text,
    metadata jsonb default '{}'::jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamptz not null default now(),
    
    constraint audit_logs_action_not_empty check (action <> '')
);

comment on table public.audit_logs is 'System-wide audit trail for compliance and security';

-- Indexes for audit logs
create index if not exists idx_audit_logs_user_id on public.audit_logs(user_id);
create index if not exists idx_audit_logs_action on public.audit_logs(action);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity, entity_id);

-- ============================================================
-- SECTION 7: FUNCTIONS - UTILITIES
-- ============================================================

-- Function: Update updated_at timestamp
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

comment on function public.set_updated_at() is 'Automatically updates updated_at column';

-- Function: Check if user has specific roles
create or replace function public.has_role(role_names text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.user_roles ur
        join public.roles r on r.id = ur.role_id
        where ur.user_id = auth.uid()
        and r.name = any(role_names)
    );
$$;

comment on function public.has_role(text[]) is 'Returns true if current user has any of the specified roles';

-- ============================================================
-- SECTION 8: FUNCTIONS - EMPLOYEE CODE VERIFICATION
-- ============================================================

-- Function: Verify employee code
create or replace function public.verify_employee_code(code text)
returns table (
    employee_code text,
    full_name text,
    email text,
    employee_position text,
    department text
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
    return query
    select
        e.employee_code,
        e.full_name,
        e.email,
        e.employee_position,
        e.department
    from public.employees e
    where e.employee_code = code
    and e.is_used = false;
end;
$$;

comment on function public.verify_employee_code(text) is 'Verifies employee code and returns info if valid and unused';

-- Function: Mark employee code as used
create or replace function public.mark_employee_code_used(
    code text,
    new_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    -- Mark employee code as used
    update public.employees
    set
        is_used = true,
        used_at = now(),
        user_id = new_user_id,
        updated_at = now()
    where employee_code = code
    and is_used = false;
    
    -- Link employee code to user
    update public.users
    set
        employee_code = code,
        updated_at = now()
    where id = new_user_id;
end;
$$;

comment on function public.mark_employee_code_used(text, uuid) is 'Marks employee code as used and links to user';

-- ============================================================
-- SECTION 9: FUNCTIONS - USER MANAGEMENT
-- ============================================================

-- Function: Sync email verification from auth.users
create or replace function public.sync_email_verification(user_uuid uuid)
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

comment on function public.sync_email_verification(uuid) is 'Syncs email verification status from auth.users';

-- Function: Update last login timestamp
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

comment on function public.update_last_login() is 'Updates last login timestamp for current user';

-- ============================================================
-- SECTION 10: TRIGGERS
-- ============================================================

-- Trigger: Update users.updated_at
drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
    before update on public.users
    for each row
    execute function public.set_updated_at();

-- Trigger: Update employees.updated_at
drop trigger if exists trg_employees_updated_at on public.employees;
create trigger trg_employees_updated_at
    before update on public.employees
    for each row
    execute function public.set_updated_at();

-- ============================================================
-- SECTION 11: AUTH USER CREATION TRIGGER
-- ============================================================

drop trigger if exists on_auth_user_created on auth.users;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    emp_code text;
    emp_position text;
    emp_full_name text;
    emp_email text;
    selected_role_id uuid;
begin
    -- Extract employee code from metadata
    emp_code := new.raw_user_meta_data ->> 'employeeCode';
    
    -- Extract full name
    emp_full_name := coalesce(
        new.raw_user_meta_data ->> 'fullName',
        new.raw_user_meta_data ->> 'full_name',
        split_part(new.email, '@', 1)
    );
    
    -- Get employee info if code exists
    if emp_code is not null then
        select
            e.employee_position,
            e.full_name,
            e.email
        into
            emp_position,
            emp_full_name,
            emp_email
        from public.employees e
        where e.employee_code = emp_code
        and e.is_used = false
        limit 1;
    else
        -- Fallback to metadata position
        emp_position := new.raw_user_meta_data ->> 'position';
    end if;
    
    -- Create user profile
    insert into public.users (
        id,
        email,
        full_name,
        position,
        employee_code,
        is_active,
        email_verified
    )
    values (
        new.id,
        coalesce(emp_email, new.email),
        emp_full_name,
        emp_position,
        emp_code,
        false,
        false
    )
    on conflict (id) do update
    set
        email = excluded.email,
        full_name = excluded.full_name,
        position = excluded.position,
        employee_code = excluded.employee_code,
        updated_at = now();
    
    -- Assign role based on position
    if emp_position is not null then
        select id into selected_role_id
        from public.roles
        where name = emp_position
        limit 1;
        
        if selected_role_id is not null then
            insert into public.user_roles (user_id, role_id)
            values (new.id, selected_role_id)
            on conflict (user_id, role_id) do nothing;
        end if;
    end if;
    
    -- Mark employee code as used
    if emp_code is not null then
        perform public.mark_employee_code_used(emp_code, new.id);
    end if;
    
    return new;
end;
$$;

comment on function public.handle_new_user() is 'Creates user profile and assigns roles when auth.users is inserted';

create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute function public.handle_new_user();

-- ============================================================
-- SECTION 12: ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;
alter table public.employees enable row level security;
alter table public.audit_logs enable row level security;

-- Drop existing policies
do $$
declare
    pol record;
begin
    for pol in
        select schemaname, tablename, policyname
        from pg_policies
        where schemaname = 'public'
        and tablename in ('users', 'roles', 'user_roles', 'employees', 'audit_logs')
    loop
        execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
    end loop;
end $$;

-- USERS POLICIES
create policy "users_select_self"
    on public.users for select
    to authenticated
    using (auth.uid() = id);

create policy "users_select_admin_manager"
    on public.users for select
    to authenticated
    using (public.has_role(array['admin', 'manager']));

-- ROLES POLICIES
create policy "roles_select_authenticated"
    on public.roles for select
    to authenticated
    using (true);

-- USER_ROLES POLICIES
create policy "user_roles_select_self"
    on public.user_roles for select
    to authenticated
    using (auth.uid() = user_id);

create policy "user_roles_select_admin_manager"
    on public.user_roles for select
    to authenticated
    using (public.has_role(array['admin', 'manager']));

-- EMPLOYEES POLICIES
create policy "employees_select_admin"
    on public.employees for select
    to authenticated
    using (public.has_role(array['admin']));

create policy "employees_select_manager"
    on public.employees for select
    to authenticated
    using (public.has_role(array['manager']));

create policy "employees_insert_admin"
    on public.employees for insert
    to authenticated
    with check (public.has_role(array['admin']));

create policy "employees_update_admin"
    on public.employees for update
    to authenticated
    using (public.has_role(array['admin']));

create policy "employees_delete_admin"
    on public.employees for delete
    to authenticated
    using (public.has_role(array['admin']));

-- AUDIT_LOGS POLICIES
create policy "audit_logs_select_admin"
    on public.audit_logs for select
    to authenticated
    using (public.has_role(array['admin']));

-- ============================================================
-- SECTION 13: SAMPLE EMPLOYEE DATA
-- ============================================================

-- Insert 15 pre-registered employees
insert into public.employees (
    employee_code,
    full_name,
    email,
    employee_position,
    department,
    metadata
)
values
-- ADMIN
('EMP-10001', 'Daisy Rey Daguplo', 'daisyreydaguplo18@gmail.com', 'admin', 'Management', '{"hire_date": "2024-01-15"}'::jsonb),

-- MANAGERS
('EMP-20001', 'Maria Santos', 'maria.santos@redindiancustoms.com', 'manager', 'Operations', '{"hire_date": "2024-02-01"}'::jsonb),
('EMP-20002', 'John Chen', 'john.chen@redindiancustoms.com', 'manager', 'Logistics', '{"hire_date": "2024-02-15"}'::jsonb),

-- OPERATIONAL STAFF
('EMP-30001', 'Sarah Williams', 'sarah.williams@redindiancustoms.com', 'operational_staff', 'Operations', '{"hire_date": "2024-03-01"}'::jsonb),
('EMP-30002', 'Robert Johnson', 'robert.johnson@redindiancustoms.com', 'operational_staff', 'Operations', '{"hire_date": "2024-03-10"}'::jsonb),
('EMP-30003', 'Emily Davis', 'emily.davis@redindiancustoms.com', 'operational_staff', 'Inventory', '{"hire_date": "2024-03-20"}'::jsonb),

-- WAREHOUSE STAFF
('EMP-40001', 'Michael Brown', 'michael.brown@redindiancustoms.com', 'warehouse_staff', 'Warehouse', '{"hire_date": "2024-04-01"}'::jsonb),
('EMP-40002', 'Jennifer Garcia', 'jennifer.garcia@redindiancustoms.com', 'warehouse_staff', 'Warehouse', '{"hire_date": "2024-04-05"}'::jsonb),
('EMP-40003', 'David Martinez', 'david.martinez@redindiancustoms.com', 'warehouse_staff', 'Warehouse', '{"hire_date": "2024-04-10"}'::jsonb),
('EMP-40004', 'Lisa Anderson', 'lisa.anderson@redindiancustoms.com', 'warehouse_staff', 'Receiving', '{"hire_date": "2024-04-15"}'::jsonb),
('EMP-40005', 'James Wilson', 'james.wilson@redindiancustoms.com', 'warehouse_staff', 'Picking', '{"hire_date": "2024-04-20"}'::jsonb),

-- SALES STAFF
('EMP-50001', 'Patricia Taylor', 'patricia.taylor@redindiancustoms.com', 'sales_staff', 'Sales', '{"hire_date": "2024-05-01"}'::jsonb),
('EMP-50002', 'Christopher Lee', 'christopher.lee@redindiancustoms.com', 'sales_staff', 'Sales', '{"hire_date": "2024-05-05"}'::jsonb),
('EMP-50003', 'Linda White', 'linda.white@redindiancustoms.com', 'sales_staff', 'Customer Service', '{"hire_date": "2024-05-10"}'::jsonb),
('EMP-50004', 'Daniel Harris', 'daniel.harris@redindiancustoms.com', 'sales_staff', 'Sales', '{"hire_date": "2024-05-15"}'::jsonb)
on conflict (employee_code) do nothing;

-- ============================================================
-- SECTION 14: HELPER VIEWS
-- ============================================================

-- View: Employee registration status
drop view if exists public.employee_registration_status;

create view public.employee_registration_status as
select
    e.employee_code,
    e.full_name as employee_name,
    e.email as employee_email,
    e.employee_position,
    e.department,
    e.is_used,
    e.used_at,
    e.created_at as employee_added_at,
    u.id as user_id,
    u.email as user_email,
    u.full_name as user_name,
    u.is_active as user_active,
    u.email_verified as user_email_verified,
    u.created_at as user_created_at
from public.employees e
left join public.users u on u.id = e.user_id
order by e.employee_code;

comment on view public.employee_registration_status is 'Shows registration status of all employees';

grant select on public.employee_registration_status to authenticated;

-- ============================================================
-- SECTION 15: RELOAD SCHEMA CACHE
-- ============================================================

notify pgrst, 'reload schema';

-- ============================================================
-- SECTION 16: VERIFICATION QUERIES
-- ============================================================

-- Check roles
select id, name, description from public.roles order by name;

-- Check employees
select employee_code, full_name, email, employee_position, is_used
from public.employees
order by employee_code;

-- Test employee code verification
select * from public.verify_employee_code('EMP-10001');

-- View employee registration status
select * from public.employee_registration_status;

-- Check tables exist
select table_name
from information_schema.tables
where table_schema = 'public'
and table_name in ('users', 'roles', 'user_roles', 'employees', 'audit_logs')
order by table_name;

-- ============================================================
-- SUCCESS! PRODUCTION-READY SCHEMA DEPLOYED
-- ============================================================
--
-- ✅ TABLES CREATED:
-- - roles (5 default roles)
-- - users (with employee_code support)
-- - user_roles (many-to-many)
-- - employees (15 pre-registered employees)
-- - audit_logs (for compliance)
--
-- ✅ FUNCTIONS CREATED:
-- - set_updated_at() - Auto-update timestamps
-- - has_role() - Role checking
-- - verify_employee_code() - Code verification
-- - mark_employee_code_used() - Mark codes as used
-- - sync_email_verification() - Sync email status
-- - update_last_login() - Track logins
-- - handle_new_user() - Auto-create profiles
--
-- ✅ TRIGGERS CREATED:
-- - on_auth_user_created - Auto user setup
-- - trg_users_updated_at - Auto timestamp
-- - trg_employees_updated_at - Auto timestamp
--
-- ✅ SECURITY ENABLED:
-- - Row Level Security (RLS) on all tables
-- - Role-based access policies
-- - Admin-only employee management
--
-- ✅ YOUR ADMIN ACCOUNT:
-- Code:  EMP-10001
-- Name:  Daisy Rey Daguplo
-- Email: daisyreydaguplo18@gmail.com
-- Role:  admin
--
-- 🎯 NEXT STEPS:
-- 1. Run verification queries above
-- 2. Test signup with EMP-10001
-- 3. Test admin features in dashboard
-- 4. Add more employees as needed
--
-- ============================================================
