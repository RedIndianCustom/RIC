# Warehouse Tire Assignment Enhancement Guide

## Overview
This guide shows how to enhance the WarehouseLocations component to support:
1. ✅ Product dropdown selection (from products table)
2. ✅ Tire size auto-fill (from selected product)
3. ✅ Multiple products per position
4. ✅ Add/Remove product entries

## Backend Changes

### ✅ 1. Database Schema Updated
**File:** `backend/database/028_warehouse_storage_positions.sql`

Added `metadata` JSONB column to store multiple products:
```sql
metadata JSONB DEFAULT '{}'::jsonb,
```

**Migration:** Already included in the migration file. If you've already run the migration, add the column manually:
```sql
ALTER TABLE public.warehouse_storage_positions 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
```

### ✅ 2. Controller Enhanced
**File:** `backend/src/controllers/warehouseLocationController.js`

The `updateStoragePosition` function now supports TWO formats:

**Legacy (single product):**
```javascript
PUT /api/warehouse-locations/:id/positions/:positionId
{
  "tire_size": "Dual Sport 90/90-17",
  "quantity": 8
}
```

**Enhanced (multiple products):**
```javascript
PUT /api/warehouse-locations/:id/positions/:positionId
{
  "products": [
    {
      "product_id": "uuid-1",
      "tire_size": "Dual Sport 90/90-17",
      "quantity": 5
    },
    {
      "product_id": "uuid-2",
      "tire_size": "Enduro 100/90-19",
      "quantity": 3
    }
  ],
  "total_quantity": 8
}
```

The backend stores:
- `current_stock`: Total quantity
- `tire_size`: Display string ("90/90-17" or "90/90-17 +1 more")
- `metadata.products`: Full product breakdown array

### ✅ 3. Products API
**Endpoint:** `GET /api/products`

Already exists in `backend/src/routes/productRoutes.js`

Returns:
```json
{
  "products": [
    {
      "id": "uuid",
      "sku": "MICH-PS4S-2454519",
      "brand": "Michelin",
      "model": "Pilot Sport 4S",
      "dimensions": "245/45 R19 98Y",
      "category": "Ultra High Performance"
    }
  ]
}
```

## Frontend Implementation

### Step 1: Add State Variables

Add these to your WarehouseLocations component (around line 530):

```javascript
// Add after existing state declarations
const [products, setProducts] = useState([]);
const [loadingProducts, setLoadingProducts] = useState(false);
const [positionProducts, setPositionProducts] = useState([{
  id: Date.now(),
  product_id: '',
  tire_size: '',
  quantity: 0
}]);
```

### Step 2: Load Products

Add this useEffect (around line 595):

```javascript
useEffect(() => {
  loadProducts();
}, []);

const loadProducts = async () => {
  setLoadingProducts(true);
  try {
    const { data } = await api.get('/products');
    setProducts(data.products || []);
  } catch (err) {
    console.warn('Could not load products:', err);
    setProducts([]);
  } finally {
    setLoadingProducts(false);
  }
};
```

### Step 3: Update selectPosition Function

Replace the existing `selectPosition` function (around line 1070):

```javascript
const selectPosition = position => {
  setSelectedPosition(position);
  
  // Parse existing products from position metadata
  if (position.metadata && Array.isArray(position.metadata.products)) {
    setPositionProducts(position.metadata.products.map(p => ({
      ...p,
      id: Date.now() + Math.random()
    })));
  } else if (position.tire_size) {
    // Legacy: single tire size
    setPositionProducts([{
      id: Date.now(),
      product_id: '',
      tire_size: position.tire_size,
      quantity: position.current_stock || 0
    }]);
  } else {
    // Empty position
    setPositionProducts([{
      id: Date.now(),
      product_id: '',
      tire_size: '',
      quantity: 0
    }]);
  }
};
```

### Step 4: Add Product Management Functions

Add these functions after `selectPosition`:

