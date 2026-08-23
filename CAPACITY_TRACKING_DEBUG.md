# 🔍 Capacity Tracking Debug - Zero Usage Issue

**Issue:** Shelf dropdown shows "0/180 tires" even after creating barcodes for Dual Sport  
**Status:** 🔧 DEBUGGING - Enhanced logging added

---

## 🐛 Problem Description

User reported:
- Generated barcode for **Dual Sport** tire
- Assigned to: **WH1-RACK-4**, Shelf/Section/Subsection
- But dropdown still shows: **"Shelf 1 (0/180 tires) 🟢"**
- Capacity API is **not counting** the inventory units

---

## 🔍 Root Cause Analysis

### Possible Issues:

1. **Data not being saved** - Barcode generation might fail silently
2. **Wrong column name** - API looking for `rack` but data saved in `rack_code`
3. **Wrong warehouse_id** - Mismatch between selected warehouse and saved value
4. **Wrong rack value** - Data saved with different rack code format
5. **Wrong status** - Inventory unit status not in the expected list

---

## ✅ Fix Applied

### Enhanced Logging in `warehouseController.js`:

**Added debug logging to capacity endpoint:**

```javascript
// Now logs:
console.log('📊 Query parameters:', {
  warehouse_id: warehouseId,
  rack: rack.rack_code,
  statuses: ['pending', 'received', 'available', 'reserved']
});

// If no units found, checks ALL units:
const { data: allUnits } = await supabaseAdmin
  .from('inventory_units')
  .select('id, warehouse_id, rack, status, shelf_number')
  .limit(5);

console.log('🔍 Sample of ALL inventory units:', allUnits);
```

---

## 🧪 Testing Steps

### Step 1: Restart Backend
```powershell
cd backend
npm start
```

### Step 2: Open Backend Logs
Keep the terminal visible to see console output.

### Step 3: Generate Barcode
1. Go to **Generate Barcodes** page
2. Select:
   - Batch: BATCH-2608-806 (Dual Sport)
   - Warehouse: Main Warehouse (WH1)
   - Rack: WH1-RACK-4
   - Shelf: 1
   - Section: 1
   - Subsection: 1
3. Click **Generate Barcode**

### Step 4: Check Backend Logs

**Look for:**
```
📦 Update data: { 
  warehouse_id: '...', 
  rack: 'WH1-RACK-4', 
  shelf_number: 1, 
  section_number: 1, 
  subsection_number: 1 
}
✅ Warehouse and hierarchical location assigned
```

### Step 5: Refresh Page
After generating barcode, **refresh the browser** (F5)

### Step 6: Select Rack Again
1. Select same Batch
2. Select same Warehouse
3. Select same Rack
4. **Watch for capacity API call**

**Backend should log:**
```
📊 GET /api/warehouses/:warehouseId/racks/:rackId/capacity
   warehouseId: ...
   rackId: ...
📦 Rack config: { rack_code: 'WH1-RACK-4', ... }
📦 Found X inventory units in this rack
```

### Step 7: Check Results

**If units FOUND:**
```
📦 Found 1 inventory units in this rack
📦 Sample unit: { shelf_number: 1, section_number: 1, ... }
```
→ **Capacity should now show 1 tire!**

**If units NOT found:**
```
📦 Found 0 inventory units in this rack
⚠️ NO INVENTORY UNITS FOUND - checking if any exist at all...
🔍 Sample of ALL inventory units: [ { id, warehouse_id, rack, status } ]
```
→ **Check the sample data** to see what values are actually stored

---

## 🔧 Common Issues & Solutions

### Issue 1: warehouse_id NULL
**Log shows:** `warehouse_id: null` in sample  
**Solution:** Barcode generation not saving warehouse_id

**Fix:**
```javascript
// In barcodeService.js, verify:
updateData.warehouse_id = warehouseId; // Must have valid UUID
```

### Issue 2: rack NULL or different format
**Log shows:** `rack: null` or `rack: 'RACK-4'` (missing WH1-)  
**Solution:** Rack code format mismatch

**Fix:**
```javascript
// In barcodeService.js, verify:
updateData.rack = rack.rack_code; // Should be 'WH1-RACK-4'
```

