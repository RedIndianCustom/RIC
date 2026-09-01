import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Warehouse, Truck, Barcode, Activity, RefreshCw, CheckCircle,
  Clock, AlertTriangle, PackageCheck, PackageOpen, Boxes, ScanBarcode,
  ClipboardList, ArrowRight, ChevronRight, MapPin, Navigation, Layers,
  Target, ShoppingCart, PackageSearch, TrendingUp, FileText, ListChecks,
  Bell, Zap, ShieldCheck, Search, QrCode, Archive, Settings
} from 'lucide-react';
import api from '../../../services/api.js';

// Motion variants
const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

export default function WarehouseDashboardView({ name = 'Warehouse Staff' }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState({
    pendingReceiving: 0,
    itemsToPick: 0,
    itemsToPack: 0,
    inspectionQueue: 0,
    defectiveToday: 0,
    tasksCompleted: 0,
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [quickActionModal, setQuickActionModal] = useState(false);
  const [actionType, setActionType] = useState('');
  const [actionSubmitted, setActionSubmitted] = useState(false);

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      setRefreshing(true);
      const { data } = await api.get('/dashboard/warehouse');
      
      if (data?.kpis) {
        setMetrics({
          pendingReceiving: data.kpis.pendingReceiving ?? 0,
          itemsToPick: data.kpis.itemsToPick ?? 0,
          itemsToPack: data.kpis.itemsToPack ?? 0,
          inspectionQueue: data.kpis.inspectionQueue ?? 0,
          defectiveToday: data.kpis.defectiveToday ?? 0,
          tasksCompleted: data.kpis.tasksCompleted ?? 0,
        });
      }

      if (data?.recentActivity) {
        setRecentActivity(data.recentActivity);
      }
    } catch (error) {
      console.warn('Warehouse dashboard API notice:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleQuickAction = (type) => {
    setActionType(type);
    setQuickActionModal(true);
  };

  const handleActionSubmit = (e) => {
    e.preventDefault();
    setActionSubmitted(true);
    setTimeout(() => {
      setActionSubmitted(false);
      setQuickActionModal(false);
      setActionType('');
    }, 1500);
  };

  return (
    <div className="space-y-7">
      {/* ── Executive Hero Banner ─────────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-950 via-orange-900 to-amber-900 p-6 sm:p-8 text-white shadow-xl border border-orange-800"
      >
        <div className="absolute right-0 top-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-12 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-orange-200 border border-white/15 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Warehouse Floor Control • Operations Active
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Welcome back, {name}
              <Warehouse className="w-6 h-6 text-orange-400" />
            </h1>
            <p className="text-orange-200 text-sm max-w-2xl leading-relaxed">
              Physical warehouse operations terminal. Dock receiving, inspection queue management, picking/packing tasks, inventory scanning, and storage location tracking.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={loadDashboardData}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all backdrop-blur-md border border-white/10 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Syncing...' : 'Refresh Data'}
            </button>

            <button
              onClick={() => handleQuickAction('scan')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-sm font-semibold shadow-lg shadow-orange-500/25 transition-all active:scale-95"
            >
              <ScanBarcode className="w-4 h-4" />
              Quick Scan
            </button>

            <Link
              to="/warehouse/tasks"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-800 hover:bg-orange-700 text-orange-200 text-sm font-medium transition-all border border-orange-700 active:scale-95"
            >
              <ListChecks className="w-4 h-4 text-amber-400" />
              My Tasks
            </Link>
          </div>
        </div>

        {/* Real-time Status Bar */}
        <div className="relative z-10 mt-6 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-900/80 border border-orange-700/60 backdrop-blur-md shadow-sm">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-300 shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-orange-300">Dock Status</p>
              <p className="text-xs font-semibold text-blue-300 flex items-center gap-1.5 mt-0.5 truncate">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-300 shrink-0" />
                {metrics.pendingReceiving} at dock
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-900/80 border border-orange-700/60 backdrop-blur-md shadow-sm">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-orange-300">Inspection Queue</p>
              <p className="text-xs font-semibold text-orange-100 mt-0.5 truncate">{metrics.inspectionQueue} items</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-900/80 border border-orange-700/60 backdrop-blur-md shadow-sm">
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300 shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-orange-300">Active Tasks</p>
              <p className="text-xs font-semibold text-purple-300 mt-0.5 truncate">{metrics.itemsToPick + metrics.itemsToPack} pending</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-900/80 border border-orange-700/60 backdrop-blur-md shadow-sm">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 shrink-0">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-orange-300">My Tasks Today</p>
              <p className="text-xs font-bold text-emerald-300 mt-0.5 truncate">{metrics.tasksCompleted} completed</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Core Floor Operations KPIs ─────────────────────────────── */}
      <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Pending Receiving */}
        <motion.div variants={fadeUp} className="group relative rounded-2xl bg-white p-5 shadow-sm border border-slate-200/80 hover:shadow-md transition-all hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Dock Receiving</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{metrics.pendingReceiving}</span>
            <span className="text-xs font-medium text-slate-500">At dock</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
            <span className="text-blue-600 font-medium">Awaiting intake</span>
            <Link to="/warehouse/receiving" className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-0.5">
              Receive <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.div>

        {/* Items to Pick */}
        <motion.div variants={fadeUp} className="group relative rounded-2xl bg-white p-5 shadow-sm border border-slate-200/80 hover:shadow-md transition-all hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Picking Queue</span>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 group-hover:scale-110 transition-transform">
              <PackageSearch className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{metrics.itemsToPick}</span>
            <span className="text-xs font-medium text-slate-500">Items</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
            <span className="text-purple-600 font-medium">Ready to pick</span>
            <Link to="/warehouse/picking" className="text-purple-600 hover:text-purple-700 font-medium inline-flex items-center gap-0.5">
              Start <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.div>

        {/* Items to Pack */}
        <motion.div variants={fadeUp} className="group relative rounded-2xl bg-white p-5 shadow-sm border border-slate-200/80 hover:shadow-md transition-all hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Packing Queue</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform">
              <PackageCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{metrics.itemsToPack}</span>
            <span className="text-xs font-medium text-slate-500">Items</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
            <span className="text-amber-600 font-medium">Ready to pack</span>
            <Link to="/warehouse/packing" className="text-amber-600 hover:text-amber-700 font-medium inline-flex items-center gap-0.5">
              Pack <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.div>

        {/* Tasks Completed */}
        <motion.div variants={fadeUp} className="group relative rounded-2xl bg-white p-5 shadow-sm border border-slate-200/80 hover:shadow-md transition-all hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">My Tasks Today</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{metrics.tasksCompleted}</span>
            <span className="text-xs font-medium text-slate-500">Completed</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
            <span className="text-emerald-600 font-medium flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Good progress
            </span>
            <Link to="/warehouse/tasks" className="text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-0.5">
              View <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.div>
      </motion.div>

      {/* ── Middle Section: Dock Overview & Workflow ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dock Receiving & Storage Allocation */}
        <motion.div variants={fadeUp} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                Dock Receiving &amp; Allocation
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Current dock status and storage assignments</p>
            </div>
            <Link to="/warehouse/dock" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Dock View <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-800">Pending Dock Intake</span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                  {metrics.pendingReceiving} shipments
                </span>
              </div>
              <p className="text-xs text-slate-600 mb-3">Cargo trucks at dock waiting for unloading and initial barcode scanning</p>
              <Link to="/warehouse/receiving" className="text-xs font-semibold text-blue-700 hover:text-blue-800 inline-flex items-center gap-1">
                Begin Receiving <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-800">Quality Inspection Queue</span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                  {metrics.inspectionQueue} items
                </span>
              </div>
              <p className="text-xs text-slate-600 mb-3">Products received and awaiting visual inspection before storage allocation</p>
              <Link to="/warehouse/inspection" className="text-xs font-semibold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1">
                Inspect Items <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-4 rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-800">Defective Items Today</span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                  {metrics.defectiveToday} flagged
                </span>
              </div>
              <p className="text-xs text-slate-600 mb-3">Damaged or non-conforming products identified during inspection</p>
              <Link to="/warehouse/defective" className="text-xs font-semibold text-red-700 hover:text-red-800 inline-flex items-center gap-1">
                View Defects <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Physical Receiving & Storage Workflow */}
        <motion.div variants={fadeUp} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-orange-600" />
                Receiving &amp; Storage Workflow
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Standard floor operations procedure</p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Step 1 */}
            <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-slate-800">Dock Receiving Scan</h3>
                <p className="text-xs text-slate-600 mt-1">Scan shipment barcode at dock, verify manifest, mark as "Received" in system</p>
                <Link to="/warehouse/receiving" className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 mt-2">
                  Dock Scanner <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-slate-800">Quality Inspection</h3>
                <p className="text-xs text-slate-600 mt-1">Visual check for damage, verify quantities, flag defects if found</p>
                <Link to="/warehouse/inspection" className="text-xs font-semibold text-amber-600 hover:text-amber-700 inline-flex items-center gap-1 mt-2">
                  Inspection Tool <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-slate-800">Storage Location Assignment</h3>
                <p className="text-xs text-slate-600 mt-1">System suggests optimal rack location, scan target shelf, place product</p>
                <Link to="/warehouse/storage" className="text-xs font-semibold text-purple-600 hover:text-purple-700 inline-flex items-center gap-1 mt-2">
                  Allocate Storage <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                4
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-slate-800">Confirm Storage &amp; Update Inventory</h3>
                <p className="text-xs text-slate-600 mt-1">Final scan confirms placement, inventory count updated, task marked complete</p>
                <Link to="/warehouse/tasks" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1 mt-2">
                  Task List <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Categorized Warehouse Launchpad ────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Warehouse Floor Operations</h2>
            <p className="text-xs text-slate-500">Direct access to receiving, picking, inventory scanning, and floor management tools</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Receiving & Dock Intake */}
          <motion.div variants={fadeUp} className="rounded-2xl border border-blue-200/80 bg-gradient-to-b from-blue-50/50 to-white p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Receiving &amp; Dock</h3>
                <p className="text-[11px] text-slate-500">Intake &amp; inspection</p>
              </div>
            </div>
            <div className="space-y-1.5 pt-2 border-t border-blue-100">
              <Link to="/warehouse/receiving" className="flex items-center justify-between p-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-blue-100/60 hover:text-blue-900 transition-colors">
                <span className="flex items-center gap-2"><PackageOpen className="w-4 h-4 text-blue-600" /> Dock Receiving</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </Link>
              <Link to="/warehouse/inspection" className="flex items-center justify-between p-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-blue-100/60 hover:text-blue-900 transition-colors">
                <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-blue-600" /> Quality Inspection</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </Link>
              <Link to="/warehouse/storage" className="flex items-center justify-between p-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-blue-100/60 hover:text-blue-900 transition-colors">
                <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-600" /> Storage Allocation</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </Link>
            </div>
          </motion.div>

          {/* Picking & Order Fulfillment */}
          <motion.div variants={fadeUp} className="rounded-2xl border border-purple-200/80 bg-gradient-to-b from-purple-50/50 to-white p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-md shadow-purple-500/20">
                <PackageSearch className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Picking &amp; Fulfillment</h3>
                <p className="text-[11px] text-slate-500">Order preparation</p>
              </div>
            </div>
            <div className="space-y-1.5 pt-2 border-t border-purple-100">
              <Link to="/warehouse/picking" className="flex items-center justify-between p-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-purple-100/60 hover:text-purple-900 transition-colors">
                <span className="flex items-center gap-2"><PackageSearch className="w-4 h-4 text-purple-600" /> Picking Queue</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </Link>
              <Link to="/warehouse/packing" className="flex items-center justify-between p-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-purple-100/60 hover:text-purple-900 transition-colors">
                <span className="flex items-center gap-2"><PackageCheck className="w-4 h-4 text-purple-600" /> Packing Station</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </Link>
              <Link to="/warehouse/shipping" className="flex items-center justify-between p-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-purple-100/60 hover:text-purple-900 transition-colors">
                <span className="flex items-center gap-2"><Truck className="w-4 h-4 text-purple-600" /> Shipping Dock</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </Link>
            </div>
          </motion.div>

          {/* Inventory & Barcode Scanning */}
          <motion.div variants={fadeUp} className="rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/50 to-white p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-600 text-white shadow-md shadow-amber-500/20">
                <ScanBarcode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Inventory &amp; Scanning</h3>
                <p className="text-[11px] text-slate-500">Stock verification</p>
              </div>
            </div>
            <div className="space-y-1.5 pt-2 border-t border-amber-100">
              <button 
                onClick={() => handleQuickAction('scan')}
                className="w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-amber-100/60 hover:text-amber-900 transition-colors"
              >
                <span className="flex items-center gap-2"><ScanBarcode className="w-4 h-4 text-amber-600" /> Quick Scan</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>
              <Link to="/inventory" className="flex items-center justify-between p-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-amber-100/60 hover:text-amber-900 transition-colors">
                <span className="flex items-center gap-2"><Boxes className="w-4 h-4 text-amber-600" /> Stock Lookup</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </Link>
              <Link to="/warehouse/cycle-count" className="flex items-center justify-between p-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-amber-100/60 hover:text-amber-900 transition-colors">
                <span className="flex items-center gap-2"><ClipboardList className="w-4 h-4 text-amber-600" /> Cycle Count</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </Link>
            </div>
          </motion.div>

          {/* Floor Reports & Movements */}
          <motion.div variants={fadeUp} className="rounded-2xl border border-slate-300 bg-gradient-to-b from-slate-100/60 to-white p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-800 text-white shadow-md shadow-slate-800/20">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Reports &amp; Movements</h3>
                <p className="text-[11px] text-slate-500">Activity &amp; tasks</p>
              </div>
            </div>
            <div className="space-y-1.5 pt-2 border-t border-slate-200">
              <Link to="/warehouse/tasks" className="flex items-center justify-between p-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-200/60 hover:text-slate-900 transition-colors">
                <span className="flex items-center gap-2"><ListChecks className="w-4 h-4 text-slate-700" /> My Task List</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </Link>
              <Link to="/warehouse/movements" className="flex items-center justify-between p-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-200/60 hover:text-slate-900 transition-colors">
                <span className="flex items-center gap-2"><Navigation className="w-4 h-4 text-slate-700" /> Stock Movements</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </Link>
              <Link to="/warehouse/reports" className="flex items-center justify-between p-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-200/60 hover:text-slate-900 transition-colors">
                <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-slate-700" /> Floor Reports</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Live Floor Activity Stream ─────────────────────────────── */}
      <motion.div variants={fadeUp} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-600" />
              Live Floor Activity
            </h2>
            <p className="text-xs text-slate-500">Real-time warehouse operations and task completion events</p>
          </div>
          <Link to="/warehouse/activity" className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1">
            Full Log <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {recentActivity.length === 0 ? (
            <div className="py-8 text-center">
              <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-600">No recent activity</p>
              <p className="text-xs text-slate-400 mt-1">Floor operations will appear here</p>
            </div>
          ) : (
            recentActivity.slice(0, 8).map((log) => (
              <div key={log.id} className="py-3 flex items-start justify-between gap-4 hover:bg-slate-50/50 px-2 rounded-lg transition-colors">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 rounded-lg bg-orange-100 text-orange-600">
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">{log.action || 'warehouse.event'}</span>
                      <span className="text-[11px] text-slate-400">• {log.user || 'Floor Staff'}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{log.details || 'Task completed'}</p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 whitespace-nowrap">{log.time || 'Recently'}</span>
              </div>
            ))
          )}
        </div>
      </motion.div>

      {/* ── Quick Action Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {quickActionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-orange-100 text-orange-700">
                    <ScanBarcode className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Quick Barcode Scanner</h3>
                    <p className="text-xs text-slate-500">Scan product or location barcode</p>
                  </div>
                </div>
                <button
                  onClick={() => setQuickActionModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>

              {actionSubmitted ? (
                <div className="p-6 text-center space-y-2">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
                  <h4 className="text-sm font-bold text-slate-900">Scan Recorded!</h4>
                  <p className="text-xs text-slate-500">Product information retrieved successfully.</p>
                </div>
              ) : (
                <form onSubmit={handleActionSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Barcode / SKU
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 123456789012 or SKU-TIRE-001"
                      className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setQuickActionModal(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-md shadow-orange-500/20"
                    >
                      Lookup Product
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
