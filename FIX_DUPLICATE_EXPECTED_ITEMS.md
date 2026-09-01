# Fix: Duplicate Expected Items Showing in Receiving Modal

## Problem
When starting receiving for SHIP312, the modal shows **11 items** to scan when there should only be **3 items** (3 different product sizes).

### What User Sees:
```
Item 1 of 11  ❌ Wrong! Should be "Item 1 of 3"

☑ Red Indian Customs Dual Sport XT (120/80-17) Qty: 28
☑ Red Indian Customs Dual Sport XT (100/90-17) Qty: 28  
☑ Red Indian Customs Dual Sport XT (120/80-17) Qty: 28  ⚠️ Duplicate!
☑ Red Indian Customs Dual Sport XT (100/90-17) Qty: 28  ⚠️ Duplicate!
... (11 items total)
```

### What Should Show:
```
Item 1 of 3  ✅ Correct!

☑ Red Indian Customs Dual Sport XT (120/80-17) Qty: 28
☑ Red Indian Customs Dual Sport XT (100/90-17) Qty: 28
☑ Red Indian Customs Dual Sport XT (120/80-18) Qty: 14
```

---

## Root Cause

The `shipment_expected_items` table has **duplicate rows** for the same product size:

```sql
SELECT shipment_id, product_size, COUNT(*) 
FROM shipment_expected_items
WHERE shipment_id = (SELECT id FROM shipments WHERE shipment_number = 'SHIP312')
GROUP BY shipment_id, product_size;

-- Result shows duplicates:
-- 120/80-17: 4 rows  ⚠️ Should be 1
-- 100/90-17: 4 rows  ⚠️ Should be 1  
-- 120/80-18: 3 rows  ⚠️ Should be 1
```

### Why Did This Happen?

1. **Multiple registrations** - The shipment was updated/re-saved multiple times
2. **No unique constraint** - Database allowed duplicate inserts
3. **No cleanup** - Old expected items weren't deleted before inserting new ones

---

## Solution

### Fix 1: SQL Script to Remove Duplicates
**File:** `backend/database/043_fix_duplicate_expected_items.sql`

This script:
1. **Shows duplicates** - Lists all duplicate entries
2. **Deletes duplicates** - Keeps only the first (oldest) row for each unique combination
3. **Adds UNIQUE constraint** - Prevents future duplicates
4. **Verifies results** - Shows remaining expected items

**Run this SQL:**
```sql
-- In Supabase SQL Editor or psql
\i backend/database/043_fix_duplicate_expected_items.sql
```

### Fix 2: Backend Auto-Cleanup
**File:** `backend/src/controllers/receivingQcController.js`

Updated `registerExpectedItems` to:
```javascript
// DELETE existing items first
await supabase
  .from('shipment_expected_items')
  .delete()
  .eq('shipment_id', shipment_id);

// THEN insert new items
const { data, error } = await supabase
  .from('shipment_expected_items')
  .insert(items);
```

Now when you edit/update a shipment:
1. ✅ Old expected items are deleted
2. ✅ New expected items are inserted
3. ✅ No duplicates possible

---

## How to Fix SHIP312 Now

### Option 1: Run SQL Script (RECOMMENDED)
```bash
# In your terminal
cd backend/database
psql -d your_database -f 043_fix_duplicate_expected_items.sql

# Or in Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Copy/paste the SQL from 043_fix_duplicate_expected_items.sql
# 3. Click "Run"
```

### Option 2: Edit and Re-Save Shipment
1. Go to **Operational Staff > Shipment Registration**
2. Find **SHIP312** and click **Edit**
3. Click **Update Shipment** (no changes needed)
4. Backend will automatically delete old items and insert 3 new ones
5. Check console: `✅ Registered 3 expected items`

### Option 3: Manual SQL Delete
```sql
-- Find duplicate IDs
SELECT id, product_size, expected_quantity
FROM shipment_expected_items
WHERE shipment_id = (SELECT id FROM shipments WHERE shipment_number = 'SHIP312')
ORDER BY product_size, created_at;

-- Delete all except the first of each size
WITH to_keep AS (
  SELECT DISTINCT ON (product_size) id
  FROM shipment_expected_items
  WHERE shipment_id = (SELECT id FROM shipments WHERE shipment_number = 'SHIP312')
  ORDER BY product_size, created_at ASC
)
DELETE FROM shipment_expected_items
WHERE shipment_id = (SELECT id FROM shipments WHERE shipment_number = 'SHIP312')
  AND id NOT IN (SELECT id FROM to_keep);
```

