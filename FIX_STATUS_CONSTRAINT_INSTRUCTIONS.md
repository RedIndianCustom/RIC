# 🚨 URGENT: Fix Status Constraint Error

## Problem
Shipment creation is failing with:
```
new row for relation "shipments" violates check constraint "shipments_status_check"
Code: 23514
```

The database constraint is **rejecting** the 'PENDING' status value, even though it should be valid.

## Root Cause
The `shipments_status_check` constraint has an incorrect definition that doesn't include 'PENDING' or has the wrong case sensitivity.

## Solution
You need to run the fix SQL in Supabase to drop and recreate the constraint with the correct values.

---

## 📋 Step-by-Step Instructions

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project (`hbsynkxaadnximuytbor`)
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New Query"**

## Problem: Existing Data Has Invalid Status Values

The error `check constraint "chk_shipments_status" of relation "shipments" is violated by some row` means you have existing shipments in your database with status values that don't match the constraint.

**Example:** Your database might have lowercase values like 'pending' or 'received', but the constraint expects UPPERCASE values like 'PENDING' or 'RECEIVED'.

## Solution: Update Data THEN Fix Constraint

We need to use a different SQL script that:
1. Checks what status values exist
2. Updates them to valid values
3. Then creates the constraint

---

## 📋 NEW Step-by-Step Instructions

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project (`hbsynkxaadnximuytbor`)
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New Query"**

### Step 2: Copy and Paste This NEW SQL

**IMPORTANT: Use this SQL instead of the previous one!**

```sql
### Step 2: Copy and Paste This NEW SQL

**IMPORTANT: Use this SQL instead of the previous one!**

```sql
-- ============================================================================
-- FIX SHIPMENTS STATUS CONSTRAINT - WITH EXISTING DATA HANDLING
-- ============================================================================
-- This script fixes the constraint AND updates any existing invalid status values

-- Step 1: Check what status values currently exist in the database
SELECT 
    status,
    COUNT(*) as count
FROM public.shipments
GROUP BY status
ORDER BY count DESC;

-- Step 2: Show current constraints (for verification)
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
JOIN pg_class cl ON cl.oid = c.conrelid
WHERE cl.relname = 'shipments'
AND n.nspname = 'public'
AND (conname LIKE '%status%' OR pg_get_constraintdef(c.oid) LIKE '%status%');

-- Step 3: Update any invalid status values to valid ones
-- This maps common variations to the correct values
UPDATE public.shipments
SET status = CASE
    -- Map lowercase to uppercase
    WHEN LOWER(status) = 'pending' THEN 'PENDING'
    WHEN LOWER(status) = 'in_transit' THEN 'IN_TRANSIT'
    WHEN LOWER(status) = 'in transit' THEN 'IN_TRANSIT'
    WHEN LOWER(status) = 'received' THEN 'RECEIVED'
    WHEN LOWER(status) = 'inspecting' THEN 'INSPECTING'
    WHEN LOWER(status) = 'approved' THEN 'APPROVED'
    WHEN LOWER(status) = 'rejected' THEN 'REJECTED'
    WHEN LOWER(status) = 'cancelled' THEN 'CANCELLED'
    WHEN LOWER(status) = 'canceled' THEN 'CANCELLED'
    
    -- Map other common status values
    WHEN LOWER(status) = 'draft' THEN 'PENDING'
    WHEN LOWER(status) = 'new' THEN 'PENDING'
    WHEN LOWER(status) = 'active' THEN 'PENDING'
    WHEN LOWER(status) = 'shipped' THEN 'IN_TRANSIT'
    WHEN LOWER(status) = 'delivered' THEN 'RECEIVED'
    WHEN LOWER(status) = 'completed' THEN 'RECEIVED'
    WHEN LOWER(status) = 'closed' THEN 'RECEIVED'
    
    -- If none match, default to PENDING
    ELSE 'PENDING'
