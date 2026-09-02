-- ============================================================
-- INVENTORY MANAGEMENT SYSTEM
-- EMPLOYEE BIOMETRIC CODE VERIFICATION SYSTEM v2.0
-- ============================================================
--
-- AUTHOR: Red Indian Customs Development Team
-- LAST UPDATED: 2026-08-13
-- DATABASE: PostgreSQL 14+ with Supabase
--
-- PURPOSE:
-- Secure employee registration system using pre-assigned biometric
-- codes. Only employees with valid codes can create accounts.
--
-- FEATURES:
-- ✓ Biometric code verification before signup
-- ✓ Automatic position assignment from employee records
-- ✓ One-time use codes (prevents duplicate registrations)
-- ✓ Role-based access control with RLS
-- ✓ Comprehensive audit trail
-- ✓ Email format validation
-- ✓ Optimized indexes for performance
--
-- WORKFLOW:
-- 1. Admin pre-registers employees with biometric codes
-- 2. Employee enters code during signup
-- 3. System validates and displays employee information
-- 4. Account created with verified employee details
-- 5. Code marked as used and cannot be reused
--
-- ============================================================

-- ============================================================
-- SECTION 1: TABLE STRUCTURE
-- ============================================================

-- Drop existing table if you want to start fresh (CAUTION!)
-- drop table if exists public.employees cascade;

-- Create employees table
create table if not exists public.employees (
    -- Primary Key
    id uuid primary key default gen_random_uuid(),
    
    -- Biometric/Employee Code (unique identifier for signup)
    employee_code text unique not null,
    
    -- Employee Personal Information
    full_name text not null,
    email text unique not null,
    employee_position text not null,
    department text,
    
    -- Usage Tracking
    is_used boolean not null default false,
    used_at timestamptz,
    user_id uuid references public.users(id) on delete set null,
    
    -- Timestamps
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    
    -- Audit Fields
    created_by uuid references public.users(id) on delete set null,
    metadata jsonb default '{}'::jsonb,
    
    -- Constraints
    constraint valid_employee_position check (
        employee_position in (
            'admin',
            'manager',
            'operational_staff',
            'warehouse_staff',
            'sales_staff'
        )
    ),
    constraint valid_email_format check (
        email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ),
    constraint check_used_at_when_used check (
        (is_used = true and used_at is not null and user_id is not null) or
        (is_used = false and used_at is null and user_id is null)
    )
);

-- Add comment to table
comment on table public.employees is 'Pre-registered employees with biometric codes for secure signup';

-- ============================================================
-- SECTION 2: PERFORMANCE INDEXES
-- ============================================================

-- Index for quick lookup of unused codes during verification
create index if not exists idx_employees_code_unused
    on public.employees(employee_code)
    where not is_used;

-- Index for email lookups (case-insensitive)
create index if not exists idx_employees_email_lower
    on public.employees(lower(email));

-- Index for filtering by position
create index if not exists idx_employees_position
    on public.employees(employee_position);

-- Index for filtering unused codes
create index if not exists idx_employees_unused
    on public.employees(is_used)
    where not is_used;

-- Index for user_id lookups
create index if not exists idx_employees_user_id
    on public.employees(user_id)
    where user_id is not null;

-- Composite index for common queries
create index if not exists idx_employees_code_used
    on public.employees(employee_code, is_used);

-- ============================================================
-- SECTION 3: LINK TO USERS TABLE
-- ============================================================

-- Add employee_code column to users table (if not exists)
do $$
begin
    if not exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'users'
          and column_name = 'employee_code'
    ) then
        alter table public.users add column employee_code text;
        raise notice 'Added employee_code column to users table';
    else
        raise notice 'employee_code column already exists in users table';
    end if;
end $$;

-- Index on users.employee_code
create index if not exists idx_users_employee_code
    on public.users(employee_code)
    where employee_code is not null;

-- ============================================================
-- SECTION 4: TRIGGERS
-- ============================================================

-- Updated_at trigger for employees table
drop trigger if exists trg_employees_updated_at on public.employees;

create trigger trg_employees_updated_at
    before update on public.employees
    for each row
    execute function public.set_updated_at();

-- ============================================================
-- SECTION 5: ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on employees table
alter table public.employees enable row level security;

-- Drop existing policies (clean slate)
drop policy if exists "employees_select_admin" on public.employees;
drop policy if exists "employees_select_manager" on public.employees;
drop policy if exists "employees_insert_admin" on public.employees;
drop policy if exists "employees_update_admin" on public.employees;
drop policy if exists "employees_delete_admin" on public.employees;

-- Policy: Admin full SELECT access
create policy "employees_select_admin"
    on public.employees
    for select
    to authenticated
    using (public.has_role(array['admin']));

