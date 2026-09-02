-- ============================================================
-- RUN THIS IN SUPABASE SQL EDITOR — fixes all 403 errors
-- ============================================================

-- Step 1: Copy position from employees table → users table
UPDATE public.users u
SET
    position      = e.employee_position,
    employee_code = e.employee_code,
    updated_at    = now()
FROM public.employees e
WHERE e.user_id = u.id
  AND (u.position IS NULL OR u.position = '');

-- Step 2: Copy position from auth metadata → users table (fallback)
UPDATE public.users u
SET
    position   = (a.raw_user_meta_data->>'position'),
    updated_at = now()
FROM auth.users a
WHERE a.id = u.id
  AND (u.position IS NULL OR u.position = '')
  AND (a.raw_user_meta_data->>'position') IS NOT NULL;

-- Step 3: Copy position from auth metadata (employeeCode path)
UPDATE public.users u
SET
    position   = e.employee_position,
    updated_at = now()
FROM auth.users a
JOIN public.employees e ON e.employee_code = (a.raw_user_meta_data->>'employeeCode')
WHERE a.id = u.id
  AND (u.position IS NULL OR u.position = '');

-- Step 4: Assign role for every user who now has a position
INSERT INTO public.user_roles (user_id, role_id)
SELECT DISTINCT u.id, r.id
FROM   public.users u
JOIN   public.roles r ON r.name = u.position
WHERE  u.position IS NOT NULL
  AND  u.position <> ''
  AND  NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = u.id AND ur.role_id = r.id
  );

-- ============================================================
-- VERIFY — every user should show a role
-- ============================================================
SELECT
    u.email,
    u.full_name,
    u.position,
    COALESCE(r.name, '❌ NO ROLE') AS assigned_role
FROM  public.users u
LEFT  JOIN public.user_roles ur ON ur.user_id = u.id
LEFT  JOIN public.roles r       ON r.id = ur.role_id
ORDER BY u.created_at DESC;
