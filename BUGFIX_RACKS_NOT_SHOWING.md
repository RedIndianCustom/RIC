# Bug Fix: Racks Not Showing in Position Assignment Modal

## 🐛 **Issue**
The "Select Rack" dropdown in the Position Assignment Modal was showing only dashes "-" instead of actual rack names.

![Issue Screenshot](screenshot showing empty dropdown with dashes)

---

## 🔍 **Root Cause**

The Position Assignment Modal was using `warehouseLocations` state which loads data from `/warehouse-locations` API endpoint. However, this endpoint returns the `warehouse_locations` table which has the structure:
- `id`, `zone`, `aisle`, `rack`, `shelf`, `capacity`, `current_stock`, `status`

The modal was expecting rack data with fields:
- `warehouse_name`, `rack_code`

These fields don't exist in `warehouse_locations` table. The correct source is the `rack_configurations` table accessible via `/racks` endpoint.

---

## ✅ **Solution**

### **1. Added Separate Racks State**
```javascript
const [racks, setRacks] = useState([]); // For position picker - rack_configurations
```

### **2. Created Load Racks Function**
```javascript
const loadRacks = async () => {
  if (racks.length > 0) return; // already loaded
  try {
    const { data } = await api.get('/racks');
    console.log('📦 Loaded racks:', data);
    setRacks(data.racks || []);
  } catch (err) {
    console.warn('Could not load racks:', err);
  }
};
```

### **3. Updated openPositionPicker to Load Racks**
```javascript
const openPositionPicker = (productIndex) => {
  setEditingProductIndex(productIndex);
  setSelectedRackId(null);
  setSelectedPositionIds([]);
  setShowPositionModal(true);
  loadRacks(); // ← NEW: Load racks when opening modal
};
```

### **4. Updated Modal Dropdown to Use Racks**
```javascript
// BEFORE:
{warehouseLocations.map(rack => (
  <option key={rack.id} value={rack.id}>
    {rack.warehouse_name} - {rack.rack_code}
  </option>
))}

// AFTER:
{racks.map(rack => (
  <option key={rack.id} value={rack.id}>
    {rack.warehouse?.name || 'Unknown'} - {rack.rack_code}
  </option>
))}
```

### **5. Updated loadRackPositions API Endpoint**
```javascript
// BEFORE:
const response = await api.get(`/warehouse-locations/${rackId}/positions`);

// AFTER:
const response = await api.get(`/rack-locations?rack_id=${rackId}`);
```

### **6. Updated Data Field Mappings**
Updated all references to use `rack_locations` table structure:
- `current_stock` → `quantity` (current stock)
- `capacity` → `capacity` (with default 15)
- `tire_size` → `tire_size`
- Added `status` field check

---

## 📊 **Data Structure Comparison**

### **warehouse_locations Table (OLD - WRONG SOURCE)**
```javascript
{
  id: "uuid",
  zone: "A",
  aisle: "1",
  rack: "R01",
  shelf: "S01",
  capacity: 100,
  current_stock: 50,
  status: "active"
}
```

### **rack_configurations Table (NEW - CORRECT SOURCE)**
```javascript
{
  id: "uuid",
  rack_code: "WH1-R01-RK01",
  warehouse_id: "uuid",
  warehouse: {
    id: "uuid",
    name: "Main Warehouse",
    code: "WH1"
  },
  size_category: "medium",
  total_shelves: 5,
  sections_per_shelf: 3,
  subsections_per_section: 2,
  status: "active"
}
```

### **rack_locations Table (POSITIONS)**
```javascript
{
  id: "uuid",
  rack_id: "uuid",
  position_code: "WH1-R01-RK01-S01-SH01-SUB01",
  shelf_number: 1,
  section_number: 1,
  subsection_number: 1,
  quantity: 10, // current stock
  capacity: 15,
  tire_size: "90/90-17",
  status: "active"
}
```

---

## 🔧 **API Endpoints Used**

| Purpose | Endpoint | Returns |
|---------|----------|---------|
| Load Racks | `GET /racks` | `{ racks: [...] }` from `rack_configurations` table |
| Load Positions | `GET /rack-locations?rack_id={id}` | `{ locations: [...] }` from `rack_locations` table |
| Load Warehouses (Optional) | `GET /warehouse-locations` | `{ locations: [...] }` from `warehouse_locations` table |

---

## 📝 **Files Modified**

**File:** `frontend/src/pages/dashboard/operational/ShipmentRegistration.jsx`

**Changes:**
1. Added `racks` state variable
2. Added `loadRacks()` function
3. Updated `openPositionPicker()` to call `loadRacks()`
4. Updated `loadRackPositions()` to use `/rack-locations` endpoint
5. Updated position modal dropdown to use `racks` instead of `warehouseLocations`
6. Updated data field mappings throughout:
   - `current_stock` → `quantity`
   - Added default capacity (15)
   - Added status check

---

## 🧪 **Testing**

After the fix:
1. ✅ Open Position Assignment Modal
2. ✅ Rack dropdown shows actual rack names (e.g., "Main Warehouse - WH1-R01-RK01")
3. ✅ Selecting rack loads positions correctly
4. ✅ Positions show capacity bars
5. ✅ Multi-select works
6. ✅ Distribution calculates correctly

---

## 🎯 **Result**

The Position Assignment Modal now correctly:
- ✅ Loads racks from `rack_configurations` table
- ✅ Displays warehouse name and rack code
- ✅ Loads positions from `rack_locations` table
- ✅ Shows capacity and availability
- ✅ Handles tire size matching
- ✅ Validates capacity constraints

---

## 🔮 **Future Improvements**

### **Option 1: Denormalize for Performance**
Add `warehouse_name` and `rack_code` to `rack_locations` table to avoid joins:
```sql
ALTER TABLE rack_locations 
  ADD COLUMN warehouse_name VARCHAR(100),
  ADD COLUMN rack_code VARCHAR(50);
```

### **Option 2: Create View**
```sql
CREATE VIEW rack_positions_with_details AS
SELECT 
  rl.*,
  rc.rack_code,
  w.name as warehouse_name,
  w.code as warehouse_code
FROM rack_locations rl
JOIN rack_configurations rc ON rl.rack_id = rc.id
JOIN warehouses w ON rc.warehouse_id = w.id;
```

---

## ✅ **Status**

**Issue:** ❌ Racks showing as dashes  
**Fixed:** ✅ Racks load with proper names  
**Build:** ✅ Successful  
**Tested:** ✅ Working correctly  

---

**Fixed:** August 19, 2026  
**Agent:** Kiro AI Development Environment
