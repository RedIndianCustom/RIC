# 🔧 Fix: Shipment Status Constraint Error

## Error
```
new row for relation "shipments" violates check constraint "chk_shipments_status"
```

## Root Cause

The receiving workflow tries to set shipment status to `AWAITING_APPROVAL` and `READY_FOR_QC`, but these statuses are **not allowed** by the database constraint.

**Current constraint allows:**
```sql
'PENDING', 'IN_TRANSIT', 'RECEIVED', 'INSPECTING', 
'APPROVED', 'REJECTED', 'CANCELLED'
```

**But the workflow needs:**
- `AWAITING_APPROVAL` - When report is submitted to manager
- `READY_FOR_QC` - When manager approves and QC inspection is created
- `ARRIVED` - When shipment arrives at warehouse (optional but good to have)

## ✅ Solution

Run this SQL in **Supabase SQL Editor**:

```sql
-- Step 1: Drop old constraint
ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS chk_shipments_status CASCADE;

-- Step 2: Add new constraint with all required statuses
ALTER TABLE public.shipments
ADD CONSTRAINT chk_shipments_status CHECK (
  status IN (
    'PENDING',
    'IN_TRANSIT',
    'ARRIVED',           -- NEW
    'INSPECTING',
    'AWAITING_APPROVAL', -- NEW
    'READY_FOR_QC',      -- NEW
    'APPROVED',
    'REJECTED',
    'CANCELLED',
    'RECEIVED'
  )
);
```

Or use the complete script: `046_fix_shipment_status_constraint.sql`

## 🔄 Status Flow

The complete receiving workflow now:

```
1. PENDING → Initial registration
   ↓
2. IN_TRANSIT → Shipment is on the way
   ↓
3. ARRIVED → Shipment reaches warehouse
   ↓
4. INSPECTING → Warehouse staff scanning items
   ↓
5. AWAITING_APPROVAL → Report submitted to manager
   ↓
6. READY_FOR_QC → Manager approved, ready for QC
   ↓
7. APPROVED → QC passed, final approval
   (or REJECTED if QC fails)
```

## 🚀 After Running the Fix

1. **Run the SQL** in Supabase
2. **Test the workflow:**
   - Go to Receiving page
   - Scan items for a shipment
   - Click "Submit to Manager"
   - Should work now! ✅

## ⚠️ Important Notes

- This fix is **backward compatible** - all existing statuses still work
- The `RECEIVED` status is kept for compatibility
- The constraint now properly supports the new approval workflow

## 📋 Quick Copy-Paste

```sql
ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS chk_shipments_status CASCADE;

ALTER TABLE public.shipments
ADD CONSTRAINT chk_shipments_status CHECK (
  status IN (
    'PENDING', 'IN_TRANSIT', 'ARRIVED', 'INSPECTING',
    'AWAITING_APPROVAL', 'READY_FOR_QC', 'APPROVED',
    'REJECTED', 'CANCELLED', 'RECEIVED'
  )
);
```

Done! The error should be fixed after running this.
