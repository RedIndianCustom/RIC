# Column Name Fixes - role_name → roles.name

## Issue
Multiple files were incorrectly referencing `role_name` column in `user_roles` table, which doesn't exist.

## Database Schema
```sql
-- user_roles table (ACTUAL structure)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  role_id UUID REFERENCES roles(id),  -- Foreign key to roles table
  created_at TIMESTAMPTZ
);

-- roles table
CREATE TABLE roles (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE,  -- 'admin', 'manager', 'warehouse_staff', etc.
  description TEXT
);
```

**Key Point**: `user_roles` uses `role_id` (UUID), NOT `role_name` (TEXT).

---

## Files Fixed

### 1. ✅ `backend/database/037_warehouse_operations.sql`

**Error**:
```
ERROR: 42703: column ur.role_name does not exist
```

**Fixed 4 RLS Policies**:
- "Warehouse staff can view tasks"
- "Warehouse staff can update assigned tasks"
- "Warehouse staff can view picking tasks"
- "Warehouse staff can view performance"

**Before (WRONG)**:
```sql
EXISTS (
  SELECT 1 FROM user_roles ur
  WHERE ur.user_id = auth.uid()
  AND ur.role_name IN ('warehouse_staff', 'admin', 'manager')  -- ❌ role_name doesn't exist
)
```

**After (CORRECT)**:
```sql
EXISTS (
  SELECT 1 FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id  -- ✅ Join to get role name
  WHERE ur.user_id = auth.uid()
  AND r.name IN ('warehouse_staff', 'admin', 'manager')
)
```

---

### 2. ✅ `backend/src/controllers/receivingQcController.js`

**Fixed 2 Functions**:
- `createNotification()` - Helper function (line ~697)
- `createWorkflowNotification()` - Exported API endpoint (line ~853)

**Before (WRONG)**:
```javascript
const { data: users } = await supabase
  .from('user_roles')
  .select('user_id')
  .eq('role_name', role.toLowerCase());  // ❌ role_name doesn't exist
```

**After (CORRECT)**:
```javascript
const { data: users } = await supabase
  .from('user_roles')
  .select('user_id, roles!inner(name)')  // ✅ Join roles table
  .eq('roles.name', role.toLowerCase());
```

**Supabase Syntax Notes**:
- `roles!inner(name)` - Inner join with roles table, select name field
- `.eq('roles.name', value)` - Filter on joined table field

---

## Verification

### Test SQL Query (Run in Supabase SQL Editor):
```sql
-- Verify user_roles structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_roles'
ORDER BY ordinal_position;

-- Should show: id, user_id, role_id, created_at
-- Should NOT show: role_name

-- Test the corrected join pattern
SELECT 
  ur.user_id,
  r.name as role_name
FROM user_roles ur
JOIN roles r ON r.id = ur.role_id
LIMIT 5;
```

### Test Backend API:
```bash
# After backend restart
node backend/test-inventory-api.mjs
```

---

## Migration Execution (NOW READY)

### Migration 037:
1. Open Supabase Dashboard → SQL Editor
2. Open file: `backend/database/037_warehouse_operations.sql`
3. Copy **ALL** content
4. Paste into SQL Editor
5. Click "Run"
6. ✅ Should succeed: "Success. No rows returned"

### Migration 036:
1. Open file: `backend/database/036_inventory_advanced_features.sql`
2. Copy **ALL** content
3. Paste into SQL Editor
4. Click "Run"
5. ✅ Should succeed: "Success. No rows returned"

---

## Impact

### Before Fixes:
❌ Migration 037 fails with column error  
❌ Notifications fail to send (can't find users by role)  
❌ RLS policies fail (nobody has permissions)

### After Fixes:
✅ Migration 037 executes successfully  
✅ Notifications send to correct users by role  
✅ RLS policies work correctly  
✅ "Send to Warehouse" button works  
✅ Warehouse staff can access their tasks

---

## Other Files Checked (No Issues Found)

✅ `backend/database/036_inventory_advanced_features.sql` - No role_name usage  
✅ `backend/database/038_enhanced_receiving_qc_workflow.sql` - No role_name usage

---

## Testing Checklist

After executing migrations and restarting backend:

- [ ] Run: `node backend/test-inventory-api.mjs` - All tests pass
- [ ] Inventory page loads without errors
- [ ] Incoming Shipments Enhanced page loads
- [ ] Click "Send to Warehouse" - Success message appears
- [ ] Check backend logs - "Notification sent to X user(s)"
- [ ] Login as warehouse staff - Notification appears
- [ ] Warehouse tasks page loads (no RLS errors)

---

## Files Modified

1. ✅ `backend/database/037_warehouse_operations.sql` - Fixed 4 RLS policies
2. ✅ `backend/src/controllers/receivingQcController.js` - Fixed 2 functions
3. 📄 `FIX_MIGRATION_037_RLS_POLICIES.md` - Documentation
4. 📄 `COLUMN_NAME_FIXES_COMPLETE.md` - This file

---

## Next Steps

1. **Execute migrations in order**:
   - First: `036_inventory_advanced_features.sql`
   - Second: `037_warehouse_operations.sql`
   - Third: `038_enhanced_receiving_qc_workflow.sql` (if not done)

2. **Restart backend server**:
   ```bash
   # In backend directory
   npm run dev
   ```

3. **Test complete workflow**:
   - Operational: Register shipment → Send to warehouse
   - Warehouse: Receive notification → Start receiving
   - Check: No role or column errors in logs

4. **Verify database**:
   - All tables created
   - All RLS policies active
   - User permissions working

---

## Technical Notes

### Supabase Foreign Key Syntax:
```javascript
// Inner join (ONLY returns records with matching role)
.select('user_id, roles!inner(name)')

// Left join (returns all user_roles, even without role)
.select('user_id, roles(name)')

// Multiple fields from joined table
.select('user_id, roles!inner(id, name, description)')
```

### Filter on Joined Table:
```javascript
// ✅ CORRECT
.eq('roles.name', 'admin')

// ❌ WRONG
.eq('role_name', 'admin')
```

---

## Common Errors & Solutions

### "column role_name does not exist"
**Cause**: Using old column name  
**Solution**: Join roles table and use `r.name`

### "No users found with role: X"
**Cause**: Role name case mismatch or typo  
**Solution**: Check roles table for exact names (lowercase)

### "RLS policy violation"
**Cause**: Policies not updated to use join  
**Solution**: Re-execute migration 037 with fixes

---

## Success Criteria

✅ All migrations execute without errors  
✅ Backend starts without errors  
✅ Inventory page loads with stats  
✅ Send to Warehouse works  
✅ Notifications reach warehouse staff  
✅ No "column does not exist" errors  
✅ RLS policies enforce correctly
