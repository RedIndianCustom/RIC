# Warehouse Receiving Error Fix

## Problem
Warehouse staff could not see shipments sent from operational staff. Multiple errors occurred:
1. `Error: column shipments.shipment_type does not exist` at ReceivingEnhanced.jsx:71
2. `Error: column products_1.name does not exist` at ReceivingEnhanced.jsx:109 when clicking "View Details"
3. `Error: column suppliers_1.code does not exist` at ReceivingEnhanced.jsx:71 when loading shipments
4. Display showing "N/A" for Origin and Expected Arrival fields

## Root Causes
1. **Backend Query Error**: The `getIncomingShipments` function was querying non-existent columns
2. **Column Mismatch**: Backend was using incorrect column names
3. **Toast Function Error**: Frontend was using `showToast.error()` instead of `toast.error()`
4. **Shipment Details Error**: `getShipmentDetails` was trying to query inventory_units with wrong product join syntax
5. **Frontend Field Mismatch**: Frontend was displaying non-existent fields (`origin`, `expected_arrival`, `total_quantity`, `shipment_type`)
6. **Supplier Table Mismatch**: Queries were trying to fetch `suppliers.code` which doesn't exist in the suppliers table

## Changes Applied

### 1. Backend Controller - getIncomingShipments
**File**: `backend/src/controllers/warehouseOperationsController.js`

**Changed Query:**
```javascript
.select(`
  id,
  shipment_number,
  status,
  expected_date,           // ✅ CORRECT (was expected_arrival)
  actual_date,             // ✅ CORRECT (was actual_arrival)
  received_date,           // ✅ ADDED
  supplier_id,
  expected_quantity,       // ✅ CORRECT (was total_quantity)
  actual_quantity,         // ✅ ADDED
  container_number,        // ✅ ADDED
  bl_number,               // ✅ ADDED
  notes,
  product_breakdown,       // ✅ ADDED (JSON field with size breakdown)
  created_at,
  supplier:suppliers(id, name)  // ✅ ADDED (join to get supplier info, removed non-existent 'code')
`)
.order('expected_date', { ascending: true })
```

**Removed non-existent columns:**
- ❌ `shipment_type` - doesn't exist
- ❌ `origin` - doesn't exist
- ❌ `expected_arrival` - wrong name
- ❌ `actual_arrival` - wrong name
- ❌ `total_quantity` - wrong name
- ❌ `suppliers.code` - doesn't exist in suppliers table

### 2. Backend Controller - getShipmentDetails
**File**: `backend/src/controllers/warehouseOperationsController.js`

**Fixed to handle both received and in-transit shipments:**

```javascript
export const getShipmentDetails = async (req, res) => {
  // Get shipment with supplier info
  const { data: shipment } = await supabase
    .from('shipments')
    .select(`
      *,
      supplier:suppliers(id, name)  // ✅ FIXED: Removed non-existent 'code' column
    `)
    .eq('id', id)
    .single();

  // For received shipments, get actual inventory_units
  if (shipment.status === 'RECEIVED' || shipment.status === 'RECEIVING') {
    const { data: inventoryItems } = await supabase
      .from('inventory_units')
      .select(`
        id,
        barcode_value,
        status,
        product_id,
        batch_id,
        warehouse_id,
        rack_code,
        position_code,
        products!inner (  // ✅ FIXED: Use !inner for proper join
          id,
          sku,
          brand,
          model,
          product_type,
          size
        )
      `)
      .eq('shipment_id', id);
    
    items = inventoryItems || [];
  } else {
    // For in-transit shipments, use product_breakdown JSON
    if (shipment.product_breakdown) {
      items = Object.entries(shipment.product_breakdown).map(([size, quantity]) => ({
        size,
        quantity,
        expected: true
      }));
    }
  }
};
```

**Key fixes:**
- ✅ Changed `products (...)` to `products!inner (...)` for proper join syntax
- ✅ Added logic to handle shipments without inventory_units yet
- ✅ Use `product_breakdown` JSON for expected items
- ✅ Include supplier information

### 3. Backend Controller - completeReceiving
**File**: `backend/src/controllers/warehouseOperationsController.js`

**Fixed column names:**
```javascript
.update({
  status: 'RECEIVED',
  actual_date: new Date().toISOString().split('T')[0],  // ✅ DATE field
  received_date: new Date().toISOString(),               // ✅ TIMESTAMPTZ field
  notes: notes,
  updated_at: new Date().toISOString()
})
```

### 4. Frontend - Toast Fix
**File**: `frontend/src/pages/dashboard/warehouse/ReceivingEnhanced.jsx`

**Changed Import:**
```javascript
// ❌ OLD
import { showToast } from '../../../utils/toast';
showToast.error('Failed to load shipments');

// ✅ NEW
import { toast } from '../../../utils/toast';
toast.error('Failed to load shipments');
```

### 5. Frontend - Display Fields Fix
**File**: `frontend/src/pages/dashboard/warehouse/ReceivingEnhanced.jsx`

**Changed Display Fields:**
```javascript
// ❌ OLD
<div>Origin: {shipment.origin || 'N/A'}</div>
<div>Expected Arrival: {shipment.expected_arrival}</div>
<div>Total Quantity: {shipment.total_quantity}</div>
<div>Type: {shipment.shipment_type}</div>

// ✅ NEW
<div>Supplier: {shipment.supplier?.name || 'N/A'}</div>
<div>Expected Date: {shipment.expected_date}</div>
<div>Expected Quantity: {shipment.expected_quantity}</div>
<div>Container: {shipment.container_number || 'N/A'}</div>
```

