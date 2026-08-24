# Fix: Shipment Deletion Error in Supabase

## 🔴 Error Message

```
Failed to save changes: Failed to run sql query: 
ERROR: 23502: null value in column "shipment_id" of relation "batches" violates not-null constraint

DETAIL: Failing row contains (48f73b11-4e99-4760-82cc-92cdd6e1cf8e, BATCH-2608-TEST-001, ...)

CONTEXT: SQL statement "UPDATE ONLY "public"."batches" SET "shipment_id" = NULL 
WHERE $1 OPERATOR(pg_catalog.=) "shipment_id""
```

---

## 🔍 Problem Explanation

### **What's Happening:**
1. You're trying to delete a shipment from the `shipments` table in Supabase
2. The batch `BATCH-2608-TEST-001` has a foreign key referencing that shipment
3. The current foreign key is set to **SET NULL** on delete
4. But the `batches.shipment_id` column is marked as **NOT NULL** (required)
5. Database tries to set `shipment_id = NULL` but fails because it's NOT NULL

### **Database Constraint Conflict:**
```
Foreign Key Action: ON DELETE SET NULL (tries to set to NULL)
Column Constraint: NOT NULL (doesn't allow NULL)
Result: ERROR ❌
```

---

## ✅ Solution

Change the foreign key to **CASCADE DELETE** instead of **SET NULL**.

This means:
- When you delete a shipment
- All batches linked to that shipment are **automatically deleted**
- No orphaned batches left behind

---

## 🔧 How to Fix

### **Run in Supabase SQL Editor:**

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** → **New Query**
4. Copy and paste this SQL:

```sql
-- Drop the old foreign key constraint
ALTER TABLE batches 
DROP CONSTRAINT IF EXISTS batches_shipment_id_fkey;

-- Add new constraint with CASCADE DELETE
ALTER TABLE batches
ADD CONSTRAINT batches_shipment_id_fkey
FOREIGN KEY (shipment_id) 
REFERENCES shipments(id) 
ON DELETE CASCADE;

-- Verify the change
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.table_name = 'batches' 
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'shipment_id';
```

5. Click **Run** (or Ctrl+Enter)
6. The last SELECT should show `delete_rule = 'CASCADE'`

---

## 🧪 Test After Fix

1. Go to Supabase **Table Editor**
2. Open `shipments` table
3. Try to delete a shipment row
4. ✅ **It should now delete successfully**
5. Check `batches` table - batches linked to that shipment are also deleted

---

## ⚠️ Important Notes

### **Before the Fix:**
- Deleting shipment → ERROR (can't set batch.shipment_id to NULL)
- Batches become orphaned if you force delete

### **After the Fix:**
- Deleting shipment → Automatically deletes all linked batches
- Clean cascade deletion
- No orphaned data

### **Warning:**
When you delete a shipment, **all its batches will also be deleted**. This is usually what you want, but be aware of this behavior.

---

## 🔄 Alternative Solution (If You Want to Keep Batches)

If you want to **keep batches** when shipment is deleted, you need to:

1. **Make shipment_id nullable:**
```sql
ALTER TABLE batches ALTER COLUMN shipment_id DROP NOT NULL;
```

2. **Change FK to SET NULL:**
```sql
ALTER TABLE batches 
DROP CONSTRAINT IF EXISTS batches_shipment_id_fkey;

ALTER TABLE batches
ADD CONSTRAINT batches_shipment_id_fkey
FOREIGN KEY (shipment_id) 
REFERENCES shipments(id) 
ON DELETE SET NULL;
```

But CASCADE DELETE is usually better for data integrity!

---

## 📋 Summary

| Issue | Current Behavior | After Fix |
|-------|------------------|-----------|
| Delete shipment with batches | ❌ ERROR: can't set NULL | ✅ Deletes shipment + batches |
| Foreign key action | SET NULL | CASCADE |
| Orphaned batches | Possible | Never |
| Data integrity | ⚠️ Risk | ✅ Clean |

---

*SQL script location: `backend/database/FIX_BATCHES_FK_CONSTRAINT.sql`*
*Run this in Supabase SQL Editor to fix the issue*