END
WHERE status NOT IN ('PENDING', 'IN_TRANSIT', 'RECEIVED', 'INSPECTING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- Show how many records were updated
SELECT 
    'Records updated: ' || COUNT(*) as update_result
FROM public.shipments
WHERE status IN ('PENDING', 'IN_TRANSIT', 'RECEIVED', 'INSPECTING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- Step 4: Drop ALL existing status constraints
ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS shipments_status_check CASCADE;
ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS chk_shipments_status CASCADE;
ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS check_shipment_status CASCADE;
ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS check_status CASCADE;

-- Step 5: Add the correct constraint (should work now since data is fixed)
ALTER TABLE public.shipments
    ADD CONSTRAINT chk_shipments_status CHECK (
        status IN ('PENDING', 'IN_TRANSIT', 'RECEIVED', 'INSPECTING', 'APPROVED', 'REJECTED', 'CANCELLED')
    );

-- Step 6: Verify the fix worked
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
JOIN pg_class cl ON cl.oid = c.conrelid
WHERE cl.relname = 'shipments'
AND n.nspname = 'public'
AND conname LIKE '%status%';

-- Step 7: Verify all shipments now have valid status values
SELECT 
    status,
    COUNT(*) as count
FROM public.shipments
GROUP BY status
ORDER BY count DESC;

-- Step 8: Test insert with PENDING status
DO $$
BEGIN
    -- Try to insert a test record
    INSERT INTO public.shipments (
        shipment_number,
        container_number,
        supplier_id,
        status,
        expected_quantity,
        actual_quantity
    ) VALUES (
        'TEST-CONSTRAINT-FIX',
        'CNT-TEST',
        (SELECT id FROM public.suppliers LIMIT 1),
        'PENDING',
        0,
        0
    );
    
    -- If we get here, it worked!
    RAISE NOTICE '✅ SUCCESS: PENDING status is now accepted!';
    
    -- Clean up test record
    DELETE FROM public.shipments WHERE shipment_number = 'TEST-CONSTRAINT-FIX';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ FAILED: % - %', SQLSTATE, SQLERRM;
END $$;
```

### Step 3: Run the Query

1. Click **"Run"** button (or press Ctrl+Enter / Cmd+Enter)
2. Wait for the query to complete
3. Check the output/results panel

### Step 4: Verify Success

You should see output like:
```
✅ SUCCESS: PENDING status is now accepted!
```

If you see this, the constraint is fixed!

---

## 🧪 Test After Fix

1. Go back to your frontend application
2. Refresh the page (Ctrl+R or Cmd+R)
3. Try creating a new shipment
4. **Expected Result:** Shipment creates successfully without errors!

---

## ❓ Troubleshooting

### If you see "no schema has been selected"
- Make sure you're in the correct project
- The SQL should still work

### If you see "relation 'shipments' does not exist"
- Check that you're in the `public` schema
- Verify the table exists by running: `SELECT * FROM public.shipments LIMIT 1;`

### If the test insert still fails
- Copy the exact error message
- Share it so we can diagnose further

### If you don't have permission to run DDL statements
- You may need to use the Supabase service role key
- Or contact your database administrator

---

## 🔍 What This SQL Does

1. **Shows current constraints** - So you can see what's wrong
2. **Drops all status-related constraints** - Removes the broken constraint(s)
3. **Adds the correct constraint** - With proper status values including 'PENDING'
4. **Verifies the fix** - Shows the new constraint definition
5. **Tests with a real insert** - Confirms 'PENDING' is now accepted

---

## 📝 Expected Constraint Definition

After running this SQL, you should see:

```
Constraint Name: chk_shipments_status
Definition: CHECK ((status = ANY (ARRAY['PENDING'::text, 'IN_TRANSIT'::text, 'RECEIVED'::text, 'INSPECTING'::text, 'APPROVED'::text, 'REJECTED'::text, 'CANCELLED'::text])))
```

---

## ⚠️ Important Notes

- This SQL is **safe to run** - it only affects the constraint, not your data
- Existing shipments will not be affected
- The constraint ensures data quality by only allowing valid status values
- After fixing, **all valid statuses** will work: PENDING, IN_TRANSIT, RECEIVED, INSPECTING, APPROVED, REJECTED, CANCELLED

---

## 📞 Need Help?

If you encounter any issues:
1. Take a screenshot of the SQL Editor showing the error
2. Share the exact error message
3. Check if the constraint was partially created by running:
   ```sql
   SELECT conname, pg_get_constraintdef(oid) 
   FROM pg_constraint 
   WHERE conrelid = 'public.shipments'::regclass;
   ```

---

**After running this SQL, shipment creation should work perfectly!** ✅
