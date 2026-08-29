import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Boxes, Package, Warehouse, MapPin, Search, Filter, RefreshCw,
  TrendingUp, AlertTriangle, CheckCircle, XCircle, Eye, Download,
  BarChart3, Grid, List, ChevronRight, Info, Layers, ScanBarcode,
  Clock, Calendar, ArrowUpDown, FileText, PackageCheck, RotateCcw,
  PackageX, Zap, Activity, Bell, Settings, Target, TrendingDown,
  Plus, Edit2, Trash2, Save, X as CloseIcon, History, PieChart,
  BarChart2, LineChart, Square, CheckSquare
} from 'lucide-react';
import api from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';

const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };

export default function Inventory() {
  const { hasRole, user } = useAuth();
  const isOperational = hasRole('operational_staff');
  const isWarehouse = hasRole('warehouse_staff');
  const isAdmin = hasRole('admin');
  const isManager = hasRole('manager');

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inventoryData, setInventoryData] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [statistics, setStatistics] = useState({
    totalUnits: 0,
    available: 0,
    sold: 0,
    returned: 0,
    damaged: 0,
    lowStock: 0,
  });

  // Advanced Features State
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'alerts', 'analytics', 'movements'
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [bulkOperations, setBulkOperations] = useState([]);

  // Bulk Selection
  const [selectedItems, setSelectedItems] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkAction, setBulkAction] = useState('status'); // 'status' or 'location'
  const [bulkUpdates, setBulkUpdates] = useState({});

  // Low Stock Configuration
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [thresholdForm, setThresholdForm] = useState({
    product_id: '',
    warehouse_id: '',
    min_quantity: 10,
    reorder_quantity: 50,
    critical_quantity: 5,
    alert_enabled: true
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'location', 'status'

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Load data
  useEffect(() => {
    loadAllData();
  }, []);

  // Reload stats when warehouse filter changes
  useEffect(() => {
    if (!loading) {
      loadDashboardStats();
    }
  }, [selectedWarehouse]);

  useEffect(() => {
    if (activeTab === 'alerts') {
      loadLowStockAlerts();
    } else if (activeTab === 'analytics') {
      loadAnalytics();
    } else if (activeTab === 'movements') {
      loadStockMovements();
    }
  }, [activeTab]);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadInventoryData(),
      loadWarehouses(),
      loadDashboardStats()
    ]);
    setLoading(false);
  };

  const loadWarehouses = async () => {
    try {
      const { data } = await api.get('/warehouses');
      if (data?.warehouses) {
        setWarehouses(data.warehouses);
      }
    } catch (error) {
      console.error('Failed to load warehouses:', error);
    }
  };

  const loadInventoryData = async () => {
    try {
      setRefreshing(true);
      const { data } = await api.get('/inventory-units', {
        params: { limit: 1000 }
      });

      if (data?.inventoryUnits) {
        setInventoryData(data.inventoryUnits);
        calculateStatistics(data.inventoryUnits);
      }
    } catch (error) {
      console.error('Failed to load inventory:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const loadDashboardStats = async () => {
    try {
      const warehouseParam = selectedWarehouse !== 'all' ? selectedWarehouse : undefined;
      const { data } = await api.get('/inventory/dashboard-stats', {
        params: { warehouse_id: warehouseParam }
      });
      if (data?.stats) {
        setStatistics({
          totalUnits: data.stats.totalUnits || 0,
          available: data.stats.available || 0,
          sold: data.stats.sold || 0,
          returned: data.stats.returned || 0,
          damaged: data.stats.damaged || 0,
          lowStockAlerts: data.stats.lowStockAlerts || 0
        });
      }
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
      // Fallback to calculating from inventory data if API fails
      if (inventoryData.length > 0) {
        calculateStatistics(inventoryData);
      }
    }
  };

  const loadLowStockAlerts = async () => {
    try {
      const { data } = await api.get('/inventory/low-stock-alerts');
      if (data?.alerts) {
        setLowStockAlerts(data.alerts);
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  };

  const loadStockMovements = async () => {
    try {
      const { data } = await api.get('/inventory/movements', {
        params: {
          warehouse_id: selectedWarehouse !== 'all' ? selectedWarehouse : null,
          days: 30,
          limit: 100
        }
      });
      if (data?.movements) {
        setStockMovements(data.movements);
      }
    } catch (error) {
      console.error('Failed to load movements:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const { data } = await api.get('/inventory/analytics', {
        params: {
          warehouse_id: selectedWarehouse !== 'all' ? selectedWarehouse : null,
          days: 30
        }
      });
      if (data?.analytics) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  const calculateStatistics = (data) => {
    const stats = {
      totalUnits: data.length,
      available: data.filter(item => ['AVAILABLE', 'NEW'].includes(item.status)).length,
      sold: data.filter(item => item.status === 'SOLD').length,
      returned: data.filter(item => item.status === 'RETURNED').length,
      damaged: data.filter(item => item.status === 'DAMAGED').length,
      lowStockAlerts: statistics.lowStockAlerts || 0, // Preserve low stock from API
    };
    setStatistics(stats);
    
    // Also fetch low stock alerts count if not already set
    if (!statistics.lowStockAlerts) {
      fetchLowStockCount();
    }
  };

  const fetchLowStockCount = async () => {
    try {
      const { data } = await api.get('/inventory/low-stock-alerts');
      if (data?.alerts) {
        setStatistics(prev => ({
          ...prev,
          lowStockAlerts: data.alerts.length
        }));
      }
    } catch (error) {
      console.error('Failed to fetch low stock count:', error);
    }
  };

  // Bulk operations
  const toggleSelectItem = (itemId) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const selectAllVisible = () => {
    const visibleIds = paginatedData.map(item => item.id);
    setSelectedItems(visibleIds);
  };

  const clearSelection = () => {
    setSelectedItems([]);
  };

  const handleBulkUpdate = async () => {
    if (selectedItems.length === 0) {
      alert('No items selected');
      return;
    }

    if (Object.keys(bulkUpdates).length === 0) {
      alert('No updates specified');
      return;
    }

    try {
      const { data } = await api.post('/inventory/bulk-update', {
        inventory_unit_ids: selectedItems,
        updates: bulkUpdates
      });

      if (data.success) {
        alert(`✅ Successfully updated ${data.updated_count} items`);
        setShowBulkModal(false);
        setBulkUpdates({});
        clearSelection();
        loadInventoryData();
      }
    } catch (error) {
      console.error('Bulk update failed:', error);
      alert('❌ Failed to perform bulk update: ' + (error.response?.data?.error || error.message));
    }
  };

  // Low stock threshold management
  const handleCreateThreshold = async () => {
    try {
      const { data } = await api.post('/inventory/low-stock-thresholds', thresholdForm);
      if (data.success) {
        alert('✅ Threshold created successfully');
        setShowThresholdModal(false);
        setThresholdForm({
          product_id: '',
          warehouse_id: '',
          min_quantity: 10,
          reorder_quantity: 50,
          critical_quantity: 5,
          alert_enabled: true
        });
        loadLowStockAlerts();
      }
    } catch (error) {
      console.error('Failed to create threshold:', error);
      alert('❌ ' + (error.response?.data?.error || 'Failed to create threshold'));
    }
  };

  // Filter and sort data
  const getFilteredData = () => {
    let filtered = [...inventoryData];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.inventory_unit_code?.toLowerCase().includes(query) ||
        item.products?.sku?.toLowerCase().includes(query) ||
        item.products?.model?.toLowerCase().includes(query) ||
        item.products?.brand?.toLowerCase().includes(query) ||
        item.warehouses?.name?.toLowerCase().includes(query) ||
        item.rack?.toLowerCase().includes(query)
      );
    }

    if (selectedWarehouse !== 'all') {
      filtered = filtered.filter(item => item.warehouse_id === selectedWarehouse);
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(item => item.status === selectedStatus);
    }

    switch (sortBy) {
      case 'recent':
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'location':
        filtered.sort((a, b) => {
          const locA = `${a.warehouses?.name || ''}-${a.rack || ''}`.toLowerCase();
          const locB = `${b.warehouses?.name || ''}-${b.rack || ''}`.toLowerCase();
          return locA.localeCompare(locB);
        });
        break;
      case 'status':
        filtered.sort((a, b) => (a.status || '').localeCompare(b.status || ''));
        break;
      default:
        break;
    }

    return filtered;
  };

  const filteredData = getFilteredData();
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Export data
  const handleExport = () => {
    const csvData = [
      ['Unit Code', 'SKU', 'Product', 'Warehouse', 'Rack', 'Position', 'Status', 'Received Date'],
      ...filteredData.map(item => [
        item.inventory_unit_code || '',
        item.products?.sku || '',
        `${item.products?.brand || ''} ${item.products?.model || ''}`.trim(),
        item.warehouses?.name || '',
        item.rack || '',
        item.position_code || '',
        item.status || '',
        item.received_at ? new Date(item.received_at).toLocaleDateString() : '',
      ])
    ];

    const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `inventory-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'NEW':
      case 'AVAILABLE':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'SOLD':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'RETURNED':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'DAMAGED':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'INSPECTION':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'NEW':
      case 'AVAILABLE':
        return <CheckCircle className="w-4 h-4" />;
      case 'SOLD':
        return <PackageCheck className="w-4 h-4" />;
      case 'RETURNED':
        return <RotateCcw className="w-4 h-4" />;
      case 'DAMAGED':
        return <PackageX className="w-4 h-4" />;
      case 'INSPECTION':
        return <Eye className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm text-slate-600">Loading inventory data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div variants={fadeUp} className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Boxes className="w-6 h-6" />
              <h1 className="text-2xl sm:text-3xl font-bold">Inventory Management</h1>
            </div>
            <p className="text-indigo-100 text-sm max-w-2xl">
              Real-time view of stock levels, locations, and status across all warehouses
            </p>
          </div>
          <button
            onClick={loadAllData}
            disabled={refreshing}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl flex items-center gap-2 text-sm font-medium transition-all border border-white/20 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Statistics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
            <p className="text-xs text-indigo-200 font-semibold mb-1">Total Units</p>
            <p className="text-2xl font-bold">{statistics.totalUnits.toLocaleString()}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
            <p className="text-xs text-green-200 font-semibold mb-1">Available</p>
            <p className="text-2xl font-bold text-green-300">{statistics.available.toLocaleString()}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
            <p className="text-xs text-blue-200 font-semibold mb-1">Sold</p>
            <p className="text-2xl font-bold text-blue-300">{statistics.sold.toLocaleString()}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
            <p className="text-xs text-amber-200 font-semibold mb-1">Returned</p>
            <p className="text-2xl font-bold text-amber-300">{statistics.returned.toLocaleString()}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
            <p className="text-xs text-red-200 font-semibold mb-1">Damaged</p>
            <p className="text-2xl font-bold text-red-300">{statistics.damaged.toLocaleString()}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 cursor-pointer hover:bg-white/15 transition-all" onClick={() => setActiveTab('alerts')}>
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-orange-300" />
              <p className="text-xs text-orange-200 font-semibold mb-1">Low Stock</p>
            </div>
            <p className="text-2xl font-bold text-orange-300">{statistics.lowStockAlerts || 0}</p>
          </div>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div variants={fadeUp} className="bg-white rounded-xl p-2 border border-slate-200 shadow-sm">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'inventory'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Package className="w-4 h-4" />
            Inventory
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'alerts'
                ? 'bg-orange-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Bell className="w-4 h-4" />
            Low Stock Alerts
            {lowStockAlerts.length > 0 && (
              <span className="px-2 py-0.5 bg-orange-500 text-white rounded-full text-xs font-bold">
                {lowStockAlerts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'movements'
                ? 'bg-green-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            Movement History
          </button>
        </div>
      </motion.div>

      {/* Tab Content - will continue in next message */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link to="/barcode/scan" className="bg-white rounded-xl p-4 border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <ScanBarcode className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Scan Item</p>
              <p className="text-xs text-slate-500">Quick lookup</p>
            </div>
          </div>
        </Link>

        <Link to="/warehouse" className="bg-white rounded-xl p-4 border border-slate-200 hover:border-green-300 hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Warehouse className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Warehouses</p>
              <p className="text-xs text-slate-500">View locations</p>
            </div>
          </div>
        </Link>

        <Link to="/batches" className="bg-white rounded-xl p-4 border border-slate-200 hover:border-purple-300 hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Layers className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Batches</p>
              <p className="text-xs text-slate-500">Manage batches</p>
            </div>
          </div>
        </Link>

        <button
          onClick={handleExport}
          className="bg-white rounded-xl p-4 border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Download className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Export</p>
              <p className="text-xs text-slate-500">Download CSV</p>
            </div>
          </div>
        </button>
      </motion.div>

      {/* Filters & Search */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-2">Search Inventory</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by SKU, product, location..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Warehouse Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Warehouse</label>
            <select
              value={selectedWarehouse}
              onChange={(e) => {
                setSelectedWarehouse(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Warehouses</option>
              {warehouses.map(wh => (
                <option key={wh.id} value={wh.id}>{wh.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="NEW">New</option>
              <option value="AVAILABLE">Available</option>
              <option value="SOLD">Sold</option>
              <option value="RETURNED">Returned</option>
              <option value="DAMAGED">Damaged</option>
              <option value="INSPECTION">Inspection</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortBy('recent')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sortBy === 'recent'
                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5 inline mr-1" />
              Recent
            </button>
            <button
              onClick={() => setSortBy('location')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sortBy === 'location'
                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 inline mr-1" />
              Location
            </button>
            <button
              onClick={() => setSortBy('status')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sortBy === 'status'
                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5 inline mr-1" />
              Status
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">
              Showing {paginatedData.length} of {filteredData.length} items
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg ${
                  viewMode === 'grid'
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg ${
                  viewMode === 'list'
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Inventory Grid/List */}
      {paginatedData.length === 0 ? (
        <motion.div variants={fadeUp} className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Inventory Found</h3>
          <p className="text-sm text-slate-600 mb-4">
            {searchQuery || selectedWarehouse !== 'all' || selectedStatus !== 'all'
              ? 'Try adjusting your filters'
              : 'Start by receiving shipments or registering products'}
          </p>
          <Link
            to="/shipments/incoming"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <Package className="w-4 h-4" />
            Receive Shipment
          </Link>
        </motion.div>
      ) : viewMode === 'grid' ? (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedData.map((item) => (
            <motion.div
              key={item.id}
              variants={fadeUp}
              className="bg-white rounded-xl p-4 border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group"
            >
              {/* Product Info */}
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <Package className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 truncate">
                    {item.products?.brand} {item.products?.model}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">{item.products?.sku}</p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(item.status)}`}>
                  {getStatusIcon(item.status)}
                  {item.status}
                </span>
              </div>

              {/* Location */}
              <div className="space-y-1.5 mb-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Warehouse className="w-3.5 h-3.5" />
                  <span className="font-medium">{item.warehouses?.name || 'Not assigned'}</span>
                </div>
                {item.rack && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="font-mono">{item.rack}</span>
                  </div>
                )}
                {item.position_code && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Info className="w-3.5 h-3.5" />
                    <span className="font-mono text-xs">{item.position_code}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <Link
                to={`/barcode/scan?code=${item.inventory_unit_code}`}
                className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg text-xs font-medium transition-all group-hover:bg-indigo-50"
              >
                <Eye className="w-3.5 h-3.5" />
                View Details
              </Link>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Warehouse</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Received</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-900 font-medium">
                      {item.products?.brand} {item.products?.model}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 font-mono">{item.products?.sku}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{item.warehouses?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 font-mono">{item.rack || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(item.status)}`}>
                        {getStatusIcon(item.status)}
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {item.received_at ? new Date(item.received_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/barcode/scan?code=${item.inventory_unit_code}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-xs font-medium"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div variants={fadeUp} className="flex items-center justify-between bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-sm text-slate-600">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