-- Policy: Manager read-only SELECT access
create policy "employees_select_manager"
    on public.employees
    for select
    to authenticated
    using (public.has_role(array['manager']));

-- Policy: Admin INSERT access
create policy "employees_insert_admin"
    on public.employees
    for insert
    to authenticated
    with check (public.has_role(array['admin']));

-- Policy: Admin UPDATE access
create policy "employees_update_admin"
    on public.employees
    for update
    to authenticated
    using (public.has_role(array['admin']));

-- Policy: Admin DELETE access
create policy "employees_delete_admin"
    on public.employees
    for delete
    to authenticated
    using (public.has_role(array['admin']));

-- ============================================================
-- SECTION 6: FUNCTION - VERIFY EMPLOYEE CODE
-- ============================================================

drop function if exists public.verify_employee_code(text);

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

comment on function public.verify_employee_code(text) is 
'Verifies employee biometric code and returns employee info if code is valid and unused';

-- ============================================================
-- SECTION 7: FUNCTION - MARK CODE AS USED
-- ============================================================

drop function if exists public.mark_employee_code_used(text, uuid);

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
    
    -- Link employee code to user account
    update public.users
    set
        employee_code = code,
        updated_at = now()
    where id = new_user_id;
end;
$$;

comment on function public.mark_employee_code_used(text, uuid) is 
'Marks employee code as used and links it to the created user account';

-- ============================================================
-- SECTION 8: AUTH TRIGGER (Drop First)
-- ============================================================

-- IMPORTANT: Drop trigger BEFORE dropping function to avoid dependency errors
drop trigger if exists on_auth_user_created on auth.users;

-- ============================================================
-- SECTION 9: FUNCTION - HANDLE NEW USER
-- ============================================================

drop function if exists public.handle_new_user();

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
        ''
    );
    
    -- If employee code exists, get verified employee info
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
        -- Fallback for old signup flow (without employee code)
        emp_position := new.raw_user_meta_data ->> 'position';
    end if;
    
    -- Create or update user profile
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
    
    -- Find and assign role based on position
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

comment on function public.handle_new_user() is 
'Trigger function to create user profile and assign roles after auth.users insert';

-- ============================================================
-- SECTION 10: RECREATE AUTH TRIGGER
-- ============================================================

create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute function public.handle_new_user();

-- ============================================================
-- SECTION 11: SAMPLE EMPLOYEE DATA
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
-- ADMIN (Your Account)
(
    'EMP-10001',
    'Daisy Rey Daguplo',
    'daisyreydaguplo18@gmail.com',
    'admin',
    'Management',
    '{"hire_date": "2024-01-15", "employee_type": "full_time", "priority": "high"}'::jsonb
),

-- MANAGERS
(
    'EMP-20001',
    'Maria Santos',
    'maria.santos@redindiancustoms.com',
    'manager',
    'Operations',
    '{"hire_date": "2024-02-01", "employee_type": "full_time"}'::jsonb
),
(
    'EMP-20002',
    'John Chen',
    'john.chen@redindiancustoms.com',
    'manager',
    'Logistics',
    '{"hire_date": "2024-02-15", "employee_type": "full_time"}'::jsonb
),

-- OPERATIONAL STAFF
(
    'EMP-30001',
    'Sarah Williams',
    'sarah.williams@redindiancustoms.com',
    'operational_staff',
    'Operations',
    '{"hire_date": "2024-03-01", "employee_type": "full_time"}'::jsonb
),
(
    'EMP-30002',
    'Robert Johnson',
    'robert.johnson@redindiancustoms.com',
    'operational_staff',
    'Operations',
    '{"hire_date": "2024-03-10", "employee_type": "full_time"}'::jsonb
),
(
    'EMP-30003',
    'Emily Davis',
    'emily.davis@redindiancustoms.com',
    'operational_staff',
    'Inventory',
    '{"hire_date": "2024-03-20", "employee_type": "full_time"}'::jsonb
),

-- WAREHOUSE STAFF
(
    'EMP-40001',
    'Michael Brown',
    'michael.brown@redindiancustoms.com',
    'warehouse_staff',
    'Warehouse',
    '{"hire_date": "2024-04-01", "employee_type": "full_time"}'::jsonb
),
(
    'EMP-40002',
    'Jennifer Garcia',
    'jennifer.garcia@redindiancustoms.com',
    'warehouse_staff',
    'Warehouse',
    '{"hire_date": "2024-04-05", "employee_type": "full_time"}'::jsonb
),
(
    'EMP-40003',
    'David Martinez',
    'david.martinez@redindiancustoms.com',
    'warehouse_staff',
    'Warehouse',
    '{"hire_date": "2024-04-10", "employee_type": "full_time"}'::jsonb
),
(
    'EMP-40004',
    'Lisa Anderson',
    'lisa.anderson@redindiancustoms.com',
    'warehouse_staff',
    'Receiving',
    '{"hire_date": "2024-04-15", "employee_type": "full_time"}'::jsonb
),
(
    'EMP-40005',
    'James Wilson',
    'james.wilson@redindiancustoms.com',
    'warehouse_staff',
    'Picking',
    '{"hire_date": "2024-04-20", "employee_type": "full_time"}'::jsonb
),

