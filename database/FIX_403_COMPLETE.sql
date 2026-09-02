-- ============================================================================
-- COMPLETE 403 ERROR FIX
-- ============================================================================
-- This script will:
-- 1. Create roles if they don't exist
-- 2. Find your user account
-- 3. Assign admin role to your account
-- 4. Verify everything worked
-- ============================================================================

-- STEP 1: Create default roles (if they don't exist)
-- ============================================================================
INSERT INTO roles (name, description) VALUES
  ('admin', 'Full system access - can do everything'),
  ('manager', 'Management and reporting features'),
  ('operational_staff', 'Operational tasks: orders, inventory, suppliers'),
  ('warehouse_staff', 'Warehouse operations: receiving, picking, packing'),
  ('sales_staff', 'Sales operations and customer management')
ON CONFLICT (name) DO NOTHING;

-- Verify roles were created
SELECT '✅ Step 1 Complete: Roles in system' as status;
SELECT id, name, description FROM roles ORDER BY name;

-- ============================================================================
-- STEP 2: Show all users (to identify your email)
-- ============================================================================
SELECT '📧 Step 2: Your registered users' as status;
SELECT 
  email,
  created_at,
  last_sign_in_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ Confirmed'
    ELSE '⚠️ Not confirmed'
  END as email_status
FROM auth.users
ORDER BY created_at DESC;

-- ============================================================================
-- STEP 3A: Auto-assign admin role to the MOST RECENT user
-- (This is usually YOU if you just registered)
-- ============================================================================
DO $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_admin_role_id UUID;
BEGIN
  -- Get the most recent user (last registered)
  SELECT id, email INTO v_user_id, v_user_email
  FROM auth.users 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- Get admin role ID
  SELECT id INTO v_admin_role_id 
  FROM roles 
  WHERE name = 'admin';
  
  IF v_user_id IS NOT NULL AND v_admin_role_id IS NOT NULL THEN
    -- Assign admin role
    INSERT INTO user_roles (user_id, role_id)
    VALUES (v_user_id, v_admin_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
    
    RAISE NOTICE '✅ Assigned admin role to most recent user: %', v_user_email;
  ELSE
    RAISE NOTICE '❌ Could not assign role - user or role not found';
  END IF;
END $$;

-- ============================================================================
-- STEP 3B: ALTERNATIVE - Assign by specific email
-- If the auto-assign above didn't work, uncomment and edit this:
-- ============================================================================
/*
DO $$
DECLARE
  v_user_id UUID;
  v_admin_role_id UUID;
  v_email TEXT := 'your-email@example.com'; -- ⚠️ CHANGE THIS TO YOUR EMAIL
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  SELECT id INTO v_admin_role_id FROM roles WHERE name = 'admin';
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ User not found with email: %', v_email;
    RAISE NOTICE 'Check the email list above and make sure it matches exactly';
    RETURN;
  END IF;
  
  IF v_admin_role_id IS NULL THEN
    RAISE NOTICE '❌ Admin role not found';
    RETURN;
  END IF;
  
  INSERT INTO user_roles (user_id, role_id)
  VALUES (v_user_id, v_admin_role_id)
  ON CONFLICT (user_id, role_id) DO NOTHING;
  
  RAISE NOTICE '✅ Successfully assigned admin role to: %', v_email;
END $$;
*/

-- ============================================================================
-- STEP 4: VERIFY - Show all users with their assigned roles
-- ============================================================================
SELECT '🎯 Step 4: Final verification - Users with roles' as status;
SELECT 
  u.email,
  COALESCE(
    ARRAY_AGG(r.name ORDER BY r.name) FILTER (WHERE r.name IS NOT NULL),
    ARRAY[]::text[]
  ) as roles,
  CASE 
    WHEN COUNT(r.id) > 0 THEN '✅ Has roles'
    ELSE '❌ NO ROLES ASSIGNED'
  END as status
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
GROUP BY u.email
ORDER BY u.email;

-- ============================================================================
-- IMPORTANT NEXT STEPS:
-- ============================================================================
-- After running this script:
-- 
-- 1. ✅ Check the output above - you should see your email with ['admin'] role
-- 2. 🚪 SIGN OUT from your application completely
-- 3. 🔑 SIGN BACK IN to refresh your session
-- 4. ✅ Try accessing warehouse locations again
-- 5. 🎉 The 403 error should be gone!
--
-- If you still see 403 errors:
-- - Make sure you signed out and back in (this is critical!)
-- - Check browser console: localStorage.getItem('user') should show roles
-- - Clear browser cache/cookies and sign in again
-- ============================================================================
