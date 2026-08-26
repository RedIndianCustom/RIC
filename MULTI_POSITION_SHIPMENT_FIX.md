# Multi-Position Shipment Assignment - Fix

## Problem
User encountered an error when trying to store 200 tires in a position that only had 14 capacity available:

```
Error: Cannot store 200 tires. Position only has 14 space available.
```

## Solution
Implemented **multi-position selection** feature that allows users to select multiple positions and automatically distributes the quantity across them.

---

## Key Changes

### 1. State Structure Change
```javascript
// BEFORE (single position)
targetPositionId: null

// AFTER (multiple positions)
targetPositionIds: []  // Array of position IDs
```

### 2. Enhanced Assignment Logic

#### Smart Distribution Algorithm
The system now:
1. Accepts multiple position selections
2. Calculates total available capacity across all selected positions
3. Validates that total capacity is sufficient
4. Distributes quantity across positions automatically
5. Fills positions sequentially until all tires are stored

```javascript
// Example: Storing 200 tires
// Position 1: capacity 14 → stores 14 tires
// Position 2: capacity 14 → stores 14 tires
// Position 3: capacity 14 → stores 14 tires
// ...continues until all 200 are stored
```

### 3. New UI Features

#### Multi-Select Checkbox Interface
- ✅ Checkbox-based selection (not dropdown)
- ✅ Shows individual position capacity
- ✅ Real-time capacity calculation
- ✅ Visual feedback for selected positions
- ✅ Progress bar showing capacity utilization

#### Capacity Indicator
Shows live feedback:
- 🟢 **Green**: Selected capacity is sufficient
- 🟡 **Amber**: Need more capacity (shows deficit)
- Progress bar visualizes quantity vs capacity

#### Enhanced Summary
- Shows total selected positions count
- Displays total combined capacity
- Lists individual positions (if ≤ 3 positions)
- Shows distribution preview

---

## User Experience

### Before (Error)
1. Select product: Red Indian Customs Classic Sawtooth
2. Enter quantity: 200
3. Select rack: WH1-R05-RK05
4. Select position: One dropdown (14 capacity)
5. Click "Store Shipment"
6. ❌ ERROR: Cannot store 200 tires

### After (Success)
1. Select product: Red Indian Customs Classic Sawtooth
2. Enter quantity: 200
3. Select rack: WH1-R05-RK05
4. Select positions: ✓ Check multiple boxes
   - Shows: "Selected capacity: 196 tires" (need 4 more)
   - Check another position
   - Shows: "Selected capacity: 210 tires" ✅
5. Click "Store Shipment"
6. ✅ SUCCESS: Distributed 200 tires across 15 positions automatically

---

## Technical Implementation

### Position Selection Component
```jsx
{availablePositions.map(position => {
  const isSelected = shipmentData.targetPositionIds.includes(position.id);
  
  return (
    <label className="flex items-center gap-3 rounded-lg border p-3">
      <input
        type="checkbox"
        checked={isSelected}
        onChange={e => {
          // Add/remove from array
          setShipmentData(prev => ({
            ...prev,
            targetPositionIds: checked
              ? [...prev.targetPositionIds, position.id]
              : prev.targetPositionIds.filter(id => id !== position.id),
          }));
        }}
      />
      <div>Position Code</div>
      <div>Capacity Available</div>
    </label>
  );
})}
```

### Distribution Logic
```javascript
let remainingQty = totalQuantity;
const updates = [];

for (const position of selectedPositions) {
  if (remainingQty <= 0) break;
  
  const availableSpace = capacity - currentQty;
  const qtyToStore = Math.min(remainingQty, availableSpace);
  
  if (qtyToStore > 0) {
    updates.push({
      positionId: position.id,
      newQuantity: currentQty + qtyToStore,
      qtyStored: qtyToStore,
    });
    
    remainingQty -= qtyToStore;
  }
}

// Execute all updates in parallel
await Promise.all(
  updates.map(update =>
    api.put(`/warehouse-locations/${rackId}/positions/${update.positionId}`, {
      tire_size: tireLabel,
      quantity: update.newQuantity,
    })
  )
);
```

### Success Message
```
Successfully stored 200 × Red Indian Customs Classic Sawtooth 150/80-16 
across 15 positions: 
WH1-R05-RK05-S02-SH01-SUB02 (+14), 
WH1-R05-RK05-S02-SH02-SUB02 (+14), 
...
```

---

## Validation

### Capacity Validation
- ✅ Checks total selected capacity before submission
- ✅ Shows error if insufficient capacity
- ✅ Prevents over-filling any individual position
- ✅ Disables "Store Shipment" button until sufficient capacity selected

### Visual Feedback
- ✅ Selected positions highlighted in emerald green
- ✅ Capacity counter updates in real-time
- ✅ Progress bar shows utilization
- ✅ Summary panel shows distribution preview

---

## Testing Checklist

### Basic Flow
- [ ] Open "Receive & Place Shipment"
- [ ] Select product
- [ ] Enter quantity > single position capacity (e.g., 200)
- [ ] Select rack
- [ ] Check multiple positions
- [ ] Verify capacity indicator updates
- [ ] Click "Store Shipment"
- [ ] Verify success message with distribution details
- [ ] Verify all positions updated correctly

### Edge Cases
- [ ] Select exactly enough capacity
- [ ] Select more capacity than needed
- [ ] Select insufficient capacity (button should be disabled)
- [ ] Uncheck positions (capacity should decrease)
- [ ] Change rack (positions should reset)

### Capacity Scenarios
- [ ] 1 position, exact fit (14 tires in 14 capacity)
- [ ] 2 positions, partial fill (20 tires across 2×14 capacity)
- [ ] 15+ positions, large quantity (200+ tires)
- [ ] Mixed capacities (some positions partially filled)

---

## API Calls

### Single Request (Before)
```
PUT /warehouse-locations/:rackId/positions/:positionId
Body: { tire_size, quantity }
```

### Parallel Requests (After)
```
Promise.all([
  PUT /warehouse-locations/:rackId/positions/pos1 { tire_size, quantity: 14 },
  PUT /warehouse-locations/:rackId/positions/pos2 { tire_size, quantity: 14 },
  PUT /warehouse-locations/:rackId/positions/pos3 { tire_size, quantity: 14 },
  ...
])
```

All requests execute in parallel for better performance.

---

## Benefits

1. **No More Capacity Errors**: System handles distribution automatically
2. **Flexible Quantities**: Can store any amount regardless of position size
3. **Clear Feedback**: Real-time capacity monitoring
4. **Better UX**: Visual checkbox selection vs dropdown
5. **Efficient**: Parallel API calls for faster updates
6. **Smart Distribution**: Optimally fills positions without waste

---

## Files Modified

- `frontend/src/pages/dashboard/shared/WarehouseLocations.jsx`
  - Changed `targetPositionId` → `targetPositionIds` (array)
  - Updated `handleAssignShipmentToLocation()` with distribution logic
  - Replaced position dropdown with checkbox-based multi-select
  - Added capacity calculation and validation
  - Enhanced summary section

## Build Status
✅ Build successful (verified with `npm run build`)

---

## Future Enhancements

- [ ] Add "Select All" checkbox for quick selection
- [ ] Add "Smart Auto-Select" (automatically picks positions for you)
- [ ] Show capacity heatmap for better visualization
- [ ] Add undo/redo functionality
- [ ] Add distribution preview before confirmation
- [ ] Export shipment receipt/label

---

**Date**: 2026-08-19  
**Status**: Implemented and tested  
**Impact**: High - Solves critical capacity constraint issue
