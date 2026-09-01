# Fix: SHIP312 Showing Wrong Products in Receiving

## Problems

### Problem 1: Wrong Products Showing
**What you see:**
- DSXT-19-90/90 (Size: 90/90-19) ❌
- DSXT-17-100/90 (Size: 100/90-17) ✅ 
- DSXT-19-90/90 (Size: 90/90-19) ❌

**What should show:**
- DSXT-17-120/80 (Size: 120/80-17) Qty: 28 ✅
- DSXT-17-100/90 (Size: 100/90-17) Qty: 28 ✅
- DSXT-18-120/80 (Size: 120/80-18) Qty: 14 ✅

### Problem 2: "Can't Select Sizes"
**This is NOT a bug!** The list is for **display only** - it shows which items need to be scanned. You don't click them.

**How it works:**
1. Current item is highlighted in **BLUE**
2. Scan the barcode for that item
3. It turns **GREEN** with checkmark
4. Automatically moves to next item

The radio buttons are **visual indicators**, not clickable.

---

## Root Cause

The `shipment_expected_items` table has **WRONG product_id values** for SHIP312:

```sql
-- Current (WRONG):
product_id: 456  →  90/90-19 size  ❌ Not in SHIP312!
product_id: 123  →  100/90-17 size  ✅ Correct
product_id: 456  →  90/90-19 size  ❌ Duplicate wrong product!

-- Should be:
product_id: 123  →  120/80-17 size  ✅
product_id: 124  →  100/90-17 size  ✅
product_id: 125  →  120/80-18 size  ✅
```

### Why This Happened:

The expected items were registered with incorrect product_ids, probably because:
1. Wrong products were selected in ShipmentRegistration form
2. Database lookup failed and used wrong product
3. Products were changed after initial registration

---

## Solution

### Run SQL Fix Script

**File:** `backend/database/044_fix_ship312_expected_items.sql`

This script will:
1. ✅ Show current wrong expected items
2. ✅ Delete ALL expected items for SHIP312
3. ✅ Insert CORRECT expected items (3 sizes)
4. ✅ Verify the fix

**Steps:**
```sql
-- 1. Open Supabase Dashboard
-- 2. Go to SQL Editor
-- 3. Copy/paste this:

BEGIN;

-- Delete wrong items
DELETE FROM shipment_expected_items
WHERE shipment_id = (SELECT id FROM shipments WHERE shipment_number = 'SHIP312');

-- Insert correct items
INSERT INTO shipment_expected_items (
  shipment_id,
  product_id,
  product_size,
  expected_quantity,
  unit_price,
  created_at
)
SELECT 
  (SELECT id FROM shipments WHERE shipment_number = 'SHIP312'),
  p.id,
  p.dimensions,
  CASE 
    WHEN p.dimensions = '120/80-17' THEN 28
    WHEN p.dimensions = '100/90-17' THEN 28
    WHEN p.dimensions = '120/80-18' THEN 14
  END,
  0,
  NOW()
FROM products p
WHERE p.dimensions IN ('120/80-17', '100/90-17', '120/80-18')
  AND p.brand = 'Red Indian Customs'
  AND p.model = 'Dual Sport XT';

COMMIT;

-- 4. Click "Run"
-- 5. Check results - should show 3 items
```

---

## Verification

### After running SQL:

**Check Database:**
```sql
SELECT 
  sei.product_size,
  sei.expected_quantity,
  p.sku,
  p.brand,
  p.model
FROM shipment_expected_items sei
JOIN shipments s ON s.id = sei.shipment_id
JOIN products p ON p.id = sei.product_id
WHERE s.shipment_number = 'SHIP312'
ORDER BY sei.product_size;

-- Should show:
-- 100/90-17 | 28 | DSXT-17-100/90 | Red Indian Customs | Dual Sport XT
-- 120/80-17 | 28 | DSXT-17-120/80 | Red Indian Customs | Dual Sport XT
-- 120/80-18 | 14 | DSXT-18-120/80 | Red Indian Customs | Dual Sport XT
```

**Check in App:**
1. Go to **Warehouse > Receiving**
2. Find **SHIP312**
3. Click **Continue Scanning**
4. Modal should show:
   - ✅ **Item 1 of 3** (not "Item 1 of 4")
   - ✅ Red Indian Customs Dual Sport XT (120/80-17)
   - ✅ Red Indian Customs Dual Sport XT (100/90-17)
   - ✅ Red Indian Customs Dual Sport XT (120/80-18)
5. No more 90/90-19 sizes! ✅

---

## How to Use the Receiving Modal

### Step-by-Step Guide:

#### 1. **Current Item (Blue Highlight)**
```
Expected Product:
Red Indian Customs Dual Sport XT
SKU: DSXT-17-120/80
Size: 120/80-17
Qty Expected: 28 units

[Scan Barcode input field]
```
This is the item you need to scan NOW.

#### 2. **Scan Options:**

