import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Layers, 
  Search, 
  Calendar, 
  Package, 
  Barcode, 
  Edit2, 
  Trash2, 
  X, 
  Check, 
  AlertTriangle,
  ChevronDown,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  Ship,
  Box,
  MapPin
} from 'lucide-react';
import { 
  fetchBatches, 
  createBatch, 
  updateBatch, 
  deleteBatch,
  fetchShipments,
  fetchProducts
} from '../../../services/api';

// Add custom scrollbar styles
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(248, 250, 252, 0.5);
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #f97316 0%, #dc2626 100%);
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, #ea580c 0%, #b91c1c 100%);
  }
`;

export default function BatchManagement() {
  const [batches, setBatches] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    shipment_id: '',
    batch_number: '',
    batch_month: new Date().getMonth() + 1,
    batch_year: new Date().getFullYear(),
    manufactured_date: '',
    expiry_date: '',
    notes: '',
    // Additional display fields (not sent to API)
    container_number: '',
    bl_number: '',
    warehouse_name: '',
    warehouse_code: '',
    product_breakdown: []
  });

  // Auto-fill shipment details when shipment is selected
  const handleShipmentChange = (shipmentId) => {
    const selectedShipment = shipments.find(s => s.id === shipmentId);
    if (selectedShipment) {
      console.log('📦 Selected Shipment:', selectedShipment);
      console.log('📦 Product Breakdown:', selectedShipment.product_breakdown);
      
      // Auto-detect warehouse from product assigned positions
      let warehouseName = '';
      let warehouseCode = '';
      
      const shipmentProducts = selectedShipment.product_breakdown || [];
      console.log(`📦 Found ${shipmentProducts.length} products in shipment`);
      
      // Count total assigned positions
      let totalPositions = 0;
      let productsWithPositions = 0;
      
      shipmentProducts.forEach((product, idx) => {
        const posCount = product.assigned_positions?.length || 0;
        totalPositions += posCount;
        if (posCount > 0) productsWithPositions++;
        
        console.log(`📦 Product ${idx + 1}:`, {
          name: product.product_name || `${product.brand} ${product.model}`,
          quantity: product.quantity,
          assignedPositions: posCount,
          positions: product.assigned_positions
        });
      });
      
      console.log(`📦 Summary: ${productsWithPositions}/${shipmentProducts.length} products have positions assigned (${totalPositions} total positions)`);
      
      if (shipmentProducts.length > 0 && shipmentProducts[0].assigned_positions?.length > 0) {
        const firstPosition = shipmentProducts[0].assigned_positions[0];
        const positionCode = firstPosition.position_code || '';
        console.log('📦 First position code:', positionCode);
        
        // Extract warehouse code from position_code (e.g., "WH1-R05-RK05-S01-SH05-SUB01")
        const warehouseCodeMatch = positionCode.match(/^(WH\d+)/);
        
        if (warehouseCodeMatch) {
          warehouseCode = warehouseCodeMatch[1];
          warehouseName = `Warehouse ${warehouseCode}`;
          console.log('✅ Warehouse detected:', warehouseName, warehouseCode);
        } else {
          console.warn('⚠️ Could not extract warehouse code from position:', positionCode);
        }
      } else {
        console.warn('⚠️ No assigned positions found in products');
      }
      
      setFormData(prev => ({
        ...prev,
        shipment_id: shipmentId,
        container_number: selectedShipment.container_number || '',
        bl_number: selectedShipment.bl_number || '',
        warehouse_name: warehouseName,
        warehouse_code: warehouseCode,
        product_breakdown: selectedShipment.product_breakdown || []
      }));
      
      console.log('✅ Form data updated with shipment details and assigned positions');
    } else {
      setFormData(prev => ({
        ...prev,
        shipment_id: '',
        container_number: '',
        bl_number: '',
        warehouse_name: '',
        warehouse_code: '',
        product_breakdown: []
      }));
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  // Calculate total barcodes generated
  const totalBarcodesGenerated = batches.reduce((sum, batch) => sum + (batch.barcode_count || 0), 0);

  const loadData = async () => {
    try {
      setLoading(true);
      const [batchesData, shipmentsData, productsData] = await Promise.all([
        fetchBatches({ status: statusFilter }),
        fetchShipments(), // Remove RECEIVED filter to show ALL shipments
        fetchProducts() // Fetch ALL products without any filter
      ]);
      
      setBatches(batchesData.batches || []);
      setShipments(shipmentsData.shipments || []);
      setProducts(productsData.products || []);
      setError(null);
    } catch (err) {
      console.error('Error loading data:', err);
      if (err.status === 401) {
        setError('Authentication required. Please log in again.');
      } else if (err.status === 403) {
        setError('Access denied. You do not have permission to view batches.');
      } else {
        setError(err.message || 'Failed to load data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const generateBatchNumber = () => {
    const { batch_month, batch_year } = formData;
    const monthStr = String(batch_month).padStart(2, '0');
    const yearStr = String(batch_year).slice(-2);
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `BATCH-${yearStr}${monthStr}-${randomNum}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Extract assigned positions from product breakdown
      const productsWithPositions = (formData.product_breakdown || []).map(product => {
        return {
          product_id: product.product_id,
          product_name: product.product_name || `${product.brand || ''} ${product.model || ''}`.trim(),
          brand: product.brand,
          model: product.model,
          dimensions: product.dimensions || product.size,
          sku: product.sku,
          quantity: product.quantity,
          assigned_positions: product.assigned_positions || []
        };
      });

      // Build complete batch data with assigned positions
      const batchData = {
        shipment_id: formData.shipment_id,
        batch_number: formData.batch_number || generateBatchNumber(),
        batch_month: formData.batch_month,
        batch_year: formData.batch_year,
        manufactured_date: formData.manufactured_date || null,
        expiry_date: formData.expiry_date || null,
        notes: formData.notes || null,
        warehouse_code: formData.warehouse_code || null,
        warehouse_name: formData.warehouse_name || null,
        // Include products with their assigned positions
        products: productsWithPositions
      };

      console.log('📦 Batch data being sent:', JSON.stringify(batchData, null, 2));

      if (editingBatch) {
        await updateBatch(editingBatch.id, batchData);
        setSuccess('Batch updated successfully with assigned positions');
      } else {
        await createBatch(batchData);
        setSuccess('Batch created successfully with assigned positions');
      }

      setTimeout(() => setSuccess(''), 3000);
      resetForm();
      await loadData();
    } catch (err) {
      console.error('Error saving batch:', err);
      console.error('Error details:', err.response?.data);
      setError(err.response?.data?.error || 'Failed to save batch');
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (batch) => {
    setEditingBatch(batch);
    
    // Find the shipment to get container, BL, products, and warehouse
    const batchShipment = shipments.find(s => s.id === batch.shipment_id);
    
    // Auto-detect warehouse from product assigned positions
    let warehouseName = '';
    let warehouseCode = '';
    
    const shipmentProducts = batchShipment?.product_breakdown || [];
    if (shipmentProducts.length > 0 && shipmentProducts[0].assigned_positions?.length > 0) {
      const firstPosition = shipmentProducts[0].assigned_positions[0];
      const positionCode = firstPosition.position_code || '';
      const warehouseCodeMatch = positionCode.match(/^(WH\d+)/);
      
      if (warehouseCodeMatch) {
        warehouseCode = warehouseCodeMatch[1];
        warehouseName = `Warehouse ${warehouseCode}`;
      }
    }
    
    setFormData({
      shipment_id: batch.shipment_id || '',
      batch_number: batch.batch_number || '',
      batch_month: batch.batch_month || new Date().getMonth() + 1,
      batch_year: batch.batch_year || new Date().getFullYear(),
      manufactured_date: batch.manufactured_date || '',
      expiry_date: batch.expiry_date || '',
      notes: batch.notes || '',
      // Auto-fill shipment details for edit mode
      container_number: batchShipment?.container_number || batch.shipments?.container_number || '',
      bl_number: batchShipment?.bl_number || batch.shipments?.bl_number || '',
      warehouse_name: warehouseName,
      warehouse_code: warehouseCode,
      product_breakdown: batchShipment?.product_breakdown || []
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      // Use DELETE endpoint - backend already does soft delete (sets status to INACTIVE)
      await deleteBatch(id);
      setSuccess('Batch deactivated successfully');
      setTimeout(() => setSuccess(''), 3000);
      setDeleteConfirm(null);
      await loadData();
    } catch (err) {
      console.error('Error deactivating batch:', err);
      setError(err.response?.data?.error || 'Failed to deactivate batch');
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      shipment_id: '',
      batch_number: '',
      batch_month: new Date().getMonth() + 1,
      batch_year: new Date().getFullYear(),
      manufactured_date: '',
      expiry_date: '',
      notes: '',
      container_number: '',
      bl_number: '',
      warehouse_name: '',
      warehouse_code: '',
      product_breakdown: []
    });
    setEditingBatch(null);
    setShowForm(false);
  };

  const getStatusBadge = (status) => {
    const styles = {
      ACTIVE: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
      INACTIVE: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', icon: XCircle },
      COMPLETED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: Check }
    };
    return styles[status] || styles.INACTIVE;
  };

  const filteredBatches = batches.filter(batch => {
    const matchesSearch = 
      batch.batch_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch.products?.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch.products?.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch.shipments?.shipment_number?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  if (loading && batches.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading batches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 -m-6 p-6 min-h-screen">
      {/* Inject custom scrollbar styles */}
      <style>{scrollbarStyles}</style>
      
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 mb-2">
              <Layers className="w-3.5 h-3.5" />
              BATCH MANAGEMENT
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 bg-clip-text text-transparent tracking-tight">
              Batch Management
            </h1>
            <div className="text-slate-600 text-sm flex items-center gap-2 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              Create and manage tire batches from received shipments
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData()}
              className="p-2.5 rounded-xl bg-white border-2 border-slate-200 text-slate-700 hover:border-blue-400 transition-all duration-300 shadow-sm hover:shadow-md"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/50"
            >
              <Plus className="w-4 h-4" />
              New Batch
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg border border-slate-200 p-5 hover:shadow-xl transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Batches</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {batches.length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Layers className="w-6 h-6 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg border border-emerald-200 p-5 hover:shadow-xl transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Barcodes Generated</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                {totalBarcodesGenerated}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
              <Barcode className="w-6 h-6 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-lg border border-slate-200 p-5 hover:shadow-xl transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Active Batches</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                {batches.filter(b => b.status === 'ACTIVE').length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-lg border border-slate-200 p-5 hover:shadow-xl transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Avg Per Batch</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {batches.length > 0 ? Math.round(totalBarcodesGenerated / batches.length) : 0}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Alerts */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-4 rounded-xl bg-gradient-to-r from-rose-50 to-red-50 border border-rose-200 text-rose-900 text-sm flex items-center gap-3 shadow-md"
          >
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span className="font-medium">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-rose-100 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-900 text-sm flex items-center gap-3 shadow-md"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">{success}</span>
            <button onClick={() => setSuccess('')} className="ml-auto p-1 hover:bg-emerald-100 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => resetForm()}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{editingBatch ? 'Edit Batch' : 'Create New Batch'}</h2>
                  <p className="text-blue-100 text-sm mt-1">Fill in the batch details below</p>
                </div>
                <button
                  onClick={() => resetForm()}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-8">
                {/* Section 1: Shipment Selection */}
                <div>
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <Ship className="w-4 h-4 text-white" />
                      </div>
                      Shipment Information
                    </h3>
                    <p className="text-sm text-slate-600 ml-10">Select the shipment for this batch</p>
                  </div>

                  <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-2xl p-6 border-2 border-slate-200">
                    <label className="block text-sm font-bold text-slate-700 mb-3">
                      <Ship className="w-4 h-4 inline mr-1.5" />
                      Shipment *
                    </label>
                    <select
                      value={formData.shipment_id}
                      onChange={(e) => handleShipmentChange(e.target.value)}
                      required
                      disabled={editingBatch}
                      className="w-full px-5 py-4 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500 transition-all text-base font-medium bg-white shadow-sm hover:border-blue-400"
                    >
                      <option value="">Select Shipment</option>
                      {shipments.map(shipment => (
                        <option key={shipment.id} value={shipment.id}>
                          {shipment.shipment_number} - {shipment.container_number}
                        </option>
                      ))}
                    </select>
                    {shipments.length === 0 && (
                      <div className="mt-4 p-4 rounded-xl bg-amber-50 border-2 border-amber-200">
                        <p className="text-sm text-amber-800 font-medium flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          No shipments available. Create a shipment first.
                        </p>
                      </div>
                    )}

                    {/* Auto-filled Shipment Details */}
                    {(formData.container_number || formData.bl_number || formData.warehouse_name) && (
                      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {formData.container_number && (
                          <div className="bg-white rounded-xl p-5 border-2 border-blue-200 shadow-sm">
                            <p className="text-xs font-bold text-blue-600 uppercase mb-2 flex items-center gap-1.5">
                              <Box className="w-3.5 h-3.5" />
                              Container Number
                            </p>
                            <p className="text-xl font-bold text-blue-900">{formData.container_number}</p>
                          </div>
                        )}
                        {formData.bl_number && (
                          <div className="bg-white rounded-xl p-5 border-2 border-blue-200 shadow-sm">
                            <p className="text-xs font-bold text-blue-600 uppercase mb-2 flex items-center gap-1.5">
                              <Ship className="w-3.5 h-3.5" />
                              BL Number
                            </p>
                            <p className="text-xl font-bold text-blue-900">{formData.bl_number}</p>
                          </div>
                        )}
                        {formData.warehouse_name && (
                          <div className="bg-white rounded-xl p-5 border-2 border-emerald-200 shadow-sm">
                            <p className="text-xs font-bold text-emerald-600 uppercase mb-2 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5" />
                              Warehouse
                            </p>
                            <p className="text-lg font-bold text-emerald-900">{formData.warehouse_name}</p>
                            {formData.warehouse_code && (
                              <p className="text-xs text-slate-600 mt-1">Code: {formData.warehouse_code}</p>
                            )}
                            <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-700">
                              <CheckCircle2 className="w-3 h-3" />
                              <span className="font-medium">Auto-detected from positions</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Position Detection Summary */}
                    {formData.product_breakdown && formData.product_breakdown.length > 0 && (() => {
                      const totalPositions = formData.product_breakdown.reduce((sum, p) => {
                        return sum + (p.assigned_positions?.length || 0);
                      }, 0);
                      const productsWithPositions = formData.product_breakdown.filter(p => 
                        p.assigned_positions && p.assigned_positions.length > 0
                      ).length;
                      
                      if (totalPositions > 0) {
                        return (
                          <div className="mt-6 rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-5">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                                <MapPin className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="text-sm font-bold text-blue-900">Assigned Positions Detected</h4>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs font-bold">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Ready for Barcode Generation
                                  </span>
                                </div>
                                <div className="grid grid-cols-3 gap-4 mt-3">
                                  <div className="bg-white rounded-lg p-3 border border-blue-200">
                                    <p className="text-xs font-bold text-blue-600 uppercase mb-1">Products with Positions</p>
                                    <p className="text-2xl font-bold text-blue-900">{productsWithPositions}</p>
                                  </div>
                                  <div className="bg-white rounded-lg p-3 border border-blue-200">
                                    <p className="text-xs font-bold text-blue-600 uppercase mb-1">Total Positions</p>
                                    <p className="text-2xl font-bold text-blue-900">{totalPositions}</p>
                                  </div>
                                  <div className="bg-white rounded-lg p-3 border border-blue-200">
                                    <p className="text-xs font-bold text-blue-600 uppercase mb-1">Warehouse</p>
                                    <p className="text-lg font-bold text-blue-900">{formData.warehouse_code || 'N/A'}</p>
                                  </div>
                                </div>
                                <div className="mt-3 flex items-center gap-2 text-xs text-blue-700">
                                  <Barcode className="w-4 h-4" />
                                  <span className="font-medium">
                                    When generating barcodes, each position will be automatically included in the barcode data
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>

                {/* Section 2: Product Breakdown */}
                {formData.product_breakdown && formData.product_breakdown.length > 0 && (
                  <div>
                    <div className="mb-6">
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                          <Package className="w-4 h-4 text-white" />
                        </div>
                        Product Breakdown
                      </h3>
                      <p className="text-sm text-slate-600 ml-10">Products included in the selected shipment</p>
                    </div>

                    <div className="bg-gradient-to-br from-orange-50 to-red-50/30 rounded-2xl p-6 border-2 border-orange-200">
                      <div className="flex items-center justify-between mb-5">
                        <div className="text-sm font-bold text-orange-900 flex items-center gap-2">
                          <Box className="w-4 h-4" />
                          {formData.product_breakdown.length} Product Type{formData.product_breakdown.length !== 1 ? 's' : ''}
                        </div>
                        <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg">
                          <p className="text-xs font-bold uppercase tracking-wide">Total Quantity</p>
                          <p className="text-2xl font-bold">
                            {formData.product_breakdown.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                        {formData.product_breakdown.map((product, idx) => {
                          // Support both legacy (category/size) and new format (brand/model/dimensions)
                          const displayName = product.product_name || `${product.brand || ''} ${product.model || ''}`.trim() || product.category || 'Unknown Product';
                          const displaySize = product.dimensions || product.size || 'N/A';
                          const hasPositions = product.assigned_positions && product.assigned_positions.length > 0;
                          
                          return (
                            <div 
                              key={idx} 
                              className="bg-white rounded-xl p-5 border-2 border-orange-200 hover:border-orange-400 hover:shadow-lg transition-all group"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4 flex-1">
                                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-lg font-bold shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                                    {idx + 1}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    {/* Product Name */}
                                    <p className="text-base font-bold text-slate-900 mb-1 truncate">{displayName}</p>
                                    
                                    {/* Brand & Model (if available) */}
                                    {product.brand && product.model && (
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-bold text-orange-600 uppercase">Brand:</span>
                                        <span className="text-sm text-slate-700 font-medium">{product.brand}</span>
                                        <span className="text-slate-300">|</span>
                                        <span className="text-xs font-bold text-orange-600 uppercase">Model:</span>
                                        <span className="text-sm text-slate-700 font-medium">{product.model}</span>
                                      </div>
                                    )}
                                    
                                    {/* Size/Dimensions */}
                                    <div className="flex items-center gap-2 mb-2">
                                      <Box className="w-3.5 h-3.5 text-orange-500" />
                                      <span className="text-sm text-slate-600 font-medium">{displaySize}</span>
                                    </div>
                                    
                                    {/* SKU */}
                                    {product.sku && (
                                      <div className="text-xs text-slate-500 mb-2">
                                        SKU: <span className="font-mono font-medium">{product.sku}</span>
                                      </div>
                                    )}
                                    
                                    {/* Assigned Positions */}
                                    {hasPositions && (
                                      <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                                        <div className="flex items-center gap-2 mb-2">
                                          <MapPin className="w-3.5 h-3.5 text-blue-600" />
                                          <span className="text-xs font-bold text-blue-900 uppercase">
                                            Assigned Positions ({product.assigned_positions.length})
                                          </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                          {product.assigned_positions.slice(0, 3).map((pos, posIdx) => (
                                            <div 
                                              key={posIdx}
                                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-blue-300 text-xs font-bold text-blue-700"
                                            >
                                              <MapPin className="w-3 h-3" />
                                              {pos.position_code}
                                              <span className="text-blue-500">×{pos.quantity}</span>
                                            </div>
                                          ))}
                                          {product.assigned_positions.length > 3 && (
                                            <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-100 text-xs font-bold text-blue-700">
                                              +{product.assigned_positions.length - 3} more
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Quantity */}
                                <div className="text-right flex-shrink-0">
                                  <p className="text-xs font-bold text-orange-600 uppercase mb-1">Quantity</p>
                                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-100 to-red-100 border-2 border-orange-300 text-lg font-bold text-orange-700">
                                    {product.quantity}
                                    <span className="text-xs">pcs</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Section 3: Batch Details */}
                <div>
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                        <Layers className="w-4 h-4 text-white" />
                      </div>
                      Batch Details
                    </h3>
                    <p className="text-sm text-slate-600 ml-10">Configure batch identification and dates</p>
                  </div>

                  <div className="bg-gradient-to-br from-slate-50 to-purple-50/30 rounded-2xl p-6 border-2 border-slate-200 space-y-6">
                    {/* Batch Number */}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-3">
                        <Barcode className="w-4 h-4 inline mr-1.5" />
                        Batch Number
                      </label>
                      <input
                        type="text"
                        value={formData.batch_number}
                        onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                        placeholder="Leave blank to auto-generate"
                        className="w-full px-5 py-4 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-base font-medium bg-white shadow-sm hover:border-purple-400"
                      />
                      <span className="mt-2 text-xs text-slate-500 font-medium flex items-center gap-1.5 block">
                        <span className="w-1 h-1 rounded-full bg-purple-500"></span>
                        Format: BATCH-YYMM-XXX
                      </span>
                    </div>

                    {/* Batch Month & Year */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">
                          <Calendar className="w-4 h-4 inline mr-1.5" />
                          Batch Month *
                        </label>
                        <select
                          value={formData.batch_month}
                          onChange={(e) => setFormData({ ...formData, batch_month: parseInt(e.target.value) })}
                          required
                          className="w-full px-5 py-4 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-base font-medium bg-white shadow-sm hover:border-purple-400"
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                            <option key={month} value={month}>
                              {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })} ({month})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">
                          <Calendar className="w-4 h-4 inline mr-1.5" />
                          Batch Year *
                        </label>
                        <input
                          type="number"
                          value={formData.batch_year}
                          onChange={(e) => setFormData({ ...formData, batch_year: parseInt(e.target.value) })}
                          required
                          min="2000"
                          max="2100"
                          className="w-full px-5 py-4 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-base font-medium bg-white shadow-sm hover:border-purple-400"
                        />
                      </div>
                    </div>

                    {/* Manufactured & Expiry Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">
                          <Clock className="w-4 h-4 inline mr-1.5" />
                          Manufactured Date
                        </label>
                        <input
                          type="date"
                          value={formData.manufactured_date}
                          onChange={(e) => setFormData({ ...formData, manufactured_date: e.target.value })}
                          className="w-full px-5 py-4 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-base font-medium bg-white shadow-sm hover:border-purple-400"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">
                          <AlertTriangle className="w-4 h-4 inline mr-1.5" />
                          Expiry Date
                        </label>
                        <input
                          type="date"
                          value={formData.expiry_date}
                          onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                          className="w-full px-5 py-4 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-base font-medium bg-white shadow-sm hover:border-purple-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 4: Additional Notes */}
                <div>
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center">
                        <Edit2 className="w-4 h-4 text-white" />
                      </div>
                      Additional Notes
                    </h3>
                    <p className="text-sm text-slate-600 ml-10">Optional notes or remarks for this batch</p>
                  </div>

                  <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-6 border-2 border-slate-200">
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows="5"
                      placeholder="Enter any additional information, special handling instructions, or remarks..."
                      className="w-full px-5 py-4 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-slate-500/20 focus:border-slate-500 transition-all text-base resize-none bg-white shadow-sm hover:border-slate-400"
                    />
                  </div>
                </div>

                {/* Form Actions - Sticky Footer */}
                <div className="sticky bottom-0 bg-white border-t-2 border-slate-200 -mx-8 -mb-8 px-8 py-6 rounded-b-2xl shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
                  <div className="flex justify-end gap-4">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-8 py-4 border-2 border-slate-300 rounded-xl text-base font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm hover:shadow-md"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-8 py-4 rounded-xl text-base font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-xl hover:shadow-blue-500/50 hover:scale-[1.02]"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          Saving...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Check className="w-5 h-5" />
                          {editingBatch ? 'Update Batch' : 'Create Batch'}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search batches, products, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-slate-50/50"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer bg-slate-50/50"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="COMPLETED">Completed</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Batches Grid */}
      <div className="grid grid-cols-1 gap-4">
        {filteredBatches.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mx-auto mb-4">
              <Layers className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No batches found</h3>
            <p className="text-slate-600 mb-6">Create your first batch to get started</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/40 transition-all"
            >
              <Plus className="w-4 h-4" />
              Create First Batch
            </button>
          </motion.div>
        ) : (
          filteredBatches.map((batch, index) => {
            const statusStyle = getStatusBadge(batch.status);
            const StatusIcon = statusStyle.icon;
            const canDeactivate = batch.status === 'ACTIVE'; // Only allow deactivating ACTIVE batches

            return (
              <motion.div
                key={batch.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-300 overflow-hidden group"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                        <Package className="w-7 h-7 text-white" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-slate-900 truncate">{batch.batch_number}</h3>
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {batch.status}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span>{batch.batch_month}/{batch.batch_year}</span>
                          </div>
                        </div>
                        
                        {/* Barcode Count Badge */}
                        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200">
                          <Barcode className="w-4 h-4 text-emerald-600" />
                          <span className="text-sm font-bold text-emerald-900">
                            {batch.barcode_count || 0} Barcodes Generated
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(batch)}
                        className="p-2.5 rounded-xl bg-blue-50 border-2 border-blue-200 text-blue-700 hover:bg-blue-100 transition-all"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {canDeactivate && (
                        <button
                          onClick={() => setDeleteConfirm(batch.id)}
                          className="p-2.5 rounded-xl bg-red-50 border-2 border-red-200 text-red-700 hover:bg-red-100 transition-all"
                          title="Deactivate"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                    {/* Product Info */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5" />
                        Products
                      </div>
                      {batch.shipments?.product_breakdown && batch.shipments.product_breakdown.length > 0 ? (
                        <div className="space-y-2">
                          {batch.shipments.product_breakdown.slice(0, 2).map((product, idx) => {
                            // Support both legacy (category/size) and new format (brand/model/dimensions)
                            const displayName = product.product_name || `${product.brand || ''} ${product.model || ''}`.trim() || product.category || 'Unknown Product';
                            const displaySize = product.dimensions || product.size || 'N/A';
                            const hasPositions = product.assigned_positions && product.assigned_positions.length > 0;
                            
                            return (
                              <div key={idx} className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-3 border border-orange-200">
                                <div className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                  {displayName}
                                </div>
                                <div className="text-xs text-slate-600 mb-1 flex items-center gap-1.5">
                                  <Box className="w-3 h-3 text-orange-500" />
                                  {displaySize}
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-orange-600">
                                    Qty: {product.quantity} pcs
                                  </span>
                                  {hasPositions && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-xs font-bold">
                                      <MapPin className="w-3 h-3" />
                                      {product.assigned_positions.length} pos
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {batch.shipments.product_breakdown.length > 2 && (
                            <div className="text-xs text-slate-500 italic pl-2">
                              +{batch.shipments.product_breakdown.length - 2} more products
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm font-semibold text-slate-900">{batch.products?.sku || 'N/A'}</div>
                      )}
                    </div>

                    {/* Shipment Info */}
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Ship className="w-3.5 h-3.5" />
                        Shipment
                      </div>
                      <div className="text-sm font-semibold text-slate-900">{batch.shipments?.shipment_number || 'N/A'}</div>
                      <div className="text-xs text-slate-600">{batch.shipments?.container_number}</div>
                    </div>

                    {/* Dates */}
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Created
                      </div>
                      <div className="text-sm font-semibold text-slate-900">
                        {new Date(batch.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-slate-600">
                        {new Date(batch.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delete Confirmation */}
                <AnimatePresence>
                  {deleteConfirm === batch.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-gradient-to-r from-red-50 to-rose-50 border-t-2 border-red-200 px-6 py-4 overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-red-900">Deactivate this batch?</p>
                            <p className="text-xs text-red-700">Status will be changed to INACTIVE. The batch record will be preserved.</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-4 py-2 rounded-lg border-2 border-red-200 text-sm font-bold text-red-700 hover:bg-red-50 transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDelete(batch.id)}
                            disabled={loading}
                            className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/40 disabled:opacity-50 transition-all"
                          >
                            {loading ? 'Deactivating...' : 'Deactivate'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
