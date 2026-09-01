-- ============================================================================
-- CHECK AND CREATE WAREHOUSE STAFF USERS
-- ============================================================================
-- Purpose: Ensure at least one user has WAREHOUSE_STAFF role for notifications
-- ============================================================================

DO $$ 
DECLARE
    admin_user_id UUID;
    warehouse_role_id UUID;
    warehouse_staff_count INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Checking Warehouse Staff Setup';
    RAISE NOTICE '========================================';
    
    -- Check if warehouse_staff role exists in roles table
    SELECT id INTO warehouse_role_id
    FROM roles
    WHERE LOWER(name) = 'warehouse_staff'
    LIMIT 1;
    
    IF warehouse_role_id IS NULL THEN
        RAISE NOTICE '❌ warehouse_staff role not found in roles table';
        RAISE NOTICE 'Creating warehouse_staff role...';
        
        INSERT INTO roles (name, description)
        VALUES ('warehouse_staff', 'Warehouse staff responsible for receiving and managing inventory')
        RETURNING id INTO warehouse_role_id;
        
        RAISE NOTICE '✅ Created warehouse_staff role with ID: %', warehouse_role_id;
    ELSE
        RAISE NOTICE '✅ warehouse_staff role exists with ID: %', warehouse_role_id;
    END IF;
    
    -- Check how many users have warehouse_staff role
    SELECT COUNT(*) INTO warehouse_staff_count
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE LOWER(r.name) = 'warehouse_staff';
    
    RAISE NOTICE 'Current warehouse staff count: %', warehouse_staff_count;
    
    IF warehouse_staff_count = 0 THEN
        RAISE NOTICE '⚠️  No users have warehouse_staff role!';
        RAISE NOTICE 'Looking for admin user to assign warehouse_staff role...';
        
        -- Find an admin user (or any user) to assign the role
        SELECT id INTO admin_user_id
        FROM auth.users
        ORDER BY created_at
        LIMIT 1;
        
        IF admin_user_id IS NOT NULL THEN
            -- Assign warehouse_staff role to this user
            INSERT INTO user_roles (user_id, role_id)
            VALUES (admin_user_id, warehouse_role_id)
            ON CONFLICT (user_id, role_id) DO NOTHING;
            
            RAISE NOTICE '✅ Assigned warehouse_staff role to user: %', admin_user_id;
            
            -- Also update the role field in users table if it exists
            UPDATE users
            SET role = 'WAREHOUSE_STAFF'
            WHERE id = admin_user_id;
            
            RAISE NOTICE '✅ Updated users.role field for user: %', admin_user_id;
        ELSE
            RAISE WARNING '⚠️  No users found in database! Create a user first.';
        END IF;
    ELSE
        RAISE NOTICE '✅ Found % warehouse staff user(s)', warehouse_staff_count;
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Summary Report';
    RAISE NOTICE '========================================';
    
END $$;

-- Verification Queries
DO $$
DECLARE
    role_check RECORD;
    user_check RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📊 VERIFICATION REPORT:';
    RAISE NOTICE '----------------------------------------';
    
    -- Check roles table
    RAISE NOTICE '';
    RAISE NOTICE '1️⃣  Roles in system:';
    FOR role_check IN 
        SELECT id, name, description 
        FROM roles 
        ORDER BY name
    LOOP
        RAISE NOTICE '   - % (ID: %)', role_check.name, role_check.id;
    END LOOP;
    
    -- Check users with warehouse_staff role
    RAISE NOTICE '';
    RAISE NOTICE '2️⃣  Users with warehouse_staff role:';
    FOR user_check IN
        SELECT 
            u.id,
            u.email,
            u.full_name,
            u.role as user_table_role,
            r.name as role_table_name
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        WHERE LOWER(r.name) = 'warehouse_staff'
           OR LOWER(u.role) = 'warehouse_staff'
    LOOP
        RAISE NOTICE '   - % (%) - Role: %/%', 
            user_check.full_name, 
            user_check.email,
            user_check.user_table_role,
            user_check.role_table_name;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    
END $$;

-- Show current user roles distribution
SELECT 
    COALESCE(r.name, u.role, 'NO_ROLE') as role_name,
    COUNT(*) as user_count
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN roles r ON r.id = ur.role_id
GROUP BY COALESCE(r.name, u.role, 'NO_ROLE')
ORDER BY user_count DESC;

COMMENT ON TABLE roles IS 'System roles for access control';
COMMENT ON TABLE user_roles IS 'Junction table linking users to their roles';

SELECT '✅ Warehouse staff check complete!' as status;
