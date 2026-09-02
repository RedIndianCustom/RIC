-- ============================================================================
-- ASSIGN ROLES TO USER ACCOUNT
-- ============================================================================
-- This script helps you assign roles to your user account to fix 403 errors
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
-- ============================================================================

-- STEP 1: Check existing users and their roles
-- This shows you all registered users and what roles they currently have
SELECT 
  u.id as user_id,
  u.email,
  u.created_at,
  COALESCE(ARRAY_AGG(r.name) FILTER (WHERE r.name IS NOT NULL), ARRAY[]::text[]) as current_roles
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
GROUP BY u.id, u.email, u.created_at
ORDER BY u.created_at DESC;

-- ============================================================================
-- STEP 2: Check what roles are available in the system
-- ============================================================================
SELECT id, name, description, created_at
FROM roles
ORDER BY name;

-- ============================================================================
-- STEP 3: ASSIGN ADMIN ROLE TO A SPECIFIC USER
-- ============================================================================
-- METHOD 1: Assign admin role by email (RECOMMENDED)
-- Replace 'your-email@example.com' with your actual email address

DO $$
DECLARE
  v_user_id UUID;
  v_admin_role_id UUID;
  v_email TEXT := 'your-email@example.com'; -- ⚠️ CHANGE THIS TO YOUR EMAIL
BEGIN
  -- Get user ID by email
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = v_email;
  
  -- Get admin role ID
  SELECT id INTO v_admin_role_id 
  FROM roles 
  WHERE name = 'admin';
  
  -- Check if user exists
  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ User with email % not found', v_email;
    RETURN;
  END IF;
  
  -- Check if role exists
  IF v_admin_role_id IS NULL THEN
    RAISE NOTICE '❌ Admin role not found in roles table';
    RETURN;
  END IF;
  
  -- Assign admin role
  INSERT INTO user_roles (user_id, role_id)
  VALUES (v_user_id, v_admin_role_id)
  ON CONFLICT (user_id, role_id) DO NOTHING;
  
  RAISE NOTICE '✅ Successfully assigned admin role to %', v_email;
END $$;

-- ============================================================================
-- METHOD 2: Assign admin role to the FIRST registered user
-- Use this if you're the first/only user
-- ============================================================================

-- Uncomment the code below to use this method:
/*
DO $$
DECLARE
  v_user_id UUID;
  v_admin_role_id UUID;
BEGIN
  -- Get the first user (oldest account)
  SELECT id INTO v_user_id 
  FROM auth.users 
  ORDER BY created_at ASC 
  LIMIT 1;
  
  -- Get admin role ID
  SELECT id INTO v_admin_role_id 
  FROM roles 
  WHERE name = 'admin';
  
  IF v_user_id IS NOT NULL AND v_admin_role_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id)
    VALUES (v_user_id, v_admin_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
    
    RAISE NOTICE '✅ Assigned admin role to first user: %', v_user_id;
  ELSE
    RAISE NOTICE '❌ Could not find user or admin role';
  END IF;
END $$;
*/

-- ============================================================================
-- METHOD 3: Assign multiple roles to a user
-- Use this if you want to give a user multiple roles at once
-- ============================================================================

-- Uncomment and modify the code below:
/*
DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'your-email@example.com'; -- ⚠️ CHANGE THIS
  v_role_name TEXT;
  v_role_id UUID;
  v_roles TEXT[] := ARRAY['admin', 'manager']; -- Add roles you want to assign
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ User not found: %', v_email;
    RETURN;
  END IF;
  
  -- Loop through roles and assign each one
  FOREACH v_role_name IN ARRAY v_roles
  LOOP
    SELECT id INTO v_role_id FROM roles WHERE name = v_role_name;
    
    IF v_role_id IS NOT NULL THEN
      INSERT INTO user_roles (user_id, role_id)
      VALUES (v_user_id, v_role_id)
      ON CONFLICT (user_id, role_id) DO NOTHING;
      
      RAISE NOTICE '✅ Assigned % role to %', v_role_name, v_email;
    ELSE
      RAISE NOTICE '⚠️  Role not found: %', v_role_name;
    END IF;
  END LOOP;
END $$;
*/

-- ============================================================================
-- STEP 4: VERIFY THE ASSIGNMENT
-- Run this to confirm roles were assigned correctly
-- ============================================================================
SELECT 
  u.id as user_id,
  u.email,
  COALESCE(ARRAY_AGG(r.name) FILTER (WHERE r.name IS NOT NULL), ARRAY[]::text[]) as assigned_roles
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
GROUP BY u.id, u.email
ORDER BY u.created_at DESC;

-- ============================================================================
-- OPTIONAL: Remove a role from a user
-- ============================================================================
-- Uncomment and modify if you need to remove a role:
/*
DELETE FROM user_roles
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com')
  AND role_id = (SELECT id FROM roles WHERE name = 'admin');
*/

-- ============================================================================
-- NOTES:
-- ============================================================================
-- After running this script:
-- 1. Sign out from your application
-- 2. Sign back in to refresh your session
-- 3. The 403 errors should disappear
-- 4. You'll have access to all admin features
--
-- Available roles in the system:
-- - admin: Full system access
-- - manager: Management and reporting features
-- - operational_staff: Operational tasks (orders, inventory, suppliers)
-- - warehouse_staff: Warehouse operations (receiving, picking, packing)
-- - sales_staff: Sales operations
-- ============================================================================
