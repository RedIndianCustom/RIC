import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, XCircle, Clock, AlertCircle, User, Package,
  FileText, TrendingUp, Search, Filter, RefreshCw, Eye
} from 'lucide-react';
import api from '../../../services/api';
import Button from '../../../components/common/Button';
import Loading from '../../../components/common/Loading';
import EmptyState from '../../../components/common/EmptyState';
import Modal from '../../../components/common/Modal';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function ApprovalRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  useEffect(() => {
    loadApprovalRequests();
  }, [statusFilter]);

  const loadApprovalRequests = async () => {
    try {
      setLoading(true);
      setError('');

      // Load receiving reports pending approval
      const { data } = await api.get('/receiving/pending-approvals');
      
      console.log('📥 Received response:', data);
      
      if (data.success) {
        // Transform to match UI format
        const transformed = (data.data || []).map(report => ({
          id: report.report_id,
          type: 'receiving_report',
          title: `Receiving Report ${report.report_number}`,
          description: `Shipment ${report.shipment_number} - ${report.total_scanned} items received with ${Math.abs(report.total_discrepancy)} ${report.total_discrepancy === 0 ? 'no discrepancies' : report.total_discrepancy > 0 ? 'short' : 'over'}`,
          requestedBy: report.submitted_by_name,
          createdAt: new Date(report.submitted_at).toLocaleString(),
          status: 'pending',
          details: report
        }));
        
        setRequests(transformed);
        console.log('✅ Loaded', transformed.length, 'pending receiving reports');
      }

    } catch (err) {
      console.error('❌ Error loading approval requests:', err);
      setError('Failed to load approval requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    try {
      setError('');
      setLoading(true);
      
      console.log('📝 Approving report:', requestId);
      
      // Call the actual backend API
      const { data } = await api.post(`/receiving/approve/${requestId}`, {
        decision: 'APPROVED',
        decision_notes: 'Approved by manager'
      });
      
      console.log('✅ Approval response:', data);
      
      if (data.success) {
        setSuccess('Request approved successfully! QC inspection has been created.');
        await loadApprovalRequests();
        setIsDetailModalOpen(false);
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(data.error || 'Failed to approve request');
      }
    } catch (err) {
      console.error('❌ Approval error:', err);
      setError(err.message || 'Failed to approve request');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (requestId, reason) => {
    try {
      setError('');
      setLoading(true);
      
      console.log('❌ Rejecting report:', requestId);
      
      // Call the actual backend API
      const { data } = await api.post(`/receiving/approve/${requestId}`, {
        decision: 'REJECTED',
        decision_notes: reason || 'Rejected by manager'
      });
      
      console.log('✅ Rejection response:', data);
      
      if (data.success) {
        setSuccess('Request rejected. Warehouse staff has been notified.');
        await loadApprovalRequests();
        setIsDetailModalOpen(false);
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(data.error || 'Failed to reject request');
      }
    } catch (err) {
      console.error('❌ Rejection error:', err);
      setError(err.message || 'Failed to reject request');
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          req.requestedBy?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    total: requests.length
  };

  if (loading) {
    return <Loading message="Loading approval requests..." />;
  }

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
          <h1 className="text-2xl font-bold text-slate-900">Approval Requests</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review and approve pending requests across the workflow
          </p>
        </div>
        <Button onClick={loadApprovalRequests} className="bg-white border border-slate-200">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <p className="text-green-800 text-sm">{success}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending</p>
              <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Approved</p>
              <p className="text-2xl font-bold text-slate-900">{stats.approved}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Rejected</p>
              <p className="text-2xl font-bold text-slate-900">{stats.rejected}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-xl border border-slate-200">
        {filteredRequests.length === 0 ? (
          <EmptyState
            title="No approval requests"
            description="There are no pending requests at this time. Requests from staff will appear here."
            icon={FileText}
          />
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredRequests.map((request) => (
              <div
                key={request.id}
                className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedRequest(request);
                  setIsDetailModalOpen(true);
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-slate-900">{request.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        request.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        request.status === 'approved' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {request.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{request.description}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {request.requestedBy}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {request.createdAt}
                      </span>
                    </div>
                  </div>
                  <Button className="bg-blue-600 text-white hover:bg-blue-700">
                    <Eye className="w-4 h-4" />
                    Review
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setShowRejectDialog(false);
          setRejectionReason('');
        }}
        title="Request Details"
      >
        {selectedRequest && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">{selectedRequest.title}</h3>
              <p className="text-sm text-slate-600">{selectedRequest.description}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Requested by:</span>
                <p className="font-medium">{selectedRequest.requestedBy}</p>
              </div>
              <div>
                <span className="text-slate-500">Date:</span>
                <p className="font-medium">{selectedRequest.createdAt}</p>
              </div>
            </div>

            {/* Size Breakdown */}
            {selectedRequest.details?.size_breakdown && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-slate-900 mb-2">Size Breakdown:</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-slate-700">Size</th>
                        <th className="px-3 py-2 text-right font-medium text-slate-700">Expected</th>
                        <th className="px-3 py-2 text-right font-medium text-slate-700">Scanned</th>
                        <th className="px-3 py-2 text-right font-medium text-slate-700">Difference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedRequest.details.size_breakdown.map((item, idx) => (
                        <tr key={idx} className={item.discrepancy !== 0 ? 'bg-amber-50' : ''}>
                          <td className="px-3 py-2 font-medium">{item.size}</td>
                          <td className="px-3 py-2 text-right">{item.expected}</td>
                          <td className="px-3 py-2 text-right">{item.scanned}</td>
                          <td className={`px-3 py-2 text-right font-medium ${
                            item.discrepancy > 0 ? 'text-red-600' : 
                            item.discrepancy < 0 ? 'text-green-600' : 
                            'text-slate-600'
                          }`}>
                            {item.discrepancy > 0 ? `-${item.discrepancy}` : 
                             item.discrepancy < 0 ? `+${Math.abs(item.discrepancy)}` : 
                             '0'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedRequest.details?.notes && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-slate-900 mb-1">Notes:</h4>
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded">{selectedRequest.details.notes}</p>
              </div>
            )}

            {/* Rejection Reason Input */}
            {showRejectDialog && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Rejection Reason (required):
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            )}

            {selectedRequest.status === 'pending' && (
              <div className="flex gap-3 pt-4">
                {!showRejectDialog ? (
                  <>
                    <Button
                      onClick={() => setShowRejectDialog(true)}
                      className="flex-1 bg-red-600 text-white hover:bg-red-700"
                      disabled={loading}
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => handleApprove(selectedRequest.id)}
                      className="flex-1 bg-green-600 text-white hover:bg-green-700"
                      disabled={loading}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {loading ? 'Processing...' : 'Approve'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => {
                        setShowRejectDialog(false);
                        setRejectionReason('');
                      }}
                      className="flex-1 bg-slate-200 text-slate-700 hover:bg-slate-300"
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        if (!rejectionReason.trim()) {
                          setError('Please provide a rejection reason');
                          return;
                        }
                        handleReject(selectedRequest.id, rejectionReason);
                      }}
                      className="flex-1 bg-red-600 text-white hover:bg-red-700"
                      disabled={loading || !rejectionReason.trim()}
                    >
                      <XCircle className="w-4 h-4" />
                      {loading ? 'Processing...' : 'Confirm Rejection'}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
