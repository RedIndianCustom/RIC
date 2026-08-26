# Enhancement: Use Exact Position Codes from WarehouseLocations

## 🎯 **Goal**
Make the ShipmentRegistration position picker use the **exact same location codes** as WarehouseLocations, like:
```
WH1-R05-RK05-S01-SH01-SUB02
```

Instead of simplified format:
```
Main Warehouse - Zone WH1, Aisle 05, Rack 05
```

---

## 🔧 **Changes Made**

### **1. Updated loadRacks() - Extract Rack Code from Position Code**

**Before:**
```javascript
// Grouped by zone/aisle/rack fields
const rackKey = `${loc.zone}-${loc.aisle}-${loc.rack}`;
rackMap.set(rackKey, {
  rack_code: `${loc.zone}-${loc.aisle}-${loc.rack}`,
  zone: loc.zone,
  aisle: loc.aisle,
  rack: loc.rack
});
```

**After:**
```javascript
// Extract rack code from position_code using regex
const posCode = loc.position_code || loc.code || '';
const rackMatch = posCode.match(/^(WH\d+-R\d+-RK\d+)/);

if (rackMatch) {
  const rackCode = rackMatch[1]; // e.g., "WH1-R05-RK05"
  rackMap.set(rackCode, {
    rack_code: rackCode,
    position_code_prefix: rackCode,  // Used for filtering
    warehouse_name: 'Main Warehouse'
  });
}
```

**Regex Explained:**
```
^(WH\d+-R\d+-RK\d+)
│ └┬┘ └┬┘ └┬┘ └┬┘
│  │   │   │   └─ One or more digits
│  │   │   └───── Literal "RK"
│  │   └───────── Literal "-"
│  └───────────── One or more digits
└──────────────── Start of string + Literal "WH"

Example match: "WH1-R05-RK05" from "WH1-R05-RK05-S01-SH01-SUB02"
```

---

### **2. Updated loadRackPositions() - Filter by Rack Code Prefix**

**Before:**
```javascript
// Filter by zone/aisle/rack fields
const positions = allLocations.filter(loc => 
  loc.zone === rack.zone && 
  loc.aisle === rack.aisle && 
  loc.rack === rack.rack
);
```

**After:**
```javascript
// Filter by position_code prefix
const positions = allLocations.filter(loc => {
  const posCode = loc.position_code || loc.code || '';
  return posCode.startsWith(rack.position_code_prefix);
});

// Example:
// rack.position_code_prefix = "WH1-R05-RK05"
// Matches: "WH1-R05-RK05-S01-SH01-SUB01"
// Matches: "WH1-R05-RK05-S01-SH01-SUB02"
// Does NOT match: "WH1-R06-RK06-S01-SH01-SUB01"
```

---

### **3. Updated Rack Dropdown Display**

**Before:**
```jsx
Main Warehouse - Zone WH1, Aisle 05, Rack 05
```

**After:**
```jsx
Main Warehouse - WH1-R05-RK05
```

**Code:**
```jsx
<option value={rack.id}>
  {rack.warehouse_name} - {rack.rack_code}
</option>
```

---

### **4. Updated Position Code in Distribution**

**Before:**
```javascript
position_code: `${position.zone}-${position.aisle}-${position.rack}-${position.shelf}`
// Output: "WH1-05-RK05-S01"
```

**After:**
```javascript
position_code: position.position_code || position.code || `Position-${position.id}`
// Output: "WH1-R05-RK05-S01-SH01-SUB02"
```

---

### **5. Updated Position Display in Modal**

**Before:**
```javascript
{position.code || `${position.zone}-${position.aisle}-${position.rack}-${position.shelf}`}
```

**After:**
```javascript
{position.position_code || position.code || `Position-${position.id}`}
```

---

## 📊 **Position Code Format**

### **Full Position Code Structure:**
```
WH1-R05-RK05-S01-SH01-SUB02
├─┬─┘ ├┬──┤ ├┬──┤ ├┬──┤ ├┬──┤ ├┬───┤
│ │   ││   ││    ││    ││    ││
│ │   ││   ││    ││    ││    │└── Subsection Number (padded)
│ │   ││   ││    ││    │└────── Shelf Number (padded)  
│ │   ││   ││    │└──────────── Section Number (padded)
│ │   │└───┘└────────────────── Rack Number (padded)
│ └───┴──────────────────────── Row Number (padded)
└────────────────────────────── Warehouse Code
```

