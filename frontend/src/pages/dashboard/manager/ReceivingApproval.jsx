/**
 * ============================================================================
 * RECEIVING APPROVAL - OPERATIONAL MANAGER
 * ============================================================================
 * Manager reviews completed receiving submissions from warehouse staff
 * - View pending approval requests
 * - Review received items and discrepancies
 * - Approve or reject receiving
 * - Set QC inspection deadline when approving
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  Truck,
  Calendar,
  User,
  FileText,
  Eye,
  Clock,
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  ThumbsUp,
  ThumbsDown,
  Info,
  Timer,
  Target
} from 'lucide-react';
import api from '../../../services/api';
import { toast } from '../../../utils/toast';
import QCDeadlineSelector from '../../../components/qc/QCDeadlineSelector';

export default function ReceivingApproval() {
  const [approvalRequests, setApprovalRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});
  
  // Approval/Rejection modal
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  
  // QC Deadline modal
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [pendingApprovalRequest, setPendingApprovalRequest] = useState(null);

  useEffect(() => {
    loadApprovalRequests();
  }, []);

  const loadApprovalRequests = async () => {
    try {
      setRefreshing(true);
      // Fetch shipments that are waiting for manager approval
      const { data } = await api.get('/warehouse/receiving/pending-approval');
      
      if (data.success) {
        setApprovalRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error loading approval requests:', error);
      toast.error('Failed to load approval requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
  };

  const handleApproveClick = (request) => {
    setSelectedRequest(request);
    setShowApprovalModal(true);
  };

  const handleRejectClick = (request) => {
    setSelectedRequest(request);
    setRejectionReason('');
    // Show rejection modal (you can create a separate one or reuse approval modal)
  };

  // Step 1: Manager confirms approval
  const handleConfirmApproval = async () => {
    try {
      // First, approve the receiving
      await api.post('/receiving-qc/receiving/complete', {
        shipment_id: selectedRequest.id,
        notes: approvalNotes
      });

      toast.success('Receiving approved!');
      setShowApprovalModal(false);
      setApprovalNotes('');

      // Step 2: Show deadline selector for QC inspection
      setPendingApprovalRequest(selectedRequest);
      setShowDeadlineModal(true);

    } catch (error) {
      console.error('Error approving receiving:', error);
      toast.error('Failed to approve receiving');
    }
  };

  // Step 2: Manager sets QC deadline
  const handleDeadlineSelected = async (deadlineConfig) => {
    try {
      // Create QC inspection with deadline settings
      const { data } = await api.post('/receiving-qc/qc-inspection/create', {
        shipment_id: pendingApprovalRequest.id,
        deadline_type: deadlineConfig.type,
        custom_deadline_days: deadlineConfig.customDays,
        deadline_reason: deadlineConfig.reason
      });

      if (data.success) {
        toast.success('QC inspection created with deadline set! 🎯');
        setShowDeadlineModal(false);
        setPendingApprovalRequest(null);
        
        // Refresh the list
        loadApprovalRequests();
      }
    } catch (error) {
      console.error('Error creating QC inspection:', error);
      toast.error('Failed to create QC inspection');
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      await api.post(`/warehouse/receiving/${selectedRequest.id}/reject`, {
        reason: rejectionReason
      });

      toast.success('Receiving rejected and returned to warehouse staff');
      setSelectedRequest(null);
      setRejectionReason('');
      loadApprovalRequests();
    } catch (error) {
      console.error('Error rejecting receiving:', error);
      toast.error('Failed to reject receiving');
    }
  };

  const toggleItemExpansion = (itemId) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const getDiscrepancyStatus = (expected, received) => {
    const diff = received - expected;
    if (diff === 0) return { icon: CheckCircle, color: 'green', text: 'Match', value: 0 };
    if (diff > 0) return { icon: TrendingUp, color: 'blue', text: `+${diff} Over`, value: diff };
    return { icon: TrendingDown, color: 'red', text: `${diff} Short`, value: diff };
  };

  const filteredRequests = approvalRequests.filter(request => {
    const query = searchQuery.toLowerCase();
    return (
      request.shipment_number?.toLowerCase().includes(query) ||
      request.supplier?.name?.toLowerCase().includes(query) ||
      request.received_by?.full_name?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-slate-600">Loading approval requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-blue-600" />
            Receiving Approval
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Review and approve shipment receiving from warehouse staff
          </p>
        </div>

        <button
          onClick={loadApprovalRequests}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Pending Approval</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">
                {approvalRequests.length}
              </p>
            </div>
            <Clock className="w-12 h-12 text-blue-400 opacity-50" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Approved Today</p>
              <p className="text-3xl font-bold text-green-900 mt-1">0</p>
            </div>
            <ThumbsUp className="w-12 h-12 text-green-400 opacity-50" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6 border border-amber-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-600">With Discrepancies</p>
              <p className="text-3xl font-bold text-amber-900 mt-1">
                {approvalRequests.filter(r => r.has_discrepancies).length}
              </p>
            </div>
            <AlertTriangle className="w-12 h-12 text-amber-400 opacity-50" />
          </div>
        </motion.div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by shipment number, supplier, or receiver..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>

      {/* Approval Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <ClipboardCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600">No pending approval requests</p>
          <p className="text-sm text-slate-400 mt-1">
            All shipments have been processed
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => {
            const hasDiscrepancies = request.items?.some(
              item => item.expected_quantity !== item.received_quantity
            );

            return (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-xl shadow-md border-2 p-6 ${
                  hasDiscrepancies ? 'border-amber-300 bg-amber-50' : 'border-slate-200'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-slate-900">
                        {request.shipment_number}
                      </h3>
                      {hasDiscrepancies && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-200 text-amber-800 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Has Discrepancies
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Truck className="w-4 h-4" />
                        <span>Supplier: <strong>{request.supplier?.name || 'N/A'}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <User className="w-4 h-4" />
                        <span>Received by: <strong>{request.received_by?.full_name || 'N/A'}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-4 h-4" />
                        <span>Date: <strong>{new Date(request.received_at).toLocaleDateString()}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items Summary */}
                <div className="bg-slate-50 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Items ({request.items?.length || 0})
                  </h4>
                  
                  <div className="space-y-2">
                    {request.items?.slice(0, 3).map((item) => {
                      const status = getDiscrepancyStatus(
                        item.expected_quantity,
                        item.received_quantity
                      );
                      const StatusIcon = status.icon;

                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between bg-white rounded-lg p-3"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">
                              {item.product?.name || 'Unknown Product'}
                            </p>
                            <p className="text-sm text-slate-600">
                              Size: {item.product_size || 'N/A'}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm text-slate-600">Expected</p>
                              <p className="font-bold text-slate-900">{item.expected_quantity}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-slate-600">Received</p>
                              <p className="font-bold text-slate-900">{item.received_quantity}</p>
                            </div>
                            <div className={`flex items-center gap-1 text-${status.color}-600`}>
                              <StatusIcon className="w-4 h-4" />
                              <span className="text-sm font-semibold">{status.text}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {request.items?.length > 3 && (
                      <p className="text-sm text-slate-500 text-center py-2">
                        +{request.items.length - 3} more items
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handleViewDetails(request)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>

                  <button
                    onClick={() => handleRejectClick(request)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 hover:bg-red-50 text-red-700 font-medium transition-colors"
                  >
                    <ThumbsDown className="w-4 h-4" />
                    Reject
                  </button>

                  <button
                    onClick={() => handleApproveClick(request)}
                    className="flex items-center gap-2 px-6 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors ml-auto"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Approve & Set QC Deadline
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Approval Confirmation Modal */}
      <AnimatePresence>
        {showApprovalModal && selectedRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowApprovalModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <ThumbsUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Approve Receiving
                  </h3>
                  <p className="text-sm text-slate-600">
                    {selectedRequest.shipment_number}
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex gap-2">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">Next Step: QC Deadline</p>
                    <p>After approval, you'll set the QC inspection deadline for warehouse staff.</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Approval Notes (Optional)
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Add any notes about this approval..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmApproval}
                  className="flex-1 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors"
                >
                  Approve & Continue
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QC Deadline Selector Modal */}
      {showDeadlineModal && pendingApprovalRequest && (
        <QCDeadlineSelector 
          onSelect={handleDeadlineSelected}
          onCancel={() => {
            setShowDeadlineModal(false);
            setPendingApprovalRequest(null);
            // Refresh the list even if canceled
            loadApprovalRequests();
          }}
          defaultType="STANDARD"
        />
      )}
    </div>
  );
}
