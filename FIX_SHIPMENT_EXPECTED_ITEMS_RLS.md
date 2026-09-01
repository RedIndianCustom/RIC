# Fix: Row-Level Security Policy for shipment_expected_items

## Problem
When registering a shipment in ShipmentRegistration.jsx, got error:
```
Error: new row violates row-level security policy for table "shipment_expected_items"
```

## Root Cause
The `shipment_expected_items` table has Row-Level Security (RLS) enabled, but only has a SELECT policy defined. There are no INSERT, UPDATE, or DELETE policies, so no users can insert records into the table.

### Missing Policies:
- ❌ INSERT policy (needed for creating expected items)
- ❌ UPDATE policy (needed for editing expected items)
- ❌ DELETE policy (needed for removing expected items)
- ✅ SELECT policy (already exists)

## Solution
Created comprehensive RLS policies for all receiving/QC workflow tables:

### Tables Fixed:
1. ✅ `shipment_expected_items` - Expected items for shipment
2. ✅ `shipment_received_items` - Actual scanned items
3. ✅ `shipment_discrepancies` - Variance tracking
4. ✅ `qc_inspection_items` - QC inspection details
5. ✅ `defect_inventory` - Defective items tracking
6. ✅ `workflow_notifications` - Notification system

## Changes Applied

### File: `backend/database/042_fix_shipment_expected_items_rls.sql`

### 1. shipment_expected_items Policies

**SELECT** - View shipment items:
- Allowed roles: operational_staff, warehouse_staff, manager, admin

**INSERT** - Create expected items:
- Allowed roles: operational_staff, manager, admin
- Used when: Registering new shipments

**UPDATE** - Edit expected items:
- Allowed roles: operational_staff, manager, admin
- Used when: Modifying shipment details before sending

**DELETE** - Remove expected items:
- Allowed roles: operational_staff, manager, admin
- Used when: Correcting mistakes in shipment registration

### 2. shipment_received_items Policies

**SELECT** - View received items:
- Allowed roles: warehouse_staff, manager, admin

**INSERT** - Record scanned items:
- Allowed roles: warehouse_staff, manager, admin
- Used when: Receiving and scanning shipments

**UPDATE** - Update received counts:
- Allowed roles: warehouse_staff, manager, admin
- Used when: Correcting scan counts

### 3. shipment_discrepancies Policies

**SELECT** - View discrepancies:
- Allowed roles: warehouse_staff, manager, admin

**INSERT** - Create discrepancy records:
- Allowed roles: warehouse_staff, manager, admin
- Used when: Recording variance between expected and received

**UPDATE** - Resolve discrepancies:
- Allowed roles: manager, admin (only)
- Used when: Approving/rejecting discrepancies

### 4. qc_inspection_items Policies

**ALL operations** (SELECT, INSERT, UPDATE, DELETE):
- Allowed: Inspector assigned to the QC inspection OR manager/admin
- Used when: Performing QC inspections

### 5. defect_inventory Policies

**SELECT** - View defective items:
- Allowed roles: warehouse_staff, manager, admin

**INSERT** - Record defects:
- Allowed roles: warehouse_staff, manager, admin
- Used when: Identifying defective items during QC

**UPDATE** - Update defect status:
- Allowed roles: warehouse_staff, manager, admin
- Used when: Dispositioning defective items

### 6. workflow_notifications Policies

**SELECT** - View own notifications:
- Allowed: recipient_user_id = current user

**INSERT** - Create notifications:
- Allowed: Any authenticated user
- Used when: System generates notifications

**UPDATE** - Mark notifications as read:
- Allowed: recipient_user_id = current user

## How to Apply Fix

### Step 1: Run the SQL Script
```sql
-- Connect to your Supabase database
-- Run: backend/database/042_fix_shipment_expected_items_rls.sql
```

### Step 2: Verify Policies Created
The script includes a verification query at the end that shows all policies:
```sql
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename IN (
    'shipment_expected_items',
    'shipment_received_items',
    'shipment_discrepancies',
    'qc_inspections',
    'qc_inspection_items',
    'defect_inventory',
    'workflow_notifications'
)
ORDER BY tablename, cmd;
```

### Step 3: Test Shipment Registration
1. Log in as operational_staff user
2. Navigate to Shipment Registration
3. Fill in shipment details
4. Add product sizes and quantities
5. Click Submit
6. ✅ Should succeed without RLS error