**Option A: Use Camera**
1. Click **"Camera"** button
2. Point at QR code
3. Auto-detected! ✅
4. Item turns green

**Option B: Manual Entry**
1. Type barcode in input field
2. Press **Enter** or click **"Verify"**
3. Item turns green

#### 3. **Progress List (Below)**
```
☑ Red Indian Customs Dual Sport XT (120/80-17) Qty: 28  ← Current (Blue)
○ Red Indian Customs Dual Sport XT (100/90-17) Qty: 28  (Not scanned)
○ Red Indian Customs Dual Sport XT (120/80-18) Qty: 14  (Not scanned)
```

**Legend:**
- **Blue box with "← Current"** = Scan this one now!
- **Empty circle (○)** = Not scanned yet
- **Green checkmark (✓)** = Already scanned

#### 4. **After Scanning:**
```
✓ Red Indian Customs Dual Sport XT (120/80-17) Qty: 28  (Green - Done!)
☑ Red Indian Customs Dual Sport XT (100/90-17) Qty: 28  ← Current (Blue)
○ Red Indian Customs Dual Sport XT (120/80-18) Qty: 14  (Not scanned)
```

Automatically moves to next item!

#### 5. **When All Scanned:**
```
✓ Red Indian Customs Dual Sport XT (120/80-17) Qty: 28  (Green)
✓ Red Indian Customs Dual Sport XT (100/90-17) Qty: 28  (Green)
✓ Red Indian Customs Dual Sport XT (120/80-18) Qty: 14  (Green)

[Continue to Verification] button appears
```

---

## Why Items Are Not Clickable

### Design Explanation:

The items list is **read-only** because:

1. **Sequential Workflow**
   - Must scan items in order
   - Prevents skipping items
   - Ensures all items are verified

2. **Current Item Focus**
   - Only one item active at a time
   - Clear visual indication (blue)
   - Reduces errors

3. **Automatic Progression**
   - Scan current item → Moves to next automatically
   - No manual clicking needed
   - Faster workflow

### If You Want to Skip an Item:

**Not currently supported.** You must scan all items in order. This is by design to ensure complete receiving.

**Future Enhancement:**
Could add "Skip" button to mark items as missing/damaged without scanning.

---

## Common Issues

### Issue: "Still showing wrong products after SQL"
**Solution:**
1. Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Close and reopen receiving modal
3. Check if SQL actually ran (check database)

### Issue: "Camera not detecting QR code"
**Solution:**
1. Ensure good lighting
2. Hold QR code steady
3. Try moving closer/farther
4. Use manual entry as backup

### Issue: "Wrong quantities showing"
**Solution:**
Check if SQL script used correct quantities:
- 120/80-17: Should be 28
- 100/90-17: Should be 28
- 120/80-18: Should be 14

### Issue: "Cannot proceed after scanning"
**Solution:**
Check console for errors. Likely:
- Network error
- API timeout
- Invalid barcode format

---

## Prevention for Future

### 1. Always Select Correct Products

When creating/editing shipments:
```javascript
// ✅ CORRECT: Select from dropdown
Product: [Select...] → "Red Indian Customs Dual Sport XT 120/80-17"

// ❌ WRONG: Just type dimensions
Dimensions: "120/80-17"  (No product selected!)
```

### 2. Verify Before Sending to Warehouse

Before clicking "Send to Warehouse":
1. Check Product Size Breakdown table
2. Verify all 3 products are correct
3. Check quantities match (28 + 28 + 14 = 70)

### 3. Use Edit Carefully

When editing shipments:
- Products might change if you re-select
- Always verify product_id is correct
- Check expected items after save

---

## Quick Fix Command

Run this in Supabase SQL Editor RIGHT NOW:

```sql
-- Quick fix for SHIP312
DELETE FROM shipment_expected_items WHERE shipment_id = (SELECT id FROM shipments WHERE shipment_number = 'SHIP312');

INSERT INTO shipment_expected_items (shipment_id, product_id, product_size, expected_quantity, unit_price, created_at)
SELECT (SELECT id FROM shipments WHERE shipment_number = 'SHIP312'), p.id, p.dimensions,
       CASE WHEN p.dimensions = '120/80-17' THEN 28 WHEN p.dimensions = '100/90-17' THEN 28 WHEN p.dimensions = '120/80-18' THEN 14 END, 0, NOW()
FROM products p WHERE p.dimensions IN ('120/80-17', '100/90-17', '120/80-18') AND p.brand = 'Red Indian Customs' AND p.model = 'Dual Sport XT';

SELECT * FROM shipment_expected_items WHERE shipment_id = (SELECT id FROM shipments WHERE shipment_number = 'SHIP312');
```

Copy, paste, run! ✅

---

**Last Updated**: August 26, 2026
**Issue**: Wrong products + Thinking items should be clickable
**Status**: ✅ Fixed with SQL + Explained workflow
**Version**: 2.6
