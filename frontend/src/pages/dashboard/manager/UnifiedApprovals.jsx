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
  const [discrepancyHistory, setDiscrepancyHistory] = useState([]);
  const [showDiscrepancyHistory, setShowDiscrepancyHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

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
      const { data } = await api.get('/receiving/pending-approvals');
      setReceivingRequests(data.data || []);
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
      const { data } = await api.get('/receiving-qc/discrepancies/pending');
      setDiscrepancies(data.data || []);
    } catch (error) {
      console.error('Error loading discrepancy approvals:', error);
      setDiscrepancies([]);
    }
  };

  const loadDiscrepancyHistory = async () => {
    try {
      setHistoryLoading(true);
      const { data } = await api.get('/receiving-qc/discrepancies/history');
      setDiscrepancyHistory(data.data || []);
      setShowDiscrepancyHistory(true);
    } catch (error) {
      console.error('Error loading discrepancy history:', error);
      toast.error('Failed to load discrepancy history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleViewDetails = (request) => {
    setSelectedReceiving(request);
    setShowReceivingDetail(true);
  };

  const loadStats = async () => {
    try {
      const [receiving, qc, discrepancyResponse] = await Promise.all([
        api.get('/receiving/pending-approvals'),
        api.get('/receiving-qc/qc-inspection/completed/all'),
        api.get('/receiving-qc/discrepancies/pending').catch(() => ({ data: { data: [] } }))
      ]);
      const receivingCount = receiving.data?.data?.length || 0;
      const qcCount = qc.data?.data?.length || 0;
      const discrepancyCount = discrepancyResponse.data?.data?.length || 0;

      setStats({
        receivingPending: receivingCount,
        qcPending: qcCount,
        discrepanciesPending: discrepancyCount,
        totalPending: receivingCount + qcCount + discrepancyCount
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
      if (request.status !== 'APPROVED') {
        await api.post(`/receiving/approve/${request.id}`, {
          decision: 'APPROVED',
          decision_notes: approvalNotes
        });
      }

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
        shipment_id: pendingApprovalRequest.shipment_id,
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
      await api.post(`/receiving/approve/${request.id}`, {
        decision: 'REJECTED',
        decision_notes: reason
      });
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

  const handleReviewDiscrepancy = async (discrepancy, decision) => {
    try {
      await api.put(`/receiving-qc/discrepancies/${discrepancy.id}/approve`, {
        decision,
        resolution_action: decision === 'APPROVED' ? 'ADJUST_INVENTORY' : 'RETURN_TO_RECEIVING',
        notes: approvalNotes
      });

      toast.success(`Discrepancy ${decision === 'APPROVED' ? 'approved' : 'rejected'}!`);
      setApprovalNotes('');
      await loadAllApprovals();
    } catch (error) {
      console.error('Error reviewing discrepancy:', error);
      toast.error('Failed to review discrepancy');
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

  const tabStyles = {
    blue: 'from-blue-50 to-blue-100 border-blue-200 text-blue-600 text-blue-900 text-blue-400',
    green: 'from-green-50 to-green-100 border-green-200 text-green-600 text-green-900 text-green-400',
    amber: 'from-amber-50 to-amber-100 border-amber-200 text-amber-600 text-amber-900 text-amber-400'
  };

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
            className={`bg-gradient-to-br rounded-xl p-6 border cursor-pointer hover:shadow-lg transition-shadow ${tabStyles[tab.color].split(' ').slice(0, 3).join(' ')}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${tabStyles[tab.color].split(' ')[3]}`}>{tab.label}</p>
                <p className={`text-3xl font-bold ${tabStyles[tab.color].split(' ')[4]} mt-1`}>
                  {tab.count}
                </p>
              </div>
              <tab.icon className={`w-12 h-12 ${tabStyles[tab.color].split(' ')[5]} opacity-50`} />
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
                          
                          {request.needs_qc_setup ? (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 flex items-center gap-1">
                              <ClipboardCheck className="w-3 h-3" />
                              QC setup required
                            </span>
                          ) : request.has_discrepancies && (
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
                            {request.needs_qc_setup ? 'Set QC Deadline' : 'Approve & Set QC Deadline'}
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
                <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Discrepancy review trail</p>
                    <p className="text-xs text-slate-500">Find previously approved or rejected products and manager decisions.</p>
                  </div>
                  <button
                    onClick={loadDiscrepancyHistory}
                    disabled={historyLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
                  >
                    <FileCheck className="h-4 w-4" />
                    {historyLoading ? 'Loading history...' : 'View review history'}
                  </button>
                </div>

                {discrepancies.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertTriangle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600">No pending discrepancy approvals</p>
                  </div>
                ) : (
                  discrepancies
                    .filter(discrepancy => {
                      const searchableText = [
                        discrepancy.product_name,
                        discrepancy.product?.brand,
                        discrepancy.product?.model,
                        discrepancy.product?.sku,
                        discrepancy.product_size,
                        discrepancy.shipment_number,
                        discrepancy.shipment_id,
                        discrepancy.discrepancy_type,
                        discrepancy.reason,
                        discrepancy.reported_by_name
                      ].filter(Boolean).join(' ').toLowerCase();
                      return searchableText.includes(searchQuery.toLowerCase());
                    })
                    .map(discrepancy => {
                      const difference = discrepancy.difference ?? (
                        (discrepancy.expected_quantity || 0) - (discrepancy.received_quantity || 0)
                      );
                      const productName = discrepancy.product_name || [
                        discrepancy.product?.brand,
                        discrepancy.product?.model,
                        discrepancy.product?.dimensions
                      ].filter(Boolean).join(' ') || 'Unknown product';

                      return (
                        <div key={discrepancy.id} className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <Package className="w-5 h-5 shrink-0 text-amber-700" />
                                <p className="font-semibold text-slate-900">{productName}</p>
                              </div>
                              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                                <span>Shipment: {discrepancy.shipment_number || discrepancy.shipment_id}</span>
                                <span>Size: {discrepancy.product_size || 'N/A'}</span>
                                {(discrepancy.sku || discrepancy.product?.sku) && (
                                  <span>SKU: {discrepancy.sku || discrepancy.product.sku}</span>
                                )}
                              </div>
                            </div>
                            <span className="shrink-0 rounded-full bg-amber-200 px-2 py-1 text-xs font-bold text-amber-800">
                              {discrepancy.discrepancy_type || 'DISCREPANCY'}
                            </span>
                          </div>

                          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                            <div className="rounded bg-white p-2"><p className="text-xs text-slate-500">Expected</p><p className="font-bold">{discrepancy.expected_quantity}</p></div>
                            <div className="rounded bg-white p-2"><p className="text-xs text-slate-500">Received</p><p className="font-bold">{discrepancy.received_quantity}</p></div>
                            <div className="rounded bg-white p-2"><p className="text-xs text-slate-500">Difference</p><p className="font-bold text-amber-700">{Math.abs(difference)}</p></div>
                          </div>

                          <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                            <div className="rounded bg-white/70 p-2">
                              <span className="text-xs text-slate-500">Reported by</span>
                              <p className="font-medium text-slate-800">{discrepancy.reported_by_name || discrepancy.reported_by || 'N/A'}</p>
                            </div>
                            <div className="rounded bg-white/70 p-2">
                              <span className="text-xs text-slate-500">Reported at</span>
                              <p className="font-medium text-slate-800">
                                {discrepancy.reported_at ? new Date(discrepancy.reported_at).toLocaleString() : 'N/A'}
                              </p>
                            </div>
                          </div>

                          {(discrepancy.reason || discrepancy.financial_impact != null) && (
                            <div className="mt-3 border-t border-amber-200 pt-3 text-sm text-slate-700">
                              {discrepancy.reason && <p><span className="font-semibold">Reason:</span> {discrepancy.reason}</p>}
                              {discrepancy.financial_impact != null && (
                                <p className="mt-1"><span className="font-semibold">Financial impact:</span> {Number(discrepancy.financial_impact).toLocaleString()}</p>
                              )}
                            </div>
                          )}

                          <div className="mt-4 flex gap-3 border-t border-amber-200 pt-3">
                            <button
                              onClick={() => handleReviewDiscrepancy(discrepancy, 'REJECTED')}
                              className="flex-1 rounded-lg border border-red-300 px-4 py-2 font-medium text-red-700 transition-colors hover:bg-red-50"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleReviewDiscrepancy(discrepancy, 'APPROVED')}
                              className="flex-1 rounded-lg bg-green-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-green-700"
                            >
                              Approve
                            </button>
                          </div>
                        </div>
                      );
                    })
                )}

                {showDiscrepancyHistory && (
                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">Discrepancy history</h3>
                        <p className="text-xs text-slate-500">Approved and rejected records remain available for audit.</p>
                      </div>
                      <button
                        onClick={() => setShowDiscrepancyHistory(false)}
                        className="text-sm font-medium text-slate-500 hover:text-slate-900"
                      >
                        Hide
                      </button>
                    </div>

                    {discrepancyHistory.length === 0 ? (
                      <p className="py-6 text-center text-sm text-slate-500">No discrepancy history found.</p>
                    ) : (
                      <div className="space-y-3">
                        {discrepancyHistory.map(historyItem => {
                          const historyProduct = historyItem.product_name || [
                            historyItem.product?.brand,
                            historyItem.product?.model,
                            historyItem.product?.dimensions
                          ].filter(Boolean).join(' ') || 'Unknown product';
                          const isApproved = historyItem.manager_decision === 'APPROVED';

                          return (
                            <div key={historyItem.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className="font-semibold text-slate-900">{historyProduct}</p>
                                  <p className="text-sm text-slate-600">
                                    Shipment: {historyItem.shipment?.shipment_number || historyItem.shipment_number || historyItem.shipment_id} · Size: {historyItem.product_size || 'N/A'}
                                  </p>
                                </div>
                                <span className={`rounded-full px-2 py-1 text-xs font-bold ${isApproved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {historyItem.manager_decision || historyItem.status || 'PENDING'}
                                </span>
                              </div>
                              <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                                <div className="rounded bg-white p-2"><p className="text-slate-500">Expected</p><p className="font-bold">{historyItem.expected_quantity}</p></div>
                                <div className="rounded bg-white p-2"><p className="text-slate-500">Received</p><p className="font-bold">{historyItem.received_quantity}</p></div>
                                <div className="rounded bg-white p-2"><p className="text-slate-500">Difference</p><p className="font-bold">{Math.abs(historyItem.difference || 0)}</p></div>
                              </div>
                              <p className="mt-2 text-xs text-slate-500">
                                Reported by: {historyItem.reported_by || 'N/A'} · Reviewed by: {historyItem.manager_reviewed_by || 'N/A'} · {historyItem.manager_reviewed_at ? new Date(historyItem.manager_reviewed_at).toLocaleString() : 'Not reviewed'}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showReceivingDetail && selectedReceiving && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowReceivingDetail(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(event) => event.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between border-b border-slate-200 p-5">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900">Receiving Report</h2>
                    <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">Pending review</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{selectedReceiving.report_number} • Submitted {new Date(selectedReceiving.received_at).toLocaleString()}</p>
                </div>
                <button
                  onClick={() => setShowReceivingDetail(false)}
                  className="p-2 rounded-lg hover:bg-slate-100"
                  aria-label="Close receiving report"
                >
                  <XCircle className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className={`flex items-start gap-3 rounded-lg border p-3 ${selectedReceiving.total_discrepancy === 0 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                  {selectedReceiving.total_discrepancy === 0 ? <CheckCircle className="w-5 h-5 mt-0.5" /> : <AlertTriangle className="w-5 h-5 mt-0.5" />}
                  <div>
                    <p className="font-semibold">{selectedReceiving.total_discrepancy === 0 ? 'Counts match' : 'Discrepancy requires review'}</p>
                    <p className="text-sm mt-0.5">{selectedReceiving.total_discrepancy === 0 ? 'All expected items were received.' : `${Math.abs(selectedReceiving.total_discrepancy)} item${Math.abs(selectedReceiving.total_discrepancy) === 1 ? '' : 's'} ${selectedReceiving.total_discrepancy > 0 ? 'short' : 'over'}.`}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-slate-500">Shipment</p>
                    <p className="font-semibold text-slate-900">{selectedReceiving.shipment_number}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-slate-500">Submitted by</p>
                    <p className="font-semibold text-slate-900">{selectedReceiving.received_by?.full_name || 'N/A'}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-blue-600">Expected</p>
                    <p className="text-xl font-bold text-blue-900">{selectedReceiving.total_expected}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-green-600">Scanned</p>
                    <p className="text-xl font-bold text-green-900">{selectedReceiving.total_scanned}</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700">Overall receiving progress</span>
                    <span className="font-bold text-slate-900">{selectedReceiving.total_expected ? Math.round((selectedReceiving.total_scanned / selectedReceiving.total_expected) * 100) : 0}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, selectedReceiving.total_expected ? (selectedReceiving.total_scanned / selectedReceiving.total_expected) * 100 : 0)}%` }} />
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Items by Size</h3>
                  <div className="space-y-2">
                    {(selectedReceiving.items || []).map(item => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm">
                        <span className="font-medium text-slate-900">{item.product?.name || 'Unknown Product'} ({item.product_size || 'N/A'})</span>
                        <span className="text-slate-600">{item.received_quantity} / {item.expected_quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedReceiving.notes && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
                    <strong>Notes:</strong> {selectedReceiving.notes}
                  </div>
                )}

                <div className="flex gap-3 pt-2 border-t border-slate-200">
                  <button
                    onClick={() => { setShowReceivingDetail(false); handleRejectReceiving(selectedReceiving, 'Rejected by manager'); }}
                    className="flex-1 px-4 py-2 rounded-lg border border-red-300 hover:bg-red-50 text-red-700 font-medium"
                  >
                    Reject Report
                  </button>
                  <button
                    onClick={() => { setShowReceivingDetail(false); handleApproveReceiving(selectedReceiving); }}
                    className="flex-1 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold"
                  >
                    Approve & Set QC
                  </button>
                </div>
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
            loadAllApprovals();
          }}
          defaultType="STANDARD"
        />
      )}
    </div>
  );
}
