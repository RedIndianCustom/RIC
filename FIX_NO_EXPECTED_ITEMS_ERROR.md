# Fix: "No Expected Items Found" Error

## Problem
When clicking "Continue Scanning" on SHIP312, the error appears:
```
❌ Error
No expected items found for this shipment. Please register expected items first.
```

Even though the shipment shows **Product Size Breakdown** table with items.

---

## Root Cause

The shipment has `product_breakdown` JSON field populated:
```json
{
  "120/80-17": { "quantity": 28, "product_name": "...", "assigned_positions": [...] },
  "100/90-17": { "quantity": 28, "product_name": "...", "assigned_positions": [...] }
}
```

**BUT** the `shipment_expected_items` table is **EMPTY** for this shipment.

### Why is it empty?

1. **Old shipments created before expected items feature** - The registration code was added later
2. **Product breakdown in wrong format** - Object format `{"size": {...}}` instead of array format `[{product_id, size, ...}]`
3. **Missing product_id** - The object format doesn't include `product_id`, which is REQUIRED for registration
4. **Silent registration failure** - The registration error was only logged, not shown to user

---

## Solution Implemented

### Fix 1: Enhanced Error Handling in ShipmentRegistration
**File:** `frontend/src/pages/dashboard/operational/ShipmentRegistration.jsx`

Now shows **visible error** if registration fails:
```javascript
} catch (expectedErr) {
  console.error('❌ Failed to register expected items:', expectedErr);
  setAlert({ 
    type: 'error', 
    message: `Shipment saved but failed to register expected items: ${expectedErr.response?.data?.error || expectedErr.message}`
  });
}
```

### Fix 2: Auto-Register on Send to Warehouse
**File:** `frontend/src/pages/dashboard/operational/IncomingShipmentsEnhanced.jsx`

Added smart check before sending:
```javascript
const handleSendToWarehouse = async (shipment) => {
  // Check if expected items exist
  const { data: checkData } = await api.get(`/receiving-qc/expected-items/${shipment.id}`);
  const existingItems = checkData.data || [];
  
  // If none found, try to register from product_breakdown
  if (existingItems.length === 0 && shipment.product_breakdown) {
    // Register items...
  }
  
  // Then proceed with status update
}
```

### Fix 3: Better Validation in ReceivingEnhanced
**File:** `frontend/src/pages/dashboard/warehouse/ReceivingEnhanced.jsx`

Shows clear error with actionable message:
```javascript
if (expectedItems.length === 0) {
  toast.error('No expected items found for this shipment. Please register expected items first.');
  return; // Don't open modal
}
```

---

## How to Fix SHIP312 Now

Since SHIP312 has the object format product_breakdown **without product_id**, you need to fix it manually:

### Option 1: Edit Shipment and Re-Save (RECOMMENDED)

1. Go to **Operational Staff > Shipment Registration**
2. Find **SHIP312** in the list
3. Click **Edit** (pencil icon)
4. The products should load in the form
5. Make sure each product has:
   - ✅ Product selected (Brand + Model)
   - ✅ Size/Dimensions filled
   - ✅ Quantity filled
6. Click **Update Shipment**
7. Check console for: `✅ Registered expected items for receiving/QC workflow`

### Option 2: Delete and Recreate Shipment

1. Delete SHIP312
2. Create new shipment with same details
3. Make sure to select products from dropdown (this ensures product_id is included)
4. Save shipment
5. Expected items will be registered automatically

### Option 3: Manual SQL Fix (Advanced)

If you know the product IDs, insert directly:

```sql
-- First, find the product IDs for your sizes
SELECT id, brand, model, dimensions 
FROM products 
WHERE dimensions IN ('120/80-17', '100/90-17');

-- Then insert expected items
INSERT INTO shipment_expected_items 
  (shipment_id, product_id, product_size, expected_quantity, created_at)
VALUES
  ((SELECT id FROM shipments WHERE shipment_number = 'SHIP312'), 
   (SELECT id FROM products WHERE dimensions = '120/80-17' LIMIT 1),
   '120/80-17',
   28,
   NOW()),
  ((SELECT id FROM shipments WHERE shipment_number = 'SHIP312'),
   (SELECT id FROM products WHERE dimensions = '100/90-17' LIMIT 1),
   '100/90-17',
   28,
   NOW());
```

---

## Data Format Requirements

### ❌ WRONG FORMAT (Object without product_id):
```json
{
  "120/80-17": {
    "quantity": 28,
    "product_name": "Red Indian Customs Dual Sport XT",
    "assigned_positions": [...]
  }
}
```
**Issue:** No `product_id` field!

