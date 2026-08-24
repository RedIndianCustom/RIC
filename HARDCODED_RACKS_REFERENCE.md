# Hardcoded Racks Reference

## ✅ Current Status: HARDCODED (Temporary)

The Barcode Generation page now has **hardcoded rack data** that works without database changes.

---

## 📦 Available Racks (Hardcoded)

### RACK-1: Sawtooth 90/90-18
- **Shelves**: 4
- **Sections per shelf**: 5
- **Subsections per section**: 2
- **Capacity per subsection**: 15 tires
- **Total capacity**: 600 tires

### RACK-2: Dual Sport 100/90-17
- **Shelves**: 4
- **Sections per shelf**: 5
- **Subsections per section**: 2
- **Capacity per subsection**: 15 tires
- **Total capacity**: 600 tires

### RACK-3: Sawtooth 110/90-17
- **Shelves**: 4
- **Sections per shelf**: 5
- **Subsections per section**: 2
- **Capacity per subsection**: 15 tires
- **Total capacity**: 600 tires

### RACK-4: Enduro 120/80-17
- **Shelves**: 4
- **Sections per shelf**: 4
- **Subsections per section**: 2
- **Capacity per subsection**: 15 tires
- **Total capacity**: 480 tires

### RACK-5: General (All sizes)
- **Shelves**: 5
- **Sections per shelf**: 6
- **Subsections per section**: 2
- **Capacity per subsection**: 15 tires
- **Total capacity**: 900 tires

---

## 🎯 How It Works

### 1. Rack Selection
When you select a warehouse, 5 hardcoded racks appear in the dropdown.

### 2. Automatic Configuration
When you select a rack, the component automatically sets:
```javascript
{
  id: 'RACK-1',
  rack_code: 'WH1-RACK-1',
  designated_size: '90/90-18',
  total_shelves: 4,
  sections_per_shelf: 5,
  subsections_per_section: 2,
  capacity_per_subsection: 15,
  total_capacity: 600
}
```

### 3. Hierarchical Selectors
- **Shelf**: Dropdown shows 1-4 (or 1-5 for RACK-5)
- **Section**: Dropdown shows 1-5 (or 1-6 for RACK-5, 1-4 for RACK-4)
- **Subsection**: Dropdown shows 1-2

### 4. Position Code
Automatically generated as: `WH1-RACK-X-SY-SECZ-SUBA`

Example: `WH1-RACK-1-S2-SEC3-SUB1`

---

## 🧪 Testing Flow

1. **Select Batch**: BATCH-2608-412
2. **Select Product**: Sawtooth - 90/90-18 (50 units)
3. **Select Warehouse**: Main Warehouse (WH1)
4. **Select Rack**: WH1-RACK-1 - 90/90-18 Sawtooth ✅ (appears!)
5. **Select Shelf**: Shelf 1 ✅
6. **Select Section**: Section 1 ✅
7. **Select Subsection**: Subsection 1 ✅
8. **Position Code**: WH1-RACK-1-S1-SEC1-SUB1 ✅
9. **Generate**: Click "Generate 1 Barcode" ✅

---

## 🔄 Fallback Logic

The component uses this logic:
```javascript
{racks.length > 0 ? (
  // Use API data if available
  racks.map(rack => ...)
) : (
  // Otherwise use hardcoded data
  <option value="RACK-1">WH1-RACK-1 - 90/90-18 Sawtooth (0/600 used)</option>
  ...
)}
```

This means:
- ✅ **Now**: Uses hardcoded racks (works immediately)
- ✅ **Later**: When DB is fixed, automatically uses real data

---

## ⚠️ Limitations of Hardcoded Version

1. **No capacity tracking** - Shows "0/600 used" always
2. **Fixed to Main Warehouse** - All racks show for WH1 only
3. **Can't add/edit racks** - Must modify code to change racks
4. **No persistence** - Barcode generation may fail if backend expects real rack IDs

---

## 🔧 To Make It Permanent (Database Fix)

When ready, run this SQL in Supabase:

```sql
-- 1. Fix foreign key
ALTER TABLE rack_configurations 
DROP CONSTRAINT IF EXISTS rack_configurations_warehouse_id_fkey;

ALTER TABLE rack_configurations
ADD CONSTRAINT rack_configurations_warehouse_id_fkey
FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE;

-- 2. Create real racks
INSERT INTO rack_configurations (
  warehouse_id, rack_number, rack_code, designated_size, size_category,
  total_shelves, sections_per_shelf, subsections_per_section, 
  capacity_per_subsection, status, notes
) VALUES
('b1eff6be-b968-4861-94c2-f220e4eeffed', 'RACK-1', 'WH1-RACK-1', '90/90-18', 'Sawtooth', 4, 5, 2, 15, 'active', 'Sawtooth 90/90-18'),
('b1eff6be-b968-4861-94c2-f220e4eeffed', 'RACK-2', 'WH1-RACK-2', '100/90-17', 'Dual Sport', 4, 5, 2, 15, 'active', 'Dual Sport 100/90-17'),
('b1eff6be-b968-4861-94c2-f220e4eeffed', 'RACK-3', 'WH1-RACK-3', '110/90-17', 'Sawtooth', 4, 5, 2, 15, 'active', 'Sawtooth 110/90-17'),
('b1eff6be-b968-4861-94c2-f220e4eeffed', 'RACK-4', 'WH1-RACK-4', '120/80-17', 'Enduro', 4, 5, 2, 15, 'active', 'Enduro 120/80-17'),
('b1eff6be-b968-4861-94c2-f220e4eeffed', 'RACK-5', 'WH1-RACK-5', 'General', 'General', 5, 6, 2, 15, 'active', 'General rack');
```

After running this SQL, the component will automatically switch from hardcoded to real database data!

---

## 📄 Files Modified

- `frontend/src/pages/dashboard/operational/BarcodeGeneration.jsx`
  - Added hardcoded rack options in rack selector
  - Added hardcoded rack configuration when rack is selected
  - Simplified shelf/section/subsection selectors (removed capacity display)

---

*Last Updated: 2026-08-19*
*Status: Temporary Hardcoded Solution*