```javascript
// Handle product selection
const handleProductChange = (entryId, productId) => {
  setPositionProducts(prev => prev.map(entry => {
    if (entry.id === entryId) {
      const product = products.find(p => p.id === productId);
      return {
        ...entry,
        product_id: productId,
        tire_size: product?.dimensions || ''
      };
    }
    return entry;
  }));
};

// Handle quantity change
const handleQuantityChange = (entryId, quantity) => {
  setPositionProducts(prev => prev.map(entry =>
    entry.id === entryId ? { ...entry, quantity: parseInt(quantity) || 0 } : entry
  ));
};

// Add new product entry
const addProductEntry = () => {
  setPositionProducts(prev => [
    ...prev,
    { id: Date.now(), product_id: '', tire_size: '', quantity: 0 }
  ]);
};

// Remove product entry
const removeProductEntry = (entryId) => {
  if (positionProducts.length === 1) {
    showToast('At least one product entry is required', 'error');
    return;
  }
  setPositionProducts(prev => prev.filter(entry => entry.id !== entryId));
};
```

### Step 5: Update savePosition Function

Replace the existing `savePosition` function (around line 1200):

```javascript
const savePosition = async () => {
  if (!selectedRack || !selectedPosition) return;

  // Validate all entries
  const validEntries = positionProducts.filter(entry => entry.quantity > 0);
  
  if (validEntries.length === 0) {
    showToast('At least one product with quantity > 0 is required', 'error');
    return;
  }

  // Check if all entries have products selected
  for (const entry of validEntries) {
    if (!entry.product_id && !entry.tire_size) {
      showToast('Please select a product or enter tire size for all entries', 'error');
      return;
    }
  }

  // Calculate total quantity
  const totalQuantity = validEntries.reduce((sum, entry) => sum + entry.quantity, 0);
  const capacity = Number(selectedPosition.capacity || 0);

  if (totalQuantity > capacity) {
    showToast(`Total quantity (${totalQuantity}) exceeds position capacity (${capacity})`, 'error');
    return;
  }

  setPositionSaving(true);

  try {
    // Prepare payload with multiple products
    const payload = {
      products: validEntries.map(entry => ({
        product_id: entry.product_id,
        tire_size: entry.tire_size,
        quantity: entry.quantity
      })),
      total_quantity: totalQuantity
    };

    await api.put(
      `/warehouse-locations/${selectedRack.id}/positions/${selectedPosition.id}`,
      payload
    );

    showToast('Tire position updated successfully', 'success');
    
    await loadRackPositions(selectedRack, true);
    await loadLocations();

    const updatedRack = locations.find(loc => loc.id === selectedRack.id);
    if (updatedRack) setSelectedRack(updatedRack);

    setSelectedPosition(null);
    setPositionProducts([{ id: Date.now(), product_id: '', tire_size: '', quantity: 0 }]);

  } catch (error) {
    console.error('Position update error:', error);
    showToast(
      error.response?.data?.error || error.message || 'Failed to update tire position',
      'error'
    );
  } finally {
    setPositionSaving(false);
  }
};
```

### Step 6: Add Helper for Product Grouping

Add this helper (around line 1300):

```javascript
// Group products by brand for dropdown
const productsByBrand = useMemo(() => {
  return products.reduce((acc, product) => {
    const brand = product.brand || 'Other';
    if (!acc[brand]) acc[brand] = [];
    acc[brand].push(product);
    return acc;
  }, {});
}, [products]);
```

### Step 7: Replace the Tire Assignment Modal

Find the "TIRE ASSIGNMENT MODAL" section (around line 3595) and replace it with the enhanced version from `ENHANCED_TIRE_ASSIGNMENT.jsx`.

## Testing Checklist

