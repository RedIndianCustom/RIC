import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  Clock,
  Download,
  FileText,
  RefreshCw,
  Search,
  XCircle
} from 'lucide-react';
import api from '../../../services/api';

const statusStyles = {
  PENDING: 'bg-amber-100 text-amber-800',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-800'
};

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : 'Not recorded';
}

export default function ReceivingReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [period, setPeriod] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [error, setError] = useState('');

  const loadReports = async () => {
    try {
      setRefreshing(true);
      setError('');
      const { data } = await api.get('/receiving/reports?limit=100');
      setReports(data.data || []);
    } catch (requestError) {
      console.error('Error loading receiving reports:', requestError);
      setError(requestError.response?.data?.error || 'Unable to load receiving reports.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadReports(); }, []);

  const dateRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    if (period === 'today') start.setHours(0, 0, 0, 0);
    if (period === 'week') {
      const day = start.getDay();
      start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
      start.setHours(0, 0, 0, 0);
    }
    if (period === 'month') { start.setDate(1); start.setHours(0, 0, 0, 0); }
    if (period === 'year') { start.setMonth(0, 1); start.setHours(0, 0, 0, 0); }
    if (period === 'custom' && customStart && customEnd) return { start: new Date(`${customStart}T00:00:00`), end: new Date(`${customEnd}T23:59:59.999`) };
    return { start, end };
  }, [period, customStart, customEnd]);

  const periodReports = useMemo(() => reports.filter(report => {
    const date = new Date(report.submitted_at || report.created_at);
    return !Number.isNaN(date.getTime()) && date >= dateRange.start && date <= dateRange.end;
  }), [reports, dateRange]);

  const filteredReports = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return periodReports.filter(report => {
      const status = report.status || 'PENDING';
      const text = [report.report_number, report.shipment_number, report.submitted_by_name, report.notes].filter(Boolean).join(' ').toLowerCase();
      return (statusFilter === 'ALL' || status === statusFilter) && text.includes(normalizedQuery);
    });
  }, [periodReports, query, statusFilter]);

  const summary = useMemo(() => ({
    pending: periodReports.filter(report => ['PENDING', 'PENDING_APPROVAL'].includes(report.status)).length,
    approved: periodReports.filter(report => report.status === 'APPROVED').length,
    rejected: periodReports.filter(report => report.status === 'REJECTED').length,
    discrepancies: periodReports.filter(report => report.has_discrepancies || Number(report.total_discrepancy) !== 0).length,
    expected: periodReports.reduce((total, report) => total + Number(report.total_expected || 0), 0),
    scanned: periodReports.reduce((total, report) => total + Number(report.total_scanned || 0), 0)
  }), [periodReports]);

  const exportCsv = () => {
    const headers = ['Report Number', 'Shipment', 'Submitted By', 'Expected', 'Scanned', 'Difference', 'Status', 'Submitted At'];
    const rows = filteredReports.map(report => [report.report_number || '', report.shipment_number || '', report.submitted_by_name || report.submitted_by || '', report.total_expected ?? '', report.total_scanned ?? '', report.total_discrepancy ?? '', report.status || 'PENDING', report.submitted_at || report.created_at || '']);
    const csv = [headers, ...rows].map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `receiving-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-3"><div className="rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 p-3 text-white shadow-lg shadow-blue-500/20"><ClipboardList className="h-6 w-6" /></div><div><h1 className="text-2xl font-bold text-slate-900">Receiving Reports</h1><p className="mt-1 text-sm text-slate-500">Track receiving submissions, counts, approvals, and variances.</p></div></div>
        <div className="flex gap-2"><button onClick={loadReports} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh</button><button onClick={exportCsv} disabled={!filteredReports.length} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"><Download className="h-4 w-4" /> Export CSV</button></div>
      </div>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[["Reports", periodReports.length, FileText, 'blue'], ['Pending', summary.pending, Clock, 'amber'], ['Approved', summary.approved, CheckCircle, 'green'], ['With discrepancies', summary.discrepancies, AlertTriangle, 'red'], ['Units received', summary.scanned, ClipboardList, 'blue']].map(([label, value, Icon, tone], index) => <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 text-3xl font-extrabold text-slate-900">{value}</p></div><Icon className={`h-5 w-5 text-${tone}-600`} /></div></motion.div>)}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 lg:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search report, shipment, submitter, or notes..." className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></div><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700"><option value="ALL">All statuses</option><option value="PENDING">Pending</option><option value="PENDING_APPROVAL">Pending approval</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select></div><div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3"><span className="text-xs font-semibold text-slate-500">Period:</span><select value={period} onChange={event => setPeriod(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700"><option value="today">Today</option><option value="week">This week</option><option value="month">This month</option><option value="year">This year</option><option value="custom">Custom range</option></select>{period === 'custom' && <><input type="date" value={customStart} onChange={event => setCustomStart(event.target.value)} className="rounded-lg border border-slate-300 px-2 py-2 text-xs" aria-label="Report start date" /><span className="text-xs text-slate-400">to</span><input type="date" value={customEnd} onChange={event => setCustomEnd(event.target.value)} className="rounded-lg border border-slate-300 px-2 py-2 text-xs" aria-label="Report end date" /></>}</div><p className="mt-3 text-xs text-slate-500">{filteredReports.length} of {reports.length} reports shown · Expected units: {summary.expected}</p></div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-4">Report</th><th className="px-5 py-4">Shipment</th><th className="px-5 py-4">Counts</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Submitted</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredReports.map(report => <tr key={report.id} className="hover:bg-slate-50"><td className="px-5 py-4"><p className="font-semibold text-slate-900">{report.report_number || 'Receiving report'}</p><p className="mt-1 text-xs text-slate-500">{report.submitted_by_name || report.submitted_by || 'Submitter not recorded'}</p></td><td className="px-5 py-4 text-slate-700">{report.shipment_number || report.shipment_id || 'N/A'}</td><td className="px-5 py-4"><span className="font-semibold text-blue-700">{report.total_scanned || 0}</span><span className="text-slate-500"> / {report.total_expected || 0}</span><p className={`mt-1 text-xs font-bold ${Number(report.total_discrepancy) ? 'text-amber-700' : 'text-emerald-700'}`}>{Number(report.total_discrepancy) ? `${Math.abs(report.total_discrepancy)} variance` : 'Counts match'}</p></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[report.status] || statusStyles.PENDING}`}>{(report.status || 'PENDING').replaceAll('_', ' ')}</span></td><td className="px-5 py-4 text-xs text-slate-500">{formatDate(report.submitted_at || report.created_at)}</td></tr>)}</tbody></table></div><div className="divide-y divide-slate-100 md:hidden">{filteredReports.map(report => <div key={report.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{report.report_number || 'Receiving report'}</p><p className="mt-1 text-xs text-slate-500">{report.shipment_number || 'N/A'}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusStyles[report.status] || statusStyles.PENDING}`}>{report.status || 'PENDING'}</span></div><p className="mt-3 text-xs text-slate-600">Received {report.total_scanned || 0} of {report.total_expected || 0} expected · {formatDate(report.submitted_at || report.created_at)}</p></div>)}</div>{loading && <div className="p-12 text-center text-sm text-slate-500"><RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-blue-600" />Loading receiving reports...</div>}{!loading && !filteredReports.length && <div className="p-12 text-center"><XCircle className="mx-auto mb-3 h-10 w-10 text-slate-300" /><p className="font-semibold text-slate-700">No receiving reports found</p><p className="mt-1 text-sm text-slate-500">Try changing the date or status filters.</p></div>}</div>
    </div>
  );
}