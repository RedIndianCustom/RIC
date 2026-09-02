-- Check PostgREST configuration

-- Check what schemas are exposed to the API
SHOW db_schemas;

-- If that doesn't work, try this:
SELECT current_setting('pgrst.db_schemas', true) as exposed_schemas;

-- Also check if there's a postgrest role
SELECT rolname FROM pg_roles WHERE rolname LIKE '%postgrest%' OR rolname LIKE '%pgrst%';

-- Check all roles
SELECT rolname FROM pg_roles ORDER BY rolname;

-- Check what the authenticator role can see
SELECT
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'products'
ORDER BY grantee, privilege_type;
