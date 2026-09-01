import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, CheckCircle, XCircle, Clock, FileText, 
  TrendingDown, TrendingUp, DollarSign, Package, ChevronDown,
  ChevronUp, Check, X, MessageSquare
} from 'lucide-react';
import api from '../../../services/api';

export default function DiscrepancyApproval() {
  const [discrepancies, setDiscrepancies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [reviewingId, setReviewingId] = useState(null);
  const [decision, setDecision] = useState('');
  const [resolutionAction, setResolutionAction] = useState('');
  const [managerNotes, setManagerNotes] = useState('');

  useEffect(() => {
    loadPendingDiscrepancies();
  }, []);

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  const loadPendingDiscrepancies = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/receiving-qc/discrepancies/pending');
      setDiscrepancies(data.data || []);
    } catch (error) {
      console.error('Error loading discrepancies:', error);
      setAlert({ type: 'error', message: 'Failed to load discrepancies' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (discrepancyId) => {
    if (!decision || !resolutionAction) {
      setAlert({ type: 'error', message: 'Please select decision and resolution action' });
      return;
    }

    try {
      setLoading(true);
      await api.put(`/receiving-qc/discrepancies/${discrepancyId}/approve`, {
        decision,
        resolution_action: resolutionAction,
        notes: managerNotes
      });

      setAlert({ 
        type: 'success', 
        message: `Discrepancy ${decision === 'APPROVED' ? 'approved' : 'rejected'} successfully` 
      });

      // Reset form
      setReviewingId(null);
      setDecision('');
      setResolutionAction('');
      setManagerNotes('');

      // Reload list
      await loadPendingDiscrepancies();
    } catch (error) {
      console.error('Error approving discrepancy:', error);
      setAlert({ type: 'error', message: error.response?.data?.error || 'Failed to process decision' });
    } finally {
      setLoading(false);
    }
  };

  const getDiscrepancyIcon = (type) => {
    switch (type) {
      case 'SHORT':
        return <TrendingDown className="w-5 h-5 text-red-600" />;
      case 'OVERAGE':
        return <TrendingUp className="w-5 h-5 text-yellow-600" />;
      case 'DAMAGED':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'WRONG_ITEM':
        return <XCircle className="w-5 h-5 text-purple-600" />;
      case 'MISSING':
        return <Package className="w-5 h-5 text-red-700" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getDiscrepancyColor = (type) => {
    switch (type) {
      case 'SHORT':
        return 'red';
      case 'OVERAGE':
        return 'yellow';
      case 'DAMAGED':
        return 'orange';
      case 'WRONG_ITEM':
        return 'purple';
      case 'MISSING':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getTotalFinancialImpact = () => {
    return discrepancies.reduce((sum, d) => sum + (d.financial_impact || 0), 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
            Discrepancy Approval
          </h2>
          <p className="text-gray-600 mt-1">Review and approve receiving discrepancies</p>
        </div>

        {discrepancies.length > 0 && (
          <div className="text-right">
            <p className="text-sm text-gray-600">Total Financial Impact</p>
            <p className="text-2xl font-bold text-red-600">
              ₱{getTotalFinancialImpact().toLocaleString()}
            </p>
          </div>
        )}
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

      {/* Summary Cards */}
      {discrepancies.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{discrepancies.length}</p>
              </div>
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-red-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Shortages</p>
                <p className="text-2xl font-bold text-red-600">
                  {discrepancies.filter(d => d.discrepancy_type === 'SHORT').length}
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-400" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-yellow-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overages</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {discrepancies.filter(d => d.discrepancy_type === 'OVERAGE').length}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-yellow-400" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-orange-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Damaged</p>
                <p className="text-2xl font-bold text-orange-600">
                  {discrepancies.filter(d => d.discrepancy_type === 'DAMAGED').length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-400" />
            </div>
          </div>
        </div>
      )}

      {/* Discrepancies List */}
      <div className="space-y-4">
        {loading && discrepancies.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4">Loading discrepancies...</p>
          </div>
        ) : discrepancies.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-md border border-gray-200">
            <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p>No pending discrepancies to review</p>
          </div>
        ) : (
          discrepancies.map((discrepancy) => {
            const color = getDiscrepancyColor(discrepancy.discrepancy_type);
            const isExpanded = expandedId === discrepancy.id;
            const isReviewing = reviewingId === discrepancy.id;

            return (
              <motion.div
                key={discrepancy.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-xl shadow-md border-2 border-${color}-200 overflow-hidden`}
              >
                {/* Header */}
                <div
                  className={`bg-${color}-50 p-6 cursor-pointer`}
                  onClick={() => setExpandedId(isExpanded ? null : discrepancy.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 bg-${color}-100 rounded-lg`}>
                        {getDiscrepancyIcon(discrepancy.discrepancy_type)}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {discrepancy.shipment_number}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium bg-${color}-200 text-${color}-800`}>
                            {discrepancy.discrepancy_type}
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Product:</span>
                            <span className="ml-2 font-medium text-gray-900">
                              {discrepancy.product_name}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Size:</span>
                            <span className="ml-2 font-medium text-gray-900">
                              {discrepancy.product_size}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Difference:</span>
                            <span className={`ml-2 font-bold ${
                              discrepancy.difference > 0 ? 'text-yellow-700' : 'text-red-700'
                            }`}>
                              {discrepancy.difference > 0 ? '+' : ''}{discrepancy.difference}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Impact:</span>
                            <span className="ml-2 font-bold text-red-600">
                              ₱{(discrepancy.financial_impact || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {!isReviewing && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setReviewingId(discrepancy.id);
                            setExpandedId(discrepancy.id);
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Review
                        </motion.button>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-6 h-6 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-6 h-6 text-gray-400" />
                      )}
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
                      <div className="p-6 space-y-6">
                        {/* Details */}
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3">Quantities</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Expected:</span>
                                <span className="font-medium">{discrepancy.expected_quantity}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Received:</span>
                                <span className="font-medium">{discrepancy.received_quantity}</span>
                              </div>
                              <div className="flex justify-between border-t pt-2">
                                <span className="text-gray-600">Difference:</span>
                                <span className={`font-bold ${
                                  discrepancy.difference > 0 ? 'text-yellow-700' : 'text-red-700'
                                }`}>
                                  {discrepancy.difference > 0 ? '+' : ''}{discrepancy.difference}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3">Financial Impact</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Unit Price:</span>
                                <span className="font-medium">₱{(discrepancy.unit_price || 0).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Quantity Diff:</span>
                                <span className="font-medium">{Math.abs(discrepancy.difference)}</span>
                              </div>
                              <div className="flex justify-between border-t pt-2">
                                <span className="text-gray-600">Total Impact:</span>
                                <span className="font-bold text-red-600">
                                  ₱{(discrepancy.financial_impact || 0).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {discrepancy.reason && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Reported Reason</h4>
                            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                              {discrepancy.reason}
                            </p>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Reported By:</span>
                            <span className="ml-2 font-medium">{discrepancy.reported_by_name}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Reported At:</span>
                            <span className="ml-2 font-medium">
                              {new Date(discrepancy.reported_at).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Review Form */}
                        {isReviewing && (
                          <div className="border-t pt-6 space-y-4">
                            <h4 className="font-semibold text-gray-900">Manager Decision</h4>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Decision *
                                </label>
                                <select
                                  value={decision}
                                  onChange={(e) => setDecision(e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                  <option value="">Select Decision</option>
                                  <option value="APPROVED">Approve</option>
                                  <option value="REJECTED">Reject</option>
                                  <option value="REQUIRES_MORE_INFO">Requires More Info</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Resolution Action *
                                </label>
                                <select
                                  value={resolutionAction}
                                  onChange={(e) => setResolutionAction(e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                  <option value="">Select Action</option>
                                  {discrepancy.discrepancy_type === 'SHORT' && (
                                    <>
                                      <option value="ACCEPT_SHORTAGE">Accept Shortage</option>
                                      <option value="CLAIM">File Claim with Supplier</option>
                                      <option value="REORDER">Reorder from Supplier</option>
                                    </>
                                  )}
                                  {discrepancy.discrepancy_type === 'OVERAGE' && (
                                    <>
                                      <option value="ACCEPT_OVERAGE">Accept Overage</option>
                                      <option value="RETURN">Return to Supplier</option>
                                    </>
                                  )}
                                  {discrepancy.discrepancy_type === 'DAMAGED' && (
                                    <>
                                      <option value="CLAIM">File Damage Claim</option>
                                      <option value="RETURN">Return to Supplier</option>
                                      <option value="DISPOSE">Dispose</option>
                                    </>
                                  )}
                                  {discrepancy.discrepancy_type === 'WRONG_ITEM' && (
                                    <>
                                      <option value="RETURN">Return to Supplier</option>
                                      <option value="EXCHANGE">Exchange</option>
                                    </>
                                  )}
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Manager Notes
                              </label>
                              <textarea
                                value={managerNotes}
                                onChange={(e) => setManagerNotes(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Add your notes and justification..."
                              />
                            </div>

                            <div className="flex justify-end gap-3">
                              <button
                                onClick={() => {
                                  setReviewingId(null);
                                  setDecision('');
                                  setResolutionAction('');
                                  setManagerNotes('');
                                }}
                                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                Cancel
                              </button>
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleApprove(discrepancy.id)}
                                disabled={loading || !decision || !resolutionAction}
                                className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                              >
                                <Check className="w-4 h-4" />
                                Submit Decision
                              </motion.button>
                            </div>
                          </div>
                        )}
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
