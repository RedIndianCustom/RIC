# 🔧 Database Migration Instructions

## ✅ **Fix Applied**

The SQL syntax error has been fixed. The `RAISE NOTICE` statement is now inside the `DO` block.

---

## 📋 **How to Run the Migration**

### **Step 1: Copy the SQL**

The migration SQL is in: `backend/database/025_add_batch_metadata.sql`

Or copy this directly:

```sql
-- ============================================================================
-- ADD METADATA COLUMN TO BATCHES TABLE
-- ============================================================================
-- Add metadata JSONB column to store warehouse_code, warehouse_name, 
-- and products with assigned positions
-- ============================================================================

-- Add metadata column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'batches' 
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.batches 
    ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    
    RAISE NOTICE 'Added metadata column to batches table';
  ELSE
    RAISE NOTICE 'metadata column already exists in batches table';
  END IF;
  
  RAISE NOTICE '✅ Batch metadata column migration completed';
END $$;

-- Add index for efficient JSON queries
CREATE INDEX IF NOT EXISTS idx_batches_metadata ON public.batches USING GIN (metadata);

-- Add comments
COMMENT ON COLUMN public.batches.metadata IS 'JSONB storage for warehouse_code, warehouse_name, and products with assigned_positions';
```

---

### **Step 2: Open Supabase SQL Editor**

1. Open your Supabase Dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **"New Query"**

---

### **Step 3: Execute the SQL**

1. Paste the SQL code above
2. Click **"Run"** or press `Ctrl+Enter`
3. Wait for confirmation message

**Expected Output:**
```
NOTICE:  Added metadata column to batches table
NOTICE:  ✅ Batch metadata column migration completed

Success. No rows returned
```

Or if column already exists:
```
NOTICE:  metadata column already exists in batches table
NOTICE:  ✅ Batch metadata column migration completed

Success. No rows returned
```

---

### **Step 4: Verify Migration**

Run this query to verify the column exists:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'batches' 
  AND column_name = 'metadata';
```

**Expected Result:**
```
column_name | data_type
------------|----------
metadata    | jsonb
```

---

## ✅ **After Migration**

Once the migration is complete:

1. ✅ Restart your backend server (if running)
2. ✅ Refresh your frontend (if running)
3. ✅ Start testing the assigned positions feature!

**Next Steps:**
- Create a shipment with assigned positions
- Create a batch (positions will be auto-detected)
- Generate barcodes (individual per position)
- Verify traceability includes location data

---

## 🐛 **Troubleshooting**

### **Error: "column already exists"**
This is fine! It means the migration was already run. You can proceed with testing.

### **Error: "permission denied"**
Make sure you're using the Supabase Service Role Key or have admin access.

### **Error: "table batches does not exist"**
The batches table hasn't been created yet. Run the earlier migrations first.

---

## 📚 **Documentation**

For complete usage instructions, see:
- **QUICK_START_ASSIGNED_POSITIONS.md** - Quick start guide
- **IMPLEMENTATION_SUMMARY_ASSIGNED_POSITIONS.md** - Full implementation details
- **BARCODE_ASSIGNED_POSITIONS_COMPLETE.md** - Technical reference

---

**That's it! The migration is simple and safe.** 🎉
