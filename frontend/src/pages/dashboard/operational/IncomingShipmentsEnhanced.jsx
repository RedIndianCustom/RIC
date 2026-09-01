import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Ship, Search, Package, CheckCircle2, Clock, Truck, Box, 
  ChevronDown, ChevronUp, ChevronRight, Send, Bell, Eye,
  Calendar, User, FileText, AlertCircle
} from 'lucide-react';
import api from '../../../services/api';

export default function IncomingShipmentsEnhanced() {
  const [shipments, setShipments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [sendingId, setSendingId] = useState(null);

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [shipmentsRes, suppliersRes] = await Promise.all([
        api.get('/shipments', { params: { status: statusFilter === 'all' ? null : statusFilter } }),
        api.get('/suppliers')
      ]);
      setShipments(shipmentsRes.data.shipments || []);
      setSuppliers(suppliersRes.data.suppliers || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setAlert({ type: 'error', message: 'Failed to load shipments' });
    } finally {
      setLoading(false);
    }
  };

  const loadExpectedItems = async (shipmentId) => {
    try {
      const { data } = await api.get(`/receiving-qc/expected-items/${shipmentId}`);
      return data.data || [];
    } catch (error) {
      console.error('Error loading expected items:', error);
      return [];
    }
  };

  const handleSendToWarehouse = async (shipment) => {
    try {
      setSendingId(shipment.id);

      // Update shipment status to IN_TRANSIT (ready for warehouse)
      await api.put(`/shipments/${shipment.id}`, {
        status: 'IN_TRANSIT'
      });

      // Try to create notification for warehouse staff
      try {
        const notificationResponse = await api.post('/receiving-qc/notifications', {
          notification_type: 'SHIPMENT_READY_FOR_RECEIVING',
          title: 'New Shipment Ready for Receiving',
          message: `Shipment ${shipment.shipment_number} is ready for receiving and QC inspection`,
          priority: 'HIGH',
          shipment_id: shipment.id,
          recipient_role: 'WAREHOUSE_STAFF',
          requires_action: true,
          action_url: `/warehouse/receiving-enhanced`
        });

        // Check if notification was sent or just warning
        if (notificationResponse.data.warning) {
          setAlert({ 
            type: 'success', 
            message: `Shipment ${shipment.shipment_number} sent to warehouse! ⚠️ ${notificationResponse.data.warning}` 
          });
        } else {
          setAlert({ 
            type: 'success', 
            message: `Shipment ${shipment.shipment_number} sent to warehouse! Notification sent to warehouse staff.` 
          });
        }
      } catch (notificationError) {
        // Notification failed but shipment status was updated
        console.warn('Notification creation failed:', notificationError);
        setAlert({ 
          type: 'success', 
          message: `Shipment ${shipment.shipment_number} sent to warehouse! (Note: Notification system unavailable)` 
        });
      }

      await loadData();
    } catch (error) {
      console.error('Error sending to warehouse:', error);
      setAlert({ 
        type: 'error', 
        message: error.response?.data?.error || 'Failed to send shipment to warehouse' 
      });
    } finally {
      setSendingId(null);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      'PENDING': { 
        bg: 'bg-yellow-50', 
        text: 'text-yellow-700',
        icon: Clock,
        border: 'border-yellow-200',
        badge: 'bg-yellow-100 text-yellow-800'
      },
      'IN_TRANSIT': { 
        bg: 'bg-blue-50', 
        text: 'text-blue-700',
        icon: Truck,
        border: 'border-blue-200',
        badge: 'bg-blue-100 text-blue-800'
      },
      'READY_FOR_QC': { 
        bg: 'bg-purple-50', 
        text: 'text-purple-700',
        icon: CheckCircle2,
        border: 'border-purple-200',
        badge: 'bg-purple-100 text-purple-800'
      },
      'RECEIVED': { 
        bg: 'bg-green-50', 
        text: 'text-green-700',
        icon: CheckCircle2,
        border: 'border-green-200',
        badge: 'bg-green-100 text-green-800'
      }
    };
    return configs[status] || { 
      bg: 'bg-gray-50', 
      text: 'text-gray-700', 
      icon: Package,
      border: 'border-gray-200',
      badge: 'bg-gray-100 text-gray-800'
    };
  };

  const filteredShipments = shipments.filter(shipment => {
    const matchesSearch = 
      shipment.shipment_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.container_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || shipment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: shipments.length,
    pending: shipments.filter(s => s.status === 'PENDING').length,
    inTransit: shipments.filter(s => s.status === 'IN_TRANSIT').length,
    readyForQC: shipments.filter(s => s.status === 'READY_FOR_QC').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Ship className="w-6 h-6 text-blue-600" />
            Incoming Shipments (Enhanced)
          </h2>
          <p className="text-gray-600 mt-1">View shipments with size breakdown and send to warehouse for receiving</p>
        </div>
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

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Shipments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Package className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-yellow-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Transit</p>
              <p className="text-2xl font-bold text-blue-600">{stats.inTransit}</p>
            </div>
            <Truck className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-purple-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ready for QC</p>
              <p className="text-2xl font-bold text-purple-600">{stats.readyForQC}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shipments..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          </select>
        </div>
      </div>

      {/* Shipments List */}
      <div className="space-y-4">
        {loading && filteredShipments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4">Loading shipments...</p>
          </div>
        ) : filteredShipments.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-md border border-gray-200">
            <Ship className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p>No shipments found</p>
          </div>
        ) : (
          filteredShipments.map((shipment) => {
            const statusConfig = getStatusConfig(shipment.status);
            const StatusIcon = statusConfig.icon;
            const isExpanded = expandedId === shipment.id;
            const canSendToWarehouse = shipment.status === 'PENDING';

            return (
              <motion.div
                key={shipment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-xl shadow-md border-2 ${statusConfig.border} overflow-hidden`}
              >
                {/* Header */}
                <div
                  className={`${statusConfig.bg} p-6 cursor-pointer`}
                  onClick={() => setExpandedId(isExpanded ? null : shipment.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 ${statusConfig.badge} rounded-lg`}>
                        <StatusIcon className="w-6 h-6" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {shipment.shipment_number}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig.badge}`}>
                            {shipment.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Supplier:</span>
                            <span className="ml-2 font-medium text-gray-900">
                              {suppliers.find(s => s.id === shipment.supplier_id)?.name || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Container:</span>
                            <span className="ml-2 font-medium text-gray-900">
                              {shipment.container_number || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Expected Qty:</span>
                            <span className="ml-2 font-medium text-gray-900">
                              {shipment.expected_quantity || 0} units
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Arrival Date:</span>
                            <span className="ml-2 font-medium text-gray-900">
                              {shipment.expected_arrival_date 
                                ? new Date(shipment.expected_arrival_date).toLocaleDateString()
                                : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      {canSendToWarehouse ? (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendToWarehouse(shipment);
                          }}
                          disabled={sendingId === shipment.id}
                          className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 font-semibold disabled:opacity-50 flex items-center gap-2 shadow-lg"
                        >
                          {sendingId === shipment.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              Send to Warehouse
                            </>
                          )}
                        </motion.button>
                      ) : (
                        <div className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4" />
                          {shipment.status === 'IN_TRANSIT' && 'Sent to Warehouse'}
                          {shipment.status === 'READY_FOR_QC' && 'In QC Inspection'}
                          {shipment.status === 'RECEIVED' && 'Completed'}
                          {!['IN_TRANSIT', 'READY_FOR_QC', 'RECEIVED'].includes(shipment.status) && shipment.status}
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedId(isExpanded ? null : shipment.id);
                        }}
                        className="p-2 hover:bg-white hover:bg-opacity-50 rounded-lg transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-6 h-6 text-gray-600" />
                        ) : (
                          <ChevronDown className="w-6 h-6 text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-gray-200"
                    >
                      <ShipmentDetails shipment={shipment} />
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

// Shipment Details Component
function ShipmentDetails({ shipment }) {
  // No need to fetch - we already have the shipment data!
  const productBreakdown = shipment?.product_breakdown || [];
  
  const getTotalQuantity = () => {
    if (!productBreakdown || productBreakdown.length === 0) return 0;
    return productBreakdown.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
  };

  const getTotalValue = () => {
    if (!productBreakdown || productBreakdown.length === 0) return 0;
    return productBreakdown.reduce((sum, item) => 
      sum + ((parseInt(item.quantity) || 0) * (parseFloat(item.unit_price || item.price) || 0)), 0
    );
  };

  if (productBreakdown.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="text-yellow-800 font-medium">No Size Breakdown Available</p>
            <p className="text-sm text-yellow-700 mt-1">
              This shipment was registered without size breakdown. Use the enhanced registration to add size details.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="text-gray-700">Total Products:</span>
            <span className="ml-2 font-semibold text-gray-900">
              {productBreakdown.length} types
            </span>
          </div>
          <div>
            <span className="text-gray-700">Total Quantity:</span>
            <span className="ml-2 font-semibold text-blue-600">
              {getTotalQuantity()} units
            </span>
          </div>
          <div>
            <span className="text-gray-700">Total Value:</span>
            <span className="ml-2 font-semibold text-green-600">
              ₱{getTotalValue().toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Size Breakdown Table */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Box className="w-5 h-5 text-blue-600" />
          Product Size Breakdown
        </h4>

        <div className="overflow-hidden border border-gray-200 rounded-lg">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Size/Dimensions
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Assigned Positions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {productBreakdown.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div className="font-medium">
                      {item.brand} {item.model}
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.product_name}
                    </div>
                    {item.sku && (
                      <div className="text-xs text-gray-400">
                        SKU: {item.sku}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">
                      {item.dimensions || item.size || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {item.assigned_positions && item.assigned_positions.length > 0 ? (
                      <div className="space-y-1">
                        {item.assigned_positions.map((pos, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded font-mono">
                              {pos.position_code}
                            </span>
                            <span className="text-gray-500">
                              ({pos.quantity} units)
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">No positions assigned</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
              <tr>
                <td colSpan="2" className="px-4 py-3 text-sm font-bold text-gray-900">
                  TOTAL
                </td>
                <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">
                  {getTotalQuantity()}
                </td>
                <td className="px-4 py-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Bell className="w-5 h-5 text-green-600 mt-0.5" />
          <div className="text-sm text-green-800">
            <p className="font-medium mb-1">Ready for Warehouse</p>
            <p>
              Click <strong>"Send to Warehouse"</strong> to notify warehouse staff. 
              They will receive the shipment and start the receiving process with size-by-size scanning.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
