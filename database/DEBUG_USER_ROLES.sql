-- ============================================================================
-- DEBUG USER ROLES - Find out why you're getting 403 errors
-- ============================================================================

-- STEP 1: Check all users in the system
SELECT 
  u.id,
  u.email,
  u.created_at,
  u.email_confirmed_at,
  u.last_sign_in_at
FROM auth.users u
ORDER BY u.created_at DESC;

-- STEP 2: Check what roles exist in the roles table
SELECT 
  id,
  name,
  description,
  created_at
FROM roles
ORDER BY name;

-- STEP 3: Check user_roles table (the connection between users and roles)
SELECT 
  ur.id,
  ur.user_id,
  u.email as user_email,
  ur.role_id,
  r.name as role_name,
  ur.assigned_at
FROM user_roles ur
LEFT JOIN auth.users u ON ur.user_id = u.id
LEFT JOIN roles r ON ur.role_id = r.id
ORDER BY ur.assigned_at DESC;

-- STEP 4: Combined view - Users with their roles
SELECT 
  u.id as user_id,
  u.email,
  COALESCE(
    ARRAY_AGG(r.name) FILTER (WHERE r.name IS NOT NULL),
    ARRAY[]::text[]
  ) as assigned_roles,
  COUNT(r.id) as role_count
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
GROUP BY u.id, u.email
ORDER BY u.created_at DESC;

-- STEP 5: Check if roles table is empty (common issue)
DO $$
DECLARE
  role_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO role_count FROM roles;
  
  IF role_count = 0 THEN
    RAISE NOTICE '❌ ROLES TABLE IS EMPTY! Need to create roles first.';
  ELSE
    RAISE NOTICE '✅ Found % roles in the system', role_count;
  END IF;
END $$;
