import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Package, Search, Calendar, Truck, CheckCircle2, XCircle, 
  Clock, Edit, Trash2, X, Ship, Box, FileText, User, AlertTriangle,
  MapPin, Tag, ChevronRight, TrendingUp, Layers
} from 'lucide-react';
import { fetchShipments, createShipment, updateShipment, deleteShipment, fetchSuppliers } from '../../../services/api';

export default function ShipmentRegistration() {
  const [shipments, setShipments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingShipment, setEditingShipment] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [formData, setFormData] = useState({
    supplier_id: '',
    shipment_number: '',
    container_number: '',
    bl_number: '',
    expected_quantity: '',
    expected_arrival_date: '',
    notes: '',
    product_breakdown: [] // NEW: Array of {category, size, quantity}
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
  
  // Prevent formData reset when editing shipment
  useEffect(() => {
    if (editingShipment && showForm) {
      // Only update if formData is empty/default
      if (formData.product_breakdown.length === 0 && 
          editingShipment.product_breakdown && 
          editingShipment.product_breakdown.length > 0) {
        console.log('🔧 Restoring product_breakdown from editingShipment:', editingShipment.product_breakdown);
        setFormData(prev => ({
          ...prev,
          product_breakdown: JSON.parse(JSON.stringify(editingShipment.product_breakdown))
        }));
      }
    }
  }, [showForm, editingShipment]);
  
  // DEBUG: Log formData changes
  useEffect(() => {
    console.log('🔄 formData changed:');
    console.log('   product_breakdown length:', formData.product_breakdown?.length);
    if (formData.product_breakdown && formData.product_breakdown.length > 0) {
      console.log('   Products:', formData.product_breakdown);
    }
  }, [formData.product_breakdown]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [shipmentsData, suppliersData] = await Promise.all([
        fetchShipments({ status: statusFilter === 'all' ? null : statusFilter }),
        fetchSuppliers()
      ]);
      setShipments(shipmentsData.shipments || []);
      setSuppliers(suppliersData.suppliers || []);
      setError(null);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Auto-calculate expected_quantity from product breakdown
      const calculatedQuantity = getTotalBreakdownQty();
      const submissionData = {
        ...formData,
        expected_quantity: calculatedQuantity || formData.expected_quantity
      };
      
      console.log('💾 Saving shipment...');
      console.log('📦 formData.product_breakdown:', formData.product_breakdown);
      console.log('📊 Product count:', formData.product_breakdown?.length);
      console.log('📤 Full submission data:', JSON.stringify(submissionData, null, 2));
      
      if (editingShipment) {
        console.log(`✏️ UPDATING shipment: ${editingShipment.id}`);
        const result = await updateShipment(editingShipment.id, submissionData);
        console.log('✅ Update result:', result);
        setAlert({ type: 'success', message: 'Shipment updated successfully!' });
      } else {
        console.log('➕ CREATING new shipment');
        const result = await createShipment(submissionData);
        console.log('✅ Create result:', result);
        setAlert({ type: 'success', message: 'Shipment created successfully!' });
      }

      resetForm();
      await loadData();
    } catch (err) {
      console.error('❌ Error saving shipment:', err);
      console.error('❌ Error response:', err.response?.data);
      setAlert({ type: 'error', message: err.response?.data?.error || 'Failed to save shipment' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (shipment) => {
    console.log('📝 ========== EDITING SHIPMENT ==========');
    console.log('📝 Shipment number:', shipment.shipment_number);
    console.log('📦 RAW shipment object:', shipment);
    console.log('📦 product_breakdown field:', shipment.product_breakdown);
    console.log('📦 product_breakdown type:', typeof shipment.product_breakdown);
    console.log('📦 product_breakdown is array?:', Array.isArray(shipment.product_breakdown));
    console.log('📊 Products length:', shipment.product_breakdown?.length);
    
    if (shipment.product_breakdown) {
      console.log('📦 Product breakdown content:', JSON.stringify(shipment.product_breakdown, null, 2));
    }
    
    // Show alert to user if no products
    if (!shipment.product_breakdown || shipment.product_breakdown.length === 0) {
      console.warn(`⚠️ Shipment ${shipment.shipment_number} has NO products - you can add them now!`);
    } else {
      console.log(`✅ Shipment has ${shipment.product_breakdown.length} products - they should load into the form`);
    }
    
    const formDataToSet = {
      supplier_id: shipment.supplier_id || '',
      shipment_number: shipment.shipment_number || '',
      container_number: shipment.container_number || '',
      bl_number: shipment.bl_number || '',
      expected_quantity: shipment.expected_quantity || '',
      expected_arrival_date: shipment.expected_arrival_date || '',
      notes: shipment.notes || '',
      product_breakdown: Array.isArray(shipment.product_breakdown) ? JSON.parse(JSON.stringify(shipment.product_breakdown)) : [] // Deep clone!
    };
    
    console.log('📤 Setting formData to:', formDataToSet);
    console.log('📤 formData.product_breakdown:', formDataToSet.product_breakdown);
    console.log('📤 formData.product_breakdown length:', formDataToSet.product_breakdown?.length);
    console.log('========================================\n');
    
    // Set editing shipment and formData TOGETHER in one update
    setEditingShipment(shipment);
    setFormData(formDataToSet);
    setShowForm(true);
  };

  const handleDeleteClick = (shipment) => {
    setDeleteConfirm(deleteConfirm === shipment.id ? null : shipment.id);
  };

  const handleDeleteConfirm = async (id) => {
    try {
      await deleteShipment(id);
      setAlert({ type: 'success', message: 'Shipment cancelled successfully!' });
      setDeleteConfirm(null);
      await loadData();
    } catch (err) {
      console.error('Error deleting shipment:', err);
      setAlert({ type: 'error', message: 'Failed to cancel shipment' });
    }
  };

  const resetForm = () => {
    setFormData({
      supplier_id: '',
      shipment_number: '',
      container_number: '',
      bl_number: '',
      expected_quantity: '',
      expected_arrival_date: '',
      notes: '',
      product_breakdown: []
    });
    setEditingShipment(null);
    setShowForm(false);
  };

  // Product breakdown helpers
  const TIRE_CATEGORIES = [
    'Dual Sport',
    'Sawtooth',
    'Enduro',
    'Trail',
    'Scooter'
  ];

  const TIRE_SIZES = [
    '90/90-17',
    '100/90-17',
    '110/90-17',
    '120/80-17',
    '130/80-17',
    '90/90-18',
    '100/90-18',
    '120/80-18',
    '90/90-19',
    '150/60-17'
  ];

  const addProductLine = () => {
    setFormData({
      ...formData,
      product_breakdown: [
        ...formData.product_breakdown,
        { category: '', size: '', quantity: '' }
      ]
    });
  };

  const removeProductLine = (index) => {
    const newBreakdown = formData.product_breakdown.filter((_, i) => i !== index);
    setFormData({ ...formData, product_breakdown: newBreakdown });
  };

  const updateProductLine = (index, field, value) => {
    const newBreakdown = [...formData.product_breakdown];
    newBreakdown[index] = { ...newBreakdown[index], [field]: value };
    setFormData({ ...formData, product_breakdown: newBreakdown });
  };

  const getTotalBreakdownQty = () => {
    return formData.product_breakdown.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
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
      shipment.suppliers?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  const stats = {
    total: shipments.length,
    pending: shipments.filter(s => s.status === 'PENDING').length,
    inTransit: shipments.filter(s => s.status === 'IN_TRANSIT').length,
    received: shipments.filter(s => s.status === 'RECEIVED').length
  };

  if (loading && shipments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Alert */}
        <AnimatePresence>
          {alert && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`${
                alert.type === 'success'
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-800'
                  : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200 text-red-800'
              } border-2 rounded-2xl px-6 py-4 shadow-lg backdrop-blur-sm`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {alert.type === 'success' ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                  <span className="font-medium">{alert.message}</span>
                </div>
                <button onClick={() => setAlert(null)} className="text-gray-500 hover:text-gray-700">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        >
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
              All Shipments
            </h1>
            <p className="mt-2 text-slate-600">Register and manage all tire shipments</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Shipment
          </motion.button>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ y: -4 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-teal-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Shipments</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mt-1">
                  {stats.total}
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl shadow-lg">
                <Ship className="h-8 w-8 text-white" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ y: -4 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-yellow-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Pending</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent mt-1">
                  {stats.pending}
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-2xl shadow-lg">
                <Clock className="h-8 w-8 text-white" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ y: -4 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-blue-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">In Transit</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mt-1">
                  {stats.inTransit}
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                <Truck className="h-8 w-8 text-white" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ y: -4 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-green-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Received</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mt-1">
                  {stats.received}
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg">
                <CheckCircle2 className="h-8 w-8 text-white" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Form Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={resetForm}
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
              >
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-8 py-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                        <Plus className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">
                          {editingShipment ? 'Edit Shipment' : 'New Shipment'}
                        </h2>
                        <p className="text-teal-100 text-sm mt-1">Enter shipment details below</p>
                      </div>
                    </div>
                    <button
                      onClick={resetForm}
                      className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                    >
                      <X className="h-6 w-6 text-white" />
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <form onSubmit={handleSubmit} className="p-8 overflow-y-auto max-h-[calc(90vh-180px)] space-y-6">
                  {/* Shipment Info Section */}
                  <div>
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                        <Ship className="h-4 w-4 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-800">Shipment Information</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Supplier *</label>
                        <select
                          value={formData.supplier_id}
                          onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                          required
                          className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                        >
                          <option value="">Select Supplier</option>
                          {suppliers.map(supplier => (
                            <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Shipment Number *</label>
                        <input
                          type="text"
                          value={formData.shipment_number}
                          onChange={(e) => setFormData({ ...formData, shipment_number: e.target.value })}
                          required
                          placeholder="SHIP-2026-001"
                          className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Container Number *</label>
                        <input
                          type="text"
                          value={formData.container_number}
                          onChange={(e) => setFormData({ ...formData, container_number: e.target.value })}
                          required
                          placeholder="MSKU1234567"
                          className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Bill of Lading (BL)</label>
                        <input
                          type="text"
                          value={formData.bl_number}
                          onChange={(e) => setFormData({ ...formData, bl_number: e.target.value })}
                          placeholder="BL-2026-001"
                          className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Product Breakdown Section - MOVED TO TOP */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
                          <Layers className="h-4 w-4 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800">Product Breakdown</h3>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={addProductLine}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg text-xs font-medium shadow-md hover:shadow-lg transition-all"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Product
                      </motion.button>
                    </div>

                    {formData.product_breakdown.length === 0 ? (
                      <div className="text-center py-8 px-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50">
                        <Package className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                        <p className="text-sm text-slate-600 font-medium">No products added yet</p>
                        <p className="text-xs text-slate-500 mt-1">Click "Add Product" to specify tire categories and sizes</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {formData.product_breakdown.map((item, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="flex gap-3 items-start p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200"
                          >
                            <div className="flex-1 grid grid-cols-3 gap-3">
                              {/* Category */}
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1.5">Category *</label>
                                <select
                                  value={item.category || ''}
                                  onChange={(e) => updateProductLine(index, 'category', e.target.value)}
                                  required
                                  className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all bg-white"
                                >
                                  <option value="">Select...</option>
                                  {TIRE_CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Size */}
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1.5">Size *</label>
                                <select
                                  value={item.size || ''}
                                  onChange={(e) => updateProductLine(index, 'size', e.target.value)}
                                  required
                                  className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all bg-white"
                                >
                                  <option value="">Select...</option>
                                  {TIRE_SIZES.map(size => (
                                    <option key={size} value={size}>{size}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Quantity */}
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1.5">Qty *</label>
                                <input
                                  type="number"
                                  value={item.quantity || ''}
                                  onChange={(e) => {
                                    updateProductLine(index, 'quantity', e.target.value);
                                    // Auto-update expected_quantity
                                    setTimeout(() => {
                                      const newTotal = getTotalBreakdownQty();
                                      setFormData(prev => ({ ...prev, expected_quantity: newTotal }));
                                    }, 0);
                                  }}
                                  required
                                  min="1"
                                  placeholder="0"
                                  className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                                />
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-1 mt-6">
                              {/* Add (duplicate) button - only show on last item if there are 4+ items */}
                              {index === formData.product_breakdown.length - 1 && formData.product_breakdown.length >= 4 && (
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  type="button"
                                  onClick={() => {
                                    // Duplicate current line
                                    const newBreakdown = [...formData.product_breakdown];
                                    newBreakdown.splice(index + 1, 0, { ...item, quantity: '' });
                                    setFormData({ ...formData, product_breakdown: newBreakdown });
                                  }}
                                  className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                                  title="Add more"
                                >
                                  <Plus className="h-4 w-4" />
                                </motion.button>
                              )}

                              {/* Remove button - always show */}
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                type="button"
                                onClick={() => {
                                  removeProductLine(index);
                                  // Auto-update expected_quantity after removal
                                  setTimeout(() => {
                                    const newTotal = getTotalBreakdownQty();
                                    setFormData(prev => ({ ...prev, expected_quantity: newTotal }));
                                  }, 0);
                                }}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remove"
                              >
                                <Trash2 className="h-4 w-4" />
                              </motion.button>
                            </div>
                          </motion.div>
                        ))}

                        {/* Total Summary */}
                        {formData.product_breakdown.length > 0 && (
                          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border-2 border-teal-200">
                            <span className="text-sm font-semibold text-teal-800">Total Breakdown Quantity:</span>
                            <span className="text-xl font-bold text-teal-700">{getTotalBreakdownQty()} tires</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quantity & Schedule Section */}
                  <div>
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
                        <Box className="h-4 w-4 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-800">Quantity & Schedule</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Expected Quantity (Auto-calculated)</label>
                        <input
                          type="number"
                          value={getTotalBreakdownQty()}
                          readOnly
                          min="0"
                          placeholder="Add products to calculate"
                          className="w-full px-4 py-2.5 border-2 border-slate-300 bg-slate-100 rounded-xl text-slate-700 font-semibold cursor-not-allowed"
                        />
                        <p className="text-xs text-slate-500 mt-1">Automatically calculated from product breakdown</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Expected Arrival Date</label>
                        <input
                          type="date"
                          value={formData.expected_arrival_date}
                          onChange={(e) => setFormData({ ...formData, expected_arrival_date: e.target.value })}
                          className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows="3"
                      placeholder="Additional notes about this shipment..."
                      className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Modal Footer */}
                  <div className="flex justify-end space-x-3 pt-6 border-t border-slate-200">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={resetForm}
                      className="px-6 py-2.5 border-2 border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={loading}
                      className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-medium disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : editingShipment ? 'Update Shipment' : 'Create Shipment'}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl p-6 border border-slate-200"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search shipments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="relative">
              <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all appearance-none bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="RECEIVED">Received</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Shipments Grid */}
        {filteredShipments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-12 text-center border border-slate-200"
          >
            <div className="p-6 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <Ship className="h-12 w-12 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">No shipments found</h3>
            <p className="text-slate-600 mb-6">Create your first shipment to get started</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Your First Shipment
            </motion.button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredShipments.map((shipment, index) => {
                const statusConfig = getStatusConfig(shipment.status);
                const StatusIcon = statusConfig.icon;
                const isDeleting = deleteConfirm === shipment.id;

                return (
                  <motion.div
                    key={shipment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -4 }}
                    className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
                  >
                    {/* Card Header */}
                    <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white line-clamp-1">
                            {shipment.shipment_number}
                          </h3>
                          <p className="text-xs text-teal-50 mt-1">
                            {shipment.suppliers?.name || 'Unknown Supplier'}
                          </p>
                        </div>
                        <div className={`px-3 py-1 ${statusConfig.bg} ${statusConfig.text} rounded-lg border ${statusConfig.border} flex items-center space-x-1`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          <span className="text-xs font-semibold">{shipment.status}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 space-y-4">
                      {/* Container & BL */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Box className="h-4 w-4 text-slate-400" />
                          <span className="text-sm text-slate-600">Container:</span>
                          <span className="text-sm font-semibold text-slate-800">{shipment.container_number}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-slate-400" />
                          <span className="text-sm text-slate-600">BL:</span>
                          <span className="text-sm font-semibold text-slate-800">{shipment.bl_number || 'N/A'}</span>
                        </div>
                      </div>

                      {/* Quantity */}
                      <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-600">Quantity:</span>
                          <span className="text-lg font-bold text-teal-700">
                            {shipment.actual_quantity || 0} / {shipment.expected_quantity || 0}
                          </span>
                        </div>
                      </div>

                      {/* Expected Arrival */}
                      {shipment.expected_arrival_date && (
                        <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          <span className="text-xs text-slate-600">Arrival:</span>
                          <span className="text-sm font-medium text-blue-700">
                            {new Date(shipment.expected_arrival_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex space-x-2 pt-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleEdit(shipment)}
                          className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleDeleteClick(shipment)}
                          className={`flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-medium ${
                            isDeleting
                              ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white'
                              : 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 hover:from-red-50 hover:to-rose-50 hover:text-red-600'
                          }`}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </motion.button>
                      </div>

                      {/* Delete Confirmation */}
                      <AnimatePresence>
                        {isDeleting && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-xl p-4 space-y-3">
                              <div className="flex items-start space-x-3">
                                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-sm font-semibold text-red-800">Confirm Deletion</p>
                                  <p className="text-xs text-red-600 mt-1">
                                    This will permanently cancel this shipment.
                                  </p>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleDeleteConfirm(shipment.id)}
                                  className="flex-1 px-3 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg font-medium text-sm hover:shadow-lg transition-all"
                                >
                                  Yes, Delete
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="flex-1 px-3 py-2 bg-white text-slate-700 rounded-lg font-medium text-sm border border-slate-300 hover:bg-slate-50 transition-all"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
