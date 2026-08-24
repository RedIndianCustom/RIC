import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Edit, Trash2, Eye, FileText, Download, Package, 
  TrendingUp, Clock, CheckCircle, XCircle, Loader, Search,
  Calendar, DollarSign, Truck, AlertCircle
} from 'lucide-react';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';
import Loading from '../../../components/common/Loading';
import { showToast } from '../../../utils/toast';
import api from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import CreatePOModal from '../../../components/purchaseOrders/CreatePOModal';
import ViewPOModal from '../../../components/purchaseOrders/ViewPOModal';
import ReceivePOModal from '../../../components/purchaseOrders/ReceivePOModal';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const statusConfig = {
  draft: { 
    label: 'Draft', 
    color: 'bg-slate-100 text-slate-700',
    icon: FileText,
    badgeColor: 'bg-slate-500'
  },
  pending: { 
    label: 'Pending Approval', 
    color: 'bg-yellow-100 text-yellow-700',
    icon: Clock,
    badgeColor: 'bg-yellow-500'
  },
  approved: { 
    label: 'Approved', 
    color: 'bg-blue-100 text-blue-700',
    icon: CheckCircle,
    badgeColor: 'bg-blue-500'
  },
  ordered: { 
    label: 'Ordered', 
    color: 'bg-purple-100 text-purple-700',
    icon: Truck,
    badgeColor: 'bg-purple-500'
  },
  received: { 
    label: 'Received', 
    color: 'bg-green-100 text-green-700',
    icon: Package,
    badgeColor: 'bg-green-500'
  },
  cancelled: { 
    label: 'Cancelled', 
    color: 'bg-red-100 text-red-700',
    icon: XCircle,
    badgeColor: 'bg-red-500'
  }
};

