# Multi-Section Position Selection Enhancement

## Overview
Enhanced the warehouse position assignment feature in Shipment Registration (Step 3) to allow selecting storage positions across multiple sections simultaneously using a collapsible folder interface.

## ✅ Completed Features

### 1. **Collapsible Section Interface**
- Positions are now grouped by **Section → Shelf** (e.g., "S01 · SH08")
- Each section/shelf group can be expanded or collapsed individually
- Visual indicators show:
  - Chevron icons (▶ collapsed, ▼ expanded)
  - Number of positions in each section
  - Count of selected positions per section (badge)

### 2. **Bulk Expand/Collapse Controls**
- **"Expand All"** button: Opens all section/shelf groups at once
- **"Collapse All"** button: Closes all groups for cleaner view
- Located at the top of the position list for easy access

### 3. **Multi-Section Selection**
Users can now:
1. Click "Expand All" to see all positions across all sections
2. Select positions from Section 1 (e.g., S01-SH08)
3. Select positions from Section 2 (e.g., S02-SH03)
4. Select positions from any other sections
5. See total capacity across all selected positions
6. Confirm assignment with one click

### 4. **Visual Features**
- ✅ **Selection badges**: Show "X selected" count per section
- 📊 **Capacity tracking**: Real-time capacity calculation across all selections
- 🎨 **Color coding**: 
  - Emerald = Selected positions
  - Amber = Warning (insufficient capacity)
  - Red = Full positions
- 🔒 **Reserved positions**: Filtered out (cannot select reserved positions)

### 5. **State Management**
```javascript
const [expandedSections, setExpandedSections] = useState({});
const [selectedPositionIds, setSelectedPositionIds] = useState([]);

// Functions
const toggleSection = (sectionKey) => { ... }
const expandAllSections = (groupedPositions) => { ... }
const collapseAllSections = () => { ... }
```

## How It Works

### Step-by-Step User Flow

#### **Step 1: Open Position Picker**
```
Shipment Registration → Product Breakdown → Click 📍 icon
```

#### **Step 2: Select Warehouse & Rack**
- Choose warehouse (WH1 or WH2)
- Select a rack from the dropdown

#### **Step 3: Select Positions from Multiple Sections**
```
┌─────────────────────────────────────────────┐
│ [Expand All] [Collapse All]                 │
├─────────────────────────────────────────────┤
│ ▼ 📁 S01 · SH08 (12 positions) [3 selected] │
│   ├─ ☑ WH1-LOC-XXX-S01-SH08-SUB01          │
│   ├─ ☑ WH1-LOC-XXX-S01-SH08-SUB02          │
│   └─ ☑ WH1-LOC-XXX-S01-SH08-SUB03          │
├─────────────────────────────────────────────┤
│ ▼ 📁 S02 · SH03 (8 positions) [2 selected]  │
│   ├─ ☑ WH1-LOC-XXX-S02-SH03-SUB01          │
│   └─ ☑ WH1-LOC-XXX-S02-SH03-SUB02          │
├─────────────────────────────────────────────┤
│ ▶ 📁 S03 · SH05 (10 positions)             │
└─────────────────────────────────────────────┘

Selected capacity: 250 tires | Need: 200 tires ✅
```

#### **Step 4: Confirm Assignment**
- Review capacity summary
- Click "Confirm Assignment"
- Positions are reserved across all selected sections

## Technical Implementation

### Data Structure
```javascript
// Positions grouped by section → shelf
const groupedPositions = {
  "S01-SH08": {
    section: "S01",
    shelf: "SH08",
    positions: [
      { id: "...", position_code: "...", capacity: 50, current_stock: 20, ... },
      { id: "...", position_code: "...", capacity: 50, current_stock: 10, ... }
    ]
  },
  "S02-SH03": { ... }
}

// Expanded state tracks which sections are open
const expandedSections = {
  "S01-SH08": true,
  "S02-SH03": false
}

// Selected positions tracked by ID
const selectedPositionIds = ["id1", "id2", "id3", ...]
```

### API Call on Confirmation
```javascript
await api.put(`/warehouse-locations/${rackId}/positions/${positionId}`, {
  status: 'reserved',
  reserved_quantity: distributedQty,
  reserved_for_shipment: shipment_number,
  tire_size: `${brand} ${model} - ${dimensions}`,
  product_metadata: { product_id, brand, model, dimensions, sku }
});
```

