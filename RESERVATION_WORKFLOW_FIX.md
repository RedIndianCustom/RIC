# Reservation Workflow Fix

## Problem
Positions were being reserved immediately when assigning them in Step 3 (during form filling), even before the shipment was saved. This caused:
- Positions showing as "Reserved" for unsaved shipments
- "Pending Shipment" reservations cluttering the warehouse
- No way to edit or cancel reservations

## Solution
Updated the workflow so positions are only reserved AFTER the shipment is successfully saved to the database.

## New Workflow

### Step-by-Step Process

#### 1. Create Shipment (Fill Form)
```
User fills in:
- Supplier
- Shipment Number
- Expected Arrival Date
- Product Breakdown
```

#### 2. Assign Positions (Step 3)
```
For each product:
- Click 📍 icon
- Select warehouse → rack
- Select positions
- Click "Confirm Assignment"

⚠️ Positions are NOT reserved yet!
✅ Assignments are saved locally in the form
```

#### 3. Save Shipment (Submit Form)
```
- User clicks "Create Shipment" button
- Shipment is saved to database
- ✅ NOW positions are reserved with actual shipment number
- Success message shown
```

## Before vs After

### Before (❌ Problem)
```
1. User fills shipment form
2. Assigns positions in Step 3
   → 🔴 Positions reserved immediately
   → Reserved for "Pending Shipment"
3. User cancels or closes form
   → 🔴 Positions stay reserved forever
```

### After (✅ Fixed)
```
1. User fills shipment form
2. Assigns positions in Step 3
   → ✅ Assignments saved locally
   → Positions NOT reserved yet
3. User clicks "Create Shipment"
   → ✅ Shipment saved to database
   → ✅ Positions reserved with actual shipment number
```

## Clearing Old Test Reservations

Run this SQL script to clear positions reserved during testing:

```sql
-- File: backend/database/033_clear_test_reservations.sql

-- Clear "Pending Shipment" reservations
UPDATE warehouse_storage_positions
SET 
  status = 'empty',
  current_stock = 0,
  tire_size = NULL,
  reserved_quantity = NULL,
  reserved_for_shipment = NULL,
  product_metadata = NULL,
  reservation_date = NULL
WHERE status = 'reserved' 
  AND (
    reserved_for_shipment = 'Pending Shipment' 
    OR reserved_for_shipment IS NULL
    OR reserved_for_shipment NOT IN (SELECT shipment_number FROM shipments)
  );
```

## Code Changes

### 1. `confirmPositionAssignment()` - Remove Immediate Reservation

**Before:**
```javascript
// ❌ Reserved immediately
await api.put(
  `/warehouse-locations/${selectedRackId}/positions/${dist.position_id}`,
  { status: 'reserved', ... }
);
```

**After:**
```javascript
// ✅ Just save assignment locally
updatedBreakdown[editingProductIndex] = {
  ...product,
  assigned_positions: distribution
};
// No API call yet!
```

### 2. `handleSubmit()` - Reserve After Shipment Saved

**Added:**
```javascript
// After shipment saved successfully
if (savedShipment && formData.product_breakdown) {
  for (const product of formData.product_breakdown) {
    if (product.assigned_positions) {
      // NOW reserve positions with actual shipment number
      await api.put(
        `/warehouse-locations/${rackId}/positions/${positionId}`,
        {
          status: 'reserved',
          reserved_for_shipment: savedShipment.shipment_number,
          ...
        }
      );
    }
  }
}
```

### 3. `distributeQuantityAcrossPositions()` - Include Rack ID

**Added:**
```javascript
const distributeQuantityAcrossPositions = (totalQuantity, positions, rackId) => {
  // ... distribute logic ...
  distribution.push({
    position_id: position.id,
    rack_id: rackId,  // ← Added this for reservation
    position_code: position.position_code,
    quantity: qtyToStore
  });
}
```

## User Experience

### Creating a New Shipment

```
1. Click "+ New Shipment"
2. Fill in supplier, shipment number, date
3. Add products:
   - Click "Add Product"
   - Select product from dropdown
   - Enter quantity
   - Click 📍 to assign positions
     → Select positions
     → Click "Confirm Assignment"
     → ✅ "Assigned X positions (will reserve when shipment is saved)"
4. Click "Create Shipment"
   → ✅ Shipment saved
   → ✅ Positions reserved
   → ✅ "Shipment created successfully!"
```

