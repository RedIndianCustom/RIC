# Batch Deactivation Error Fix

## Error
```
Error deactivating batch: Error: Failed to delete batch
```

## Root Cause

The database has a CHECK constraint on `batches.status` that **does not include 'INACTIVE'**:

```sql
-- Current constraint (WRONG):
CHECK (status IN ('ACTIVE','RECEIVED','APPROVED','REJECTED','CLOSED'))
-- Missing: 'INACTIVE', 'COMPLETED'
```

When the backend tries to soft delete by updating to 'INACTIVE':
```javascript
UPDATE batches SET status = 'INACTIVE' WHERE id = ...
```

The database rejects it because 'INACTIVE' is not in the allowed values.

---

## Solution

Run the SQL migration to fix the constraint:

**File:** `backend/database/039_fix_batch_status_constraint.sql`

This script will:
1. ✅ Drop old conflicting constraints
2. ✅ Add new constraint with ALL valid statuses including 'INACTIVE'
3. ✅ Verify the fix worked
4. ✅ Check for any batches with invalid status values

### Valid Statuses After Fix:
- `ACTIVE` - Normal operating status
- `INACTIVE` - Soft deleted/deactivated
- `COMPLETED` - Finished batches
- `RECEIVED` - Received from warehouse
- `APPROVED` - Approved by manager
- `REJECTED` - Rejected
- `CLOSED` - Closed/archived

---

## How to Apply

### Option 1: Supabase Dashboard
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy contents of `039_fix_batch_status_constraint.sql`
4. Run the script
5. Check for success messages

### Option 2: Command Line
```bash
# Navigate to backend directory
cd backend

# Run the migration
psql $DATABASE_URL -f database/039_fix_batch_status_constraint.sql
```

---

## Backend Changes Made

### File: `backend/src/controllers/batchController.js`

**Improved `deleteBatch` function:**

```javascript
export async function deleteBatch(req, res) {
  // 1. Check for barcodes (prevents deletion if they exist)
  const { data: barcodes } = await supabaseAdmin
    .from('barcodes')
    .select('id')
    .eq('batch_id', id)
    .limit(1);

  if (barcodes && barcodes.length > 0) {
    return res.status(409).json({
      error: 'Cannot delete batch with existing barcodes'
    });
  }

  // 2. Check for inventory units (prevents deletion if they exist)
  const { data: inventoryUnits } = await supabaseAdmin
    .from('inventory_units')
    .select('id')
    .eq('batch_id', id)
    .limit(1);

  if (inventoryUnits && inventoryUnits.length > 0) {
    return res.status(409).json({
      error: 'Cannot delete batch with existing inventory'
    });
  }

  // 3. Soft delete by updating status to INACTIVE
  const { data, error } = await supabaseAdmin
    .from('batches')
    .update({ status: 'INACTIVE', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  // Returns the deactivated batch with status = 'INACTIVE'
  return res.json({
    success: true,
    batch: data,
    message: 'Batch deactivated successfully'
  });
}
```

**Protections Added:**
- ✅ Checks for barcodes before deactivating
- ✅ Checks for inventory units before deactivating
- ✅ Returns clear error messages
- ✅ Updates `updated_at` timestamp
- ✅ Returns the updated batch object

---

## Frontend Changes

### File: `frontend/src/pages/dashboard/operational/BatchManagement.jsx`

**No changes needed!** The frontend already uses `deleteBatch(id)` which calls the backend DELETE endpoint.

**Button visibility:**
```javascript
const canDeactivate = batch.status === 'ACTIVE';
```

Only ACTIVE batches show the deactivate button.

---

## Testing After Fix

1. **Run the SQL migration** (`039_fix_batch_status_constraint.sql`)
2. **Restart backend server** (if needed)
3. **Test batch deactivation:**
   - Open Batch Management
   - Find an ACTIVE batch
   - Click deactivate button
   - Confirm
   - Should see: "Batch deactivated successfully"
   - Batch status changes to INACTIVE

4. **Test error handling:**
   - Try to deactivate a batch with barcodes
   - Should see: "Cannot delete batch with existing barcodes"

---

## Foreign Key Protection

These relationships are preserved even after deactivation:

```
batches (INACTIVE status)
  ↓ FK preserved
barcodes (remain active)
  ↓ FK preserved
inventory_units (remain in stock)
```

The database has `ON DELETE RESTRICT` constraints, so actual deletion is prevented. Soft delete (status = INACTIVE) bypasses this restriction while preserving data.

---

## Verification Queries

### Check constraint exists:
```sql
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'batches'::regclass 
AND conname LIKE '%status%';
```

### Check batches with INACTIVE status:
```sql
SELECT id, batch_number, status, updated_at
FROM batches
WHERE status = 'INACTIVE'
ORDER BY updated_at DESC;
```

### Count batches by status:
```sql
SELECT status, COUNT(*) 
FROM batches 
GROUP BY status 
ORDER BY status;
```

---

## Status: ⚠️ REQUIRES SQL MIGRATION

**Next Step:** Run `039_fix_batch_status_constraint.sql` in Supabase

After running the migration, batch deactivation will work correctly!
