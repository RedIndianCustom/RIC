/**
 * ============================================================================
 * UNIFIED APPROVALS - OPERATIONAL MANAGER
 * ============================================================================
 * Single page for all manager approvals:
 * - Receiving Approvals (with QC deadline setting)
 * - QC Inspection Approvals
 * - Discrepancy Approvals
 * - Other Approval Requests
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
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ThumbsUp,
  ThumbsDown,
  Info,
  Filter,
  FileCheck,
  PackageCheck,
  Target
} from 'lucide-react';
import api from '../../../services/api';
import { toast } from '../../../utils/toast';
import QCDeadlineSelector from '../../../components/qc/QCDeadlineSelector';
import QCDeadlineIndicator from '../../../components/qc/QCDeadlineIndicator';

export default function UnifiedApprovals() {
  const [activeTab, setActiveTab] = useState('receiving'); // receiving, qc-inspection, discrepancies
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Receiving Approvals
  const [receivingRequests, setReceivingRequests] = useState([]);
  const [selectedReceiving, setSelectedReceiving] = useState(null);
  const [showReceivingDetail, setShowReceivingDetail] = useState(false);
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [pendingApprovalRequest, setPendingApprovalRequest] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState('');

  // QC Inspection Approvals
  const [qcInspections, setQcInspections] = useState([]);
  const [selectedQC, setSelectedQC] = useState(null);
  const [showQCDetail, setShowQCDetail] = useState(false);

  // Discrepancy Approvals
  const [discrepancies, setDiscrepancies] = useState([]);

  // Stats
  const [stats, setStats] = useState({
    receivingPending: 0,
    qcPending: 0,
    discrepanciesPending: 0,
    totalPending: 0
  });

  useEffect(() => {
    loadAllApprovals();
  }, [activeTab]);

  const loadAllApprovals = async () => {
    try {
      setRefreshing(true);
      
      // Load based on active tab
      if (activeTab === 'receiving') {
        await loadReceivingApprovals();
      } else if (activeTab === 'qc-inspection') {
        await loadQCApprovals();
      } else if (activeTab === 'discrepancies') {
        await loadDiscrepancyApprovals();
      }

      // Load stats for all tabs
      await loadStats();
    } catch (error) {
      console.error('Error loading approvals:', error);
      toast.error('Failed to load approvals');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadReceivingApprovals = async () => {
    try {
      // TODO: Implement receiving approval endpoint when ready
      // For now, just set empty array to prevent errors
      setReceivingRequests([]);
      // const { data } = await api.get('/receiving-qc/receiving-reports/pending');
      // setReceivingRequests(data.reports || []);
    } catch (error) {
      console.error('Error loading receiving approvals:', error);
      setReceivingRequests([]);
    }
  };

  const loadQCApprovals = async () => {
    try {
      const { data } = await api.get('/receiving-qc/qc-inspection/completed/all');
      setQcInspections(data.data || []);
    } catch (error) {
      console.error('Error loading QC approvals:', error);
    }
  };

  const loadDiscrepancyApprovals = async () => {
    try {
      // TODO: Implement discrepancy approval endpoint when ready
      // For now, just set empty array to prevent errors
      setDiscrepancies([]);
      // const { data } = await api.get('/discrepancies/pending');
      // setDiscrepancies(data.discrepancies || []);
    } catch (error) {
      console.error('Error loading discrepancy approvals:', error);
      setDiscrepancies([]);
    }
  };

  const loadStats = async () => {
    try {
      // Only load QC stats for now (the only working endpoint)
      const qc = await api.get('/receiving-qc/qc-inspection/completed/all');
      const qcCount = qc.data?.data?.length || 0;

      setStats({
        receivingPending: 0, // TODO: Implement when endpoint ready
        qcPending: qcCount,
        discrepanciesPending: 0, // TODO: Implement when endpoint ready
        totalPending: qcCount
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats({
        receivingPending: 0,
        qcPending: 0,
        discrepanciesPending: 0,
        totalPending: 0
      });
    }
  };

  // ============================================================================
  // RECEIVING APPROVAL HANDLERS
  // ============================================================================

  const handleApproveReceiving = async (request) => {
    try {
      // Approve receiving
      await api.post('/receiving-qc/receiving/complete', {
        shipment_id: request.id,
        notes: approvalNotes
      });

      toast.success('Receiving approved!');
      setApprovalNotes('');

      // Show deadline selector
      setPendingApprovalRequest(request);
      setShowDeadlineModal(true);

    } catch (error) {
      console.error('Error approving receiving:', error);
      toast.error('Failed to approve receiving');
    }
  };

  const handleDeadlineSelected = async (deadlineConfig) => {
    try {
      // Create QC inspection with deadline
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
        loadAllApprovals();
      }
    } catch (error) {
      console.error('Error creating QC inspection:', error);
      toast.error('Failed to create QC inspection');
    }
  };

  const handleRejectReceiving = async (request, reason) => {
    try {
      await api.post(`/warehouse/receiving/${request.id}/reject`, { reason });
      toast.success('Receiving rejected');
      loadAllApprovals();
    } catch (error) {
      console.error('Error rejecting receiving:', error);
      toast.error('Failed to reject receiving');
    }
  };

  // ============================================================================
  // QC APPROVAL HANDLERS
  // ============================================================================

  const handleApproveQC = async (inspection, decision) => {
    try {
      await api.put(`/receiving-qc/qc-inspection/${inspection.id}/approve`, {
        decision,
        notes: approvalNotes
      });

      toast.success(`QC inspection ${decision.toLowerCase()}!`);
      setApprovalNotes('');
      loadAllApprovals();
    } catch (error) {
      console.error('Error approving QC:', error);
      toast.error('Failed to approve QC inspection');
    }
  };

  // ============================================================================
  // TABS CONFIGURATION
  // ============================================================================

  const tabs = [
    {
      id: 'receiving',
      label: 'Receiving Approval',
      icon: PackageCheck,
      count: stats.receivingPending,
      color: 'blue'
    },
    {
      id: 'qc-inspection',
      label: 'QC Inspection',
      icon: ClipboardCheck,
      count: stats.qcPending,
      color: 'green'
    },
    {
      id: 'discrepancies',
      label: 'Discrepancies',
      icon: AlertTriangle,
      count: stats.discrepanciesPending,
      color: 'amber'
    }
  ];

  const getDiscrepancyStatus = (expected, received) => {
    const diff = received - expected;
    if (diff === 0) return { icon: CheckCircle, color: 'green', text: 'Match' };
    if (diff > 0) return { icon: TrendingUp, color: 'blue', text: `+${diff} Over` };
    return { icon: TrendingDown, color: 'red', text: `${diff} Short` };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-slate-600">Loading approvals...</p>
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
            Approvals Center
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Review and approve operations across your warehouse
          </p>
        </div>

        <button
          onClick={loadAllApprovals}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Total Pending</p>
              <p className="text-3xl font-bold text-purple-900 mt-1">
                {stats.totalPending}
              </p>
            </div>
            <Target className="w-12 h-12 text-purple-400 opacity-50" />
          </div>
        </motion.div>

        {tabs.map((tab, index) => (
          <motion.div
            key={tab.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`bg-gradient-to-br from-${tab.color}-50 to-${tab.color}-100 rounded-xl p-6 border border-${tab.color}-200 cursor-pointer hover:shadow-lg transition-shadow`}
            onClick={() => setActiveTab(tab.id)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium text-${tab.color}-600`}>{tab.label}</p>
                <p className={`text-3xl font-bold text-${tab.color}-900 mt-1`}>
                  {tab.count}
                </p>
              </div>
              <tab.icon className={`w-12 h-12 text-${tab.color}-400 opacity-50`} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors relative ${
                    activeTab === tab.id
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs font-bold rounded-full bg-red-500 text-white">
                      {tab.count}
                    </span>
                  )}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${tabs.find(t => t.id === activeTab)?.label.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* RECEIVING APPROVALS TAB */}
            {activeTab === 'receiving' && (
              <motion.div
                key="receiving"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {receivingRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <PackageCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600">No pending receiving approvals</p>
                  </div>
                ) : (
                  receivingRequests
                    .filter(req =>
                      req.shipment_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      req.supplier?.name?.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((request) => (
                      <div
                        key={request.id}
                        className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-slate-900">
                              {request.shipment_number}
                            </h3>
                            <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                              <span className="flex items-center gap-1">
                                <Truck className="w-4 h-4" />
                                {request.supplier?.name || 'N/A'}
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {request.received_by?.full_name || 'N/A'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(request.received_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          
                          {request.has_discrepancies && (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-200 text-amber-800 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Has Discrepancies
                            </span>
                          )}
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => handleViewDetails(request)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            View Details
                          </button>

                          <button
                            onClick={() => handleRejectReceiving(request, 'Rejected by manager')}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 hover:bg-red-50 text-red-700 font-medium transition-colors"
                          >
                            <ThumbsDown className="w-4 h-4" />
                            Reject
                          </button>

                          <button
                            onClick={() => handleApproveReceiving(request)}
                            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors ml-auto"
                          >
                            <ThumbsUp className="w-4 h-4" />
                            Approve & Set QC Deadline
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </motion.div>
            )}

            {/* QC INSPECTION APPROVALS TAB */}
            {activeTab === 'qc-inspection' && (
              <motion.div
                key="qc"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {qcInspections.filter(i => !i.manager_decision || i.manager_decision === 'PENDING').length === 0 ? (
                  <div className="text-center py-12">
                    <ClipboardCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600">No pending QC approvals</p>
                  </div>
                ) : (
                  qcInspections
                    .filter(i => !i.manager_decision || i.manager_decision === 'PENDING')
                    .map((inspection) => (
                      <div
                        key={inspection.id}
                        className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-slate-900">
                              {inspection.inspection_number}
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">
                              Shipment: {inspection.shipment_number}
                            </p>

                            {/* Deadline Info */}
                            <div className="mt-3">
                              <QCDeadlineIndicator 
                                hasDeadline={inspection.has_deadline}
                                deadlineType={inspection.deadline_type}
                                dueDate={inspection.due_date}
                                urgencyLevel={inspection.urgency_level}
                                daysRemaining={inspection.days_remaining}
                                deadlineReason={inspection.deadline_reason}
                                showReason={true}
                                compact={false}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Quality Stats */}
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          <div className="bg-green-50 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-green-900">
                              {inspection.good_quality_count}
                            </p>
                            <p className="text-xs text-green-600">Good Quality</p>
                          </div>
                          <div className="bg-amber-50 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-amber-900">
                              {inspection.minor_defect_count}
                            </p>
                            <p className="text-xs text-amber-600">Minor Defects</p>
                          </div>
                          <div className="bg-red-50 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-red-900">
                              {inspection.major_defect_count}
                            </p>
                            <p className="text-xs text-red-600">Major Defects</p>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => handleApproveQC(inspection, 'REJECTED')}
                            className="flex-1 px-4 py-2 rounded-lg border border-red-300 hover:bg-red-50 text-red-700 font-medium transition-colors"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleApproveQC(inspection, 'APPROVED')}
                            className="flex-1 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors"
                          >
                            Approve
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </motion.div>
            )}

            {/* DISCREPANCIES TAB */}
            {activeTab === 'discrepancies' && (
              <motion.div
                key="discrepancies"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {discrepancies.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertTriangle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600">No pending discrepancy approvals</p>
                  </div>
                ) : (
                  <p className="text-slate-600">Discrepancy approvals coming soon...</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* QC Deadline Selector Modal */}
      {showDeadlineModal && pendingApprovalRequest && (
        <QCDeadlineSelector 
          onSelect={handleDeadlineSelected}
          onCancel={() => {
            setShowDeadlineModal(false);
            setPendingApprovalRequest(null);
            loadAllApprovals();
          }}
          defaultType="STANDARD"
        />
      )}
    </div>
  );
}
