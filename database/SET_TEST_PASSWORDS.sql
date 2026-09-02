-- ============================================================================
-- SET TEST PASSWORDS FOR OPERATIONAL STAFF
-- ============================================================================
-- This script sets the password "Password123!" for operational staff test accounts
-- WARNING: Only use this for development/testing! Use secure passwords in production!
-- ============================================================================

-- Set password for Sarah Williams
UPDATE auth.users 
SET encrypted_password = crypt('Password123!', gen_salt('bf'))
WHERE email = 'sarah.williams@redindiancustoms.com';

-- Set password for Emily Davis
UPDATE auth.users 
SET encrypted_password = crypt('Password123!', gen_salt('bf'))
WHERE email = 'emily.davis@redindiancustoms.com';

-- Verify users
SELECT 
  id,
  email,
  confirmed_at IS NOT NULL as is_confirmed,
  user_metadata->>'position' as position,
  user_metadata->>'fullName' as full_name
FROM auth.users
WHERE email IN (
  'sarah.williams@redindiancustoms.com',
  'emily.davis@redindiancustoms.com'
);

-- ============================================================================
-- LOGIN CREDENTIALS (for testing):
-- ============================================================================
-- Email: sarah.williams@redindiancustoms.com
-- Password: Password123!
-- 
-- Email: emily.davis@redindiancustoms.com  
-- Password: Password123!
-- ============================================================================