### Backend Tests
- [ ] Run migration (if metadata column doesn't exist)
- [ ] Restart backend server
- [ ] Test single product assignment (legacy format)
- [ ] Test multiple products assignment (enhanced format)
- [ ] Verify metadata.products is stored correctly

### Frontend Tests
- [ ] Products load in dropdown
- [ ] Products grouped by brand
- [ ] Tire size auto-fills when product selected
- [ ] Can add multiple product entries
- [ ] Can remove product entries
- [ ] Capacity validation works
- [ ] Total quantity calculates correctly
- [ ] Save updates position correctly
- [ ] Product breakdown displays in UI

## UI Preview

**Before (Old):**
```
┌─────────────────────────────────┐
│ Tire Size                       │
│ [Text Input]                    │
│                                 │
│ Quantity                        │
│ [Number Input]                  │
└─────────────────────────────────┘
```

**After (Enhanced):**
```
┌─────────────────────────────────┐
│ Products & Quantities  [+ Add]  │
│                                 │
│ ┌─ Product #1 ─────────────────┐│
│ │ Select Product: [Dropdown]  ││
│ │ Tire Size: 90/90-17 (auto) ││
│ │ Quantity: [5]               ││
│ └─────────────────────────────┘│
│                                 │
│ ┌─ Product #2 ─────────────────┐│
│ │ Select Product: [Dropdown]  ││
│ │ Tire Size: 100/90-19 (auto)││
│ │ Quantity: [3]               ││
│ └─────────────────────────────┘│
│                                 │
│ Total: 8 / 14 [███████░░░] 57%│
│                                 │
│ Breakdown:                      │
│ - Michelin Pilot: 5 tires      │
│ - Dunlop Sport: 3 tires         │
└─────────────────────────────────┘
```

## Data Flow

### Saving Multiple Products
```
Frontend                    Backend                      Database
────────────────────────────────────────────────────────────────────
Select Product 1 (Michelin)
  ├─ Auto-fill: 90/90-17
  └─ Quantity: 5

Select Product 2 (Dunlop)
  ├─ Auto-fill: 100/90-19
  └─ Quantity: 3

Click "Save" ──────────────►

                            Validate:
                            ├─ Total: 8 ≤ capacity ✓
                            ├─ All have tire_size ✓
                            └─ All have quantity > 0 ✓

                            Update position:
                            ├─ current_stock: 8
                            ├─ tire_size: "90/90-17 +1 more"
                            └─ metadata: {
                                products: [
                                  {product_id, tire_size, quantity: 5},
                                  {product_id, tire_size, quantity: 3}
                                ]
                              } ────────────────────►

                                                      warehouse_storage_positions
                                                      ├─ current_stock: 8
                                                      ├─ tire_size: "90/90-17 +1 more"
                                                      ├─ metadata: {...}
                                                      └─ status: "available"

                                                      Trigger fires:
                                                      └─ Update rack current_stock
```

### Loading Position
```
Database                    Backend                      Frontend
────────────────────────────────────────────────────────────────────
warehouse_storage_positions
├─ current_stock: 8
├─ tire_size: "90/90-17 +1 more"
└─ metadata: {
    products: [
      {product_id: "uuid1", tire_size: "90/90-17", quantity: 5},
      {product_id: "uuid2", tire_size: "100/90-19", quantity: 3}
    ]
  } ──────────────────────►

                            Return position with
                            metadata included ──────►

                                                      Parse metadata.products
                                                      ├─ Product 1: Michelin 5 tires
                                                      ├─ Product 2: Dunlop 3 tires
                                                      └─ Total: 8 tires

                                                      Display in UI:
                                                      ├─ 2 product cards
                                                      ├─ Capacity bar: 8/14 (57%)
                                                      └─ Breakdown list
```

## Backward Compatibility

The enhancement is **100% backward compatible**:

✅ **Legacy positions** (single tire_size + quantity) still work
✅ **Old API calls** are still supported
✅ **Existing data** is not affected
✅ **Gradual migration** - users can update positions one at a time

## Benefits

1. **No Manual Typing** - Select from product catalog
2. **Accurate Tire Sizes** - Auto-filled from product data
3. **Multiple Products** - Mix different tires in one position
4. **Better Reporting** - Track which products are where
5. **Product Traceability** - Link positions to product IDs
6. **Flexible Capacity** - Fill positions with different tire combinations

## Next Steps

1. ✅ Backend updated (controller + migration)
2. ⏳ Frontend needs updating (follow steps above)
3. ⏳ Test workflow end-to-end
4. ⏳ Optional: Add product images in dropdown
5. ⏳ Optional: Show product SKU in breakdown
6. ⏳ Optional: Add "Quick Fill" button (fill remaining capacity)

---

**Status:** Backend ✅ Ready | Frontend ⏳ Needs Implementation
**Backward Compatible:** ✅ Yes
**Breaking Changes:** ❌ None

