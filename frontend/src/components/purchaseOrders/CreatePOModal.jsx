import { useState, useEffect } from 'react';
import { Plus, Trash2, Calculator, Search } from 'lucide-react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Select from '../common/Select';
import Button from '../common/Button';
import { showToast } from '../../utils/toast';
import api from '../../services/api';

export default function CreatePOModal({ isOpen, onClose, onSuccess, suppliers, editingPO }) {
  const [formData, setFormData] = useState({
    supplierId: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDelivery: '',
    status: 'draft',
    taxAmount: 0,
    shippingCost: 0,
    notes: '',
    paymentTerms: '',
    shippingAddress: ''
  });

  const [items, setItems] = useState([
    { productName: '', productSku: '', description: '', quantity: 1, unitPrice: 0 }
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState([]);
  const [searchingProduct, setSearchingProduct] = useState({});
  const [productSuggestions, setProductSuggestions] = useState({});

  useEffect(() => {
    if (editingPO) {
      setFormData({
        supplierId: editingPO.supplierId,
        orderDate: editingPO.orderDate,
        expectedDelivery: editingPO.expectedDelivery || '',
        status: editingPO.status,
        taxAmount: editingPO.taxAmount || 0,
        shippingCost: editingPO.shippingCost || 0,
        notes: editingPO.notes || '',
        paymentTerms: editingPO.paymentTerms || '',
        shippingAddress: editingPO.shippingAddress || ''
      });
      // Load items if editing
      loadItems(editingPO.id);
    }
    // Load products for search
    loadProducts();
  }, [editingPO]);

  const loadProducts = async () => {
    try {
      const response = await api.get('/products');
      // Normalize products — combine brand + model as the display name
      const raw = response.data.products || [];
      const normalized = raw.map(p => ({
        ...p,
        displayName: `${p.brand || ''} ${p.model || ''}`.trim(),
        name:        `${p.brand || ''} ${p.model || ''}`.trim(),
        price:       p.retail_price ?? p.unit_cost ?? p.unitCost ?? 0,
        size:        p.dimensions || p.size || '',
      }));
      setProducts(normalized);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadItems = async (poId) => {
    try {
      const response = await api.get(`/purchase-orders/${poId}/items`);
      if (response.data.items && response.data.items.length > 0) {
        setItems(response.data.items.map(item => ({
          productName: item.productName,
          productSku: item.productSku || '',
          description: item.description || '',
          quantity: item.quantity,
          unitPrice: item.unitPrice
        })));
      }
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  const addItem = () => {
    setItems([...items, { productName: '', productSku: '', description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    } else {
      showToast('At least one item is required', 'warning');
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const searchProducts = (index, searchTerm) => {
    if (!searchTerm || searchTerm.length < 1) {
      setProductSuggestions({ ...productSuggestions, [index]: [] });
      return;
    }

    const q = searchTerm.toLowerCase();
    const filtered = products.filter(p =>
      p.displayName?.toLowerCase().includes(q) ||   // "Dual Sport", "Sawtooth"
      p.brand?.toLowerCase().includes(q)          || // "IRC", "Michelin"
      p.model?.toLowerCase().includes(q)          || // model name
      p.sku?.toLowerCase().includes(q)            || // SKU code
      p.dimensions?.toLowerCase().includes(q)    || // "80/100-14"
      p.category?.toLowerCase().includes(q)         // "Off-road"
    ).slice(0, 8);

    setProductSuggestions(prev => ({ ...prev, [index]: filtered }));
  };

  const selectProduct = (index, product) => {
    const newItems = [...items];
    newItems[index].productName = product.displayName || product.name || '';
    newItems[index].productSku  = product.sku || '';
    newItems[index].description = [product.dimensions, product.category]
      .filter(Boolean).join(' • ');
    newItems[index].unitPrice   = product.price || 0;
    setItems(newItems);
    setProductSuggestions(prev => ({ ...prev, [index]: [] }));
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return subtotal + parseFloat(formData.taxAmount || 0) + parseFloat(formData.shippingCost || 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.supplierId) {
      showToast('Please select a supplier', 'error');
      return;
    }

    if (items.some(item => !item.productName || item.quantity <= 0 || item.unitPrice < 0)) {
      showToast('Please fill in all item details correctly', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        items: items.map(item => ({
          productName: item.productName,
          productSku: item.productSku || null,
          description: item.description || null,
          quantity: parseInt(item.quantity),
          unitPrice: parseFloat(item.unitPrice)
        }))
      };

      if (editingPO) {
        await api.put(`/purchase-orders/${editingPO.id}`, payload);
        showToast('Purchase order updated successfully', 'success');
      } else {
        await api.post('/purchase-orders', payload);
        showToast('Purchase order created successfully', 'success');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving purchase order:', error);
      showToast(error.response?.data?.error || 'Failed to save purchase order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const subtotal = calculateSubtotal();
  const total = calculateTotal();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingPO ? 'Edit Purchase Order' : 'Create Purchase Order'}
      size="xl"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-2">
          {/* Supplier & Dates */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Supplier *"
              value={formData.supplierId}
              onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
              options={[
                { value: '', label: '-- Select Supplier --' },
                ...suppliers.map(s => ({ value: s.id, label: s.name }))
              ]}
              required
            />
            <Input
              label="Order Date *"
              type="date"
              value={formData.orderDate}
              onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Expected Delivery"
              type="date"
              value={formData.expectedDelivery}
              onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })}
            />
            <Select
              label="Status *"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'pending', label: 'Pending Approval' },
                { value: 'approved', label: 'Approved' },
                { value: 'ordered', label: 'Ordered' },
                { value: 'received', label: 'Received' },
                { value: 'cancelled', label: 'Cancelled' }
              ]}
              required
            />
          </div>

          {/* Items Section */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Items</h3>
              <Button
                type="button"
                onClick={addItem}
                icon={Plus}
                variant="ghost"
                className="text-sm"
              >
                Add Item
              </Button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-sm font-semibold text-slate-600">Item #{index + 1}</span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Product Name *
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                        <input
                          type="text"
                          value={item.productName}
                          onChange={(e) => {
                            updateItem(index, 'productName', e.target.value);
                            searchProducts(index, e.target.value);
                          }}
                          onBlur={() =>
                            setTimeout(() =>
                              setProductSuggestions(prev => ({ ...prev, [index]: [] })), 150)
                          }
                          placeholder="Search by name, brand, SKU..."
                          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>

                      {/* Product Suggestions Dropdown */}
                      {productSuggestions[index]?.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-medium">
                            {productSuggestions[index].length} product(s) found
                          </div>
                          {productSuggestions[index].map((product, pIndex) => (
                            <button
                              key={pIndex}
                              type="button"
                              onMouseDown={() => selectProduct(index, product)}
                              className="w-full px-3 py-2.5 text-left hover:bg-blue-50 border-b border-slate-100 last:border-b-0 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  {/* Product Name = Brand + Model */}
                                  <p className="text-sm font-bold text-slate-900 truncate">
                                    {product.displayName}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {product.sku && (
                                      <span className="text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                        {product.sku}
                                      </span>
                                    )}
                                    {product.dimensions && (
                                      <span className="text-xs text-slate-500">
                                        {product.dimensions}
                                      </span>
                                    )}
                                    {product.category && (
                                      <span className="text-xs text-slate-400">
                                        {product.category}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {product.price > 0 && (
                                  <span className="text-sm font-bold text-green-600 whitespace-nowrap">
                                    ₱{Number(product.price).toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <Input
                      label="Product SKU"
                      value={item.productSku}
                      onChange={(e) => updateItem(index, 'productSku', e.target.value)}
                      placeholder="e.g., MICH-PS4-225"
                    />
                  </div>

                  <div className="mt-3">
                    <Input
                      label="Description"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      placeholder="Additional details..."
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <Input
                      label="Quantity *"
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                      min="1"
                      required
                    />
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Unit Price (₱) *
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9.]/g, '');
                          updateItem(index, 'unitPrice', parseFloat(value) || 0);
                        }}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Line Total
                      </label>
                      <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-semibold text-slate-900">
                        ₱{(item.quantity * item.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Financial Summary</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Tax Amount (₱)"
                type="number"
                value={formData.taxAmount}
                onChange={(e) => setFormData({ ...formData, taxAmount: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
              />
              <Input
                label="Shipping Cost (₱)"
                type="number"
                value={formData.shippingCost}
                onChange={(e) => setFormData({ ...formData, shippingCost: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
              />
            </div>

            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="font-semibold text-slate-900">
                    ₱{subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Tax:</span>
                  <span className="font-semibold text-slate-900">
                    ₱{parseFloat(formData.taxAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Shipping:</span>
                  <span className="font-semibold text-slate-900">
                    ₱{parseFloat(formData.shippingCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="border-t border-blue-300 pt-2 flex justify-between">
                  <span className="text-base font-semibold text-slate-900">Total Amount:</span>
                  <span className="text-xl font-bold text-blue-600">
                    ₱{total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Payment Terms"
              value={formData.paymentTerms}
              onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
              placeholder="e.g., Net 30"
            />
            <Input
              label="Shipping Address"
              value={formData.shippingAddress}
              onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
              placeholder="Delivery location"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes or instructions..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-6 mt-6 border-t border-slate-200">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="flex-1"
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={submitting}
            loading={submitting}
          >
            {submitting ? 'Saving...' : (editingPO ? 'Update PO' : 'Create PO')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
