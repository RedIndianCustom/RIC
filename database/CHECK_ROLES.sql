-- ============================================================
-- CHECK ROLES AND USER ASSIGNMENTS
-- ============================================================

-- 1. All available roles
SELECT id, name FROM public.roles ORDER BY name;

-- 2. All users with their roles
SELECT
    u.id,
    u.email,
    u.full_name,
    u.position,
    u.employee_code,
    COALESCE(r.name, '❌ NO ROLE ASSIGNED') AS role
FROM public.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.roles r ON r.id = ur.role_id
ORDER BY u.created_at DESC;

-- 3. Specifically check Daisy's account
SELECT
    u.id,
    u.email,
    u.full_name,
    u.position,
    u.employee_code,
    r.name AS role_name,
    ur.role_id
FROM public.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.roles r ON r.id = ur.role_id
WHERE u.email = 'daisyreydaguplo18@gmail.com';