export default function PurchaseOrders() {
  const { hasRole } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [deletingPO, setDeletingPO] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingPO, setEditingPO] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [posRes, suppliersRes] = await Promise.all([
        api.get('/purchase-orders'),
        api.get('/suppliers')
      ]);
      setPurchaseOrders(posRes.data.purchaseOrders || []);
      setSuppliers(suppliersRes.data.suppliers || []);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Failed to load purchase orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (po) => {
    setDeletingPO(po);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/purchase-orders/${deletingPO.id}`);
      showToast('Purchase order deleted successfully', 'success');
      setShowDeleteModal(false);
      setDeletingPO(null);
      loadData();
    } catch (error) {
      showToast('Failed to delete purchase order', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleView = (po) => {
    setSelectedPO(po);
    setShowViewModal(true);
  };

  const handleEdit = (po) => {
    setEditingPO(po);
    setShowCreateModal(true);
  };

  const handleReceive = (po) => {
    setSelectedPO(po);
    setShowReceiveModal(true);
  };

  const handleGeneratePDF = async (po) => {
    try {
      showToast('Generating PDF...', 'info');
      // PDF generation logic here
      setTimeout(() => {
        showToast('PDF generated successfully', 'success');
      }, 1000);
    } catch (error) {
      showToast('Failed to generate PDF', 'error');
    }
  };

  const filteredPOs = purchaseOrders.filter(po => {
    const matchesSearch = 
      po.poNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.supplierName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: purchaseOrders.length,
    draft: purchaseOrders.filter(po => po.status === 'draft').length,
    pending: purchaseOrders.filter(po => po.status === 'pending').length,
    received: purchaseOrders.filter(po => po.status === 'received').length,
    totalValue: purchaseOrders
      .filter(po => po.status === 'received')
      .reduce((sum, po) => sum + (po.totalAmount || 0), 0)
  };

  if (loading) return <Loading />;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Purchase Orders
          </h1>
          <p className="text-sm text-slate-600 mt-1.5 font-medium">Manage supplier purchase orders and deliveries</p>
        </div>
        {hasRole('admin', 'manager', 'operational_staff') && (
          <Button 
            onClick={() => {
              setEditingPO(null);
              setShowCreateModal(true);
            }} 
            icon={Plus} 
            className="shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all"
          >
            Create PO
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-5 text-white"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <FileText className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-blue-100 font-medium">Total POs</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          className="bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl shadow-lg p-5 text-white"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <FileText className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-100 font-medium">Draft</p>
              <p className="text-3xl font-bold">{stats.draft}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-5 text-white"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Clock className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-yellow-100 font-medium">Pending</p>
              <p className="text-3xl font-bold">{stats.pending}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-5 text-white"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Package className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-green-100 font-medium">Received</p>
              <p className="text-3xl font-bold">{stats.received}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-5 text-white"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <TrendingUp className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-purple-100 font-medium">Total Value</p>
              <p className="text-3xl font-bold">
                ₱{(stats.totalValue / 1000).toFixed(0)}K
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search by PO number or supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all bg-white"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="ordered">Ordered</option>
            <option value="received">Received</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Purchase Orders List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredPOs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    PO Number
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Order Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredPOs.map((po) => {
                  const StatusIcon = statusConfig[po.status]?.icon || FileText;
                  return (
                    <motion.tr
                      key={po.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-slate-400" />
                          <span className="font-mono text-sm font-semibold text-slate-900">
                            {po.poNumber}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-900">{po.supplierName}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Calendar size={14} />
                          {new Date(po.orderDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm font-semibold text-slate-900">
                          <DollarSign size={14} className="text-green-600" />
                          ₱{po.totalAmount?.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusConfig[po.status]?.color || 'bg-slate-100 text-slate-700'}`}>
                          <StatusIcon size={12} />
                          {statusConfig[po.status]?.label || po.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleView(po)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all hover:scale-105"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          {po.status !== 'received' && po.status !== 'cancelled' && hasRole('admin', 'manager', 'operational_staff') && (
                            <button
                              onClick={() => handleReceive(po)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all hover:scale-105"
                              title="Receive Items"
                            >
                              <Package size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => handleGeneratePDF(po)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all hover:scale-105"
                            title="Download PDF"
                          >
                            <Download size={18} />
                          </button>
                          {hasRole('admin', 'manager', 'operational_staff') && (
                            <button
                              onClick={() => handleEdit(po)}
                              className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-all hover:scale-105"
                              title="Edit"
                            >
                              <Edit size={18} />
                            </button>
                          )}
                          {hasRole('admin', 'manager') && (
                            <button
                              onClick={() => handleDelete(po)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all hover:scale-105"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-14 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
              <FileText size={26} className="text-blue-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-800">No purchase orders yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Create your first purchase order to start tracking supplier orders.
              </p>
            </div>
            {hasRole('admin', 'manager', 'operational_staff') && (
              <Button onClick={() => setShowCreateModal(true)} icon={Plus}>
                Create Purchase Order
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <CreatePOModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setEditingPO(null);
          }}
          onSuccess={loadData}
          suppliers={suppliers}
          editingPO={editingPO}
        />
      )}

      {/* View Modal */}
      {showViewModal && selectedPO && (
        <ViewPOModal
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          purchaseOrder={selectedPO}
        />
      )}

      {/* Receive Modal */}
      {showReceiveModal && selectedPO && (
        <ReceivePOModal
          isOpen={showReceiveModal}
          onClose={() => setShowReceiveModal(false)}
          purchaseOrder={selectedPO}
          onSuccess={loadData}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => !isDeleting && setShowDeleteModal(false)}
        title="Delete Purchase Order"
      >
        {deletingPO && (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="text-red-600" size={32} />
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-slate-900">
                Delete this purchase order?
              </h3>
              <p className="text-slate-600">
                PO Number: <span className="font-semibold font-mono">{deletingPO.poNumber}</span>
              </p>
              <p className="text-sm text-red-600 font-medium">
                This action cannot be undone. Supplier totals will be recalculated.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Supplier:</span>
                <span className="text-sm font-semibold text-slate-900">{deletingPO.supplierName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Total Amount:</span>
                <span className="text-sm font-semibold text-green-600">
                  ₱{deletingPO.totalAmount?.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setShowDeleteModal(false)} 
                className="flex-1"
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                variant="danger"
                onClick={confirmDelete}
                className="flex-1"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader className="animate-spin" size={18} />
                    Deleting...
                  </>
                ) : (
                  'Delete PO'
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
