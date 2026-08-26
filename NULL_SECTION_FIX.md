# Fix for "Snull" / "SHnull" Display in Position Picker

## Problem
The position picker modal was showing "Snull" and "SHnull" instead of proper section/shelf numbers like "S01" and "SH01".

## Root Cause
The code was trying to load positions from `warehouse_locations` table, which doesn't have `section_number`, `shelf_number`, or `subsection_number` fields. These fields exist in the `warehouse_storage_positions` table.

## Changes Made

### 1. Updated `loadRackPositions()` Function
**Before:**
```javascript
// Load all warehouse locations and filter by rack code prefix
const response = await api.get('/warehouse-locations');
const allLocations = response.data.locations || [];

// Filter positions that start with this rack's code
const positions = allLocations.filter(loc => {
  const posCode = loc.position_code || loc.code || '';
  return posCode.startsWith(rack.position_code_prefix);
});
```

**After:**
```javascript
// Load storage positions from the dedicated endpoint
const response = await api.get(`/warehouse-locations/${rackId}/positions`);
const positions = response.data.positions || [];
```

**Impact:** Now loads from `warehouse_storage_positions` table which has the proper section/shelf/subsection structure.

### 2. Added Null Checking in `getOccupiedPositionsSummary()`
```javascript
positions.forEach(pos => {
  if (pos.current_stock && pos.current_stock > 0) {
    // Check if section_number, shelf_number, and subsection_number exist
    if (!pos.section_number || !pos.shelf_number || !pos.subsection_number) {
      console.warn('Position missing section/shelf/subsection numbers:', pos);
      return; // Skip this position
    }
    
    const section = `S${String(pos.section_number).padStart(2, '0')}`;
    const shelf = `SH${String(pos.shelf_number).padStart(2, '0')}`;
    const subsection = `SUB${String(pos.subsection_number).padStart(2, '0')}`;
    // ...
  }
});
```

**Impact:** Safely handles positions that might be missing these fields and logs a warning for debugging.

### 3. Updated `getAvailablePositionsForRack()` Filter
**Added:**
```javascript
// Only show active/available/empty positions
if (status && status !== 'active' && status !== 'available' && status !== 'empty') return false;
```

**Impact:** Now correctly shows empty positions as available for assignment.

## Backend API Endpoint

The fix relies on the existing backend endpoint:
```
GET /api/warehouse-locations/:id/positions
```

This endpoint:
1. Fetches from `warehouse_storage_positions` table
2. Returns positions with proper `section_number`, `shelf_number`, `subsection_number` fields
3. If no positions exist, it can auto-generate them based on rack metadata

## What to Check

### 1. **Check if Storage Positions Exist**
Run this SQL query:
```sql
SELECT 
  wl.code as rack_code,
  COUNT(wsp.id) as position_count
FROM warehouse_locations wl
LEFT JOIN warehouse_storage_positions wsp ON wsp.warehouse_location_id = wl.id
WHERE wl.code LIKE 'WH1-R05-RK05%'
GROUP BY wl.code;
```

**Expected Result:**
- Should show rack with position_count > 0
- If position_count = 0, positions need to be generated

### 2. **Generate Positions if Missing**
If positions don't exist, they should auto-generate when you select a rack in the UI. Check browser console for:
```
📍 Loading positions for rack WH1-R05-RK05 (ID: xxx)...
📦 Generating positions for rack WH1-R05-RK05...
✅ Generated X positions
```

### 3. **Verify Position Data Structure**
When positions load, check browser console for "Sample position:" log. It should show:
```javascript
{
  id: "uuid",
  warehouse_location_id: "uuid",
  section_number: 1,           // ← Should be a number, not null
  shelf_number: 1,              // ← Should be a number, not null
  subsection_number: 1,         // ← Should be a number, not null
  position_code: "WH1-R05-RK05-S01-SH01-SUB01",
  capacity: 100,
  current_stock: 0,
  tire_size: null,
  status: "empty",
  // ...
}
```

## Manual Position Generation (if needed)

If auto-generation doesn't work, you can manually generate positions:

```sql
-- Call the generation function for a specific rack
SELECT generate_storage_positions_for_rack(
  '<warehouse_location_id>',  -- The rack's UUID
  4,    -- sections per rack
  4,    -- shelves per section
  8,    -- subsections per shelf
  100   -- capacity per subsection (tires)
);
```

Example:
```sql
-- Get the rack ID first
SELECT id, code FROM warehouse_locations WHERE code = 'WH1-R05-RK05';

-- Then generate positions
SELECT generate_storage_positions_for_rack(
  'the-uuid-from-above',
  4,  -- 4 sections
  4,  -- 4 shelves
  8,  -- 8 subsections
  100 -- 100 tires per subsection
);
```

## Testing

1. **Open Shipment Registration**
2. **Add a Product** (e.g., 320 tires)
3. **Click "Assign Positions" (map pin icon)**
4. **Select a Rack** (e.g., "Main Warehouse - WH1-R05-RK05")
5. **Check "Current Rack Occupancy"** section:
   - Should show proper "S01", "SH01", "SUB01" labels
   - NOT "Snull", "SHnull", "SUBnull"

## Files Modified

- `frontend/src/pages/dashboard/operational/ShipmentRegistration.jsx`
  - `loadRackPositions()` - Now uses `/warehouse-locations/:id/positions`
  - `getOccupiedPositionsSummary()` - Added null checking
  - `getAvailablePositionsForRack()` - Added 'empty' status support

## Related Files (Backend)

- `backend/src/controllers/warehouseLocationController.js`
  - `getStoragePositions()` endpoint
- `backend/database/028_warehouse_storage_positions.sql`
  - Table schema and `generate_storage_positions_for_rack()` function

---

**Status**: ✅ Fixed
**Date**: 2026-08-26
**Component**: ShipmentRegistration.jsx Position Picker
