-- ============================================================
-- EMPLOYEE REGISTRATION TABLE
-- ============================================================
--
-- This table stores pre-registered employee biometric codes.
--
-- Admin creates employee registration records BEFORE the
-- employee signs up.
--
-- During signup:
-- 1. Employee enters their biometric code
-- 2. Backend verifies the code exists and is not used
-- 3. Backend creates Supabase Auth account
-- 4. Backend marks the code as used
--
-- ============================================================

create table if not exists public.employee_registration (
    id uuid primary key default gen_random_uuid(),

    -- Employee biometric code (e.g. ABC-123456)
    employee_code text unique not null,

    -- Employee information
    full_name text not null,

    email text not null,

    -- Employee position/role (e.g. 'operational_staff', 'warehouse_staff')
    employee_position text not null,

    -- Registration status
    is_used boolean not null default false,

    used_at timestamptz,

    -- Link to auth.users after signup
    auth_user_id uuid references auth.users(id) on delete set null,

    -- Timestamps
    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()   
);


-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_employee_registration_code
on public.employee_registration(employee_code);

create index if not exists idx_employee_registration_is_used
on public.employee_registration(is_used);

create index if not exists idx_employee_registration_auth_user_id
on public.employee_registration(auth_user_id);


-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

drop trigger if exists trg_employee_registration_updated_at
on public.employee_registration;

create trigger trg_employee_registration_updated_at
before update on public.employee_registration
for each row
execute function public.set_updated_at();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.employee_registration
enable row level security;

-- Only admins can manage employee registrations
create policy "employee_registration_select_admin"
on public.employee_registration
for select
to authenticated
using (
    public.has_role(array['admin'])
);

create policy "employee_registration_insert_admin"
on public.employee_registration
for insert
to authenticated
with check (
    public.has_role(array['admin'])
);

create policy "employee_registration_update_admin"
on public.employee_registration
for update
to authenticated
using (
    public.has_role(array['admin'])
);

create policy "employee_registration_delete_admin"
on public.employee_registration
for delete
to authenticated
using (
    public.has_role(array['admin'])
);


-- ============================================================
-- RPC FUNCTION: VERIFY EMPLOYEE CODE
-- ============================================================
--
-- This function can be called without authentication.
--
-- It allows the signup form to verify an employee code
-- before creating an account.
--
-- ============================================================

create or replace function public.verify_employee_code(
    p_employee_code text
)
returns table (
    employee_code text,
    full_name text,
    email text,
    employee_position text,
    is_used boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin

    return query

    select
        er.employee_code,
        er.full_name,
        er.email,
        er.employee_position,
        er.is_used

    from public.employee_registration er

    where er.employee_code = p_employee_code

    and er.is_used = false

    limit 1;

end;
$$;


-- ============================================================
-- SAMPLE DATA (FOR TESTING)
-- ============================================================
--
-- IMPORTANT: Sample data removed for production.
--
-- To add employee registrations, use the admin panel or
-- insert records manually through the Supabase dashboard.
--
-- Example:
--
-- insert into public.employee_registration (
--     employee_code,
--     full_name,
--     email,
--     employee_position
-- )
-- values
-- (
--     'YOUR-CODE-HERE',
--     'Employee Full Name',
--     'employee@company.com',
--     'warehouse_staff'
-- );
--
-- ============================================================


-- ============================================================
-- RELOAD SCHEMA
-- ============================================================

notify pgrst, 'reload schema';


-- ============================================================
-- VERIFY TABLE
-- ============================================================

select
    id,
    employee_code,
    full_name,
    email,
    employee_position,
    is_used,
    used_at,
    auth_user_id,
    created_at,
    updated_at
from public.employee_registration
order by created_at desc;
