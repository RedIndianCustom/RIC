/**
 * ============================================================================
 * RECEIVING APPROVALS - MANAGER
 * ============================================================================
 * Manager interface to review and approve/reject receiving reports
 * - View pending receiving reports
 * - See detailed discrepancy breakdown
 * - Approve (creates QC batch) or Reject (returns to receiving)
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Package,
  Clock,
  User,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  ThumbsUp,
  ThumbsDown,
  RefreshCw
} from 'lucide-react';
import api from '../../../services/api.js';
import { toast } from '../../../utils/toast';

export default function ReceivingApprovals() {
  const [pendingReports, setPendingReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [decision, setDecision] = useState(null); // 'APPROVED' or 'REJECTED'
  const [decisionNotes, setDecisionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load pending approvals
  const loadPendingApprovals = async () => {
    try {
      setRefreshing(true);
      const { data } = await api.get('/receiving/pending-approvals');
      
      if (data.success) {
        setPendingReports(data.data || []);
      }
    } catch (error) {
      console.error('Error loading pending approvals:', error);
      toast.error('Failed to load pending approvals');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPendingApprovals();
  }, []);

  // Handle view report details
  const handleViewReport = (report) => {
    setSelectedReport(report);
    setShowApprovalModal(true);
    setDecision(null);
    setDecisionNotes('');
  };

  // Handle approve/reject
  const handleSubmitDecision = async () => {
    if (!decision) {
      toast.error('Please select Approve or Reject');
      return;
    }

    if (decision === 'REJECTED' && !decisionNotes.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setSubmitting(true);

      const { data } = await api.post(`/receiving/approve/${selectedReport.report_id}`, {
        decision: decision,
        decision_notes: decisionNotes.trim() || null
      });

      if (data.success) {
        if (decision === 'APPROVED') {
          toast.success(`Report approved! QC batch ${data.data.actions?.qc_batch_number} created`);
          toast.info('QC team has been notified');
        } else {
          toast.success('Report rejected. Warehouse staff has been notified to re-scan.');
        }

        // Close modal and reload
        setShowApprovalModal(false);
        setSelectedReport(null);
        loadPendingApprovals();
      }
    } catch (error) {
      console.error('Error submitting decision:', error);
      toast.error(error.response?.data?.error || 'Failed to submit decision');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-slate-600">Loading pending approvals...</p>
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
            <FileText className="w-6 h-6 text-blue-600" />
            Receiving Approvals
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Review and approve receiving reports from warehouse staff
          </p>
        </div>

        <button
          onClick={loadPendingApprovals}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-orange-50 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">Pending Approval</p>
              <p className="text-3xl font-bold text-orange-900 mt-1">{pendingReports.length}</p>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-red-50 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">With Discrepancies</p>
              <p className="text-3xl font-bold text-red-900 mt-1">
                {pendingReports.filter(r => r.total_discrepancy !== 0).length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-green-50 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">No Issues</p>
              <p className="text-3xl font-bold text-green-900 mt-1">
                {pendingReports.filter(r => r.total_discrepancy === 0).length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Pending Reports List */}
      {pendingReports.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <p className="text-slate-900 font-medium">All caught up!</p>
          <p className="text-sm text-slate-500 mt-1">
            No pending receiving reports at this time
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {pendingReports.map((report) => {
            const hasDiscrepancy = report.total_discrepancy !== 0;
            const isOver = report.total_discrepancy < 0;
            const isShort = report.total_discrepancy > 0;

            return (
              <motion.div
                key={report.report_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border-2 border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-bold text-slate-900">
                        {report.report_number}
                      </h3>
                      {hasDiscrepancy && (
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          isShort 
                            ? 'bg-orange-100 text-orange-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {isShort ? '⚠️ Short' : '🔴 Overage'}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500 text-xs mb-1">Shipment</p>
                        <p className="text-slate-900 font-semibold">{report.shipment_number}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs mb-1">Submitted By</p>
                        <p className="text-slate-900 font-medium">{report.submitted_by_name}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs mb-1">Submitted</p>
                        <p className="text-slate-900 font-medium">
                          {new Date(report.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs mb-1">Time Ago</p>
                        <p className="text-slate-900 font-medium">
                          {getTimeAgo(report.submitted_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-blue-50 text-center">
                    <p className="text-xs text-blue-600 mb-1">Expected</p>
                    <p className="text-xl font-bold text-blue-900">{report.total_expected}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-50 text-center">
                    <p className="text-xs text-green-600 mb-1">Scanned</p>
                    <p className="text-xl font-bold text-green-900">{report.total_scanned}</p>
                  </div>
                  <div className={`p-3 rounded-lg text-center ${
                    report.total_discrepancy === 0 
                      ? 'bg-emerald-50' 
                      : isShort 
                        ? 'bg-orange-50' 
                        : 'bg-red-50'
                  }`}>
                    <p className={`text-xs mb-1 ${
                      report.total_discrepancy === 0 
                        ? 'text-emerald-600' 
                        : isShort 
                          ? 'text-orange-600' 
                          : 'text-red-600'
                    }`}>
                      Discrepancy
                    </p>
                    <p className={`text-xl font-bold ${
                      report.total_discrepancy === 0 
                        ? 'text-emerald-900' 
                        : isShort 
                          ? 'text-orange-900' 
                          : 'text-red-900'
                    }`}>
                      {report.total_discrepancy === 0 
                        ? '✓ None' 
                        : Math.abs(report.total_discrepancy)}
                    </p>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handleViewReport(report)}
                  className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Eye className="w-5 h-5" />
                  Review & Decide
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Approval Modal */}
      <AnimatePresence>
        {showApprovalModal && selectedReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !submitting && setShowApprovalModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 z-10">
                <h2 className="text-xl font-bold text-slate-900">
                  Review Receiving Report
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  {selectedReport.report_number} - {selectedReport.shipment_number}
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Report Info */}
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500 mb-1">Submitted By</p>
                      <p className="font-semibold text-slate-900">{selectedReport.submitted_by_name}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Submitted At</p>
                      <p className="font-semibold text-slate-900">
                        {new Date(selectedReport.submitted_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {selectedReport.notes && (
                    <div className="mt-3 pt-3 border-t border-slate-300">
                      <p className="text-slate-500 text-xs mb-1">Notes</p>
                      <p className="text-sm text-slate-700">{selectedReport.notes}</p>
                    </div>
                  )}
                </div>

                {/* Size Breakdown Table */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">Size Breakdown</h3>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="text-left p-3 font-semibold">Size</th>
                          <th className="text-center p-3 font-semibold">Expected</th>
                          <th className="text-center p-3 font-semibold">Scanned</th>
                          <th className="text-center p-3 font-semibold">Discrepancy</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedReport.size_breakdown?.map((item, idx) => (
                          <tr key={idx} className="border-t border-slate-200">
                            <td className="p-3 font-medium">{item.size}</td>
                            <td className="p-3 text-center">{item.expected}</td>
                            <td className="p-3 text-center">{item.scanned}</td>
                            <td className="p-3 text-center">
                              <span className={`font-bold ${
                                item.discrepancy === 0 
                                  ? 'text-green-600' 
                                  : item.discrepancy > 0 
                                    ? 'text-orange-600' 
                                    : 'text-red-600'
                              }`}>
                                {item.discrepancy === 0 
                                  ? '✓' 
                                  : item.discrepancy > 0 
                                    ? `Short: ${item.discrepancy}` 
                                    : `Over: ${Math.abs(item.discrepancy)}`}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Decision Section */}
                {!decision ? (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-900">Make Decision</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setDecision('APPROVED')}
                        className="p-6 rounded-xl border-2 border-green-300 hover:border-green-500 bg-green-50 hover:bg-green-100 transition-all text-center group"
                      >
                        <ThumbsUp className="w-8 h-8 text-green-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                        <p className="font-bold text-green-900">Approve</p>
                        <p className="text-xs text-green-700 mt-1">Create QC batch</p>
                      </button>

                      <button
                        onClick={() => setDecision('REJECTED')}
                        className="p-6 rounded-xl border-2 border-red-300 hover:border-red-500 bg-red-50 hover:bg-red-100 transition-all text-center group"
                      >
                        <ThumbsDown className="w-8 h-8 text-red-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                        <p className="font-bold text-red-900">Reject</p>
                        <p className="text-xs text-red-700 mt-1">Return to receiving</p>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className={`p-4 rounded-lg ${
                      decision === 'APPROVED' 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      <p className="font-semibold text-slate-900 mb-1">
                        Decision: <span className={decision === 'APPROVED' ? 'text-green-700' : 'text-red-700'}>
                          {decision}
                        </span>
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {decision === 'APPROVED' ? 'Notes (Optional)' : 'Rejection Reason (Required)'}
                      </label>
                      <textarea
                        value={decisionNotes}
                        onChange={(e) => setDecisionNotes(e.target.value)}
                        rows={3}
                        placeholder={decision === 'APPROVED' 
                          ? 'Add any notes about this approval...' 
                          : 'Explain why this report is being rejected...'}
                        className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setDecision(null);
                          setDecisionNotes('');
                        }}
                        disabled={submitting}
                        className="flex-1 px-4 py-3 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold transition-colors disabled:opacity-50"
                      >
                        ← Change Decision
                      </button>
                      <button
                        onClick={handleSubmitDecision}
                        disabled={submitting}
                        className={`flex-1 px-4 py-3 rounded-lg text-white font-bold transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 ${
                          decision === 'APPROVED'
                            ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
                            : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                        }`}
                      >
                        {submitting ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            {decision === 'APPROVED' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                            Confirm {decision === 'APPROVED' ? 'Approval' : 'Rejection'}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper function to calculate time ago
function getTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}
