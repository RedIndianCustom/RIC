# Warehouse 3D Visualization - Integration Guide

## Files Created

1. **`WarehouseLocations.css`** - All extracted CSS styles + 3D visualization styles
2. **`components/Rack3D.jsx`** - 3D rack visualization component
3. **`components/WarehouseRow3D.jsx`** - Warehouse row container component

## Integration Steps

### Step 1: Import the CSS file

Add to the top of `WarehouseLocations.jsx`:

```javascript
import './WarehouseLocations.css';
import WarehouseRow3D from './components/WarehouseRow3D';
import { LayoutGrid, View } from 'lucide-react'; // Add View icon
```

### Step 2: Add View State

Add this state near the top of your `WarehouseLocations` component:

```javascript
const [viewMode, setViewMode] = useState('table'); // 'table' or '3d'
```

### Step 3: Replace Inline Styles

Replace all inline `style={{}}` attributes with className equivalents:

**Before:**
```javascript
<table style={{ fontSize: '13px' }}>
```

**After:**
```javascript
<table className="warehouse-table">
```

**Before:**
```javascript
<thead style={{ height: '52px' }}>
```

**After:**
```javascript
<thead className="warehouse-table-header">
```

Continue this pattern for:
- `.warehouse-table-cell` (padding: 10px 12px)
- `.warehouse-table-row` (height: 88px)
- `.rack-code-text` (fontSize: 13px)
- `.secondary-text` (fontSize: 11px)
- `.large-number` (fontSize: 16px)
- `.action-button` (height: 34px)
- `.available-positions-box` (minWidth/minHeight)
- `.status-badge` (sizes)
- `.utilization-bar` (sizes)

### Step 4: Add View Toggle UI

Insert this right after the FILTERS section and before the warehouse groups:

```javascript
{/* =====================================================================
    VIEW TOGGLE
===================================================================== */}

<div className="view-toggle-container">
  <button
    type="button"
    onClick={() => setViewMode('table')}
    className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
  >
    <LayoutGrid size={16} />
    Table View
  </button>
  
  <button
    type="button"
    onClick={() => setViewMode('3d')}
    className={`view-toggle-btn ${viewMode === '3d' ? 'active' : ''}`}
  >
    <View size={16} />
    3D Warehouse View
  </button>
</div>
```

### Step 5: Add 3D View Rendering

Wrap your existing warehouse table section with a conditional:

```javascript
{viewMode === 'table' ? (
  // YOUR EXISTING TABLE CODE HERE
  <div className="space-y-3">
    {/* All your existing warehouse groups and tables */}
  </div>
) : (
  // NEW 3D VIEW
  <div className="warehouse-3d-container">
    {(() => {
      // Group locations by warehouse and row
      const groupedByWarehouseRow = {};
      
      filteredLocations.forEach(location => {
        const whCode = location.zone || 'Unknown';
        const meta = location.metadata || {};
        const rowNum = meta.rowNumber ?? parseInt(location.aisle) ?? 1;
        const key = `${whCode}-R${String(rowNum).padStart(2, '0')}`;
        
        if (!groupedByWarehouseRow[key]) {
          groupedByWarehouseRow[key] = {
            warehouseCode: whCode,
            rowNumber: rowNum,
            racks: []
          };
        }
        
        groupedByWarehouseRow[key].racks.push(location);
      });
      
      // Render each warehouse row
      return Object.entries(groupedByWarehouseRow)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, data]) => (
          <WarehouseRow3D
            key={key}
            warehouseCode={data.warehouseCode}
            rowNumber={data.rowNumber}
            racks={data.racks}
            rackPositions={rackPositions}
            onPositionClick={(position) => {
              // Find the rack this position belongs to
              const rack = data.racks.find(r => r.id === position.warehouse_location_id);
              if (rack) {
                setSelectedRack(rack);
                selectPosition(position);
              }
            }}
          />
        ));
    })()}
  </div>
)}
```

### Step 6: Test the Integration

1. Start your development server
2. Navigate to Warehouse Locations
3. Click "3D Warehouse View" toggle
4. You should see your racks displayed in 3D
5. Click any tire position to edit it (uses your existing modal)
6. Switch back to "Table View" to see the original table

## Features Included

✅ **CSS-based 3D transforms** (no heavy libraries)
✅ **Realistic tire icons** (not generic circles)
✅ **Hover tooltips** with full position info
✅ **Color-coded status** (empty/active/almost full/full/reserved)
✅ **Clickable positions** that integrate with your existing edit modal
✅ **Responsive design** (works on desktop/tablet)
✅ **Uses your existing data** (rackPositions, locations state)
✅ **Grouped by warehouse → row → rack** hierarchy
✅ **Compact design** (280px racks, scrollable rows)

## Customization Options

- Adjust rack width in CSS (`.rack-3d { width: 280px; }`)
- Change 3D rotation angles (`.rack-3d { transform: rotateY(-8deg) ... }`)
- Modify tire visual colors (`.tire-outer`, `.tire-inner`)
- Customize position card sizes (`.position-card-3d`)
- Change color scheme for statuses (`.position-active`, etc.)

## Performance Notes

- The 3D view renders only visible racks
- Uses CSS transforms (GPU-accelerated)
- No canvas/WebGL overhead
- Reuses your existing `rackPositions` data
- Clicking position opens your existing assignment modal

## Next Steps

1. Apply the inline style → className replacements
2. Add the view toggle UI
3. Test the 3D visualization
4. Adjust colors/sizes to match your brand
5. Consider adding section selector for racks with multiple sections

The 3D view is now a visual layer on top of your existing warehouse system!
