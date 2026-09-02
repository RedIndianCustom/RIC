-- ============================================================
-- FIX MISSING ROLES FOR EXISTING USERS
-- ============================================================
-- Run this in Supabase SQL Editor to assign roles to any
-- users who signed up but didn't get a role assigned.
-- ============================================================

-- Step 1: Check which users are missing roles
SELECT
    u.id,
    u.email,
    u.full_name,
    u.position,
    u.employee_code,
    u.created_at,
    CASE WHEN ur.user_id IS NULL THEN '❌ NO ROLE' ELSE '✅ HAS ROLE' END AS role_status
FROM public.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
ORDER BY u.created_at DESC;

-- Step 2: Assign missing roles based on position column in users table
-- This inserts a role for any user who has a position but no user_role row
INSERT INTO public.user_roles (user_id, role_id)
SELECT
    u.id AS user_id,
    r.id AS role_id
FROM public.users u
INNER JOIN public.roles r ON r.name = u.position
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE ur.user_id IS NULL
  AND u.position IS NOT NULL
  AND u.position != '';

-- Step 3: For users with no position set, check employee metadata and assign
-- This handles users whose position is in auth.users metadata but not in public.users
INSERT INTO public.user_roles (user_id, role_id)
SELECT DISTINCT
    au.id AS user_id,
    r.id AS role_id
FROM auth.users au
INNER JOIN public.roles r ON r.name = (au.raw_user_meta_data ->> 'position')
LEFT JOIN public.user_roles ur ON ur.user_id = au.id
WHERE ur.user_id IS NULL
  AND (au.raw_user_meta_data ->> 'position') IS NOT NULL
  AND (au.raw_user_meta_data ->> 'position') != '';

-- Step 4: Also update public.users.position from metadata if missing
UPDATE public.users u
SET
    position = (au.raw_user_meta_data ->> 'position'),
    updated_at = now()
FROM auth.users au
WHERE au.id = u.id
  AND (u.position IS NULL OR u.position = '')
  AND (au.raw_user_meta_data ->> 'position') IS NOT NULL
  AND (au.raw_user_meta_data ->> 'position') != '';

-- Step 5: Verify the fix
SELECT
    u.id,
    u.email,
    u.full_name,
    u.position,
    r.name AS assigned_role,
    u.created_at
FROM public.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.roles r ON r.id = ur.role_id
ORDER BY u.created_at DESC;

-- ============================================================
-- EXPECTED RESULT:
-- Every user should now have an assigned_role
-- ============================================================