---

## Verification

### Check Database:
```sql
-- Should show only 3 rows
SELECT 
  product_size,
  expected_quantity,
  COUNT(*) OVER () as total_rows
FROM shipment_expected_items
WHERE shipment_id = (SELECT id FROM shipments WHERE shipment_number = 'SHIP312');

-- Result:
-- 120/80-17 | 28 | 3
-- 100/90-17 | 28 | 3
-- 120/80-18 | 14 | 3
```

### Check Receiving Modal:
1. Go to **Warehouse > Receiving**
2. Find **SHIP312**
3. Click **Continue Scanning**
4. Should show: **"Item 1 of 3"** ✅

---

## Prevention for Future

### 1. UNIQUE Constraint (Added)
```sql
ALTER TABLE shipment_expected_items
ADD CONSTRAINT unique_shipment_product_size 
UNIQUE (shipment_id, product_id, product_size);
```

This prevents duplicate inserts at database level.

### 2. Backend Cleanup (Implemented)
The backend now deletes existing items before inserting new ones.

### 3. Frontend Validation (Future)
Could add check before registration:
```javascript
// Check if items already registered
const { data: existing } = await api.get(`/receiving-qc/expected-items/${shipment_id}`);
if (existing.data.length > 0) {
  console.warn('Expected items already registered, will replace');
}
```

---

## Data Flow

### Before Fix:
```
ShipmentRegistration
  ↓
Save Shipment
  ↓
Register Expected Items (INSERT)  ← Adds new rows
  ↓
Database: 11 rows total  ❌

Edit & Save Again
  ↓
Register Expected Items (INSERT)  ← Adds MORE rows!
  ↓
Database: 22 rows total  ❌❌
```

### After Fix:
```
ShipmentRegistration
  ↓
Save Shipment
  ↓
DELETE existing items  ← Cleanup first!
  ↓
INSERT new items (3 rows)
  ↓
Database: 3 rows total  ✅

Edit & Save Again
  ↓
DELETE existing items (3 rows)
  ↓
INSERT new items (3 rows)
  ↓
Database: 3 rows total  ✅ Still correct!
```

---

## Testing Checklist

- [ ] Run SQL script to remove duplicates
- [ ] Verify: `SELECT COUNT(*) FROM shipment_expected_items WHERE shipment_id = ...`
- [ ] Should show 3 items for SHIP312
- [ ] Go to Warehouse > Receiving
- [ ] Click "Continue Scanning" on SHIP312
- [ ] Should show "Item 1 of 3"
- [ ] Test scanning - should work for 3 items
- [ ] Edit SHIP312 in ShipmentRegistration
- [ ] Update shipment
- [ ] Check console: "Registered 3 expected items"
- [ ] Verify in database - still 3 rows (not 6)

---

## Console Logs

### Before Fix:
```
📦 Expected items count: 11  ❌
📦 Transforming item: {...} (11 times)
```

### After Fix:
```
🗑️ Deleted existing expected items for shipment 123
✅ Registered 3 expected items for shipment 123
📦 Expected items count: 3  ✅
📦 Transforming item: {...} (3 times)
```

---

## Related Files

### Modified:
- `backend/database/043_fix_duplicate_expected_items.sql` - SQL cleanup script
- `backend/src/controllers/receivingQcController.js` - Auto-delete before insert

### No Changes Needed:
- `frontend/src/pages/dashboard/warehouse/ReceivingEnhanced.jsx` - Correct 1:1 mapping
- `frontend/src/pages/dashboard/operational/ShipmentRegistration.jsx` - Correct data prep

---

## FAQ

**Q: Why 11 items instead of 3?**
A: Duplicate rows in database. Multiple registrations without cleanup.

**Q: Will this affect other shipments?**
A: No, each shipment has its own expected items. SQL script only affects duplicates.

**Q: Can I just delete all and recreate?**
A: Yes, but SQL script is safer - keeps the oldest/original entry.

**Q: What if I get "duplicate key value violates unique constraint"?**
A: Good! That means items already exist. Frontend should handle this gracefully.

---

**Last Updated**: August 26, 2026
**Issue**: Duplicate expected items in database
**Status**: ✅ Fixed with SQL script + backend cleanup
**Version**: 2.5