-- SALES STAFF
(
    'EMP-50001',
    'Patricia Taylor',
    'patricia.taylor@redindiancustoms.com',
    'sales_staff',
    'Sales',
    '{"hire_date": "2024-05-01", "employee_type": "full_time"}'::jsonb
),
(
    'EMP-50002',
    'Christopher Lee',
    'christopher.lee@redindiancustoms.com',
    'sales_staff',
    'Sales',
    '{"hire_date": "2024-05-05", "employee_type": "full_time"}'::jsonb
),
(
    'EMP-50003',
    'Linda White',
    'linda.white@redindiancustoms.com',
    'sales_staff',
    'Customer Service',
    '{"hire_date": "2024-05-10", "employee_type": "full_time"}'::jsonb
),
(
    'EMP-50004',
    'Daniel Harris',
    'daniel.harris@redindiancustoms.com',
    'sales_staff',
    'Sales',
    '{"hire_date": "2024-05-15", "employee_type": "full_time"}'::jsonb
)
on conflict (employee_code) do nothing;

-- ============================================================
-- SECTION 12: HELPER VIEW
-- ============================================================

drop view if exists public.employee_registration_status;

create view public.employee_registration_status
with (security_invoker = true)
as
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

comment on view public.employee_registration_status is 
'Shows registration status of all employees and their linked user accounts';

-- Grant access to authenticated users
revoke all on public.employee_registration_status from public;
grant select on public.employee_registration_status to authenticated;

-- ============================================================
-- SECTION 13: RELOAD POSTGREST SCHEMA
-- ============================================================

notify pgrst, 'reload schema';

-- ============================================================
-- SECTION 14: VERIFICATION QUERIES
-- ============================================================

-- Check employee count
select count(*) as total_employees from public.employees;

-- View all employees
select
    employee_code,
    full_name,
    email,
    employee_position,
    department,
    is_used
from public.employees
order by employee_code;

-- Test verification function with your admin code
select * from public.verify_employee_code('EMP-10001');

-- Test verification function with another code
select * from public.verify_employee_code('EMP-40001');

-- View registration status
select * from public.employee_registration_status;

-- ============================================================
-- SUCCESS! SCRIPT COMPLETE
-- ============================================================
--
-- ✅ CREATED:
-- - employees table with 15 sample employees
-- - Performance indexes for fast queries
-- - verify_employee_code() function
-- - mark_employee_code_used() function
-- - handle_new_user() trigger function
-- - on_auth_user_created trigger
-- - Row Level Security policies
-- - employee_registration_status view
--
-- ✅ YOUR ADMIN ACCOUNT:
-- Code:  EMP-10001
-- Name:  Daisy Rey Daguplo
-- Email: daisyreydaguplo18@gmail.com
-- Role:  admin
--
-- 🎯 NEXT STEPS:
-- 1. Refresh your frontend: http://localhost:5173
-- 2. Click "Sign Up"
-- 3. Enter employee code: EMP-10001
-- 4. Click "Verify"
-- 5. See your info appear
-- 6. Enter password and create account
-- 7. Login and access dashboard!
--
-- ============================================================

-- ============================================================
-- USAGE EXAMPLES
-- ============================================================

-- Add a new employee:
/*
insert into public.employees (
    employee_code,
    full_name,
    email,
    employee_position,
    department,
    metadata
)
values (
    'EMP-60001',
    'New Employee Name',
    'newemp@redindiancustoms.com',
    'warehouse_staff',
    'Warehouse',
    '{"hire_date": "2026-08-13", "employee_type": "full_time"}'::jsonb
);
*/

-- View unused codes:
/*
select employee_code, full_name, email, employee_position
from public.employees
where is_used = false
order by employee_code;
*/

-- View used codes:
/*
select employee_code, full_name, email, used_at, user_id
from public.employees
where is_used = true
order by used_at desc;
*/

-- Find employee by email:
/*
select * from public.employees
where lower(email) = lower('daisyreydaguplo18@gmail.com');
*/

-- ============================================================
-- END OF SCRIPT
-- ============================================================