### Issue 3: Wrong status
**Log shows:** Status is 'ACTIVE' or 'GENERATED'  
**Solution:** Inventory unit status not in expected list

**Fix:** Update capacity query to include actual status values:
```javascript
.in('status', ['ACTIVE', 'GENERATED', 'pending', 'received'])
```

### Issue 4: shelf_number NULL
**Log shows:** `shelf_number: null`  
**Solution:** Hierarchical data not being saved

**Fix in barcodeService.js:**
```javascript
if (shelfNumber) {
  updateData.shelf_number = parseInt(shelfNumber); // Check this runs
}
```

---

## 📊 Database Verification Query

Run this in Supabase SQL Editor:

```sql
-- Check what's actually in inventory_units
SELECT 
  id,
  warehouse_id,
  rack,
  rack_code,
  shelf_number,
  section_number,
  subsection_number,
  status,
  created_at
FROM inventory_units
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Result:**
```
warehouse_id: <UUID>
rack: 'WH1-RACK-4'
shelf_number: 1
section_number: 1
subsection_number: 1
status: 'pending' or 'available'
```

**If rack is NULL:**
- Barcode generation not saving rack data
- Check barcodeService.js updateData object

**If shelf_number is NULL:**
- Hierarchical data not being passed
- Check frontend form data
- Check backend parameter extraction

---

## 🎯 Next Steps

### After Restarting Backend:

1. **Generate ONE new barcode**
2. **Check backend logs** for:
   - ✅ "Update data" object
   - ✅ "Warehouse assigned" message
   - ✅ "Rack count updated" message
3. **Refresh browser**
4. **Select rack again**
5. **Check capacity API logs** for:
   - ✅ Query parameters
   - ✅ Found X units
   - ✅ Sample unit data

### Share These Logs:

If still showing 0, copy and paste these backend logs:
```
📦 Update data: { ... }
📦 Rack config: { ... }
📦 Found X inventory units
🔍 Sample of ALL inventory units: [ ... ]
```

---

## 📝 Technical Details

### Capacity Query Logic:

```javascript
// Query filters:
const { data: inventoryUnits } = await supabaseAdmin
  .from('inventory_units')
  .select('shelf_number, section_number, subsection_number, quantity')
  .eq('warehouse_id', warehouseId)  // Must match exactly
  .eq('rack', rack.rack_code)        // Must be 'WH1-RACK-4' format
  .in('status', [                     // Must be one of these
    'pending', 
    'received', 
    'available', 
    'reserved'
  ]);
```

### Save Logic (from barcodeService.js):

```javascript
const updateData = {
  warehouse_id: warehouseId,          // From formData
  rack: rack.rack_code,                // 'WH1-RACK-4'
  shelf_number: parseInt(shelfNumber), // 1
  section_number: parseInt(sectionNumber), // 1
  subsection_number: parseInt(subsectionNumber), // 1
  assigned_at: new Date().toISOString()
};

await supabaseAdmin
  .from('inventory_units')
  .update(updateData)
  .in('id', inventoryUnitIds);
```

**For capacity to work:**
- ✅ `warehouse_id` must be saved
- ✅ `rack` must equal rack_code
- ✅ `shelf_number`, `section_number`, `subsection_number` must be saved
- ✅ `status` must be in the filter list

---

## ✅ Success Criteria

**Capacity tracking works when:**

1. Backend logs show:
   ```
   ✅ Warehouse and hierarchical location assigned: WH1-RACK-4 (1 units)
   📍 Position code: WH1-RACK-4-S1-SEC1-SUB1
   ✅ Rack count updated to 1 units
   ```

2. Capacity API logs show:
   ```
   📦 Found 1 inventory units in this rack
   📦 Sample unit: { 
     shelf_number: 1, 
     section_number: 1, 
     subsection_number: 1,
     quantity: 1,
     warehouse_id: '<UUID>',
     rack: 'WH1-RACK-4',
     status: 'pending'
   }
   ```

3. Frontend displays:
   ```
   Shelf 1 (1/180 tires) 🟢
   Section 1 (1/30 tires) 🟢
   Subsection 1 (1/15 tires) 🟢
   ```

---

**Status:** 🔧 **DEBUGGING MODE ACTIVE**

**Next Action:** User should restart backend and generate ONE barcode while watching backend logs! 📊
