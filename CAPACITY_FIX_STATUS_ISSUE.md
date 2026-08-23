# 🔧 CAPACITY TRACKING FIX - Status Mismatch Issue

**Date:** August 23, 2026  
**Issue:** Capacity shows 0/180 even after creating barcodes  
**Root Cause:** Status mismatch - inventory units have status 'NEW' but query only looked for 'pending', 'received', 'available', 'reserved'

---

## 🐛 Problem Found

From backend logs:
```javascript
🔍 Sample of ALL inventory units: [
  {
    status: 'NEW',  // ❌ This status wasn't in the query filter!
    warehouse_id: null,  // Old units from before fix
    rack: null,
    shelf_number: null
  }
]
```

**New barcode created successfully:**
```javascript
📦 Update data: {
  warehouse_id: 'b1eff6be-b968-4861-94c2-f220e4eeffed',
  rack: 'WH1-RACK-4',
  shelf_number: 1,
  section_number: 1,
  subsection_number: 1,
  position_code: 'WH1-RACK-4-S1-SEC1-SUB1'
}
✅ Warehouse and hierarchical location assigned: WH1-RACK-4 (1 units)
✅ Rack count updated to 2 units
```

**But capacity query didn't find it:**
```javascript
📦 Found 0 inventory units in this rack
statuses: ['pending', 'received', 'available', 'reserved']  // Missing 'NEW'!
```

---

## ✅ Solution Applied

### Updated `warehouseController.js` Line ~404:

**BEFORE:**
```javascript
.in('status', ['pending', 'received', 'available', 'reserved'])
```

**AFTER:**
```javascript
.in('status', ['NEW', 'pending', 'received', 'available', 'reserved'])
```

Now the query will include inventory units with status 'NEW'!

---

## 🚀 Testing Steps

### 1. Restart Backend:
```powershell
cd backend
npm start
```

### 2. Refresh Browser:
```
Press F5
```

### 3. Select Rack Again:
- Go to Generate Barcodes
- Select: Batch-2608-806 → Main Warehouse → WH1-RACK-4
- **Should now show:**
  - Shelf 1 (2/180 tires) 🟢
  - Section 1 (2/30 tires) 🟢
  - Subsection 1 (2/15 tires) 🟢

### 4. Backend Should Log:
```
📦 Found 2 inventory units in this rack
📦 Sample unit: {
  shelf_number: 1,
  section_number: 1,
  subsection_number: 1,
  warehouse_id: 'b1eff6be-b968-4861-94c2-f220e4eeffed',
  rack: 'WH1-RACK-4',
  status: 'NEW',
  quantity: 1
}
```

---

## 📊 Expected Results

### Frontend Display:
```
📍 Select Exact Position

🗄️ Shelf (1-4)
┌─────────────────────────────────────┐
│ Shelf 1 (2/180 tires) 🟢           │  ✅ Shows count!
│ Shelf 2 (0/180 tires) 🟢           │
│ Shelf 3 (0/180 tires) 🟢           │
│ Shelf 4 (0/180 tires) 🟢           │
└─────────────────────────────────────┘

📦 Section (1-6)
┌─────────────────────────────────────┐
│ Section 1 (2/30 tires) 🟢          │  ✅ Shows count!
│ Section 2 (0/30 tires) 🟢          │
└─────────────────────────────────────┘

🔖 Subsection (1-2)
┌─────────────────────────────────────┐
│ Subsection 1 (2/15 tires) 🟢       │  ✅ Shows count!
│ Subsection 2 (0/15 tires) 🟢       │
└─────────────────────────────────────┘
```

---

## 🎯 Why This Happened

1. **Inventory units created** with status `'NEW'`
2. **Capacity query filtered** for `['pending', 'received', 'available', 'reserved']`
3. **'NEW' status not in list** → units excluded from count
4. **Result:** 0 tires found even though 2 exist

---

## ✅ Status

**File Modified:** `backend/src/controllers/warehouseController.js`  
**Change:** Added `'NEW'` to status filter in capacity query  
**Restart Required:** Yes (backend only)  
**Frontend Changes:** None needed

---

**Next Step:** Restart backend and refresh browser! The capacity should now show 2 tires in Shelf 1, Section 1, Subsection 1! 🎉
