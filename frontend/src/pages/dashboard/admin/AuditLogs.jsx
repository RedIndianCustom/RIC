import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScrollText, Search, Filter, Download, Calendar, User,
  Activity, AlertCircle, ShieldCheck, ShieldAlert, Clock,
  Eye, RefreshCw, CheckCircle2, ChevronRight, Terminal,
  ExternalLink, FileCode, Layers
} from 'lucide-react';
import api from '../../../services/api.js';
import Loading from '../../../components/common/Loading.jsx';
import EmptyState from '../../../components/common/EmptyState.jsx';

const CATEGORIES = ['All Categories', 'Security', 'Facilities', 'System', 'Authentication', 'Catalog'];
const SEVERITIES = ['All Severities', 'info', 'notice', 'warning', 'critical'];

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedSeverity, setSelectedSeverity] = useState('All Severities');
  const [selectedLog, setSelectedLog] = useState(null);
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/audit-logs');
      if (data?.logs && data.logs.length > 0) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.warn('Audit logs API notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ric_audit_trail_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    setSuccess('Audit logs exported to JSON successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const filteredLogs = logs.filter(log => {
    const query = searchQuery.toLowerCase();
    const matchSearch = log.action.toLowerCase().includes(query) ||
                        log.user.toLowerCase().includes(query) ||
                        log.userEmail.toLowerCase().includes(query) ||
                        log.details.toLowerCase().includes(query) ||
                        log.ipAddress.toLowerCase().includes(query);
    const matchCat = selectedCategory === 'All Categories' || log.category === selectedCategory;
    const matchSev = selectedSeverity === 'All Severities' || log.severity === selectedSeverity;
    return matchSearch && matchCat && matchSev;
  });

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'critical':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'warning':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'notice':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (loading) return <Loading message="Loading System Audit Trails..." />;

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 mb-2">
            <ScrollText className="w-3.5 h-3.5" />
            Immutable Forensic Activity Log
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Audit &amp; Security Timeline</h1>
          <p className="text-slate-500 text-sm mt-0.5">Comprehensive audit trail of permission changes, warehouse modifications, and security authentications.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-sm transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportJSON}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow-md shadow-slate-900/20 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            Export Audit JSON
          </button>
        </div>
      </div>

      {/* ── Alerts ────────────────────────────────────────────────── */}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* ── Filter & Search Bar ───────────────────────────────────── */}
      <div className="rounded-2xl bg-white p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search action, user, IP or details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white capitalize"
          >
            {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* ── Audit Logs Table ──────────────────────────────────────── */}
      {filteredLogs.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={logs.length === 0 ? 'No Audit Logs Yet' : 'No Logs Match Filters'}
          description={
            logs.length === 0
              ? 'System activity will be recorded here once events occur.'
              : 'Try adjusting your search or filter criteria.'
          }
        />
      ) : (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Action &amp; Category</th>
                <th className="px-5 py-3.5">Actor / Operator</th>
                <th className="px-5 py-3.5">Event Description</th>
                <th className="px-5 py-3.5">IP &amp; Timestamp</th>
                <th className="px-5 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => {
                const dateFormatted = new Date(log.timestamp).toLocaleString('en-US', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                });

                return (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Action & Category */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getSeverityBadge(log.severity)}`}>
                          {log.severity}
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-800">{log.action}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{log.category}</p>
                    </td>

                    {/* Actor */}
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900 text-xs">{log.user}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{log.userEmail}</p>
                    </td>

                    {/* Description */}
                    <td className="px-5 py-4 max-w-md">
                      <p className="text-xs text-slate-700 line-clamp-2">{log.details}</p>
                    </td>

                    {/* Timestamp & IP */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <p className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {dateFormatted}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">{log.ipAddress}</p>
                    </td>

                    {/* View JSON button */}
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-2 rounded-xl text-slate-500 hover:text-brand-600 hover:bg-slate-100 transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                        title="View payload"
                      >
                        <FileCode className="w-4 h-4" />
                        <span className="hidden sm:inline">JSON</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* ── Payload Inspector Modal ───────────────────────────────── */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-100 text-slate-800">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-mono">{selectedLog.action}</h3>
                    <p className="text-xs text-slate-500">Log ID: {selectedLog.id} • {selectedLog.timestamp}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {selectedLog.details}
                </p>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Metadata Payload (Forensic JSON)
                  </label>
                  <pre className="p-4 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto max-h-64 border border-slate-800 leading-relaxed">
                    {JSON.stringify({
                      id: selectedLog.id,
                      actor: selectedLog.user,
                      email: selectedLog.userEmail,
                      ip: selectedLog.ipAddress,
                      category: selectedLog.category,
                      severity: selectedLog.severity,
                      payload: selectedLog.metadata
                    }, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                >
                  Close Inspector
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
