/*
 * ============================================================================
 * ENHANCED TIRE ASSIGNMENT MODAL
 * ============================================================================
 * This replaces the existing tire assignment modal in WarehouseLocations.jsx
 * 
 * Features:
 * 1. Product dropdown selection (from products table)
 * 2. Tire size dropdown (filtered by selected product brand)
 * 3. Multiple products per position support
 * 4. Add/Remove product entries
 * ============================================================================
 */

// Add these new state variables to the component:
const [products, setProducts] = useState([]);
const [loadingProducts, setLoadingProducts] = useState(false);
const [positionProducts, setPositionProducts] = useState([{
  id: Date.now(),
  product_id: '',
  tire_size: '',
  quantity: 0
}]);

// Add this useEffect to load products on component mount:
useEffect(() => {
  loadProducts();
}, []);

// Add this function to load products:
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

// Update selectPosition to handle multiple products:
const selectPosition = position => {
  setSelectedPosition(position);
  
  // Parse existing products from position metadata or tire_size field
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

// Add function to handle product change:
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

// Add function to handle quantity change:
const handleQuantityChange = (entryId, quantity) => {
  setPositionProducts(prev => prev.map(entry =>
    entry.id === entryId ? { ...entry, quantity: parseInt(quantity) || 0 } : entry
  ));
};

// Add function to add new product entry:
const addProductEntry = () => {
  setPositionProducts(prev => [
    ...prev,
    { id: Date.now(), product_id: '', tire_size: '', quantity: 0 }
  ]);
};

// Add function to remove product entry:
const removeProductEntry = (entryId) => {
  if (positionProducts.length === 1) {
    showToast('At least one product entry is required', 'error');
    return;
  }
  setPositionProducts(prev => prev.filter(entry => entry.id !== entryId));
};

// Update savePosition function:
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

// Helper function to get available tire sizes for a selected brand
const getAvailableTireSizes = (brandFilter = null) => {
  if (!brandFilter) return products;
  return products.filter(p => p.brand === brandFilter);
};

// Helper function to group products by brand
const productsByBrand = products.reduce((acc, product) => {
  const brand = product.brand || 'Other';
  if (!acc[brand]) acc[brand] = [];
  acc[brand].push(product);
  return acc;
}, {});

/* ============================================================================
   REPLACE THE TIRE ASSIGNMENT MODAL WITH THIS
============================================================================ */

<Modal
  isOpen={!!selectedPosition}
  onClose={() => {
    setSelectedPosition(null);
    setPositionProducts([{ id: Date.now(), product_id: '', tire_size: '', quantity: 0 }]);
  }}
  size="lg"
  title={
    <span className="flex items-center gap-2">
      <Tag size={16} className="text-blue-500" />
      Assign Products to Position
    </span>
  }
>
  {selectedPosition && (
    <div className="space-y-5">
      
      {/* Position Header */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">
          Storage Position
        </p>
        <p className="mt-1 font-mono text-sm font-bold text-blue-800">
          {selectedPosition.position_code || selectedPosition.positionCode}
        </p>
        <p className="mt-1 text-xs text-blue-600">
          Section {padNumber(selectedPosition.section_number)} · 
          Shelf {padNumber(selectedPosition.shelf_number)} · 
          Subsection {padNumber(selectedPosition.subsection_number)}
        </p>
      </div>

      {/* Product Entries */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-slate-700">
            Products & Quantities
          </label>
          <button
            type="button"
            onClick={addProductEntry}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            <Plus size={14} />
            Add Product
          </button>
        </div>

        <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
          {positionProducts.map((entry, index) => (
            <div 
              key={entry.id}
              className="rounded-xl border-2 border-slate-200 bg-slate-50 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">
                  Product #{index + 1}
                </span>
                {positionProducts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeProductEntry(entry.id)}
                    className="rounded-lg p-1 text-red-500 hover:bg-red-50"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Product Selector */}
              <Field 
                label="Select Product" 
                required
                hint="Choose from available tire products"
              >
                <div className="relative">
                  <Package 
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={15}
                  />
                  <select
                    value={entry.product_id}
                    onChange={(e) => handleProductChange(entry.id, e.target.value)}
                    className="w-full cursor-pointer rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Select Product...</option>
                    {Object.entries(productsByBrand).map(([brand, brandProducts]) => (
                      <optgroup key={brand} label={brand}>
                        {brandProducts.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.brand} {product.model} - {product.dimensions}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </Field>

              {/* Tire Size Display (auto-filled from product) */}
              {entry.tire_size && (
                <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">
                    Tire Size
                  </p>
                  <p className="mt-1 font-mono text-sm font-bold text-blue-800">
                    {entry.tire_size}
                  </p>
                </div>
              )}

              {/* Quantity Input */}
              <div className="mt-3">
                <Field
                  label="Quantity"
                  required
                  hint={`Available space: ${selectedPosition.capacity || 0} tires`}
                >
                  <TextInput
                    icon={Hash}
                    type="number"
                    min="0"
                    max={selectedPosition.capacity}
                    value={entry.quantity}
                    onChange={(e) => handleQuantityChange(entry.id, e.target.value)}
                    placeholder="Enter quantity"
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Capacity Summary */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">
            Total Capacity Usage
          </span>
          <span className="text-sm font-bold text-slate-800">
            {positionProducts.reduce((sum, entry) => sum + (entry.quantity || 0), 0)} / {selectedPosition.capacity || 0}
          </span>
        </div>
        
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-blue-500 transition-all"
            style={{
              width: `${Math.min(
                100,
                (positionProducts.reduce((sum, entry) => sum + (entry.quantity || 0), 0) / 
                 Number(selectedPosition.capacity || 1)) * 100
              )}%`,
            }}
          />
        </div>

        {/* Product Breakdown */}
        {positionProducts.filter(e => e.quantity > 0).length > 0 && (
          <div className="mt-4 space-y-1 border-t border-slate-200 pt-3">
            <p className="text-xs font-semibold text-slate-500">Breakdown:</p>
            {positionProducts
              .filter(entry => entry.quantity > 0)
              .map(entry => {
                const product = products.find(p => p.id === entry.product_id);
                return (
                  <div key={entry.id} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">
                      {product ? `${product.brand} ${product.model}` : entry.tire_size}
                    </span>
                    <span className="font-bold text-slate-800">{entry.quantity} tires</span>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={() => {
            setSelectedPosition(null);
            setPositionProducts([{ id: Date.now(), product_id: '', tire_size: '', quantity: 0 }]);
          }}
          className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={savePosition}
          disabled={positionSaving}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {positionSaving ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <Save size={15} />
          )}
          {positionSaving ? 'Saving...' : 'Save Position'}
        </button>
      </div>
    </div>
  )}
</Modal>
