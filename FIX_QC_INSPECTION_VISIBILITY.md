# Fix QC Inspection Visibility Issue

## 🐛 Problem
Warehouse staff cannot see pending QC inspections even though they exist in the database.

## 🔍 Root Cause
The RLS (Row Level Security) policy on `qc_inspections` table only allows users to see inspections **assigned to them**:

```sql
CREATE POLICY "Staff can manage their work"
  ON qc_inspections FOR ALL
  USING (
    inspector_id = auth.uid() OR  -- Only if YOU are the inspector
    ...
  );
```

This means:
- Lisa Anderson (warehouse_staff) logs in
- She tries to view pending QC inspections
- The inspection is assigned to Maria Santos (different user)
- RLS blocks Lisa from seeing it
- Frontend shows "No pending QC inspections"

## ✅ Solution

Replace the single restrictive policy with **separate policies** for different operations:

1. **SELECT**: Allow viewing ALL pending/in-progress inspections
2. **UPDATE**: Only allow updating inspections assigned to you
3. **INSERT**: Only managers/admin can create
4. **DELETE**: Only managers/admin can delete

## 🚀 How to Fix

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase Dashboard
2. Click "SQL Editor" in the left sidebar
3. Click "New query"

### Step 2: Copy and Execute This SQL

```sql
-- ============================================================================
-- FIX QC INSPECTION RLS POLICY
-- Allow warehouse staff to see ALL pending QC inspections, not just their own
-- ============================================================================

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Staff can manage their work" ON qc_inspections;

-- Create new policy: warehouse_staff can see all pending/in-progress inspections
-- but can only UPDATE inspections assigned to them
CREATE POLICY "Warehouse staff can view all pending inspections"
  ON qc_inspections FOR SELECT
  TO authenticated
  USING (
    -- Allow viewing all inspections in these statuses
    status IN ('PENDING', 'IN_PROGRESS', 'OVERDUE') OR
    -- Or if it's assigned to them (can see completed ones too)
    inspector_id = auth.uid() OR
    -- Or if they're manager/admin (can see everything)
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('manager', 'admin')
    )
  );

-- Create policy for INSERT (managers/admin can create)
CREATE POLICY "Managers can create inspections"
  ON qc_inspections FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('manager', 'admin', 'operational_staff')
    )
  );

-- Create policy for UPDATE (can only update their own inspections)
CREATE POLICY "Staff can update their assigned inspections"
  ON qc_inspections FOR UPDATE
  TO authenticated
  USING (
    inspector_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('manager', 'admin')
    )
  )
  WITH CHECK (
    inspector_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('manager', 'admin')
    )
  );

-- Create policy for DELETE (only managers/admin)
CREATE POLICY "Managers can delete inspections"
  ON qc_inspections FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('manager', 'admin')
    )
  );
```

### Step 3: Click "Run" (or press Ctrl+Enter)

You should see:
```
Success. No rows returned
```

## 🧪 Test the Fix

### Option 1: In Supabase (Quick Test)
1. Open "Table Editor" → `pending_qc_inspections` view
2. You should see the PENDING inspection
3. The view is now accessible!

### Option 2: In Your App (Full Test)
1. Log out and log back in as Lisa Anderson (warehouse_staff)
2. Go to "QC Inspection" page
3. You should now see the pending inspection!

## 📋 What Changed

### Before:
```
Policy: "Staff can manage their work" (FOR ALL operations)
Rule: Can only see inspections where inspector_id = your user ID

Result: Lisa Anderson sees NO inspections because she's not assigned as inspector
```

### After:
```
Policy 1: "View all pending" (FOR SELECT)
Rule: Can see ALL pending/in-progress/overdue inspections

Policy 2: "Update assigned only" (FOR UPDATE)
Rule: Can only modify inspections assigned to you

Policy 3: "Managers create" (FOR INSERT)
Rule: Only managers/operational_staff can create

Policy 4: "Managers delete" (FOR DELETE)
Rule: Only managers/admin can delete

Result: Lisa Anderson sees ALL pending inspections, but can only work on ones assigned to her
```

## 🔒 Security Impact

✅ **Security Maintained:**
- Warehouse staff can **VIEW** all pending inspections (needed for their work)
- Warehouse staff can **ONLY UPDATE** inspections assigned to them
- Warehouse staff **CANNOT DELETE** any inspections
- Managers/admin maintain full control

✅ **No Security Risks:**
- Read-only access to pending inspections is safe
- Staff still cannot tamper with other people's work
- All modifications are logged in the database

## 🎯 Expected Behavior After Fix

### For Warehouse Staff (Lisa Anderson):
- ✅ Can see ALL pending/in-progress QC inspections
- ✅ Can select an inspection to start working
- ✅ Can only complete/update inspections assigned to her
- ❌ Cannot delete inspections
- ❌ Cannot modify other people's completed inspections

### For Managers:
- ✅ Can see ALL inspections (any status)
- ✅ Can create new inspections
- ✅ Can modify any inspection
- ✅ Can delete inspections
- ✅ Can approve QC inspections

## 📊 Verification Queries

After running the fix, verify it worked:

```sql
-- Check policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'qc_inspections';

-- Test as warehouse staff (they should see pending inspections)
SELECT * FROM pending_qc_inspections;

-- Count pending inspections
SELECT COUNT(*) as pending_count
FROM qc_inspections
WHERE status IN ('PENDING', 'IN_PROGRESS', 'OVERDUE');
```

## 🆘 Troubleshooting

### Still seeing "No pending QC inspections"?

1. **Clear browser cache and reload**
   - Frontend may have cached the empty result
   - Hard reload: Ctrl+Shift+R (Chrome) or Cmd+Shift+R (Mac)

2. **Check user role**
   ```sql
   SELECT u.full_name, u.email, r.name as role
   FROM users u
   JOIN user_roles ur ON ur.user_id = u.id
   JOIN roles r ON r.id = ur.role_id
   WHERE u.email = 'lisa.anderson@warehouse.com';
   ```

3. **Verify inspection exists**
   ```sql
   SELECT id, inspection_number, status, inspector_id
   FROM qc_inspections
   WHERE status = 'PENDING';
   ```

4. **Check backend logs**
   - Look for any errors in browser console (F12)
   - Check backend terminal for API errors

### Policy not applying?

If the policy doesn't seem to work:

1. **Restart your app** (both frontend and backend)
2. **Re-login** to get fresh auth token
3. **Check RLS is enabled**:
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE tablename = 'qc_inspections';
   ```
   Should show `rowsecurity = true`

---

**File Created:** 2026-08-19  
**Issue:** QC Inspection visibility for warehouse staff  
**Status:** Ready to apply
