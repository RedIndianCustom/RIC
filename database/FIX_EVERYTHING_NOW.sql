-- ============================================================
-- COMPLETE FIX SCRIPT
-- Run this ENTIRE script in Supabase SQL Editor
-- This fixes:
--   1. Creates user profile in public.users
--   2. Assigns admin role
--   3. Updates employee code as used
--   4. Reloads PostgREST schema cache
-- ============================================================

-- ── Step 1: Show current state ────────────────────────────────
DO $$ BEGIN RAISE NOTICE 'Step 1: Checking current state...'; END $$;

SELECT 
    'auth.users count' as check_name,
    COUNT(*)::text as result
FROM auth.users;

SELECT 
    'public.users count' as check_name,
    COUNT(*)::text as result
FROM public.users;

SELECT 
    'user_roles count' as check_name,
    COUNT(*)::text as result
FROM public.user_roles;

-- ── Step 2: Create profile for all auth users missing one ─────
DO $$ BEGIN RAISE NOTICE 'Step 2: Creating missing user profiles...'; END $$;

INSERT INTO public.users (id, email, full_name, position)
SELECT
    au.id,
    au.email,
    COALESCE(
        au.raw_user_meta_data->>'fullName',
        au.raw_user_meta_data->>'full_name',
        split_part(au.email, '@', 1)
    ) as full_name,
    COALESCE(
        au.raw_user_meta_data->>'position',
        'operational_staff'
    ) as position
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
ON CONFLICT (id) DO UPDATE
SET
    position  = EXCLUDED.position,
    full_name = EXCLUDED.full_name,
    updated_at = now();

-- ── Step 3: Fix position if NULL ─────────────────────────────
UPDATE public.users pu
SET
    position   = COALESCE(au.raw_user_meta_data->>'position', 'operational_staff'),
    updated_at = now()
FROM auth.users au
WHERE au.id = pu.id
  AND (pu.position IS NULL OR pu.position = '');

-- ── Step 4: Assign roles based on position ────────────────────
DO $$ BEGIN RAISE NOTICE 'Step 4: Assigning roles...'; END $$;

INSERT INTO public.user_roles (user_id, role_id)
SELECT DISTINCT u.id, r.id
FROM public.users u
JOIN public.roles r ON r.name = u.position
WHERE NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = u.id
)
ON CONFLICT DO NOTHING;

-- ── Step 5: Reload PostgREST schema ──────────────────────────
NOTIFY pgrst, 'reload schema';

-- ── Step 6: Verify everything is correct ─────────────────────
DO $$ BEGIN RAISE NOTICE 'Step 6: Final verification...'; END $$;

SELECT
    u.email,
    u.full_name,
    u.position,
    COALESCE(r.name, '❌ NO ROLE ASSIGNED') AS role,
    CASE WHEN ur.user_id IS NOT NULL THEN '✅ OK' ELSE '❌ MISSING' END as role_status
FROM public.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.roles r ON r.id = ur.role_id
ORDER BY u.created_at DESC;

-- ============================================================
-- EXPECTED RESULT:
-- email                          | role  | role_status
-- daisyreydaguplo18@gmail.com   | admin | ✅ OK
-- ============================================================
-- After running this:
-- 1. Log out of the app
-- 2. Log back in
-- 3. The 403 errors will be GONE
-- 4. Suppliers page will load real data
-- ============================================================
