import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  Package,
  AlertTriangle,
  FileWarning,
  RotateCcw,
  DollarSign,
  Users,
  Activity,
  ArrowRight,
  ClipboardCheck
} from 'lucide-react';
import api from '../../../services/api';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const colorClasses = {
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'bg-blue-100 text-blue-600',
    text: 'text-blue-600',
    hover: 'hover:bg-blue-100 hover:border-blue-300'
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: 'bg-green-100 text-green-600',
    text: 'text-green-600',
    hover: 'hover:bg-green-100 hover:border-green-300'
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    icon: 'bg-purple-100 text-purple-600',
    text: 'text-purple-600',
    hover: 'hover:bg-purple-100 hover:border-purple-300'
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'bg-red-100 text-red-600',
    text: 'text-red-600',
    hover: 'hover:bg-red-100 hover:border-red-300'
  },
  orange: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    icon: 'bg-orange-100 text-orange-600',
    text: 'text-orange-600',
    hover: 'hover:bg-orange-100 hover:border-orange-300'
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: 'bg-amber-100 text-amber-600',
    text: 'text-amber-600',
    hover: 'hover:bg-amber-100 hover:border-amber-300'
  },
  teal: {
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    icon: 'bg-teal-100 text-teal-600',
    text: 'text-teal-600',
    hover: 'hover:bg-teal-100 hover:border-teal-300'
  },
  indigo: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    icon: 'bg-indigo-100 text-indigo-600',
    text: 'text-indigo-600',
    hover: 'hover:bg-indigo-100 hover:border-indigo-300'
  }
};

function ReportCard({ report }) {
  const colors = colorClasses[report.color];
  const Icon = report.icon;

  return (
    <Link to={report.path}>
      <motion.div
        variants={fadeIn}
        className={`${colors.bg} ${colors.border} ${colors.hover} border-2 rounded-xl p-6 transition-all cursor-pointer group`}
      >
        <div className="flex items-start justify-between mb-4">
          <div className={`${colors.icon} w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
            <Icon size={24} />
          </div>
          <ArrowRight className={`${colors.text} opacity-0 group-hover:opacity-100 transition-opacity`} size={20} />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">{report.title}</h3>
        <p className="text-sm text-slate-600 mb-4">{report.description}</p>
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-bold ${colors.text}`}>{report.stats.value || '—'}</span>
          <span className="text-xs text-slate-500">{report.stats.label}</span>
        </div>
      </motion.div>
    </Link>
  );
}

