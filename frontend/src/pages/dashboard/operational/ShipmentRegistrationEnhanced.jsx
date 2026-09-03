import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Package, Search, Calendar, Truck, CheckCircle2, XCircle, 
  Clock, Edit, Trash2, X, Ship, Box, FileText, User, AlertTriangle,
  MapPin, Tag, ChevronRight, TrendingUp, Layers, Warehouse, Save
} from 'lucide-react';
import api from '../../../services/api';

export default function ShipmentRegistrationEnhanced() {
  const [shipments, setShipments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingShipment, setEditingShipment] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    supplier_id: '',
    shipment_number: '',
    container_number: '',
    bl_number: '',
    expected_arrival_date: '',
    notes: '',
    expected_items: [] // NEW: Size breakdown
  });

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), alert.type === 'success' ? 3000 : 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [shipmentsRes, suppliersRes, productsRes] = await Promise.all([
        api.get('/shipments', { params: { status: statusFilter === 'all' ? null : statusFilter } }),
        api.get('/suppliers'),
        api.get('/products')
      ]);
      
      setShipments(shipmentsRes.data.shipments || []);
      setSuppliers(suppliersRes.data.suppliers || []);
      setProducts(productsRes.data.products || []);
      setError(null);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // PRODUCT & SIZE MANAGEMENT
  // ============================================================================

  const addSizeBreakdown = () => {
    setFormData({
      ...formData,
      expected_items: [
        ...formData.expected_items,
        {
          product_id: '',
          product_size: '',
          expected_quantity: '',
          unit_price: '',
          notes: ''
        }
      ]
    });
  };

  const removeSizeBreakdown = (index) => {
    const newItems = formData.expected_items.filter((_, i) => i !== index);
    setFormData({ ...formData, expected_items: newItems });
  };

  const updateSizeBreakdown = (index, field, value) => {
    const newItems = [...formData.expected_items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-select product_size when product is selected
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index].product_size = product.dimensions || '';
      }
    }
    
    setFormData({ ...formData, expected_items: newItems });
  };

  const getTotalExpectedQuantity = () => {
    return formData.expected_items.reduce((sum, item) => 
      sum + (parseInt(item.expected_quantity) || 0), 0
    );
  };

  const getTotalExpectedValue = () => {
    return formData.expected_items.reduce((sum, item) => {
      const qty = parseInt(item.expected_quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      return sum + (qty * price);
    }, 0);
  };

  // ============================================================================
  // FORM SUBMISSION
  // ============================================================================

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.expected_arrival_date) {
      setAlert({ 
        type: 'error', 
        message: 'Expected Arrival Date is required!' 
      });
      return;
    }

    if (formData.expected_items.length === 0) {
      setAlert({ 
        type: 'error', 
        message: 'Please add at least one product with size breakdown!' 
      });
      return;
    }

    // Validate all items have required fields
    const invalidItems = formData.expected_items.filter(item => 
      !item.product_id || !item.product_size || !item.expected_quantity
    );

    if (invalidItems.length > 0) {
      setAlert({ 
        type: 'error', 
        message: 'All items must have product, size, and quantity!' 
      });
      return;
    }
    
    try {
      setLoading(true);
      
      const totalQty = getTotalExpectedQuantity();
      
      // First, create/update the shipment
      const shipmentData = {
        supplier_id: formData.supplier_id,
        shipment_number: formData.shipment_number,
        container_number: formData.container_number,
        bl_number: formData.bl_number,
        expected_quantity: totalQty,
        expected_arrival_date: formData.expected_arrival_date,
        notes: formData.notes
      };

      let savedShipment;
      
      if (editingShipment) {
        const result = await api.put(`/shipments/${editingShipment.id}`, shipmentData);
        savedShipment = result.data.shipment;
      } else {
        const result = await api.post('/shipments', shipmentData);
        savedShipment = result.data.shipment;
      }

      // Then, register expected items with size breakdown
      await api.post('/receiving-qc/expected-items', {
        shipment_id: savedShipment.id,
        items: formData.expected_items
      });

      setAlert({ 
        type: 'success', 
        message: editingShipment ? 'Shipment updated successfully!' : 'Shipment registered successfully with size breakdown!' 
      });

      resetForm();
      await loadData();
    } catch (err) {
      console.error('Error saving shipment:', err);
      setAlert({ type: 'error', message: err.response?.data?.error || 'Failed to save shipment' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (shipment) => {
    setEditingShipment(shipment);
    setFormData({
      supplier_id: shipment.supplier_id || '',
      shipment_number: shipment.shipment_number || '',
      container_number: shipment.container_number || '',
      bl_number: shipment.bl_number || '',
      expected_arrival_date: shipment.expected_arrival_date || '',
      notes: shipment.notes || '',
      expected_items: shipment.expected_items || []
    });
    setShowForm(true);
  };

  const handleDeleteClick = (shipment) => {
    setDeleteConfirm(deleteConfirm === shipment.id ? null : shipment.id);
  };

  const handleCancelShipment = async (id) => {
    try {
      // Update shipment status to CANCELLED (soft delete - preserves record)
      await api.put(`/shipments/${id}`, { status: 'CANCELLED' });
      setAlert({ type: 'success', message: 'Shipment cancelled successfully!' });
      setDeleteConfirm(null);
      await loadData();
    } catch (err) {
      console.error('Error cancelling shipment:', err);
      setAlert({ type: 'error', message: 'Failed to cancel shipment' });
    }
  };

  const handleDeleteConfirm = async (id) => {
    try {
      // Permanently delete the shipment from database (hard delete with cascading)
      await api.delete(`/shipments/${id}?force=true`);
      setAlert({ type: 'success', message: 'Shipment permanently deleted!' });
      setDeleteConfirm(null);
      await loadData();
    } catch (err) {
      console.error('Error deleting shipment:', err);
      setAlert({ type: 'error', message: err.response?.data?.error || 'Failed to delete shipment' });
    }
  };

  const resetForm = () => {
    setFormData({
      supplier_id: '',
      shipment_number: '',
      container_number: '',
      bl_number: '',
      expected_arrival_date: '',
      notes: '',
      expected_items: []
    });
    setEditingShipment(null);
    setShowForm(false);
  };

  const getStatusConfig = (status) => {
    const configs = {
      'PENDING': { 
        bg: 'bg-gradient-to-r from-yellow-50 to-amber-50', 
        text: 'text-yellow-700',
        icon: Clock,
        border: 'border-yellow-200'
      },
      'IN_TRANSIT': { 
        bg: 'bg-gradient-to-r from-blue-50 to-indigo-50', 
        text: 'text-blue-700',
        icon: Truck,
        border: 'border-blue-200'
      },
      'READY_FOR_QC': { 
        bg: 'bg-gradient-to-r from-purple-50 to-violet-50', 
        text: 'text-purple-700',
        icon: CheckCircle2,
        border: 'border-purple-200'
      },
      'RECEIVED': { 
        bg: 'bg-gradient-to-r from-green-50 to-emerald-50', 
        text: 'text-green-700',
        icon: CheckCircle2,
        border: 'border-green-200'
      },
      'CANCELLED': { 
        bg: 'bg-gradient-to-r from-red-50 to-rose-50', 
        text: 'text-red-700',
        icon: XCircle,
        border: 'border-red-200'
      }
    };
    return configs[status] || { 
      bg: 'bg-gray-50', 
      text: 'text-gray-700', 
      icon: Package,
      border: 'border-gray-200'
    };
  };

  const filteredShipments = shipments.filter(shipment => {
    const matchesSearch = 
      shipment.shipment_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.container_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.bl_number?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || shipment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading && shipments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Ship className="w-6 h-6 text-blue-600" />
            Incoming Shipment Registration (Enhanced)
          </h2>
          <p className="text-gray-600 mt-1">Register incoming shipments with detailed size breakdown</p>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center gap-2 shadow-md"
        >
          <Plus className="w-5 h-5" />
          New Shipment
        </motion.button>
      </div>

      {/* Alert */}
      <AnimatePresence>
        {alert && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-lg ${
              alert.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {alert.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8"
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">
                    {editingShipment ? 'Edit Shipment' : 'Register New Shipment'}
                  </h3>
                  <button
                    onClick={resetForm}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Supplier *
                    </label>
                    <select
                      value={formData.supplier_id}
                      onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Supplier</option>
                      {suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Shipment Number *
                    </label>
                    <input
                      type="text"
                      value={formData.shipment_number}
                      onChange={(e) => setFormData({ ...formData, shipment_number: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="SH-2024-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Container Number
                    </label>
                    <input
                      type="text"
                      value={formData.container_number}
                      onChange={(e) => setFormData({ ...formData, container_number: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="CONT12345"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      BL Number
                    </label>
                    <input
                      type="text"
                      value={formData.bl_number}
                      onChange={(e) => setFormData({ ...formData, bl_number: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="BL-ABC-123"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expected Arrival Date *
                    </label>
                    <input
                      type="date"
                      value={formData.expected_arrival_date}
                      onChange={(e) => setFormData({ ...formData, expected_arrival_date: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Size Breakdown Section */}
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">Product Size Breakdown</h4>
                      <p className="text-sm text-gray-600">Add products with specific sizes and quantities</p>
                    </div>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={addSizeBreakdown}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Product
                    </motion.button>
                  </div>

                  {formData.expected_items.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <Package className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">No products added yet. Click "Add Product" to start.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.expected_items.map((item, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-gray-50 p-4 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex-1 grid grid-cols-5 gap-3">
                              {/* Product */}
                              <div className="col-span-2">
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Product *
                                </label>
                                <select
                                  value={item.product_id}
                                  onChange={(e) => updateSizeBreakdown(index, 'product_id', e.target.value)}
                                  required
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                >
                                  <option value="">Select Product</option>
                                  {products.map(product => (
                                    <option key={product.id} value={product.id}>
                                      {product.brand} {product.model} {product.dimensions}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Size */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Size *
                                </label>
                                <input
                                  type="text"
                                  value={item.product_size}
                                  onChange={(e) => updateSizeBreakdown(index, 'product_size', e.target.value)}
                                  required
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                  placeholder="90/90-17"
                                />
                              </div>

                              {/* Quantity */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Quantity *
                                </label>
                                <input
                                  type="number"
                                  value={item.expected_quantity}
                                  onChange={(e) => updateSizeBreakdown(index, 'expected_quantity', e.target.value)}
                                  required
                                  min="1"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                  placeholder="100"
                                />
                              </div>

                              {/* Unit Price */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Unit Price
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.unit_price}
                                  onChange={(e) => updateSizeBreakdown(index, 'unit_price', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeSizeBreakdown(index)}
                              className="mt-6 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Summary */}
                  {formData.expected_items.length > 0 && (
                    <div className="mt-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-gray-700">Total Items:</span>
                          <span className="ml-2 font-semibold text-gray-900">
                            {formData.expected_items.length} products
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-700">Total Quantity:</span>
                          <span className="ml-2 font-semibold text-blue-600">
                            {getTotalExpectedQuantity()} units
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-700">Total Value:</span>
                          <span className="ml-2 font-semibold text-green-600">
                            ₱{getTotalExpectedValue().toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Additional notes or special instructions..."
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={loading}
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? 'Saving...' : (editingShipment ? 'Update Shipment' : 'Register Shipment')}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shipments List */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Registered Shipments</h3>
          
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search shipments..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="READY_FOR_QC">Ready for QC</option>
              <option value="RECEIVED">Received</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {filteredShipments.map(shipment => {
            const statusConfig = getStatusConfig(shipment.status);
            const StatusIcon = statusConfig.icon;
            const isDeleting = deleteConfirm === shipment.id;
            const canCancel = true; // Allow deleting shipments at any status

            return (
              <motion.div
                key={shipment.id}
                whileHover={{ scale: 1.01 }}
                className={`${statusConfig.bg} ${statusConfig.border} border-2 rounded-lg p-4 transition-all`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 ${statusConfig.bg} rounded-lg`}>
                      <StatusIcon className={`w-6 h-6 ${statusConfig.text}`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900 text-lg">
                          {shipment.shipment_number}
                        </h4>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig.text} ${statusConfig.bg}`}>
                          {shipment.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Supplier:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {suppliers.find(s => s.id === shipment.supplier_id)?.name || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Expected Qty:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {shipment.expected_quantity} units
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Arrival Date:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {shipment.expected_arrival_date ? new Date(shipment.expected_arrival_date).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleEdit(shipment)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Shipment"
                    >
                      <Edit className="w-4 h-4" />
                    </motion.button>
                    
                    {canCancel && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDeleteClick(shipment)}
                        className={`p-2 rounded-lg transition-colors ${
                          isDeleting
                            ? 'bg-red-100 text-red-600'
                            : 'text-red-600 hover:bg-red-50'
                        }`}
                        title="Delete/Cancel Shipment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    )}
                  </div>
                </div>

                {/* Delete Confirmation */}
                <AnimatePresence>
                  {isDeleting && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mt-4"
                    >
                      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-red-800">Choose Action</p>
                            <p className="text-xs text-red-600 mt-1">
                              <strong>Cancel:</strong> Marks as CANCELLED (keeps record for audit)<br/>
                              <strong>Delete:</strong> Permanently removes shipment + all batches + inventory
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCancelShipment(shipment.id)}
                            className="flex-1 px-3 py-2 bg-amber-600 text-white rounded-lg font-medium text-sm hover:bg-amber-700 transition-colors"
                          >
                            Cancel Shipment
                          </button>
                          <button
                            onClick={() => handleDeleteConfirm(shipment.id)}
                            className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 transition-colors"
                          >
                            Delete Permanently
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-4 py-2 bg-white text-gray-700 rounded-lg font-medium text-sm border border-gray-300 hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}

          {filteredShipments.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>No shipments found matching your criteria</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