### **Rack Code (Prefix):**
```
WH1-R05-RK05
├─┬─┘ ├┬──┤ ├┬──┤
│ │   ││   │└─── Rack Number
│ │   │└────── Row Number
│ └───┴─────── Warehouse Code
```

---

## 🔄 **Data Flow**

### **Loading Racks:**
1. Fetch all warehouse locations from API
2. Extract rack codes from position_code using regex
3. Group unique rack codes
4. Display in dropdown: "Main Warehouse - WH1-R05-RK05"

### **Loading Positions:**
1. User selects rack (e.g., "WH1-R05-RK05")
2. Fetch all warehouse locations
3. Filter where `position_code.startsWith("WH1-R05-RK05")`
4. Display positions with full codes: "WH1-R05-RK05-S01-SH01-SUB02"

### **Assigning Positions:**
1. User checks multiple positions
2. Distribution algorithm calculates quantity per position
3. Saves with exact position_code from database
4. Displays in product card: "WH1-R05-RK05-S01-SH01-SUB02 +50"

---

## ✅ **Benefits**

### **1. Exact Match with WarehouseLocations**
- ✅ Same format: `WH1-R05-RK05-S01-SH01-SUB02`
- ✅ Same rack codes: `WH1-R05-RK05`
- ✅ Consistent across the application

### **2. Uses Database Field Directly**
- ✅ No manual concatenation
- ✅ No risk of format mismatch
- ✅ Single source of truth (database)

### **3. Proper Filtering**
- ✅ Positions filtered by rack code prefix
- ✅ No confusion between similar racks
- ✅ Accurate position lists

### **4. Better User Experience**
- ✅ Users see familiar location codes
- ✅ Easy to identify exact positions
- ✅ Matches physical warehouse labels

---

## 📝 **Example Output**

### **Rack Dropdown:**
```
Main Warehouse - WH1-R05-RK05
Main Warehouse - WH1-R06-RK06
Main Warehouse - WH2-R02-RK04
```

### **Position List:**
```
☑ WH1-R05-RK05-S01-SH01-SUB01  (10 available)
☑ WH1-R05-RK05-S01-SH01-SUB02  (15 available)
☐ WH1-R05-RK05-S01-SH02-SUB01  (12 available)
```

### **Product Card After Assignment:**
```
┌──────────────────────────────────────┐
│ 📦 Michelin Dual Sport 90/90-17     │
│                                      │
│ Total Quantity: 100 tires            │
│                                      │
│ ASSIGNED POSITIONS (3)               │
│ • WH1-R05-RK05-S01-SH01-SUB01  +40  │
│ • WH1-R05-RK05-S01-SH01-SUB02  +40  │
│ • WH1-R05-RK05-S01-SH02-SUB01  +20  │
└──────────────────────────────────────┘
```

---

## 🧪 **Testing**

After the changes:
1. ✅ Open Position Assignment Modal
2. ✅ Rack dropdown shows format: "Main Warehouse - WH1-R05-RK05"
3. ✅ Select rack
4. ✅ Positions load with full codes: "WH1-R05-RK05-S01-SH01-SUB02"
5. ✅ Check multiple positions
6. ✅ Distribution preview shows exact position codes
7. ✅ Product card displays exact position codes
8. ✅ Matches WarehouseLocations format exactly

---

## 📁 **Files Modified**

**File:** `frontend/src/pages/dashboard/operational/ShipmentRegistration.jsx`

**Functions Updated:**
1. `loadRacks()` - Extract rack codes from position_code using regex
2. `loadRackPositions()` - Filter positions by rack code prefix
3. `distributeQuantityAcrossPositions()` - Use position_code from DB
4. Rack dropdown rendering - Display rack_code
5. Position display in modal - Use position_code

**Key Changes:**
- Added regex pattern: `/^(WH\d+-R\d+-RK\d+)/`
- Added `position_code_prefix` field to rack objects
- Changed filtering from field matching to `startsWith()`
- Use `position_code` field directly (no concatenation)

---

## ✅ **Status**

**Issue:** ❌ Simplified format (Zone/Aisle/Rack)  
**Fixed:** ✅ Exact format (WH1-R05-RK05-S01-SH01-SUB02)  
**Consistency:** ✅ Matches WarehouseLocations  
**Build:** ✅ Successful  
**Ready:** ✅ For testing  

---

**Completed:** August 19, 2026  
**Agent:** Kiro AI Development Environment