**Changed Search Filter:**
```javascript
// ❌ OLD
shipment.origin?.toLowerCase().includes(searchQuery.toLowerCase())

// ✅ NEW
shipment.supplier?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
shipment.container_number?.toLowerCase().includes(searchQuery.toLowerCase())
```

## Shipments Table Schema
The actual columns in the `shipments` table:
```sql
CREATE TABLE public.shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_number VARCHAR(100) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES public.suppliers(id),
    expected_date DATE,                     -- When shipment is expected
    actual_date DATE,                       -- When it actually arrived
    received_date TIMESTAMPTZ,              -- When receiving was completed
    container_number VARCHAR(50),
    bl_number VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',   -- PENDING, IN_TRANSIT, RECEIVED, etc.
    actual_quantity INTEGER,
    expected_quantity INTEGER,
    condition VARCHAR(50),
    notes TEXT,
    storage_location VARCHAR(255),
    product_breakdown JSONB,                -- Size breakdown (e.g., {"38": 10, "40": 15})
    received_by UUID REFERENCES public.users(id),
    inspection_completed BOOLEAN DEFAULT false,
    quality_status VARCHAR(50),
    defects TEXT,
    inspection_notes TEXT,
    inspected_by UUID REFERENCES public.users(id),
    inspection_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Note:** There is NO `origin`, `shipment_type`, `expected_arrival`, `actual_arrival`, or `total_quantity` column.

## Suppliers Table Schema
The actual columns in the `suppliers` table:
```sql
CREATE TABLE public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT,
    payment_terms TEXT,
    tax_id TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    notes TEXT,
    total_orders INTEGER DEFAULT 0,
    total_value NUMERIC(15,2) DEFAULT 0,
    created_by UUID REFERENCES public.users(id),
    updated_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Note:** There is NO `code` column in the suppliers table.

## Workflow Verification

### Step 1: Operational Staff Sends Shipment
- **Page**: `IncomingShipmentsEnhanced.jsx`
- **Action**: Click "Send to Warehouse" button
- **Backend**: POST `/shipments/:id/send-to-warehouse`
- **Result**: Status changes `PENDING` → `IN_TRANSIT`

### Step 2: Warehouse Staff Views Shipments
- **Page**: `ReceivingEnhanced.jsx`
- **Action**: Load shipments on page load
- **Backend**: GET `/warehouse/receiving`
- **Query**: Fetch shipments with status `IN_TRANSIT`, `ARRIVED`, or `PENDING_RECEIVING`
- **Displays**: 
  - Supplier name (from join)
  - Expected date
  - Expected quantity
  - Container number
- **Result**: ✅ Now works correctly (was showing N/A before fix)

### Step 3: Warehouse Staff Views Details
- **Page**: `ReceivingEnhanced.jsx`
- **Action**: Click "View Details" on a shipment
- **Backend**: GET `/warehouse/receiving/:id`
- **Logic**:
  - If shipment is `RECEIVED` or `RECEIVING`: Fetch actual inventory_units
  - If shipment is `IN_TRANSIT`: Use product_breakdown JSON for expected items
- **Result**: ✅ Now works correctly (was throwing product join error before)

### Step 4: Start Receiving
- **Action**: Click "Start Receiving"
- **Backend**: POST `/warehouse/receiving/:id/start`
- **Result**: Status changes to `RECEIVING`

### Step 5: Complete Receiving
- **Action**: Scan items, assign locations, complete
- **Backend**: POST `/warehouse/receiving/:id/complete`
- **Updates**:
  - `status` → `RECEIVED`
  - `actual_date` → Current date (DATE)
  - `received_date` → Current timestamp (TIMESTAMPTZ)
- **Result**: Status changes to `RECEIVED`

## Testing
1. ✅ Backend no longer queries non-existent columns
2. ✅ Frontend uses correct toast function
3. ✅ Frontend displays correct fields (no more N/A)
4. ✅ Shipments sent by operational staff appear in warehouse receiving page
5. ✅ "View Details" button works without product join error
6. ✅ Shipment cards show supplier name, expected date, quantity, container number

## Files Modified
- ✅ `backend/src/controllers/warehouseOperationsController.js`
  - Fixed `getIncomingShipments` query (added supplier join, fixed column names)
  - Fixed `getShipmentDetails` (fixed product join, added product_breakdown logic)
  - Fixed `completeReceiving` (fixed column names for actual_date and received_date)
- ✅ `frontend/src/pages/dashboard/warehouse/ReceivingEnhanced.jsx`
  - Fixed toast import and all calls
  - Fixed display fields (origin→supplier, expected_arrival→expected_date, etc.)
  - Fixed search filter to use supplier name instead of origin
- ✅ `WAREHOUSE_RECEIVING_FIX.md` (this documentation)

## Related Fixes (Previously Applied)
- Fixed notification system to return warning instead of error when no WAREHOUSE_STAFF users exist
- Fixed batch deactivation constraint (added INACTIVE status)
- Fixed IncomingShipmentsEnhanced to read product_breakdown directly from shipment object
- Removed old IncomingShipments.jsx component
- Updated routes to use Enhanced versions
