import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle,
  ClipboardCheck,
  Download,
  Search,
  RefreshCw,
  XCircle
} from 'lucide-react';
import api from '../../../services/api';

const decisionStyles = {
  APPROVED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-800',
  PENDING: 'bg-amber-100 text-amber-800'
};

const metricIconStyles = {
  blue: 'text-blue-600',
  green: 'text-green-600',
  red: 'text-red-600',
  teal: 'text-teal-600',
  amber: 'text-amber-600'
};

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : 'Not recorded';
}

export default function QCInspectionReports() {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [decisionFilter, setDecisionFilter] = useState('ALL');
  const [reportPeriod, setReportPeriod] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [error, setError] = useState('');

  const loadInspections = async () => {
    try {
      setRefreshing(true);
      setError('');
      const { data } = await api.get('/receiving-qc/qc-inspection/reports');
      setInspections(data.data || []);
    } catch (requestError) {
      console.error('Error loading QC inspection reports:', requestError);
      setError(requestError.response?.data?.error || 'Unable to load QC inspection reports.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInspections();
  }, []);

  const dateRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    if (reportPeriod === 'today') start.setHours(0, 0, 0, 0);
    if (reportPeriod === 'week') {
      const day = start.getDay();
      start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
      start.setHours(0, 0, 0, 0);
    }
    if (reportPeriod === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    }
    if (reportPeriod === 'year') {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
    }
    if (reportPeriod === 'custom' && customStart && customEnd) {
      return { start: new Date(`${customStart}T00:00:00`), end: new Date(`${customEnd}T23:59:59.999`) };
    }
    return { start, end };
  }, [reportPeriod, customStart, customEnd]);

  const periodInspections = useMemo(() => inspections.filter(item => {
    const inspectionDate = new Date(item.inspection_end_date || item.created_at);
    return !Number.isNaN(inspectionDate.getTime()) && inspectionDate >= dateRange.start && inspectionDate <= dateRange.end;
  }), [inspections, dateRange]);

  const summary = useMemo(() => ({
    approved: periodInspections.filter(item => item.manager_decision === 'APPROVED').length,
    rejected: periodInspections.filter(item => item.manager_decision === 'REJECTED').length,
    pending: periodInspections.filter(item => !item.manager_decision || item.manager_decision === 'PENDING').length,
    good: periodInspections.reduce((total, item) => total + Number(item.good_quality_count || 0), 0),
    minor: periodInspections.reduce((total, item) => total + Number(item.minor_defect_count || 0), 0),
    major: periodInspections.reduce((total, item) => total + Number(item.major_defect_count || 0), 0)
  }), [periodInspections]);

  const filteredInspections = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return periodInspections.filter(item => {
      const decision = item.manager_decision || 'PENDING';
      const inspectionDate = new Date(item.inspection_end_date || item.created_at);
      const text = [item.inspection_number, item.shipment_number, item.container_number, item.inspector_name, item.overall_assessment].filter(Boolean).join(' ').toLowerCase();
      return (decisionFilter === 'ALL' || decision === decisionFilter) && !Number.isNaN(inspectionDate.getTime()) && inspectionDate >= dateRange.start && inspectionDate <= dateRange.end && text.includes(normalizedQuery);
    });
  }, [periodInspections, query, decisionFilter]);

  const exportCsv = () => {
    const headers = ['Inspection', 'Shipment', 'Total Items', 'Good', 'Minor Defects', 'Major Defects', 'Quality %', 'Decision', 'Completed At'];
    const rows = filteredInspections.map(item => [
      item.inspection_number || '',
      item.shipment_number || '',
      item.total_items ?? '',
      item.good_quality_count ?? '',
      item.minor_defect_count ?? '',
      item.major_defect_count ?? '',
      item.good_quality_percentage ?? '',
      item.manager_decision || 'PENDING',
      item.inspection_end_date || ''
    ]);
    const csv = [headers, ...rows].map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `qc-inspection-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-500 p-3 text-white shadow-lg shadow-teal-500/20"><ClipboardCheck className="h-6 w-6" /></div>
          <div><h1 className="text-2xl font-bold text-slate-900">QC Inspection Reports</h1><p className="mt-1 text-sm text-slate-500">Quality outcomes, defect mix, and manager review decisions.</p></div>
        </div>
        <div className="flex gap-2">
          <button onClick={loadInspections} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh</button>
          <button onClick={exportCsv} disabled={!filteredInspections.length} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"><Download className="h-4 w-4" /> Export CSV</button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ['Completed', inspections.length, ClipboardCheck, 'blue'],
          ['Approved', summary.approved, CheckCircle, 'green'],
          ['Rejected', summary.rejected, XCircle, 'red'],
          ['Good items', summary.good, CheckCircle, 'teal'],
          ['Defect items', summary.minor + summary.major, AlertTriangle, 'amber']
        ].map(([label, value, Icon, tone], index) => (
          <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 text-3xl font-extrabold text-slate-900">{value}</p></div><Icon className={`h-5 w-5 ${metricIconStyles[tone]}`} /></div>
          </motion.div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search inspection, shipment, container, or inspector..." className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" /></div>
          <select value={decisionFilter} onChange={event => setDecisionFilter(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700"><option value="ALL">All decisions</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="PENDING">Pending</option></select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <span className="text-xs font-semibold text-slate-500">Period:</span>
          <select value={reportPeriod} onChange={event => setReportPeriod(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700">
            <option value="today">Today</option><option value="week">This week</option><option value="month">This month</option><option value="year">This year</option><option value="custom">Custom range</option>
          </select>
          {reportPeriod === 'custom' && <><input type="date" value={customStart} onChange={event => setCustomStart(event.target.value)} className="rounded-lg border border-slate-300 px-2 py-2 text-xs" aria-label="Report start date" /><span className="text-xs text-slate-400">to</span><input type="date" value={customEnd} onChange={event => setCustomEnd(event.target.value)} className="rounded-lg border border-slate-300 px-2 py-2 text-xs" aria-label="Report end date" /></>}
        </div>
        <p className="mt-3 text-xs text-slate-500">{filteredInspections.length} of {inspections.length} inspections shown · {summary.pending} still pending review</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-4">Inspection</th><th className="px-5 py-4">Shipment</th><th className="px-5 py-4">Quality mix</th><th className="px-5 py-4">Quality rate</th><th className="px-5 py-4">Decision</th><th className="px-5 py-4">Completed</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredInspections.map(item => <tr key={item.id} className="hover:bg-slate-50"><td className="px-5 py-4"><p className="font-semibold text-slate-900">{item.inspection_number || 'QC Inspection'}</p><p className="mt-1 text-xs text-slate-500">{item.inspector_name || 'Inspector not recorded'}</p></td><td className="px-5 py-4 text-slate-700">{item.shipment_number || 'Ad hoc inspection'}</td><td className="px-5 py-4 text-xs"><span className="font-semibold text-green-700">{item.good_quality_count || 0} good</span><span className="mx-2 text-slate-300">·</span><span className="text-amber-700">{item.minor_defect_count || 0} minor</span><span className="mx-2 text-slate-300">·</span><span className="text-red-700">{item.major_defect_count || 0} major</span></td><td className="px-5 py-4 font-bold text-slate-800">{Number(item.good_quality_percentage || 0).toFixed(1)}%</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${decisionStyles[item.manager_decision || 'PENDING']}`}>{(item.manager_decision || 'PENDING').replaceAll('_', ' ')}</span></td><td className="px-5 py-4 text-xs text-slate-500">{formatDate(item.inspection_end_date)}</td></tr>)}</tbody></table></div>
        <div className="divide-y divide-slate-100 md:hidden">{filteredInspections.map(item => <div key={item.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{item.inspection_number || 'QC Inspection'}</p><p className="mt-1 text-xs text-slate-500">{item.shipment_number || 'Ad hoc inspection'}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${decisionStyles[item.manager_decision || 'PENDING']}`}>{item.manager_decision || 'PENDING'}</span></div><div className="mt-3 flex justify-between text-xs"><span className="text-green-700">{item.good_quality_count || 0} good</span><span className="text-amber-700">{item.minor_defect_count || 0} minor</span><span className="text-red-700">{item.major_defect_count || 0} major</span></div></div>)}</div>
        {loading && <div className="p-12 text-center text-sm text-slate-500"><RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-teal-600" />Loading QC inspection reports...</div>}
        {!loading && !filteredInspections.length && <div className="p-12 text-center text-sm text-slate-500">No QC inspection reports match the current filters.</div>}
      </div>
    </div>
  );
}