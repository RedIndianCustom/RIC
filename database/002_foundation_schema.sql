-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table users enable row level security;
alter table roles enable row level security;
alter table user_roles enable row level security;
alter table audit_logs enable row level security;


-- ============================================================
-- DROP EXISTING POLICIES
-- ============================================================

drop policy if exists "users_select_self" on users;
drop policy if exists "users_select_admin_manager" on users;

drop policy if exists "roles_select_authenticated" on roles;

drop policy if exists "user_roles_select_self" on user_roles;
drop policy if exists "user_roles_select_admin_manager" on user_roles;

drop policy if exists "audit_logs_select_admin" on audit_logs;


-- ============================================================
-- USERS POLICIES
-- ============================================================

create policy "users_select_self"
on users
for select
using (
    auth.uid() = id
);


create policy "users_select_admin_manager"
on users
for select
using (
    has_role(array['admin', 'manager'])
);


-- ============================================================
-- ROLES POLICY
-- ============================================================

create policy "roles_select_authenticated"
on roles
for select
using (
    auth.role() = 'authenticated'
);


-- ============================================================
-- USER_ROLES POLICIES
-- ============================================================

create policy "user_roles_select_self"
on user_roles
for select
using (
    auth.uid() = user_id
);


create policy "user_roles_select_admin_manager"
on user_roles
for select
using (
    has_role(array['admin', 'manager'])
);


-- ============================================================
-- AUDIT LOG POLICY
-- ============================================================

create policy "audit_logs_select_admin"
on audit_logs
for select
using (
    has_role(array['admin'])
);