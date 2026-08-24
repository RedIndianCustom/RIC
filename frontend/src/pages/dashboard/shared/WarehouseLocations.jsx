import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Edit, Trash2, MapPin, Package, Search, Filter,
  Hash, Tag, Grid2x2, Layers, BookOpen, Box,
  CheckCircle2, AlertCircle, XCircle, Wrench, X,
} from 'lucide-react';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';
import Table from '../../../components/common/Table';
import Loading from '../../../components/common/Loading';
import EmptyState from '../../../components/common/EmptyState';
import { showToast } from '../../../utils/toast';
import api from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';

const fadeIn = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

// ── Inline field label wrapper ────────────────────────────────────────────────
function Field({ label, required, hint, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

// ── Styled text input ─────────────────────────────────────────────────────────
function TextInput({ icon: Icon, className = '', ...props }) {
  return (
    <div className="relative">
      {Icon && (
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
          <Icon size={15} />
        </span>
      )}
      <input
        className={`w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 text-sm text-slate-900 outline-none transition
          placeholder:text-slate-400
          focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100
          ${Icon ? 'pl-9 pr-3' : 'px-3'} ${className}`}
        {...props}
      />
    </div>
  );
}

// ── Status picker ─────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: 'active',      label: 'Active',      Icon: CheckCircle2, color: 'text-green-600 bg-green-50  border-green-200' },
  { value: 'full',        label: 'Full',         Icon: AlertCircle,  color: 'text-amber-600 bg-amber-50  border-amber-200' },
  { value: 'empty',       label: 'Empty',        Icon: XCircle,      color: 'text-slate-500 bg-slate-50  border-slate-200' },
  { value: 'maintenance', label: 'Maintenance',  Icon: Wrench,       color: 'text-red-600   bg-red-50    border-red-200'   },
];

function StatusPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {STATUS_OPTIONS.map(({ value: val, label, Icon, color }) => (
        <button
          key={val}
          type="button"
          onClick={() => onChange(val)}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all
            ${value === val
              ? `${color} shadow-sm ring-2 ring-current ring-offset-1`
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
        >
          <Icon size={15} />
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, label }) {
  return (
    <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
      <Icon size={12} /> {label}
    </p>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  code: '',
  warehouseCode: '',
  rackDesignation: '',
  rackSize: '',
  totalRacks: '1',
  shelvesPerRack: '4',
  sectionsPerShelf: '6',
  subsectionsPerSection: '2',
  capacity: '100',  // Default capacity
  current_stock: '0',
  status: 'active',
  // Ensure all possible fields have defaults
  name: '',
  zone: '',
  aisle: '',
  rack: '',
  shelf: '',
};

export default function WarehouseLocations() {
  const { hasRole } = useAuth();
  const [locations,       setLocations]       = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [showModal,       setShowModal]       = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [searchQuery,     setSearchQuery]     = useState('');
  const [filterZone,      setFilterZone]      = useState('all');
  const [submitting,      setSubmitting]      = useState(false);
  const [formData,        setFormData]        = useState(EMPTY_FORM);
  const [dbReady,         setDbReady]         = useState(true);   // false = table not set up yet

  // NEW: Warehouse states
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);  // NEW: For product categories

  // Auto-generate location code when warehouse is selected
  useEffect(() => {
    if (formData.warehouseCode) {
      const autoCode = `${formData.warehouseCode}-LOC-${Date.now().toString().slice(-6)}`;
      if (!editingLocation && !formData.code) {
        setFormData(prev => ({ ...prev, code: autoCode }));
      }
    }
  }, [formData.warehouseCode, editingLocation]);

  useEffect(() => { 
    loadLocations();
    loadWarehouses();
    loadProducts();
  }, []);

  // ── Data loading ────────────────────────────────────────────────────────────
  const loadLocations = async () => {
    setLoading(true);
    try {
      const response = await api.get('/warehouse-locations');
      const fetched  = response.data.locations || [];
      setLocations(fetched);
      setDbReady(true);
    } catch (err) {
      setLocations([]);
      // 503 means the DB table hasn't been created yet
      const is503 =
        err.response?.status === 503 ||
        err.status === 503 ||
        err.message?.toLowerCase().includes('not configured');
      if (is503) {
        setDbReady(false);
      } else {
        console.warn('Warehouse locations API error:', err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadWarehouses = async () => {
    try {
      const { data } = await api.get('/warehouses');
      setWarehouses(data.warehouses || []);
    } catch (err) {
      console.warn('Could not load warehouses:', err);
      setWarehouses([]);
    }
  };

  const loadProducts = async () => {
    try {
      const { data } = await api.get('/products');
      setProducts(data.products || []);
    } catch (err) {
      console.warn('Could not load products:', err);
      setProducts([]);
    }
  };

  // Get product sizes for selected category
  const getProductSizes = () => {
    if (!formData.rackDesignation || products.length === 0) return [];
    
    return products
      .filter(p => p.category === formData.rackDesignation)
      .map(p => ({
        value: p.dimensions || p.sku,
        label: `${p.dimensions || p.sku} - ${p.model || p.product_name || 'Unknown'}`,
        // Default rack configurations based on product category/size
        defaultConfig: getDefaultRackConfig(p.category, p.dimensions)
      }));
  };

  // Get default rack configuration based on product category and size
  const getDefaultRackConfig = (category, size) => {
    // Default configurations for different tire sizes
    const configs = {
      'Sawtooth': { totalRacks: '3', shelvesPerRack: '4', sectionsPerShelf: '6', subsectionsPerSection: '2' },
      'Enduro': { totalRacks: '2', shelvesPerRack: '5', sectionsPerShelf: '6', subsectionsPerSection: '2' },
      'Dual Sport': { totalRacks: '2', shelvesPerRack: '4', sectionsPerShelf: '6', subsectionsPerSection: '2' },
      'Motocross': { totalRacks: '3', shelvesPerRack: '4', sectionsPerShelf: '6', subsectionsPerSection: '2' },
      'Trail': { totalRacks: '2', shelvesPerRack: '4', sectionsPerShelf: '6', subsectionsPerSection: '2' },
      'General': { totalRacks: '1', shelvesPerRack: '4', sectionsPerShelf: '6', subsectionsPerSection: '2' }
    };

    return configs[category] || { totalRacks: '1', shelvesPerRack: '4', sectionsPerShelf: '6', subsectionsPerSection: '2' };
  };


  const setField = (field) => (e) => setFormData((f) => ({ ...f, [field]: e.target.value }));

  const closeModal = () => {
    setShowModal(false);
    setEditingLocation(null);
    setFormData(EMPTY_FORM);
  };

  // ── CRUD ────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Validate required fields
      if (!formData.code) {
        showToast('Location code is required', 'error');
        setSubmitting(false);
        return;
      }
      
      if (!formData.warehouseCode) {
        showToast('Warehouse is required', 'error');
        setSubmitting(false);
        return;
      }

      if (!formData.capacity || parseInt(formData.capacity) <= 0) {
        showToast('Capacity must be greater than 0', 'error');
        setSubmitting(false);
        return;
      }

      // Transform frontend data to match database schema
      const capacity = parseInt(formData.capacity) || 0;
      const currentStock = parseInt(formData.current_stock) || 0;

      const dbData = {
        code: formData.code.trim(),
        name: `${formData.warehouseCode} - ${formData.rackDesignation || 'General'} ${formData.rackSize || ''}`.trim(),
        zone: formData.warehouseCode,
        aisle: String(formData.totalRacks).padStart(2, '0'),
        rack: String(formData.shelvesPerRack).padStart(2, '0'),
        shelf: String(formData.sectionsPerShelf).padStart(2, '0'),
        capacity: capacity,
        current_stock: currentStock,
        status: formData.status || 'active'
      };

      console.log('Submitting warehouse location:', dbData);

      if (editingLocation) {
        await api.put(`/warehouse-locations/${editingLocation.id}`, dbData);
        showToast('Location updated successfully', 'success');
      } else {
        await api.post('/warehouse-locations', dbData);
        showToast('Location created successfully', 'success');
      }
      closeModal();
      loadLocations();
    } catch (err) {
      console.error('Submit error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Operation failed';
      showToast(errorMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (location) => {
    setEditingLocation(location);
    setFormData(location);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this location?')) return;
    try {
      await api.delete(`/warehouse-locations/${id}`);
      showToast('Location deleted successfully', 'success');
      loadLocations();
    } catch {
      showToast('Failed to delete location', 'error');
    }
  };

  // ── Filtering ───────────────────────────────────────────────────────────────
  const warehouseCodes = [...new Set(locations.map((l) => l.zone).filter(Boolean))];
  const filteredLocations = locations.filter((loc) => {
    const q = searchQuery.toLowerCase();
    return (
      (loc.code?.toLowerCase().includes(q) || loc.zone?.toLowerCase().includes(q) || loc.name?.toLowerCase().includes(q)) &&
      (filterZone === 'all' || loc.zone === filterZone)
    );
  });

  const statusBadge = (s) => ({
    active:      'bg-green-100 text-green-700',
    full:        'bg-amber-100 text-amber-700',
    empty:       'bg-slate-100 text-slate-600',
    maintenance: 'bg-red-100   text-red-700',
  }[s] ?? 'bg-slate-100 text-slate-600');

  const capacityColor = (cur, cap) => {
    const pct = (cur / cap) * 100;
    if (pct >= 90) return 'text-red-600';
    if (pct >= 70) return 'text-amber-600';
    return 'text-green-600';
  };

  // ── Table columns ───────────────────────────────────────────────────────────
  const columns = [
    { key: 'code', label: 'Location Code', sortable: true },
    { 
      key: 'zone', 
      label: 'Warehouse',
      render: (val) => val || 'N/A'
    },
    { 
      key: 'name', 
      label: 'Rack Type',
      render: (val) => {
        if (!val) return <span className="text-slate-400">N/A</span>;
        // Extract rack designation from name (e.g., "WH1 - Sawtooth 90/90-ST")
        const parts = val.split(' - ');
        if (parts.length > 1) {
          return (
            <div className="flex flex-col gap-0.5">
              <span className="inline-flex px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                {parts[1]}
              </span>
            </div>
          );
        }
        return <span className="text-xs text-slate-600">{val}</span>;
      }
    },
    { 
      key: 'config', 
      label: 'Configuration',
      render: (_, row) => {
        if (!row || !row.aisle || !row.rack || !row.shelf) {
          return <span className="text-xs text-slate-400">-</span>;
        }
        // Display as: aisle(R) × rack(S) × shelf(Sec) × Sub
        return (
          <span className="text-xs text-slate-600">
            {row.aisle}R × {row.rack}S × {row.shelf}Sec × Sub
          </span>
        );
      }
    },
    {
      key: 'capacity', label: 'Capacity',
      render: (_, row) => row ? (
        <span>
          <span className={`font-semibold ${capacityColor(row.current_stock, row.capacity)}`}>
            {row.current_stock}
          </span>
          <span className="text-slate-400"> / {row.capacity}</span>
        </span>
      ) : '-',
    },
    {
      key: 'utilization', label: 'Utilization',
      render: (_, row) => {
        if (!row) return '-';
        const pct = Math.round((row.current_stock / row.capacity) * 100);
        return (
          <div className="flex items-center gap-2">
            <div className="w-20 bg-slate-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-slate-500">{pct}%</span>
          </div>
        );
      },
    },
    {
      key: 'status', label: 'Status',
      render: (val) => {
        const s = typeof val === 'string' ? val : String(val ?? 'unknown');
        return (
          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge(s)}`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </span>
        );
      },
    },
    {
      key: 'actions', label: 'Actions',
      render: (_, row) => row ? (
        <div className="flex gap-1.5">
          {hasRole('admin', 'manager', 'operational_staff') && (
            <button
              onClick={() => handleEdit(row)}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit"
            >
              <Edit size={15} />
            </button>
          )}
          {hasRole('admin', 'manager') && (
            <button
              onClick={() => handleDelete(row.id)}
              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      ) : null,
    },
  ];

  if (loading) return <Loading />;

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Warehouse Locations</h1>
          <p className="mt-0.5 text-sm text-slate-500">Manage storage locations and capacity</p>
        </div>
        {hasRole('admin', 'manager', 'operational_staff') && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} /> Add Location
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Locations', value: locations.length,                                         Icon: MapPin,  bg: 'bg-blue-50',   iconCls: 'bg-blue-100 text-blue-600',     val: 'text-blue-700'   },
          { label: 'Total Capacity',  value: locations.reduce((s, l) => s + (parseInt(l.capacity) || 0), 0),             Icon: Package, bg: 'bg-green-50',  iconCls: 'bg-green-100 text-green-600',   val: 'text-green-700'  },
          { label: 'Current Stock',   value: locations.reduce((s, l) => s + (parseInt(l.current_stock) || 0), 0),  Icon: Box,     bg: 'bg-amber-50',  iconCls: 'bg-amber-100 text-amber-600',   val: 'text-amber-700'  },
          { label: 'Warehouses',           value: warehouseCodes.length,                                             Icon: Grid2x2, bg: 'bg-purple-50', iconCls: 'bg-purple-100 text-purple-600', val: 'text-purple-700' },
        ].map(({ label, value, Icon, bg, iconCls, val }) => (
          <div key={label} className={`${bg} rounded-xl border border-slate-200 p-4`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconCls}`}>
                <Icon size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{label}</p>
                <p className={`text-2xl font-bold ${val}`}>{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by code or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
            />
          </div>
          <div className="relative w-full md:w-44">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={filterZone}
              onChange={(e) => setFilterZone(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white"
            >
              <option value="all">All Warehouses</option>
              {warehouseCodes.map((code) => <option key={code} value={code}>Warehouse {code}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Data table */}
      <div className="bg-white rounded-xl border border-slate-200">
        {!dbReady ? (
          /* Table hasn't been created — prompt admin to run migration */
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-14 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center">
              <Layers size={28} className="text-amber-600" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-800">Database table not set up yet</p>
              <p className="mt-1 text-sm text-slate-500 max-w-md">
                The <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">warehouse_locations</code> table
                does not exist in Supabase. Run the SQL migration to start managing locations.
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-left text-xs font-mono text-amber-800 max-w-sm w-full">
              Supabase Dashboard → SQL Editor<br />
              → Run: <strong>008_warehouse_locations.sql</strong>
            </div>
          </div>
        ) : filteredLocations.length > 0 ? (
          <Table columns={columns} data={filteredLocations} />
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-14 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
              <MapPin size={26} className="text-blue-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-800">No locations yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Add your first warehouse location to start tracking storage and capacity.
              </p>
            </div>
            {hasRole('admin', 'manager', 'operational_staff') && (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus size={15} /> Add First Location
              </button>
            )}
          </div>
        )}
      </div>

      {/* ================================================================
          ADD / EDIT MODAL - REDESIGNED WITH FIXED BUTTONS
      ================================================================ */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        size="lg"
        title={
          <span className="flex items-center gap-2">
            <MapPin size={16} className="text-blue-500" />
            {editingLocation ? 'Edit Warehouse Location' : 'Add New Warehouse Location'}
          </span>
        }
      >
        <form id="location-form" onSubmit={handleSubmit} className="flex flex-col h-full max-h-[calc(90vh-120px)]">
          
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-5">

            {/* Location Code */}
            <div className="space-y-3">
              <SectionHeader icon={Hash} label="Location Code" />
              <Field label="Location Code" required hint="Auto-generated unique identifier">
                <TextInput
                  icon={Hash}
                  value={formData.code || ''}
                  onChange={setField('code')}
                  placeholder="Will be auto-generated..."
                  readOnly={!editingLocation}
                  className={!editingLocation ? 'bg-slate-100 cursor-not-allowed' : ''}
                  required
                />
              </Field>
            </div>

            <hr className="border-slate-100" />

            {/* Warehouse Selection */}
            <div className="space-y-3">
              <SectionHeader icon={MapPin} label="Warehouse" />
              <Field label="Select Warehouse" required hint="Choose which warehouse this location belongs to">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
                  <select
                    value={formData.warehouseCode || ''}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        warehouseCode: e.target.value
                      });
                    }}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 outline-none transition
                      focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 cursor-pointer"
                    required
                  >
                    <option value="" disabled>Select Warehouse...</option>
                    {warehouses.map(wh => (
                      <option key={wh.id} value={wh.code}>
                        {wh.name} ({wh.code})
                      </option>
                    ))}
                  </select>
                </div>
              </Field>

              {warehouses.length === 0 && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-300">
                  <p className="text-xs text-amber-800 font-medium flex items-center gap-2">
                    <AlertCircle size={14} />
                    No warehouses found. Please add warehouses via SQL first.
                  </p>
                  <p className="text-xs text-amber-700 mt-2">
                    Run this SQL in Supabase:
                  </p>
                  <code className="block mt-1 p-2 bg-amber-100 rounded text-xs text-amber-900 font-mono">
                    INSERT INTO warehouse_locations (code, name, zone, aisle, rack, shelf, capacity, current_stock, status)<br/>
                    VALUES ('WH1', 'Main Warehouse', 'A', '01', '01', '01', 1000, 0, 'active'),<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;('WH2', 'Second Warehouse', 'B', '01', '01', '01', 1000, 0, 'active');
                  </code>
                </div>
              )}
            </div>

            <hr className="border-slate-100" />

            {/* Product/Category Designation */}
            <div className="space-y-3">
              <SectionHeader icon={Package} label="Rack Designation" />
              <Field label="Product Category" required hint="What product category will these racks hold?">
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
                  <select
                    value={formData.rackDesignation || ''}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        rackDesignation: e.target.value,
                        rackSize: ''  // Reset size when category changes
                      });
                    }}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 outline-none transition
                      focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 cursor-pointer"
                    required
                  >
                    <option value="" disabled>Select Product Category...</option>
                    <option value="Sawtooth">Sawtooth Tires</option>
                    <option value="Enduro">Enduro Tires</option>
                    <option value="Dual Sport">Dual Sport Tires</option>
                    <option value="Motocross">Motocross Tires</option>
                    <option value="Trail">Trail Tires</option>
                    <option value="General">General Purpose</option>
                  </select>
                </div>
              </Field>

              {/* Size Selector - Shows after category is selected */}
              {formData.rackDesignation && formData.rackDesignation !== 'General' && (
                <Field label="Product Size" required hint="Select the specific tire size for this rack">
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
                    <select
                      value={formData.rackSize || ''}
                      onChange={(e) => {
                        const selectedSize = e.target.value;
                        setFormData(prev => ({ ...prev, rackSize: selectedSize }));
                        
                        // Auto-fill rack configuration based on selected product
                        const sizeOptions = getProductSizes();
                        const selectedProduct = sizeOptions.find(s => s.value === selectedSize);
                        
                        if (selectedProduct && selectedProduct.defaultConfig) {
                          // Auto-fill but user can still edit
                          setFormData(prev => ({
                            ...prev,
                            rackSize: selectedSize,
                            totalRacks: selectedProduct.defaultConfig.totalRacks,
                            shelvesPerRack: selectedProduct.defaultConfig.shelvesPerRack,
                            sectionsPerShelf: selectedProduct.defaultConfig.sectionsPerShelf,
                            subsectionsPerSection: selectedProduct.defaultConfig.subsectionsPerSection
                          }));
                          
                          showToast(`Auto-filled rack configuration for ${formData.rackDesignation}. You can still edit if needed.`, 'success');
                        }
                      }}
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-blue-300 bg-blue-50 text-sm text-blue-900 font-medium outline-none transition
                        focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 cursor-pointer"
                      required
                    >
                      <option value="" disabled>Select Size...</option>
                      {getProductSizes().length > 0 ? (
                        getProductSizes().map(size => (
                          <option key={size.value} value={size.value}>
                            {size.label}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>No sizes available for this category</option>
                      )}
                    </select>
                  </div>
                </Field>
              )}

              {/* Display Selected Product Info */}
              {formData.rackDesignation && formData.rackSize && (
                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-300">
                  <div className="text-xs font-semibold text-emerald-700 mb-1">✅ Rack Configured For:</div>
                  <div className="text-xs text-emerald-900 font-medium">
                    {formData.rackDesignation} - {formData.rackSize}
                  </div>
                  <div className="text-[10px] text-emerald-600 mt-1">
                    Configuration auto-filled below. Edit if needed.
                  </div>
                </div>
              )}
            </div>

            <hr className="border-slate-100" />

            {/* Rack Configuration */}
            <div className="space-y-3">
              <SectionHeader icon={Layers} label="Rack Configuration" />
              <p className="text-xs text-slate-600 mb-3">
                Configuration will auto-fill when you select a product size. Shows totals across all racks.
              </p>

              <div className="space-y-3">
                {/* Total Racks */}
                <Field label="Total Racks" required hint="How many racks for this product">
                  <TextInput
                    icon={Grid2x2}
                    type="number"
                    min="1"
                    max="100"
                    value={formData.totalRacks || '1'}
                    onChange={setField('totalRacks')}
                    placeholder="e.g., 2"
                    required
                  />
                </Field>

                {/* Grid for per-rack values */}
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Shelves/Rack" required hint="Per rack">
                    <TextInput
                      icon={Layers}
                      type="number"
                      min="1"
                      max="20"
                      value={formData.shelvesPerRack || '4'}
                      onChange={setField('shelvesPerRack')}
                      placeholder="4"
                      required
                    />
                  </Field>

                  <Field label="Sections/Shelf" required hint="Per shelf">
                    <TextInput
                      icon={Box}
                      type="number"
                      min="1"
                      max="20"
                      value={formData.sectionsPerShelf || '6'}
                      onChange={setField('sectionsPerShelf')}
                      placeholder="6"
                      required
                    />
                  </Field>

                  <Field label="Subsections" required hint="Per section">
                    <TextInput
                      icon={Tag}
                      type="number"
                      min="1"
                      max="10"
                      value={formData.subsectionsPerSection || '2'}
                      onChange={setField('subsectionsPerSection')}
                      placeholder="2"
                      required
                    />
                  </Field>
                </div>
              </div>

              {/* Configuration Summary - Shows TOTALS */}
              {formData.totalRacks && formData.shelvesPerRack && formData.sectionsPerShelf && formData.subsectionsPerSection && (
                <div className="p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-semibold text-blue-700">
                      📊 Total Configuration Summary
                    </div>
                    {formData.rackSize && (
                      <span className="text-[10px] font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                        Auto-filled for {formData.rackDesignation}
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {/* Base Configuration */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-blue-900 pb-2 border-b border-blue-200">
                      <div className="flex items-center gap-1">
                        <Grid2x2 size={12} className="text-blue-600" />
                        <span className="font-semibold">Racks:</span>
                        <span className="font-bold text-blue-700">{formData.totalRacks}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Layers size={12} className="text-blue-600" />
                        <span className="font-semibold">Shelves/Rack:</span>
                        <span className="font-bold text-blue-700">{formData.shelvesPerRack}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Box size={12} className="text-blue-600" />
                        <span className="font-semibold">Sections/Shelf:</span>
                        <span className="font-bold text-blue-700">{formData.sectionsPerShelf}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Tag size={12} className="text-blue-600" />
                        <span className="font-semibold">Subsections:</span>
                        <span className="font-bold text-blue-700">{formData.subsectionsPerSection}</span>
                      </div>
                    </div>

                    {/* Total Calculations */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-blue-100 rounded-lg p-2 text-center">
                        <div className="text-[10px] font-medium text-blue-600 mb-1">Total Shelves</div>
                        <div className="text-lg font-bold text-blue-800">
                          {parseInt(formData.totalRacks || 0) * parseInt(formData.shelvesPerRack || 0)}
                        </div>
                      </div>
                      <div className="bg-indigo-100 rounded-lg p-2 text-center">
                        <div className="text-[10px] font-medium text-indigo-600 mb-1">Total Sections</div>
                        <div className="text-lg font-bold text-indigo-800">
                          {parseInt(formData.totalRacks || 0) * 
                           parseInt(formData.shelvesPerRack || 0) * 
                           parseInt(formData.sectionsPerShelf || 0)}
                        </div>
                      </div>
                      <div className="bg-purple-100 rounded-lg p-2 text-center">
                        <div className="text-[10px] font-medium text-purple-600 mb-1">Total Subsections</div>
                        <div className="text-lg font-bold text-purple-800">
                          {parseInt(formData.totalRacks || 0) * 
                           parseInt(formData.shelvesPerRack || 0) * 
                           parseInt(formData.sectionsPerShelf || 0) * 
                           parseInt(formData.subsectionsPerSection || 0)}
                        </div>
                      </div>
                    </div>

                    {/* Total Storage Positions */}
                    <div className="bg-gradient-to-r from-emerald-100 to-green-100 rounded-lg p-2 text-center border-2 border-emerald-400">
                      <div className="text-[10px] font-semibold text-emerald-700 mb-1">
                        🎯 TOTAL STORAGE POSITIONS
                      </div>
                      <div className="text-2xl font-black text-emerald-800">
                        {parseInt(formData.totalRacks || 0) *
                          parseInt(formData.shelvesPerRack || 0) *
                          parseInt(formData.sectionsPerShelf || 0) *
                          parseInt(formData.subsectionsPerSection || 0)}
                      </div>
                      <div className="text-[9px] text-emerald-600 mt-1">
                        Available tire positions across all racks
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <hr className="border-slate-100" />

            {/* Capacity */}
            <div className="space-y-3">
              <SectionHeader icon={Package} label="Capacity" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Max Capacity" required hint="Total units this location holds">
                  <TextInput
                    icon={Package}
                    type="number"
                    min="0"
                    value={formData.capacity || '100'}
                    onChange={setField('capacity')}
                    placeholder="100"
                    required
                  />
                </Field>
                <Field label="Current Stock" required hint="Units currently stored">
                  <TextInput
                    icon={Box}
                    type="number"
                    min="0"
                    value={formData.current_stock || '0'}
                    onChange={setField('current_stock')}
                    placeholder="0"
                    required
                  />
                </Field>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Status */}
            <div className="space-y-3 pb-4">
              <SectionHeader icon={CheckCircle2} label="Status" />
              <StatusPicker
                value={formData.status || 'active'}
                onChange={(val) => setFormData((f) => ({ ...f, status: val }))}
              />
            </div>

          </div>

          {/* Fixed Action Buttons - ALWAYS VISIBLE */}
          <div className="flex-shrink-0 border-t border-slate-200 pt-4 mt-4 bg-white">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <X size={15} /> Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  : editingLocation ? <Edit size={15} /> : <Plus size={15} />
                }
                {submitting ? 'Saving...' : editingLocation ? 'Update Location' : 'Create Location'}
              </button>
            </div>
          </div>

        </form>
      </Modal>

    </motion.div>
  );
}
