import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Ship, Search, Filter, Calendar, Package, CheckCircle2, XCircle, 
  AlertTriangle, Clock, TrendingUp, Eye, Edit, Trash2, X, 
  MapPin, FileText, User, Truck, Box, ChevronRight
} from 'lucide-react';
import { fetchShipments, updateShipment, deleteShipment, fetchSuppliers } from '../../../services/api';

export default function IncomingShipments() {
  const [shipments, setShipments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [receiveMode, setReceiveMode] = useState(null);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), alert.type === 'success' ? 3000 : 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [shipmentsData, suppliersData] = await Promise.all([
        fetchShipments({ status: statusFilter === 'all' ? null : statusFilter }),
        fetchSuppliers()
      ]);
      setShipments(shipmentsData.shipments || []);
      setSuppliers(suppliersData.suppliers || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setAlert({ type: 'error', message: 'Failed to load shipments' });
    } finally {
      setLoading(false);
    }
  };

  const handleReceiveShipment = async (shipmentId, actualQuantity) => {
    try {
      await updateShipment(shipmentId, {
        status: 'RECEIVED',
        actual_quantity: actualQuantity,
        received_date: new Date().toISOString()
      });
      setAlert({ type: 'success', message: 'Shipment received successfully!' });
      setReceiveMode(null);
      await loadData();
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to receive shipment' });
    }
  };

  const handleCancelShipment = async (id) => {
    try {
      await updateShipment(id, { status: 'CANCELLED' });
      setAlert({ type: 'success', message: 'Shipment cancelled successfully!' });
      await loadData();
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to cancel shipment' });
    }
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
    const matchesStatus = statusFilter === 'all' || shipment.status === statusFilter;
    const matchesSupplier = supplierFilter === 'all' || shipment.supplier_id === supplierFilter;
    return matchesSearch && matchesStatus && matchesSupplier;
  });

  const stats = {
    total: shipments.length,
    pending: shipments.filter(s => s.status === 'PENDING').length,
    inTransit: shipments.filter(s => s.status === 'IN_TRANSIT').length,
    received: shipments.filter(s => s.status === 'RECEIVED').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 p-6">
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Incoming Shipments
          </h1>
          <p className="mt-2 text-slate-600">Track and receive incoming cargo shipments</p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ y: -4 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-blue-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Shipments</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mt-1">
                  {stats.total}
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
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

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl p-6 border border-slate-200"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
              <Filter className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">Filter Shipments</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search shipments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="relative">
              <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="RECEIVED">Received</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="relative">
              <Truck className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white"
              >
                <option value="all">All Suppliers</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
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
            <p className="text-slate-600">No incoming shipments match your filters</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnimatePresence>
              {filteredShipments.map((shipment, index) => {
                const statusConfig = getStatusConfig(shipment.status);
                const StatusIcon = statusConfig.icon;
                const isReceiving = receiveMode === shipment.id;

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
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Ship className="h-5 w-5 text-blue-100" />
                            <h3 className="text-lg font-bold text-white">
                              {shipment.shipment_number}
                            </h3>
                          </div>
                          <p className="text-sm text-blue-100">
                            {shipment.suppliers?.name || 'Unknown Supplier'}
                          </p>
                        </div>
                        <div className={`px-3 py-1.5 ${statusConfig.bg} ${statusConfig.text} rounded-lg border ${statusConfig.border} flex items-center space-x-1.5`}>
                          <StatusIcon className="h-4 w-4" />
                          <span className="text-xs font-semibold">{shipment.status}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 space-y-4">
                      {/* Container & BL Info */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Box className="h-4 w-4 text-slate-400" />
                            <span className="text-xs text-slate-500">Container</span>
                          </div>
                          <p className="text-sm font-semibold text-slate-800 pl-6">
                            {shipment.container_number || 'N/A'}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-slate-400" />
                            <span className="text-xs text-slate-500">BL Number</span>
                          </div>
                          <p className="text-sm font-semibold text-slate-800 pl-6">
                            {shipment.bl_number || 'N/A'}
                          </p>
                        </div>
                      </div>

                      {/* Quantity Info */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs text-slate-600">Expected Quantity</span>
                            <p className="text-2xl font-bold text-blue-700 mt-1">
                              {shipment.expected_quantity || 0}
                            </p>
                          </div>
                          {shipment.actual_quantity && (
                            <div className="text-right">
                              <span className="text-xs text-slate-600">Actual</span>
                              <p className="text-lg font-semibold text-slate-700 mt-1">
                                {shipment.actual_quantity}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Product Breakdown Preview */}
                      {shipment.product_breakdown && shipment.product_breakdown.length > 0 && (
                        <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-4 border border-orange-200">
                          <div className="flex items-center space-x-2 mb-3">
                            <Package className="h-4 w-4 text-orange-600" />
                            <span className="text-xs font-semibold text-orange-800">Products ({shipment.product_breakdown.length} types)</span>
                          </div>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {shipment.product_breakdown.slice(0, 3).map((product, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs bg-white/60 rounded-lg px-3 py-2">
                                <span className="font-medium text-slate-700">{product.category} {product.size}</span>
                                <span className="font-bold text-orange-700">{product.quantity} pcs</span>
                              </div>
                            ))}
                            {shipment.product_breakdown.length > 3 && (
                              <p className="text-xs text-center text-orange-600 font-medium pt-1">
                                +{shipment.product_breakdown.length - 3} more products
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Expected Arrival */}
                      {shipment.expected_arrival_date && (
                        <div className="flex items-center space-x-2 p-3 bg-slate-50 rounded-lg">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          <span className="text-xs text-slate-600">Expected:</span>
                          <span className="text-sm font-medium text-slate-800">
                            {new Date(shipment.expected_arrival_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      {/* Actions */}
                      {shipment.status === 'PENDING' || shipment.status === 'IN_TRANSIT' ? (
                        <>
                          <div className="flex space-x-2 pt-2">
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setReceiveMode(isReceiving ? null : shipment.id)}
                              className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              {isReceiving ? 'Cancel' : 'Receive Shipment'}
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                setSelectedShipment(shipment);
                                setShowDetailModal(true);
                              }}
                              className="px-4 py-2.5 bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
                            >
                              <Eye className="h-4 w-4" />
                            </motion.button>
                          </div>

                          {/* Receive Mode */}
                          <AnimatePresence>
                            {isReceiving && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 space-y-3">
                                  <p className="text-sm font-semibold text-green-800">Enter Actual Quantity Received</p>
                                  <input
                                    type="number"
                                    defaultValue={shipment.expected_quantity}
                                    id={`qty-${shipment.id}`}
                                    className="w-full px-4 py-2 border-2 border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    min="0"
                                  />
                                  <button
                                    onClick={() => {
                                      const qty = document.getElementById(`qty-${shipment.id}`).value;
                                      handleReceiveShipment(shipment.id, parseInt(qty));
                                    }}
                                    className="w-full px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
                                  >
                                    Confirm Receipt
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </>
                      ) : (
                        <div className="flex space-x-2 pt-2">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              setSelectedShipment(shipment);
                              setShowDetailModal(true);
                            }}
                            className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </motion.button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Detail Modal */}
        <AnimatePresence>
          {showDetailModal && selectedShipment && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowDetailModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
              >
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                        <Ship className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white">Shipment Details</h3>
                        <p className="text-blue-100 text-sm mt-1">{selectedShipment.shipment_number}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                    >
                      <X className="h-6 w-6 text-white" />
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="p-8 overflow-y-auto max-h-[calc(90vh-180px)] space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Supplier</p>
                      <p className="font-semibold text-slate-800">{selectedShipment.suppliers?.name || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Status</p>
                      <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-lg text-sm font-semibold ${getStatusConfig(selectedShipment.status).bg} ${getStatusConfig(selectedShipment.status).text}`}>
                        {selectedShipment.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Container Number</p>
                      <p className="font-semibold text-slate-800">{selectedShipment.container_number || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 mb-1">BL Number</p>
                      <p className="font-semibold text-slate-800">{selectedShipment.bl_number || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Expected Quantity</p>
                      <p className="text-2xl font-bold text-blue-600">{selectedShipment.expected_quantity || 0}</p>
                    </div>
                    {selectedShipment.actual_quantity && (
                      <div>
                        <p className="text-sm text-slate-500 mb-1">Actual Quantity</p>
                        <p className="text-2xl font-bold text-green-600">{selectedShipment.actual_quantity}</p>
                      </div>
                    )}
                  </div>

                  {selectedShipment.expected_arrival_date && (
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Expected Arrival Date</p>
                      <p className="font-semibold text-slate-800">
                        {new Date(selectedShipment.expected_arrival_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {selectedShipment.received_date && (
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Received Date</p>
                      <p className="font-semibold text-slate-800">
                        {new Date(selectedShipment.received_date).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {selectedShipment.notes && (
                    <div>
                      <p className="text-sm text-slate-500 mb-2">Notes</p>
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-700">
                        {selectedShipment.notes}
                      </div>
                    </div>
                  )}

                  {/* Product Breakdown - Full List */}
                  {selectedShipment.product_breakdown && selectedShipment.product_breakdown.length > 0 && (
                    <div>
                      <p className="text-sm text-slate-500 mb-3">Product Breakdown</p>
                      <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border-2 border-orange-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-orange-500 to-red-600 px-4 py-2">
                          <div className="grid grid-cols-3 gap-4">
                            <span className="text-xs font-bold text-white">Category</span>
                            <span className="text-xs font-bold text-white">Size</span>
                            <span className="text-xs font-bold text-white text-right">Quantity</span>
                          </div>
                        </div>
                        <div className="divide-y divide-orange-200">
                          {selectedShipment.product_breakdown.map((product, idx) => (
                            <div key={idx} className="grid grid-cols-3 gap-4 px-4 py-3 bg-white/60 hover:bg-white transition-colors">
                              <span className="text-sm font-semibold text-slate-800">{product.category}</span>
                              <span className="text-sm font-medium text-slate-600">{product.size}</span>
                              <span className="text-sm font-bold text-orange-700 text-right">{product.quantity} pcs</span>
                            </div>
                          ))}
                        </div>
                        <div className="bg-gradient-to-r from-orange-100 to-red-100 px-4 py-3 border-t-2 border-orange-300">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-orange-900">Total</span>
                            <span className="text-lg font-bold text-orange-700">
                              {selectedShipment.product_breakdown.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0)} tires
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="bg-slate-50 px-8 py-5 flex justify-end space-x-3 border-t border-slate-200">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowDetailModal(false)}
                    className="px-6 py-2.5 border-2 border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition-all"
                  >
                    Close
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