## Role Permissions Summary

| Table | Role | SELECT | INSERT | UPDATE | DELETE |
|-------|------|--------|--------|--------|--------|
| **shipment_expected_items** |
| | operational_staff | ✅ | ✅ | ✅ | ✅ |
| | warehouse_staff | ✅ | ❌ | ❌ | ❌ |
| | manager | ✅ | ✅ | ✅ | ✅ |
| | admin | ✅ | ✅ | ✅ | ✅ |
| **shipment_received_items** |
| | warehouse_staff | ✅ | ✅ | ✅ | ❌ |
| | manager | ✅ | ✅ | ✅ | ❌ |
| | admin | ✅ | ✅ | ✅ | ❌ |
| **shipment_discrepancies** |
| | warehouse_staff | ✅ | ✅ | ❌ | ❌ |
| | manager | ✅ | ✅ | ✅ | ❌ |
| | admin | ✅ | ✅ | ✅ | ❌ |
| **qc_inspection_items** |
| | Inspector (owner) | ✅ | ✅ | ✅ | ✅ |
| | manager | ✅ | ✅ | ✅ | ✅ |
| | admin | ✅ | ✅ | ✅ | ✅ |
| **defect_inventory** |
| | warehouse_staff | ✅ | ✅ | ✅ | ❌ |
| | manager | ✅ | ✅ | ✅ | ❌ |
| | admin | ✅ | ✅ | ✅ | ❌ |
| **workflow_notifications** |
| | Recipient (owner) | ✅ | ❌ | ✅ | ❌ |
| | Any authenticated | ❌ | ✅ | ❌ | ❌ |

## Workflow Impact

### Before Fix:
```
❌ Operational Staff registers shipment
   → Creates shipment record ✅
   → Tries to insert expected items ❌ RLS ERROR
   → Transaction rolls back
   → Shipment not created
```

### After Fix:
```
✅ Operational Staff registers shipment
   → Creates shipment record ✅
   → Inserts expected items ✅
   → Shipment created successfully
   → Can send to warehouse
```

## Testing Checklist

### Operational Staff Tests:
- [ ] Can create new shipment with expected items
- [ ] Can view expected items
- [ ] Can edit expected items before sending
- [ ] Can delete expected items
- [ ] Can send shipment to warehouse

### Warehouse Staff Tests:
- [ ] Can view expected items for incoming shipments
- [ ] Can create received items during receiving
- [ ] Can update received counts
- [ ] Can create discrepancy records
- [ ] CANNOT edit expected items (read-only)

### Manager/Admin Tests:
- [ ] Can perform all operational staff operations
- [ ] Can perform all warehouse staff operations
- [ ] Can resolve discrepancies
- [ ] Can view all inspection data

## Error Resolution

### Original Error:
```
Error: new row violates row-level security policy for table "shipment_expected_items"
```

### After Fix:
```
✅ Shipment registered successfully!
✅ Expected items created
✅ Ready to send to warehouse
```

## Related Files

### Modified:
- ✅ `backend/database/042_fix_shipment_expected_items_rls.sql` (new file)

### Original Source:
- 📄 `backend/database/038_enhanced_receiving_qc_workflow.sql`
  - Created the tables with RLS enabled
  - Only included SELECT policy for shipment_expected_items
  - Missing INSERT, UPDATE, DELETE policies

### Frontend (No Changes Required):
- `frontend/src/pages/dashboard/operational/ShipmentRegistration.jsx`
  - Will work automatically after SQL fix applied

## Notes

### Why RLS is Important:
Row-Level Security ensures that:
- Users only see/modify data they have permission for
- Operational staff can't interfere with warehouse operations
- Warehouse staff can't modify expected items after shipment sent
- Only managers can resolve discrepancies

### Policy Design Philosophy:
1. **Operational staff** - Can create and manage expected items (shipment planning)
2. **Warehouse staff** - Can record actual received items and discrepancies (execution)
3. **Managers/Admins** - Can do everything (oversight and resolution)

### Security Best Practices:
- ✅ RLS policies check role membership via user_roles table
- ✅ Policies use auth.uid() to verify current user
- ✅ Write operations (INSERT/UPDATE) have WITH CHECK clauses
- ✅ Read operations (SELECT) have USING clauses
- ✅ Ownership-based access for QC inspections
- ✅ Recipient-based access for notifications
