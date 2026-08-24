# Shipment Product Breakdown Feature

## Overview
Added detailed product specification to shipments so staff knows exactly what tire categories, sizes, and quantities are in each incoming shipment.

## Changes Made

### 1. Frontend Updates (`ShipmentRegistration.jsx`)

#### New Section: "Product Breakdown"
Located between "Quantity & Schedule" and "Notes" sections in the shipment form.

#### Features:
- ✅ **Add multiple product lines** - Click "Add Product" button
- ✅ **Select tire category** - Dropdown with:
  - Dual Sport
  - Sawtooth
  - Enduro
  - Trail
  - Scooter

- ✅ **Select tire size** - Dropdown with common sizes:
  - 90/90-17
  - 100/90-17
  - 110/90-17
  - 120/80-17
  - 130/80-17
  - 90/90-18
  - 100/90-18
  - 120/80-18
  - 90/90-19
  - 150/60-17

- ✅ **Enter quantity per size** - Number input for each product line
- ✅ **Remove product lines** - Trash icon to delete unwanted lines
- ✅ **Total calculation** - Automatic sum of all quantities displayed at bottom

#### UI/UX:
- Orange/red gradient icon for visibility
- Each product line has its own card with 3 columns (Category, Size, Qty)
- Empty state message when no products added
- Total summary card with teal gradient showing total tire count

### 2. Database Migration (`022_add_product_breakdown_to_shipments.sql`)

#### Schema Change:
```sql
ALTER TABLE shipments 
ADD COLUMN product_breakdown JSONB DEFAULT '[]'::jsonb;
```

#### Data Structure:
```json
[
  {"category": "Dual Sport", "size": "90/90-17", "quantity": 50},
  {"category": "Sawtooth", "size": "100/90-17", "quantity": 30},
  {"category": "Enduro", "size": "120/80-17", "quantity": 20}
]
```

#### Benefits of JSONB:
- Flexible structure
- Can query specific categories/sizes
- Fast with GIN index
- Easy to extend in future

## How to Use

### For Staff Creating Shipments:

1. **Fill basic shipment info** (Supplier, Shipment Number, Container, etc.)

2. **Click "Add Product"** button in Product Breakdown section

3. **For each tire type:**
   - Select category (e.g., "Dual Sport")
   - Select size (e.g., "90/90-17")
   - Enter quantity (e.g., "50")

4. **Add more product lines** as needed (one per tire size)

5. **Review total** at bottom - should match expected quantity

6. **Submit shipment** - Product breakdown is saved with shipment

### Example Use Case:

**Shipment SHIP-2026-003 contains:**
- Dual Sport 90/90-17: 50 tires
- Dual Sport 100/90-17: 30 tires
- Sawtooth 110/90-17: 40 tires
- Enduro 120/80-17: 30 tires
- **Total: 150 tires**

Staff will know exactly what to expect when this shipment arrives!

## Installation Steps

### Step 1: Run Database Migration
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste: `022_add_product_breakdown_to_shipments.sql`
3. Click "Run"

### Step 2: Restart Backend (if needed)
The backend API will automatically handle the new field since it's JSONB.

### Step 3: Test the Feature
1. Go to "All Shipments" page
2. Click "New Shipment"
3. Scroll to "Product Breakdown" section
4. Add some product lines
5. Submit and verify data is saved

## Technical Details

### Frontend State Management:
```javascript
const [formData, setFormData] = useState({
  // ... existing fields
  product_breakdown: [] // Array of {category, size, quantity}
});
```

### Helper Functions:
- `addProductLine()` - Adds empty product line to array
- `removeProductLine(index)` - Removes product line at index
- `updateProductLine(index, field, value)` - Updates specific field in product line
- `getTotalBreakdownQty()` - Sums all quantities for total

### Backend:
No changes needed! The API already handles JSONB fields automatically.

## Future Enhancements

### Possible Additions:
1. **Auto-populate from past shipments** - Suggest common product mixes
2. **Validation** - Warn if breakdown total doesn't match expected quantity
3. **Product lookup** - Link to actual products table for SKU validation
4. **Export** - Generate packing list PDF from breakdown
5. **Receive against breakdown** - Check off items as they're physically received

## Benefits

### For Warehouse Staff:
- ✅ Know exactly what's coming before shipment arrives
- ✅ Prepare appropriate storage locations
- ✅ Organize receiving process by product type
- ✅ Quick reference during unloading

### For Managers:
- ✅ Track which product categories are being ordered
- ✅ Analyze shipment composition over time
- ✅ Better inventory forecasting
- ✅ Identify trends in supplier product mix

### For System:
- ✅ Better data for inventory planning
- ✅ Structured data (not just notes)
- ✅ Queryable for reports
- ✅ Can be used for automatic warehouse location assignment

## Troubleshooting

### If product breakdown doesn't save:
1. Check browser console for errors
2. Verify migration was run successfully
3. Check that backend is using latest code
4. Ensure at least one product line is added before submitting

### If dropdown options are missing:
Check that `TIRE_CATEGORIES` and `TIRE_SIZES` constants are correctly defined in the component.

### To add more tire sizes:
Edit the `TIRE_SIZES` array in `ShipmentRegistration.jsx`:
```javascript
const TIRE_SIZES = [
  '90/90-17',
  // ... existing sizes
  '140/70-17',  // Add new size here
];
```

## Summary

This feature transforms shipments from simple "expected quantity" tracking to detailed, product-level planning. Staff now have complete visibility into shipment contents before arrival, enabling better preparation and more efficient receiving operations.