export default function AllReports() {
  const [loading, setLoading] = useState(true);
  const [reportPeriod, setReportPeriod] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [reportData, setReportData] = useState({ discrepancies: [], inspections: [] });
  const [stats, setStats] = useState({
    totalReports: 8,
    revenueMTD: 0,
    openIssues: 0,
    activitiesToday: 0
  });

  const [reports, setReports] = useState([
    {
      id: 'inventory',
      title: 'Inventory Reports',
      description: 'View stock levels, turnover rates, and inventory valuation',
      icon: Package,
      path: '/reports/inventory',
      color: 'blue',
      stats: { value: '—', label: 'Total Items' }
    },
    {
      id: 'sales',
      title: 'Sales Reports',
      description: 'Analyze sales performance, trends, and revenue metrics',
      icon: TrendingUp,
      path: '/reports/sales',
      color: 'green',
      stats: { value: '—', label: 'This Month' }
    },
    {
      id: 'stock-movement',
      title: 'Stock Movement Reports',
      description: 'Track inventory movements, transfers, and adjustments',
      icon: Activity,
      path: '/reports/stock-movement',
      color: 'purple',
      stats: { value: '—', label: 'Movements' }
    },
    {
      id: 'discrepancy',
      title: 'Discrepancy Reports',
      description: 'Review quantity mismatches and counting discrepancies',
      icon: FileWarning,
      path: '/reports/discrepancies',
      color: 'red',
      stats: { value: '—', label: 'Open Issues' }
    },
    {
      id: 'qc-inspection',
      title: 'QC Inspection Reports',
      description: 'Review completed inspections, quality rates, and manager decisions',
      icon: ClipboardCheck,
      path: '/reports/qc-inspection',
      color: 'teal',
      stats: { value: '—', label: 'Completed Inspections' }
    },
    {
      id: 'defects',
      title: 'Defect Reports',
      description: 'Monitor defective items, quality issues, and damage reports',
      icon: AlertTriangle,
      path: '/reports/defects',
      color: 'orange',
      stats: { value: '—', label: 'Defective Items' }
    },
    {
      id: 'returns',
      title: 'Return Reports',
      description: 'Analyze return patterns, reasons, and processing times',
      icon: RotateCcw,
      path: '/reports/returns',
      color: 'amber',
      stats: { value: '—', label: 'This Month' }
    },
    {
      id: 'refunds',
      title: 'Refund Reports',
      description: 'Track refund requests, amounts, and processing status',
      icon: DollarSign,
      path: '/reports/refunds',
      color: 'teal',
      stats: { value: '—', label: 'Total Refunds' }
    },
    {
      id: 'employee-efficiency',
      title: 'Employee Efficiency',
      description: 'Monitor team performance, productivity, and task completion',
      icon: Users,
      path: '/reports/employee-efficiency',
      color: 'indigo',
      stats: { value: '—', label: 'Avg Efficiency' }
    }
  ]);

  useEffect(() => {
    loadReportsData();
  }, []);

  const loadReportsData = async () => {
    try {
      setLoading(true);

      const [discrepancyResponse, qcResponse] = await Promise.all([
        api.get('/receiving-qc/discrepancies/history'),
        api.get('/receiving-qc/qc-inspection/reports')
      ]);
      const discrepancies = discrepancyResponse.data?.data || [];
      const inspections = qcResponse.data?.data || [];
      setReportData({ discrepancies, inspections });

    } catch (err) {
      console.warn('Reports data not available:', err);
    } finally {
      setLoading(false);
    }
  };

  const dateRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    if (reportPeriod === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (reportPeriod === 'week') {
      const day = start.getDay();
      start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
      start.setHours(0, 0, 0, 0);
    } else if (reportPeriod === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    } else if (reportPeriod === 'year') {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
    } else if (reportPeriod === 'custom' && customStart && customEnd) {
      const customStartDate = new Date(`${customStart}T00:00:00`);
      const customEndDate = new Date(`${customEnd}T23:59:59.999`);
      return { start: customStartDate, end: customEndDate };
    }

    return { start, end };
  }, [reportPeriod, customStart, customEnd]);

  const filteredDiscrepancies = useMemo(() => reportData.discrepancies.filter(item => {
    const date = new Date(item.reported_at);
    return !Number.isNaN(date.getTime()) && date >= dateRange.start && date <= dateRange.end;
  }), [reportData.discrepancies, dateRange]);

  const filteredInspections = useMemo(() => reportData.inspections.filter(item => {
    const date = new Date(item.inspection_end_date || item.created_at);
    return !Number.isNaN(date.getTime()) && date >= dateRange.start && date <= dateRange.end;
  }), [reportData.inspections, dateRange]);

  useEffect(() => {
    const pendingIssues = filteredDiscrepancies.filter(item => (item.manager_decision || 'PENDING') === 'PENDING').length;
    setStats(prev => ({
      ...prev,
      totalReports: filteredDiscrepancies.length + filteredInspections.length,
      openIssues: pendingIssues
    }));
    setReports(prev => prev.map(report => {
      if (report.id === 'discrepancy') {
        return { ...report, stats: { value: pendingIssues, label: 'Open Issues' } };
      }
      if (report.id === 'qc-inspection') {
        return { ...report, stats: { value: filteredInspections.length, label: 'Completed Inspections' } };
      }
      return report;
    }));
  }, [filteredDiscrepancies, filteredInspections]);

  const periodLabel = reportPeriod === 'custom'
    ? `${customStart || 'Start'} to ${customEnd || 'End'}`
    : reportPeriod === 'today'
      ? 'Today'
      : reportPeriod === 'week'
        ? 'This week'
        : reportPeriod === 'year'
          ? 'This year'
          : 'This month';

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={fadeIn}>
        <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">
          Comprehensive reporting and analytics for all warehouse operations
        </p>
      </motion.div>

      <motion.div variants={fadeIn} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Reporting period</p>
            <p className="mt-0.5 text-xs text-slate-500">Track report activity by day, week, month, year, or a custom range.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={reportPeriod} onChange={event => setReportPeriod(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              <option value="today">Today</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="year">This year</option>
              <option value="custom">Custom range</option>
            </select>
            {reportPeriod === 'custom' && (
              <>
                <input type="date" value={customStart} onChange={event => setCustomStart(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500" aria-label="Report start date" />
                <span className="text-sm text-slate-400">to</span>
                <input type="date" value={customEnd} onChange={event => setCustomEnd(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500" aria-label="Report end date" />
              </>
            )}
            <button onClick={loadReportsData} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              <Activity className="h-4 w-4" /> Refresh data
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs font-medium text-blue-700">Showing: {periodLabel} · {filteredDiscrepancies.length + filteredInspections.length} tracked events</p>
      </motion.div>

      {/* Quick Stats */}
      <motion.div variants={fadeIn} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <BarChart3 className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Tracked Reports</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalReports}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Revenue MTD</p>
              <p className="text-2xl font-bold text-slate-900">
                {stats.revenueMTD > 0 ? `$${(stats.revenueMTD / 1000).toFixed(1)}K` : '—'}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="text-amber-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Open Issues · {periodLabel}</p>
              <p className="text-2xl font-bold text-slate-900">
                {stats.openIssues > 0 ? stats.openIssues : '—'}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Activity className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Activities Today</p>
              <p className="text-2xl font-bold text-slate-900">
                {stats.activitiesToday > 0 ? stats.activitiesToday.toLocaleString() : '—'}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Reports Grid */}
      <motion.div
        variants={staggerContainer}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {reports.map((report) => (
          <ReportCard key={report.id} report={report} />
        ))}
      </motion.div>

      {/* Info Section */}
      <motion.div variants={fadeIn} className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <BarChart3 className="text-blue-600" size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Export & Automation</h3>
            <p className="text-sm text-slate-600 mb-3">
              All reports can be exported to CSV, Excel, or PDF formats. You can also schedule automatic
              report generation and email delivery for regular monitoring.
            </p>
            <button className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
              Configure Report Automation →
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
