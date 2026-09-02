-- Script to assign default roles to users for testing
-- This helps resolve 403 permission errors

-- First, let's see what users exist
SELECT 
  u.id,
  u.email,
  u.created_at,
  ARRAY_AGG(r.name) as roles
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
GROUP BY u.id, u.email, u.created_at
ORDER BY u.created_at DESC;

-- Assign 'admin' role to the first user (or specific user by email)
-- Replace 'your-email@example.com' with actual email if needed
DO $$
DECLARE
  v_user_id UUID;
  v_admin_role_id UUID;
BEGIN
  -- Get the first user or specific user
  SELECT id INTO v_user_id 
  FROM auth.users 
  ORDER BY created_at ASC 
  LIMIT 1;
  
  -- Get admin role ID
  SELECT id INTO v_admin_role_id 
  FROM roles 
  WHERE name = 'admin';
  
  -- Assign admin role if user and role exist
  IF v_user_id IS NOT NULL AND v_admin_role_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id)
    VALUES (v_user_id, v_admin_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
    
    RAISE NOTICE 'Assigned admin role to user: %', v_user_id;
  ELSE
    RAISE NOTICE 'Could not find user or admin role';
  END IF;
END $$;

-- Verify the assignment
SELECT 
  u.id,
  u.email,
  ARRAY_AGG(r.name) as roles
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
GROUP BY u.id, u.email;
