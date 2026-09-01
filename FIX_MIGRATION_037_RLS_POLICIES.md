# Fix for Migration 037 - RLS Policy Column Name Error

## Error
```
ERROR: 42703: column ur.role_name does not exist
```

## Root Cause
The RLS policies in `037_warehouse_operations.sql` were referencing `ur.role_name`, but the `user_roles` table uses `role_id` (UUID foreign key to `roles` table), not `role_name`.

## Fix Applied
Changed all RLS policy queries from:
```sql
-- ❌ WRONG
EXISTS (
  SELECT 1 FROM user_roles ur
  WHERE ur.user_id = auth.uid()
  AND ur.role_name IN ('warehouse_staff', 'admin', 'manager')
)
```

To:
```sql
-- ✅ CORRECT
EXISTS (
  SELECT 1 FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid()
  AND r.name IN ('warehouse_staff', 'admin', 'manager')
)
```

## Database Schema Reference
```sql
-- user_roles table structure
CREATE TABLE user_roles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  role_id UUID REFERENCES roles(id),  -- ✅ Uses role_id, not role_name
  -- ...
);

-- roles table structure
CREATE TABLE roles (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE,  -- ✅ 'admin', 'manager', 'warehouse_staff', etc.
  -- ...
);
```

## Policies Fixed
1. ✅ "Warehouse staff can view tasks" policy
2. ✅ "Warehouse staff can update assigned tasks" policy
3. ✅ "Warehouse staff can view picking tasks" policy
4. ✅ "Warehouse staff can view performance" policy

## How to Execute (Now Fixed)

### Supabase SQL Editor:
1. Open Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy **ALL** content from `backend/database/037_warehouse_operations.sql`
4. Paste and click "Run"
5. ✅ Should succeed without errors

## Verification Query
After executing, verify policies were created:
```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN (
  'warehouse_tasks',
  'picking_tasks',
  'packing_tasks',
  'warehouse_staff_performance'
)
ORDER BY tablename, policyname;
```

Should return 4 policies.

## Related Files
- `backend/database/037_warehouse_operations.sql` - Fixed file
- `backend/database/038_enhanced_receiving_qc_workflow.sql` - Also uses same pattern (check if needed)

## Status
✅ **FIXED** - Ready to execute
