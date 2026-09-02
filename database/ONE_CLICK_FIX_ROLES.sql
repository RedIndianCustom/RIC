-- ============================================================
-- ONE CLICK FIX: Assign missing roles to ALL users
-- Run this in Supabase SQL Editor → fixes 403 errors instantly
-- ============================================================

-- 1. Pull position from employees table into public.users
UPDATE public.users u
SET
    position    = e.employee_position,
    employee_code = e.employee_code,
    updated_at  = now()
FROM public.employees e
WHERE e.employee_code = u.employee_code
  AND (u.position IS NULL OR u.position = '');

-- 2. Pull position from auth metadata if still missing
UPDATE public.users u
SET
    position   = (a.raw_user_meta_data ->> 'position'),
    updated_at = now()
FROM auth.users a
WHERE a.id = u.id
  AND (u.position IS NULL OR u.position = '')
  AND (a.raw_user_meta_data ->> 'position') IS NOT NULL
  AND (a.raw_user_meta_data ->> 'position') != '';

-- 3. Assign role to every user that has a position but no role
INSERT INTO public.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM public.users u
JOIN public.roles r ON r.name = u.position
LEFT JOIN public.user_roles ur ON ur.user_id = u.id AND ur.role_id = r.id
WHERE ur.user_id IS NULL
  AND u.position IS NOT NULL
  AND u.position != ''
ON CONFLICT DO NOTHING;

-- ============================================================
-- VERIFY — should show a role for every user
-- ============================================================
SELECT
    u.email,
    u.full_name,
    u.position,
    u.employee_code,
    COALESCE(r.name, '❌ STILL NO ROLE — contact support') AS assigned_role
FROM public.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.roles r       ON r.id = ur.role_id
ORDER BY u.created_at DESC;