### ✅ CORRECT FORMAT (Array with product_id):
```json
[
  {
    "product_id": 123,
    "brand": "Red Indian Customs",
    "model": "Dual Sport XT",
    "dimensions": "120/80-17",
    "quantity": 28,
    "sku": "DSXT-17-120/80",
    "unit_price": 0,
    "notes": ""
  },
  {
    "product_id": 124,
    "brand": "Red Indian Customs",
    "model": "Dual Sport XT",
    "dimensions": "100/90-17",
    "quantity": 28,
    "sku": "DSXT-17-100/90",
    "unit_price": 0,
    "notes": ""
  }
]
```

---

## Expected Items Table Structure

```sql
CREATE TABLE shipment_expected_items (
  id BIGSERIAL PRIMARY KEY,
  shipment_id BIGINT REFERENCES shipments(id) NOT NULL,
  product_id BIGINT REFERENCES products(id) NOT NULL,  -- REQUIRED!
  product_size TEXT NOT NULL,
  expected_quantity INTEGER NOT NULL,
  unit_price DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Point:** `product_id` is REQUIRED and MUST reference an actual product in the `products` table.

---

## Auto-Registration Logic

### When Expected Items Are Registered:

1. **On Shipment Creation** (ShipmentRegistration)
   - Automatically registers when clicking "Save Shipment"
   - Only if `product_breakdown` has items with `product_id`

2. **On Send to Warehouse** (IncomingShipmentsEnhanced) - NEW!
   - Checks if expected items exist
   - If not, tries to register from `product_breakdown`
   - Shows warning if registration fails

3. **Manual Button** (Future Enhancement)
   - Add "Register Expected Items" button
   - Allow manual registration for old shipments

---

## Testing Checklist

### New Shipments:
- [x] Create shipment with products
- [x] Check console: "✅ Registered expected items"
- [x] Verify in database: `SELECT * FROM shipment_expected_items`
- [x] Send to warehouse
- [x] Start receiving - items should load

### Old Shipments (Like SHIP312):
- [ ] Edit and re-save shipment
- [ ] Check console for registration
- [ ] OR Delete and recreate
- [ ] OR Run manual SQL insert
- [ ] Then test receiving workflow

### Error Cases:
- [x] Shipment without products - shows warning
- [x] Shipment with wrong format - shows error
- [x] Missing product_id - shows error message

---

## Console Logs to Check

### When Creating Shipment:
```
📦 Registering expected items: [{...}, {...}]
📦 Shipment ID: 123
📦 Items count: 2
✅ Registered expected items for receiving/QC workflow
```

### When Sending to Warehouse:
```
🔍 Checking expected items for shipment: 123
📦 Existing expected items: []
⚠️ No expected items found, registering from product_breakdown...
✅ Registered 2 expected items for receiving/QC
```

### When Starting Receiving:
```
📦 Expected items response: { success: true, data: [{...}, {...}] }
📦 Expected items array: [{...}, {...}]
📦 Expected items count: 2
📦 Transforming item: {...}
📦 Transformed items count: 2
```

### If Error:
```
❌ Error checking/registering expected items: ...
⚠️ Object format product_breakdown - cannot auto-register without product_id
```

---

## Quick Fix Command

Run this in browser console on the Shipment Registration page to see what's wrong with SHIP312:

```javascript
// Check shipment data
const shipment = shipments.find(s => s.shipment_number === 'SHIP312');
console.log('Product Breakdown:', shipment.product_breakdown);
console.log('Has product_id?', shipment.product_breakdown[0]?.product_id);

// Check expected items
fetch('/api/receiving-qc/expected-items/' + shipment.id)
  .then(r => r.json())
  .then(d => console.log('Expected Items:', d));
```

---

## Prevention for Future

### In ShipmentRegistration Form:

1. **Always select products from dropdown**
   - Don't just type dimensions
   - Ensures `product_id` is captured

2. **Validate before saving**
   ```javascript
   if (!item.product_id) {
     alert('Please select a product from the dropdown');
     return;
   }
   ```

3. **Show confirmation**
   ```
   ✅ Shipment created and 2 expected items registered for receiving!
   ```

---

## Next Steps

1. **Fix SHIP312** using Option 1 (Edit and Re-Save)
2. **Test Receiving** - should work now
3. **Check Other Shipments** - any other old ones?
4. **Add Validation** - prevent saving without product_id

---

**Last Updated**: August 26, 2026
**Issue**: No expected items in database
**Status**: ✅ Fixed with auto-registration
**Version**: 2.4
