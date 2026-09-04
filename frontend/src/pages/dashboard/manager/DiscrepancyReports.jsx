import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  FileWarning,
  Package,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  XCircle
} from 'lucide-react';
import api from '../../../services/api';

const TYPE_STYLES = {
  SHORT: 'bg-red-50 text-red-700 border-red-200',
  OVERAGE: 'bg-amber-50 text-amber-700 border-amber-200',
  DAMAGED: 'bg-orange-50 text-orange-700 border-orange-200',
  WRONG_ITEM: 'bg-purple-50 text-purple-700 border-purple-200',
  MISSING: 'bg-rose-50 text-rose-700 border-rose-200'
};

const STATUS_STYLES = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-800',
  REQUIRES_MORE_INFO: 'bg-blue-100 text-blue-800'
};

function getProductName(record) {
  return record.product_name || [
    record.product?.brand,
    record.product?.model,
    record.product?.dimensions
  ].filter(Boolean).join(' ') || 'Unknown product';
}

function getShipmentNumber(record) {
  return record.shipment?.shipment_number || record.shipment_number || record.shipment_id || 'Unknown shipment';
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : 'Not recorded';
}

function MetricCard({ label, value, detail, icon: Icon, tone }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    red: 'bg-red-50 text-red-600 border-red-200'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <div className={`rounded-xl border p-3 ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}

export default function DiscrepancyReports() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [reportPeriod, setReportPeriod] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const loadRecords = async () => {
    try {
      setRefreshing(true);
      setError('');
      const { data } = await api.get('/receiving-qc/discrepancies/history');
      setRecords(data.data || []);
    } catch (requestError) {
      console.error('Error loading discrepancy report:', requestError);
      setError(requestError.response?.data?.error || 'Unable to load discrepancy history.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRecords();
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

  const periodRecords = useMemo(() => records.filter(record => {
    const recordDate = new Date(record.reported_at);
    return !Number.isNaN(recordDate.getTime()) && recordDate >= dateRange.start && recordDate <= dateRange.end;
  }), [records, dateRange]);

  const summary = useMemo(() => {
    const pending = periodRecords.filter(record => (record.manager_decision || 'PENDING') === 'PENDING');
    const approved = periodRecords.filter(record => record.manager_decision === 'APPROVED');
    const rejected = periodRecords.filter(record => record.manager_decision === 'REJECTED');
    const shortages = periodRecords.filter(record => record.discrepancy_type === 'SHORT' || record.discrepancy_type === 'MISSING');
    const impact = periodRecords.reduce((total, record) => total + Number(record.financial_impact || 0), 0);
    const units = periodRecords.reduce((total, record) => total + Math.abs(Number(record.difference || 0)), 0);

    return { pending, approved, rejected, shortages, impact, units };
  }, [periodRecords]);

  const filteredRecords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return periodRecords.filter(record => {
      const status = record.manager_decision || 'PENDING';
      const recordDate = new Date(record.reported_at);
      const searchable = [
        getProductName(record),
        getShipmentNumber(record),
        record.product_size,
        record.product?.sku,
        record.discrepancy_type,
        record.reason
      ].filter(Boolean).join(' ').toLowerCase();

      return (statusFilter === 'ALL' || status === statusFilter) &&
        (typeFilter === 'ALL' || record.discrepancy_type === typeFilter) &&
        !Number.isNaN(recordDate.getTime()) && recordDate >= dateRange.start && recordDate <= dateRange.end &&
        searchable.includes(query);
    });
  }, [periodRecords, searchQuery, statusFilter, typeFilter]);

  const exportCsv = () => {
    const headers = ['Product', 'SKU', 'Shipment', 'Size', 'Type', 'Expected', 'Received', 'Difference', 'Financial Impact', 'Status', 'Reported At', 'Reviewed At'];
    const rows = filteredRecords.map(record => [
      getProductName(record),
      record.product?.sku || record.sku || '',
      getShipmentNumber(record),
      record.product_size || '',
      record.discrepancy_type || '',
      record.expected_quantity ?? '',
      record.received_quantity ?? '',
      record.difference ?? '',
      record.financial_impact ?? '',
      record.manager_decision || 'PENDING',
      record.reported_at || '',
      record.manager_reviewed_at || ''
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `discrepancy-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-full space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-red-600 to-orange-500 p-3 text-white shadow-lg shadow-red-500/20">
              <FileWarning className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Discrepancy Reports</h1>
              <p className="mt-1 text-sm text-slate-500">Track receiving variances, decisions, and financial exposure.</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={loadRecords} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button onClick={exportCsv} disabled={!filteredRecords.length} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total records" value={records.length} detail="All discrepancy events" icon={FileWarning} tone="blue" />
        <MetricCard label="Pending review" value={summary.pending.length} detail="Needs manager action" icon={Clock} tone="amber" />
        <MetricCard label="Approved" value={summary.approved.length} detail="Resolved approvals" icon={CheckCircle} tone="green" />
        <MetricCard label="Short / missing" value={summary.shortages.length} detail={`${summary.units} units affected`} icon={TrendingDown} tone="red" />
        <MetricCard label="Financial impact" value={summary.impact.toLocaleString()} detail="Recorded value exposure" icon={TrendingUp} tone="red" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search product, SKU, shipment, or reason..." className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </div>
          <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500">
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <select value={typeFilter} onChange={event => setTypeFilter(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500">
            <option value="ALL">All types</option>
            <option value="SHORT">Short</option>
            <option value="OVERAGE">Overage</option>
            <option value="DAMAGED">Damaged</option>
            <option value="WRONG_ITEM">Wrong item</option>
            <option value="MISSING">Missing</option>
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <span className="text-xs font-semibold text-slate-500">Period:</span>
          <select value={reportPeriod} onChange={event => setReportPeriod(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700">
            <option value="today">Today</option><option value="week">This week</option><option value="month">This month</option><option value="year">This year</option><option value="custom">Custom range</option>
          </select>
          {reportPeriod === 'custom' && <><input type="date" value={customStart} onChange={event => setCustomStart(event.target.value)} className="rounded-lg border border-slate-300 px-2 py-2 text-xs" aria-label="Report start date" /><span className="text-xs text-slate-400">to</span><input type="date" value={customEnd} onChange={event => setCustomEnd(event.target.value)} className="rounded-lg border border-slate-300 px-2 py-2 text-xs" aria-label="Report end date" /></>}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>{filteredRecords.length} of {records.length} records shown</span>
          <span>Updated {records.length ? formatDate(records[0].reported_at) : 'not yet'}</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-4">Product</th>
                <th className="px-5 py-4">Shipment</th>
                <th className="px-5 py-4">Variance</th>
                <th className="px-5 py-4">Impact</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Reported</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map(record => {
                const status = record.manager_decision || 'PENDING';
                const difference = Number(record.difference || 0);
                return (
                  <tr key={record.id} onClick={() => setExpandedId(expandedId === record.id ? null : record.id)} className="cursor-pointer transition-colors hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">{getProductName(record)}</p>
                      <p className="mt-1 text-xs text-slate-500">{record.product_size || 'N/A'}{record.product?.sku ? ` · SKU ${record.product.sku}` : ''}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-700">{getShipmentNumber(record)}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-lg border px-2 py-1 text-xs font-bold ${TYPE_STYLES[record.discrepancy_type] || TYPE_STYLES.SHORT}`}>{record.discrepancy_type || 'DISCREPANCY'}</span>
                      <p className={`mt-1 font-bold ${difference > 0 ? 'text-amber-700' : 'text-red-700'}`}>{difference > 0 ? '+' : ''}{difference} units</p>
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-800">{Number(record.financial_impact || 0).toLocaleString()}</td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[status] || STATUS_STYLES.PENDING}`}>{status.replaceAll('_', ' ')}</span></td>
                    <td className="px-5 py-4 text-xs text-slate-500">{formatDate(record.reported_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {filteredRecords.map(record => {
            const status = record.manager_decision || 'PENDING';
            const difference = Number(record.difference || 0);
            return (
              <button key={record.id} onClick={() => setExpandedId(expandedId === record.id ? null : record.id)} className="block w-full p-4 text-left hover:bg-slate-50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><p className="truncate font-semibold text-slate-900">{getProductName(record)}</p><p className="mt-1 text-xs text-slate-500">{getShipmentNumber(record)} · {record.product_size || 'N/A'}</p></div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${STATUS_STYLES[status] || STATUS_STYLES.PENDING}`}>{status}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs"><span className={`font-bold ${difference > 0 ? 'text-amber-700' : 'text-red-700'}`}>{difference > 0 ? '+' : ''}{difference} units</span><span className="text-slate-500">{formatDate(record.reported_at)}</span></div>
              </button>
            );
          })}
        </div>

        {loading && <div className="p-12 text-center text-sm text-slate-500"><RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-blue-600" />Loading discrepancy report...</div>}
        {!loading && !filteredRecords.length && <div className="p-12 text-center"><Package className="mx-auto mb-3 h-10 w-10 text-slate-300" /><p className="font-semibold text-slate-700">No discrepancy records found</p><p className="mt-1 text-sm text-slate-500">Try changing the search or filters.</p></div>}
      </div>

      {expandedId && (() => {
        const record = records.find(item => item.id === expandedId);
        if (!record) return null;
        const status = record.manager_decision || 'PENDING';
        return (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-600">Selected record</p><h2 className="mt-1 text-lg font-bold text-slate-900">{getProductName(record)}</h2><p className="text-sm text-slate-600">{getShipmentNumber(record)} · {record.product_size || 'N/A'}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLES[status] || STATUS_STYLES.PENDING}`}>{status.replaceAll('_', ' ')}</span></div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4"><div className="rounded-xl bg-white p-3"><p className="text-xs text-slate-500">Expected</p><p className="mt-1 font-bold">{record.expected_quantity}</p></div><div className="rounded-xl bg-white p-3"><p className="text-xs text-slate-500">Received</p><p className="mt-1 font-bold">{record.received_quantity}</p></div><div className="rounded-xl bg-white p-3"><p className="text-xs text-slate-500">Reason</p><p className="mt-1 font-medium text-slate-800">{record.reason || 'Not provided'}</p></div><div className="rounded-xl bg-white p-3"><p className="text-xs text-slate-500">Reviewed</p><p className="mt-1 font-medium text-slate-800">{formatDate(record.manager_reviewed_at)}</p></div></div>
          </motion.div>
        );
      })()}
    </div>
  );
}