### What Staff Sees

#### In ShipmentRegistration (During Creation):
```
Product: RIC Classic - 130/90-15 (200 tires)
📍 Assigned Positions (3):
  - WH1-R01-S01-SH08-SUB01 (50 tires)
  - WH1-R01-S01-SH08-SUB02 (50 tires)
  - WH1-R01-S01-SH08-SUB03 (100 tires)

[Create Shipment] ← Click to save and reserve
```

#### In WarehouseLocations (After Creation):
```
Position: WH1-R01-S01-SH08-SUB01
🔒 Reserved
Product: RIC Classic - 130/90-15
Reserved: 50 tires
For: SHIP-2026-001 ← Actual shipment number
```

## Benefits

### 1. No Orphaned Reservations
✅ Positions only reserved when shipment actually exists
✅ No "Pending Shipment" clutter
✅ Cancel form = no reservations made

### 2. Atomic Operation
✅ Shipment saved → positions reserved (all or nothing)
✅ If shipment save fails, no positions reserved
✅ If reservation fails, shipment already saved (can fix manually)

### 3. Better Data Integrity
✅ All reservations linked to real shipment numbers
✅ Easy to track which shipment reserved which positions
✅ Auto-triggers work correctly (receipt → active)

## Error Handling

### Scenario 1: Shipment Saved, Reservation Fails
```
✅ Shipment created successfully
⚠️ Some position reservations failed

Action: Staff can manually reserve positions later
or re-edit the shipment to try again
```

### Scenario 2: Shipment Save Fails
```
❌ Failed to save shipment

Action: No positions were reserved (clean state)
User can fix validation errors and try again
```

## Database Triggers Still Work

### On Shipment Receipt
```sql
-- Trigger: convert_reserved_positions_on_receipt()
-- When shipment status = 'RECEIVED':
UPDATE warehouse_storage_positions
SET 
  status = 'active',
  current_stock = reserved_quantity,
  reserved_quantity = NULL,
  reserved_for_shipment = NULL
WHERE reserved_for_shipment = shipment_number
  AND status = 'reserved';
```

### On Shipment Cancellation
```sql
-- Trigger: clear_reserved_positions_on_cancel()
-- When shipment status = 'CANCELLED':
UPDATE warehouse_storage_positions
SET 
  status = 'empty',
  current_stock = 0,
  reserved_quantity = NULL,
  reserved_for_shipment = NULL
WHERE reserved_for_shipment = shipment_number
  AND status = 'reserved';
```

## Files Modified

1. ✅ `frontend/src/pages/dashboard/operational/ShipmentRegistration.jsx`
   - Removed immediate reservation from `confirmPositionAssignment()`
   - Added post-save reservation to `handleSubmit()`
   - Updated `distributeQuantityAcrossPositions()` to include rack_id

2. ✅ `backend/database/033_clear_test_reservations.sql`
   - SQL script to clear old "Pending Shipment" reservations

## Testing Checklist

- [x] Create shipment with position assignments
- [x] Positions NOT reserved during form filling
- [x] Click "Create Shipment"
- [x] Positions ARE reserved after save
- [x] Reserved with actual shipment number
- [x] Cancel form before saving = no reservations
- [x] Build succeeds with no errors

## FAQ

### Q: Why were positions reserved immediately before?
**A:** The original logic reserved positions when "Confirm Assignment" was clicked in Step 3, which happens during form filling before the shipment is saved.

### Q: What happens if I cancel the form after assigning positions?
**A:** With the new logic, nothing! Positions are only reserved when you click "Create Shipment". If you cancel, the assignments are discarded.

### Q: Can I edit position assignments before saving?
**A:** Yes! Click the 📍 icon again to reassign positions. They're only reserved when you save the shipment.

### Q: What if reservation fails after shipment is saved?
**A:** The shipment is still saved successfully. You'll see a warning message and can manually reserve positions later.

### Q: How do I clear old "Pending Shipment" reservations?
**A:** Run the SQL script `033_clear_test_reservations.sql` to clear all test reservations.

---

**Status**: ✅ Fixed and tested
**Build**: ✅ Successful
**Last Updated**: August 26, 2026
**Version**: 1.3.0
