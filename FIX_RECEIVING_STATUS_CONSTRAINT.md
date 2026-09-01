# Fix: Shipment Status Constraint for Receiving Process

## Problem
When clicking "View Details" or starting the receiving process, got error:
```
Error: new row for relation "shipments" violates check constraint "chk_shipments_status"
```

## Root Cause
The `startReceiving` function was trying to set shipment status to `RECEIVING`, but this value is not allowed by the database constraint.

### Allowed Status Values
The `chk_shipments_status` constraint only allows:
- `PENDING`
- `IN_TRANSIT`
- `RECEIVED`
- `INSPECTING` ✅
- `APPROVED`
- `REJECTED`
- `CANCELLED`

**Note:** `RECEIVING` and `PENDING_RECEIVING` are NOT allowed values.

## Changes Applied

### 1. Backend - startReceiving Function
**File**: `backend/src/controllers/warehouseOperationsController.js`

**Changed:**
```javascript
// ❌ OLD - Invalid status
const { data, error } = await supabase
  .from('shipments')
  .update({
    status: 'RECEIVING',  // ❌ Not allowed by constraint
    updated_at: new Date().toISOString()
  })

// ✅ NEW - Valid status
const { data, error } = await supabase
  .from('shipments')
  .update({
    status: 'INSPECTING',  // ✅ Allowed by constraint
    updated_at: new Date().toISOString()
  })
```

### 2. Backend - getShipmentDetails Function
**File**: `backend/src/controllers/warehouseOperationsController.js`

**Changed:**
```javascript
// ❌ OLD
if (shipment.status === 'RECEIVED' || shipment.status === 'RECEIVING') {

// ✅ NEW
if (shipment.status === 'RECEIVED' || shipment.status === 'INSPECTING') {
```

### 3. Backend - getIncomingShipments Function
**File**: `backend/src/controllers/warehouseOperationsController.js`

**Changed:**
```javascript
// ❌ OLD - Invalid status
query = query.in('status', ['IN_TRANSIT', 'ARRIVED', 'PENDING_RECEIVING']);

// ✅ NEW - Valid status
query = query.in('status', ['IN_TRANSIT', 'ARRIVED', 'INSPECTING']);
```

### 4. Frontend - Status Filter
**File**: `frontend/src/pages/dashboard/warehouse/ReceivingEnhanced.jsx`

**Changed:**
```jsx
// ❌ OLD
<option value="RECEIVING">Receiving</option>

// ✅ NEW
<option value="INSPECTING">Inspecting</option>
```

### 5. Frontend - Status Badge Color
**File**: `frontend/src/pages/dashboard/warehouse/ReceivingEnhanced.jsx`

**Changed:**
```jsx
// ❌ OLD
shipment.status === 'RECEIVING' ? 'bg-blue-100 text-blue-700' :

// ✅ NEW
shipment.status === 'INSPECTING' ? 'bg-blue-100 text-blue-700' :
```

### 6. Frontend - Continue Button
**File**: `frontend/src/pages/dashboard/warehouse/ReceivingEnhanced.jsx`

**Changed:**
```jsx
// ❌ OLD
{shipment.status === 'RECEIVING' && (

// ✅ NEW
{shipment.status === 'INSPECTING' && (
```

## Status Flow

### Correct Workflow:
1. **Operational Staff** registers shipment → Status: `PENDING`
2. **Operational Staff** sends to warehouse → Status: `IN_TRANSIT`
3. **Warehouse Staff** starts receiving → Status: `INSPECTING`
4. **Warehouse Staff** completes receiving → Status: `RECEIVED`

### Status Meanings:
- `PENDING` - Shipment registered but not yet sent
- `IN_TRANSIT` - Shipment sent to warehouse, awaiting arrival
- `ARRIVED` - Shipment physically arrived at warehouse (optional intermediate state)
- `INSPECTING` - Warehouse staff is actively receiving/inspecting items
- `RECEIVED` - Receiving completed, items stored
- `APPROVED` - Quality control approved (optional)
- `REJECTED` - Quality control rejected (optional)
- `CANCELLED` - Shipment cancelled

## Testing
1. ✅ Start receiving process no longer throws constraint error
2. ✅ Shipment status changes from `IN_TRANSIT` to `INSPECTING` when starting
3. ✅ Frontend displays `INSPECTING` status correctly with blue badge
4. ✅ Continue button appears for shipments in `INSPECTING` status
5. ✅ Filter dropdown includes `INSPECTING` option
6. ✅ Backend queries only use valid status values

## Files Modified
- ✅ `backend/src/controllers/warehouseOperationsController.js`
  - `startReceiving` - changed status from RECEIVING to INSPECTING
  - `getShipmentDetails` - check for INSPECTING instead of RECEIVING
  - `getIncomingShipments` - filter for INSPECTING instead of PENDING_RECEIVING
- ✅ `frontend/src/pages/dashboard/warehouse/ReceivingEnhanced.jsx`
  - Status filter dropdown option
  - Status badge color condition
  - Continue button condition
- ✅ `FIX_RECEIVING_STATUS_CONSTRAINT.md` (this document)

## Database Constraint
```sql
ALTER TABLE public.shipments
    ADD CONSTRAINT chk_shipments_status CHECK (
        status IN ('PENDING','IN_TRANSIT','RECEIVED','INSPECTING','APPROVED','REJECTED','CANCELLED')
    );
```

**Note:** If you need to add new status values, you must:
1. Update this constraint to include the new value
2. Update all backend code that filters by status
3. Update all frontend code that displays or filters by status