## Benefits

### For Users
✅ **Faster Assignment**: Select from multiple sections without navigating between views
✅ **Better Visibility**: See all available sections at once
✅ **Flexible Organization**: Assign products to optimal positions across the warehouse
✅ **Error Prevention**: Real-time capacity validation prevents over-allocation

### For Operations
✅ **Space Optimization**: Utilize available capacity across all sections
✅ **Scalability**: Easily handle large warehouses with many sections
✅ **Traceability**: Each position records the shipment and product details

## Related Features

### Position Reservation System
When positions are assigned during shipment registration:
- Status changes to `reserved`
- Product metadata saved (brand, model, dimensions)
- Position becomes unavailable in WarehouseLocations view
- Shows 🔒 Reserved badge with product name
- Auto-converts to `active` when shipment is received

### Warehouse Locations View
Reserved positions display:
```
┌─────────────────────────────────────────────┐
│ WH1-LOC-519440-S01-SH08-SUB02               │
│ 🔒 Reserved                                  │
│ Red Indian Customs Classic - 130/90-15      │
│ For: SHIP-2026-001                          │
│ Reserved: 50 tires                          │
└─────────────────────────────────────────────┘
```

## Files Modified

### Frontend
- `frontend/src/pages/dashboard/operational/ShipmentRegistration.jsx`
  - Added `expandedSections` state
  - Added `toggleSection()`, `expandAllSections()`, `collapseAllSections()` functions
  - Updated position picker modal with collapsible sections
  - Removed duplicate position rendering code
  - Added section selection badges

- `frontend/src/pages/dashboard/shared/WarehouseLocations.jsx`
  - Updated to display reserved positions with product info
  - Added reservation badge and styling
  - Filters out reserved positions from selection

### Database
- `backend/database/032_add_position_reservation_fields.sql`
  - Added `reserved_quantity`, `reserved_for_shipment`, `product_metadata`, `reservation_date`
  - Created auto-convert trigger (reserved → active on receipt)
  - Created auto-clear trigger (on shipment cancellation)

## Testing Checklist

- [x] Can expand individual sections
- [x] Can collapse individual sections
- [x] "Expand All" opens all sections
- [x] "Collapse All" closes all sections
- [x] Can select positions from Section 1
- [x] Can select positions from Section 2
- [x] Can select positions from multiple sections simultaneously
- [x] Selection count badges update correctly
- [x] Capacity calculation includes all selected positions
- [x] Confirmation saves all selections
- [x] Reserved positions appear in WarehouseLocations
- [x] Auto-convert works on shipment receipt

## Known Limitations

1. **Section grouping**: Currently groups by Section → Shelf only (not by subsection)
2. **Performance**: Large warehouses (1000+ positions) may have slight lag when expanding all
3. **Capacity distribution**: Manual distribution across positions (auto-distribution not implemented)

## Future Enhancements

### Potential Improvements
- [ ] Auto-distribute quantity across selected positions
- [ ] Sort sections by availability
- [ ] Filter sections by available capacity
- [ ] Bulk select all positions in a section
- [ ] Drag-and-drop position reordering
- [ ] Visual warehouse map view

## User Guide

### Quick Start
1. Create a new shipment
2. Add product to breakdown
3. Click the 📍 icon next to the product
4. Select warehouse → rack
5. Click "Expand All" to see all sections
6. Check positions from any sections you need
7. Verify capacity matches your quantity
8. Click "Confirm Assignment"

### Tips
💡 Use "Expand All" to get a bird's-eye view of all available positions
💡 Check capacity summary at the top to ensure sufficient space
💡 Select from multiple sections to optimize warehouse utilization
💡 Reserved positions will show 🔒 icon in WarehouseLocations

## Conclusion

The multi-section selection enhancement provides a powerful, flexible way to assign warehouse positions across the entire facility. Users can now efficiently allocate incoming shipments to optimal storage locations while maintaining full visibility and control.

---

**Status**: ✅ Completed and working
**Last Updated**: August 26, 2026
**Version**: 1.0.0
