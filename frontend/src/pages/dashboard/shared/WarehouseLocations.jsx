import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Edit, Trash2, MapPin, Package, Search, Filter,
  Hash, Tag, Grid2x2, Layers, Box,
  CheckCircle2, AlertCircle, XCircle, Wrench, X,
  Warehouse, ChevronDown, ChevronRight,
  Rows3, LayoutGrid, Archive, Eye, Save, RefreshCw,
} from 'lucide-react';
import Modal from '../../../components/common/Modal';
import Loading from '../../../components/common/Loading';
import { showToast } from '../../../utils/toast';
import api from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';

const fadeIn = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

/* ============================================================================
   FIELD
============================================================================ */
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

/* ============================================================================
   TEXT INPUT
============================================================================ */
function TextInput({ icon: Icon, className = '', ...props }) {
  return (
    <div className="relative">
      {Icon && (
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
          <Icon size={15} />
        </span>
      )}
      <input
        className={`w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 ${Icon ? 'pl-9 pr-3' : 'px-3'} ${className}`}
        {...props}
      />
    </div>
  );
}

/* ============================================================================
   STATUS OPTIONS
============================================================================ */
const STATUS_OPTIONS = [
  { value: 'active',      label: 'Active',      Icon: CheckCircle2, color: 'text-green-600 bg-green-50 border-green-200' },
  { value: 'full',        label: 'Full',         Icon: AlertCircle,  color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { value: 'empty',       label: 'Empty',        Icon: XCircle,      color: 'text-slate-500 bg-slate-50 border-slate-200' },
  { value: 'maintenance', label: 'Maintenance',  Icon: Wrench,       color: 'text-red-600 bg-red-50 border-red-200' },
];

function StatusPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {STATUS_OPTIONS.map(({ value: val, label, Icon, color }) => (
        <button
          key={val}
          type="button"
          onClick={() => onChange(val)}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
            value === val
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

/* ============================================================================
   SECTION HEADER
============================================================================ */
function SectionHeader({ icon: Icon, label }) {
  return (
    <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
      <Icon size={12} />
      {label}
    </p>
  );
}

/* ============================================================================
   TIRE SIZE BADGE
============================================================================ */
function TireSizeBadge({ tireSize, quantity }) {
  if (!tireSize) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
        Empty
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
      <Tag size={11} />
      {tireSize}
      {quantity !== undefined && <span className="font-bold">× {quantity}</span>}
    </span>
  );
}

/* ============================================================================
   DEFAULT FORM

   One Warehouse Location = One Physical Rack
   Example:
     Warehouse : WH1
     Row       : 01
     Rack      : 02
     Rack Code : WH1-R01-RK02
============================================================================ */
const EMPTY_FORM = {
  code:                  '',
  warehouseCode:         '',
  rowNumber:             '1',
  rackNumber:            '1',
  rackType:              'Standard Tire Rack',
  sectionsPerRack:       '6',
  shelvesPerSection:     '8',
  subsectionsPerSection: '2',
  tiresPerSubsection:    '14',   // maximum physical capacity per subsection
  capacity:              '',
  current_stock:         '0',
  status:                'active',
};

/* ============================================================================
   HELPERS
============================================================================ */
function padNumber(value, length = 2) {
  return String(value || 0).padStart(length, '0');
}

/** WH1 + Row 01 + Rack 02  →  WH1-R01-RK02 */
function generateRackCode(warehouseCode, rowNumber, rackNumber) {
  if (!warehouseCode) return '';
  return `${warehouseCode}-R${padNumber(rowNumber)}-RK${padNumber(rackNumber)}`;
}

/** WH1-R01-RK02 + S01-SH01-SUB01  →  full position code */
function generatePositionCode(warehouseCode, rowNumber, rackNumber, section, shelf, subsection) {
  return `${generateRackCode(warehouseCode, rowNumber, rackNumber)}-S${padNumber(section)}-SH${padNumber(shelf)}-SUB${padNumber(subsection)}`;
}

/** Sections × Shelves × Subsections × Tires  →  max tire capacity */
function calcRackCapacity(form) {
  const sections    = parseInt(form.sectionsPerRack       || 0);
  const shelves     = parseInt(form.shelvesPerSection     || 0);
  const subsections = parseInt(form.subsectionsPerSection || 0);
  const tires       = parseInt(form.tiresPerSubsection    || 0);
  if (!sections || !shelves || !subsections || !tires) return 0;
  return sections * shelves * subsections * tires;
}

/** Sections × Shelves × Subsections  →  number of storage slots */
function calcStoragePositions(form) {
  const sections    = parseInt(form.sectionsPerRack       || 0);
  const shelves     = parseInt(form.shelvesPerSection     || 0);
  const subsections = parseInt(form.subsectionsPerSection || 0);
  if (!sections || !shelves || !subsections) return 0;
  return sections * shelves * subsections;
}

function generateExactLocationExample(warehouseCode, rowNumber, rackNumber) {
  if (!warehouseCode) return 'Select warehouse first';
  return generatePositionCode(warehouseCode, rowNumber, rackNumber, 1, 1, 1);
}

function getPositionUtilization(position) {
  const capacity = Number(position.capacity || 0);
  const stock    = Number(position.current_stock || position.quantity || 0);
  if (!capacity) return 0;
  return Math.min(100, Math.round((stock / capacity) * 100));
}

function capacityColor(current, capacity) {
  if (!capacity) return 'text-slate-500';
  const pct = (current / capacity) * 100;
  if (pct >= 90) return 'text-red-600';
  if (pct >= 70) return 'text-amber-600';
  return 'text-green-600';
}

/**
 * Build an empty positions array from rack metadata.
 * Used as a local fallback when the backend positions endpoint
 * is not yet implemented.
 */
function buildEmptyPositions(location) {
  const meta             = location?.metadata || {};
  const warehouseCode    = meta.warehouseCode   || location.zone  || '';
  const rowNumber        = Number(meta.rowNumber    ?? parseInt(location.aisle) ?? 1);
  const rackNumber       = Number(meta.rackNumber   ?? parseInt(location.rack)  ?? 1);
  const sections         = Number(meta.sectionsPerRack       ?? parseInt(location.shelf) ?? 0);
  const shelves          = Number(meta.shelvesPerSection     ?? 0);
  const subsections      = Number(meta.subsectionsPerSection ?? 0);
  const capacityPerSub   = Number(meta.tiresPerSubsection    ?? 0);

  const positions = [];
  for (let section = 1; section <= sections; section++) {
    for (let shelf = 1; shelf <= shelves; shelf++) {
      for (let sub = 1; sub <= subsections; sub++) {
        positions.push({
          id:                  `generated-${section}-${shelf}-${sub}`,
          warehouse_location_id: location.id,
          section_number:      section,
          shelf_number:        shelf,
          subsection_number:   sub,
          position_code:       generatePositionCode(warehouseCode, rowNumber, rackNumber, section, shelf, sub),
          capacity:            capacityPerSub,
          current_stock:       0,
          tire_size:           null,
          status:              'empty',
        });
      }
    }
  }
  return positions;
}

/* ============================================================================
   MAIN COMPONENT
============================================================================ */
export default function WarehouseLocations() {
  const { hasRole } = useAuth();

  const [locations,        setLocations]        = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [showModal,        setShowModal]        = useState(false);
  const [editingLocation,  setEditingLocation]  = useState(null);
  const [searchQuery,      setSearchQuery]      = useState('');
  const [filterZone,       setFilterZone]       = useState('all');
  const [openFolders,      setOpenFolders]      = useState({});
  const [submitting,       setSubmitting]       = useState(false);
  const [formData,         setFormData]         = useState(EMPTY_FORM);
  const [dbReady,          setDbReady]          = useState(true);
  const [warehouses,       setWarehouses]       = useState([]);

  // Positions state
  const [rackPositions,       setRackPositions]       = useState({});
  const [loadingPositions,    setLoadingPositions]    = useState({});
  const [selectedRack,        setSelectedRack]        = useState(null);
  const [showPositionsModal,  setShowPositionsModal]  = useState(false);
  const [selectedPosition,    setSelectedPosition]    = useState(null);
  const [positionSaving,      setPositionSaving]      = useState(false);
  const [tireSizeInput,       setTireSizeInput]       = useState('');
  const [quantityInput,       setQuantityInput]       = useState('0');

  /* --------------------------------------------------------------------------
     AUTO-GENERATE PHYSICAL RACK CODE
  -------------------------------------------------------------------------- */
  useEffect(() => {
    if (formData.warehouseCode && formData.rowNumber && formData.rackNumber && !editingLocation) {
      setFormData(prev => ({
        ...prev,
        code: generateRackCode(formData.warehouseCode, formData.rowNumber, formData.rackNumber),
      }));
    }
  }, [formData.warehouseCode, formData.rowNumber, formData.rackNumber, editingLocation]);

  /* --------------------------------------------------------------------------
     AUTO-CALCULATE CAPACITY
  -------------------------------------------------------------------------- */
  useEffect(() => {
    const total = calcRackCapacity(formData);
    if (total > 0) setFormData(prev => ({ ...prev, capacity: String(total) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.sectionsPerRack, formData.shelvesPerSection, formData.subsectionsPerSection, formData.tiresPerSubsection]);

  /* --------------------------------------------------------------------------
     INITIAL LOAD
  -------------------------------------------------------------------------- */
  useEffect(() => {
    loadLocations();
    loadWarehouses();
  }, []);

  /* --------------------------------------------------------------------------
     LOAD LOCATIONS
  -------------------------------------------------------------------------- */
  const loadLocations = async () => {
    setLoading(true);
    try {
      const response = await api.get('/warehouse-locations');
      const fetched  = response.data.locations || [];
      setLocations(fetched);
      setDbReady(true);
      const allOpen = {};
      fetched.forEach(loc => { if (loc.zone) allOpen[loc.zone] = true; });
      setOpenFolders(allOpen);
    } catch (err) {
      setLocations([]);
      const is503 =
        err.response?.status === 503 ||
        err.status === 503 ||
        err.message?.toLowerCase().includes('not configured');
      if (is503) setDbReady(false);
      else console.warn('Warehouse locations API error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------------------------------------------------------
     LOAD WAREHOUSES
  -------------------------------------------------------------------------- */
  const loadWarehouses = async () => {
    try {
      const { data } = await api.get('/warehouses');
      setWarehouses(data.warehouses || []);
    } catch (err) {
      console.warn('Could not load warehouses:', err);
      setWarehouses([]);
    }
  };

  /* --------------------------------------------------------------------------
     LOAD RACK POSITIONS
     Falls back to locally-generated empty positions when backend
     GET /warehouse-locations/:id/positions is not yet available.
  -------------------------------------------------------------------------- */
  const loadRackPositions = async (location, force = false) => {
    if (!location?.id) return;
    if (rackPositions[location.id] && !force) return;

    setLoadingPositions(prev => ({ ...prev, [location.id]: true }));
    try {
      const response = await api.get(`/warehouse-locations/${location.id}/positions`);
      setRackPositions(prev => ({ ...prev, [location.id]: response.data.positions || [] }));
    } catch (err) {
      console.warn(`Could not load positions for rack ${location.code}:`, err.message);
      setRackPositions(prev => ({ ...prev, [location.id]: buildEmptyPositions(location) }));
    } finally {
      setLoadingPositions(prev => ({ ...prev, [location.id]: false }));
    }
  };

  /* --------------------------------------------------------------------------
     FIELD HANDLER
  -------------------------------------------------------------------------- */
  const setField = (field) => (event) =>
    setFormData(prev => ({ ...prev, [field]: event.target.value }));

  /* --------------------------------------------------------------------------
     CLOSE RACK MODAL
  -------------------------------------------------------------------------- */
  const closeModal = () => {
    setShowModal(false);
    setEditingLocation(null);
    setFormData(EMPTY_FORM);
  };

  /* --------------------------------------------------------------------------
     CLOSE POSITIONS MODAL
  -------------------------------------------------------------------------- */
  const closePositionsModal = () => {
    setShowPositionsModal(false);
    setSelectedRack(null);
    setSelectedPosition(null);
    setTireSizeInput('');
    setQuantityInput('0');
  };

  /* --------------------------------------------------------------------------
     CREATE / UPDATE RACK
  -------------------------------------------------------------------------- */
  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      if (!formData.warehouseCode) { showToast('Warehouse is required', 'error');     return; }
      if (!formData.rowNumber)     { showToast('Rack row is required', 'error');       return; }
      if (!formData.rackNumber)    { showToast('Rack number is required', 'error');    return; }

      const rackCapacity = calcRackCapacity(formData);
      if (rackCapacity <= 0) {
        showToast('Please configure sections, shelves, subsections and tires/subsection', 'error');
        return;
      }

      const currentStock = parseInt(formData.current_stock) || 0;
      if (currentStock > rackCapacity) {
        showToast('Current stock cannot exceed rack capacity', 'error');
        return;
      }

      const locationCode = formData.code ||
        generateRackCode(formData.warehouseCode, formData.rowNumber, formData.rackNumber);

      const locationMetadata = {
        structureVersion:      3,
        warehouseCode:         formData.warehouseCode,
        rowNumber:             parseInt(formData.rowNumber),
        rackNumber:            parseInt(formData.rackNumber),
        rackType:              formData.rackType,
        sectionsPerRack:       parseInt(formData.sectionsPerRack),
        shelvesPerSection:     parseInt(formData.shelvesPerSection),
        subsectionsPerSection: parseInt(formData.subsectionsPerSection),
        tiresPerSubsection:    parseInt(formData.tiresPerSubsection),
        exactLocationFormat:   `${locationCode}-S##-SH##-SUB##`,
      };

      const dbData = {
        code:          locationCode.trim(),
        name:          `${formData.warehouseCode} - Row ${padNumber(formData.rowNumber)} - Rack ${padNumber(formData.rackNumber)}`,
        zone:          formData.warehouseCode,
        aisle:         padNumber(formData.rowNumber),
        rack:          padNumber(formData.rackNumber),
        shelf:         String(formData.sectionsPerRack).padStart(2, '0'),
        capacity:      rackCapacity,
        current_stock: currentStock,
        status:        formData.status || 'active',
        metadata:      locationMetadata,
      };

      const isMetaMissing = (err) =>
        (err?.response?.data?.error || err?.message || '').toLowerCase().includes('metadata');

      const save = async (payload, id) =>
        id ? api.put(`/warehouse-locations/${id}`, payload) : api.post('/warehouse-locations', payload);

      try {
        await save(dbData, editingLocation?.id);
      } catch (metaErr) {
        if (isMetaMissing(metaErr)) {
          console.warn('metadata column missing — saving without it. Run 025_add_metadata_to_warehouse_locations.sql');
          const { metadata: _omit, ...withoutMeta } = dbData;
          await save(withoutMeta, editingLocation?.id);
        } else {
          throw metaErr;
        }
      }

      showToast(
        editingLocation ? 'Rack location updated successfully' : 'Rack location created successfully',
        'success'
      );
      await loadLocations();
      closeModal();

    } catch (error) {
      console.error('Warehouse location submit error:', error);
      showToast(error.response?.data?.error || error.message || 'Operation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  /* --------------------------------------------------------------------------
     EDIT LOCATION
  -------------------------------------------------------------------------- */
  const handleEdit = (location) => {
    const meta = location.metadata || {};
    setEditingLocation(location);
    setFormData({
      ...EMPTY_FORM,
      code:                  location.code || '',
      warehouseCode:         meta.warehouseCode         || location.zone        || '',
      rowNumber:             String(meta.rowNumber      ?? parseInt(location.aisle) ?? 1),
      rackNumber:            String(meta.rackNumber     ?? parseInt(location.rack)  ?? 1),
      rackType:              meta.rackType              || 'Standard Tire Rack',
      sectionsPerRack:       String(meta.sectionsPerRack       ?? parseInt(location.shelf) ?? 6),
      shelvesPerSection:     String(meta.shelvesPerSection     ?? 8),
      subsectionsPerSection: String(meta.subsectionsPerSection ?? 2),
      tiresPerSubsection:    String(meta.tiresPerSubsection    ?? 14),
      current_stock:         String(location.current_stock     ?? 0),
      status:                location.status || 'active',
    });
    setShowModal(true);
  };

  /* --------------------------------------------------------------------------
     DELETE LOCATION
  -------------------------------------------------------------------------- */
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this rack location?')) return;
    try {
      await api.delete(`/warehouse-locations/${id}`);
      showToast('Rack location deleted successfully', 'success');
      await loadLocations();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete rack location', 'error');
    }
  };

  /* --------------------------------------------------------------------------
     OPEN POSITION VIEWER
  -------------------------------------------------------------------------- */
  const openPositions = async (location) => {
    setSelectedRack(location);
    await loadRackPositions(location);
    setShowPositionsModal(true);
  };

  /* --------------------------------------------------------------------------
     SELECT POSITION (open assignment modal)
  -------------------------------------------------------------------------- */
  const selectPosition = (position) => {
    setSelectedPosition(position);
    setTireSizeInput(position.tire_size || position.tireSize || '');
    setQuantityInput(String(position.current_stock || position.quantity || 0));
  };

  /* --------------------------------------------------------------------------
     SAVE TIRE ASSIGNMENT
  -------------------------------------------------------------------------- */
  const savePosition = async () => {
    if (!selectedRack || !selectedPosition) return;

    const quantity = parseInt(quantityInput) || 0;
    const capacity = Number(selectedPosition.capacity || 0);

    if (quantity < 0) { showToast('Quantity cannot be negative', 'error'); return; }
    if (quantity > capacity) { showToast(`Quantity cannot exceed position capacity of ${capacity}`, 'error'); return; }
    if (quantity > 0 && !tireSizeInput.trim()) {
      showToast('Tire size is required when quantity is greater than zero', 'error');
      return;
    }

    setPositionSaving(true);
    try {
      await api.put(
        `/warehouse-locations/${selectedRack.id}/positions/${selectedPosition.id}`,
        { tire_size: quantity > 0 ? tireSizeInput.trim() : null, quantity }
      );

      showToast('Tire position updated successfully', 'success');
      await loadRackPositions(selectedRack, true);
      await loadLocations();

      // refresh selectedRack reference
      setSelectedRack(prev => locations.find(l => l.id === prev?.id) || prev);
      setSelectedPosition(null);
      setTireSizeInput('');
      setQuantityInput('0');
    } catch (error) {
      console.error('Position update error:', error);
      showToast(error.response?.data?.error || error.message || 'Failed to update tire position', 'error');
    } finally {
      setPositionSaving(false);
    }
  };

  /* --------------------------------------------------------------------------
     FILTERING
  -------------------------------------------------------------------------- */
  const warehouseCodes = [...new Set(locations.map(l => l.zone).filter(Boolean))];

  const filteredLocations = locations.filter(location => {
    const query = searchQuery.toLowerCase();
    const meta  = location.metadata || {};
    const text  = [location.code, location.name, location.zone, meta.rowNumber, meta.rackNumber, meta.rackType]
      .filter(Boolean).join(' ').toLowerCase();
    return text.includes(query) && (filterZone === 'all' || location.zone === filterZone);
  });

  /* --------------------------------------------------------------------------
     RACK TIRE SUMMARY (from loaded positions)
  -------------------------------------------------------------------------- */
  const getRackTireSummary = (location) => {
    const positions = rackPositions[location.id] || [];
    const summary   = {};
    positions.forEach(pos => {
      const tireSize = pos.tire_size || pos.tireSize;
      const qty      = Number(pos.current_stock || pos.quantity || 0);
      if (tireSize && qty > 0) summary[tireSize] = (summary[tireSize] || 0) + qty;
    });
    return Object.entries(summary).sort((a, b) => b[1] - a[1]);
  };

  /* --------------------------------------------------------------------------
     STYLE HELPERS
  -------------------------------------------------------------------------- */
  const statusBadge = (status) => ({
    active:      'bg-green-100 text-green-700',
    full:        'bg-amber-100 text-amber-700',
    empty:       'bg-slate-100 text-slate-600',
    maintenance: 'bg-red-100 text-red-700',
  }[status] || 'bg-slate-100 text-slate-600');

  const totalCapacity = locations.reduce((s, l) => s + (parseInt(l.capacity)      || 0), 0);
  const totalStock    = locations.reduce((s, l) => s + (parseInt(l.current_stock) || 0), 0);

  if (loading) return <Loading />;

  /* ==========================================================================
     RENDER
  ========================================================================== */
  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-6">

      {/* ── Page Header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Warehouse Locations</h1>
          <p className="mt-0.5 text-sm text-slate-500">Manage racks, storage positions, and tire assignments</p>
        </div>
        {hasRole('admin', 'manager', 'operational_staff') && (
          <button
            onClick={() => { setEditingLocation(null); setFormData(EMPTY_FORM); setShowModal(true); }}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <Plus size={16} /> Add Rack
          </button>
        )}
      </div>

      {/* ── Summary Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Total Racks',    value: locations.length,    Icon: LayoutGrid, bg: 'bg-blue-50',   iconCls: 'bg-blue-100 text-blue-600',     val: 'text-blue-700'   },
          { label: 'Total Capacity', value: totalCapacity,        Icon: Package,    bg: 'bg-green-50',  iconCls: 'bg-green-100 text-green-600',   val: 'text-green-700'  },
          { label: 'Current Stock',  value: totalStock,           Icon: Box,        bg: 'bg-amber-50',  iconCls: 'bg-amber-100 text-amber-600',   val: 'text-amber-700'  },
          { label: 'Warehouses',     value: warehouseCodes.length, Icon: Warehouse, bg: 'bg-purple-50', iconCls: 'bg-purple-100 text-purple-600', val: 'text-purple-700' },
        ].map(({ label, value, Icon, bg, iconCls, val }) => (
          <div key={label} className={`${bg} rounded-xl border border-slate-200 p-4`}>
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconCls}`}>
                <Icon size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{label}</p>
                <p className={`text-2xl font-bold ${val}`}>{Number(value).toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ───────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search rack code, row, rack number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="relative w-full md:w-52">
            <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={filterZone}
              onChange={(e) => setFilterZone(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">All Warehouses</option>
              {warehouseCodes.map(code => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Main Content ──────────────────────────────────────────── */}
      {!dbReady ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-slate-200 bg-white px-6 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
            <Layers size={28} className="text-amber-600" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-800">Database table not set up yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Run <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono">008_warehouse_locations.sql</code> in Supabase SQL Editor.
            </p>
          </div>
        </div>

      ) : filteredLocations.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-slate-200 bg-white px-6 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
            <MapPin size={26} className="text-blue-400" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-800">No rack locations yet</p>
            <p className="mt-1 text-sm text-slate-500">Add your physical racks to start generating exact tire locations.</p>
          </div>
          {hasRole('admin', 'manager', 'operational_staff') && (
            <button
              onClick={() => { setEditingLocation(null); setFormData(EMPTY_FORM); setShowModal(true); }}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <Plus size={15} /> Add First Rack
            </button>
          )}
        </div>

      ) : (
        /* ── Warehouse Folder Groups ── */
        <div className="space-y-3">
          {(() => {
            const groups = {};
            filteredLocations.forEach(loc => {
              const key = loc.zone || 'Unknown';
              if (!groups[key]) groups[key] = [];
              groups[key].push(loc);
            });

            return Object.entries(groups).map(([warehouseCode, locs]) => {
              const isOpen     = openFolders[warehouseCode] !== false;
              const totalCap   = locs.reduce((s, l) => s + (parseInt(l.capacity)      || 0), 0);
              const totalSt    = locs.reduce((s, l) => s + (parseInt(l.current_stock) || 0), 0);
              const pct        = totalCap > 0 ? Math.round((totalSt / totalCap) * 100) : 0;
              const whName     = warehouses.find(w => w.code === warehouseCode)?.name || warehouseCode;

              return (
                <div key={warehouseCode} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

                  {/* Warehouse folder header */}
                  <button
                    type="button"
                    onClick={() => setOpenFolders(prev => ({ ...prev, [warehouseCode]: !isOpen }))}
                    className="flex w-full items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3.5 transition-colors hover:bg-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      {isOpen
                        ? <ChevronDown  size={16} className="shrink-0 text-slate-500" />
                        : <ChevronRight size={16} className="shrink-0 text-slate-500" />
                      }
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
                        <Warehouse size={17} className="text-blue-600" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-slate-900">{whName}</p>
                        <p className="text-xs text-slate-500">{locs.length} physical rack{locs.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pr-1">
                      <div className="hidden items-center gap-1.5 text-xs text-slate-500 sm:flex">
                        <Package size={13} />
                        <span className="font-semibold text-slate-700">{totalSt.toLocaleString()}</span>
                        <span>/</span>
                        <span>{totalCap.toLocaleString()} tires</span>
                      </div>
                      <div className="hidden items-center gap-2 md:flex">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-blue-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold ${pct >= 90 ? 'text-red-600' : pct >= 70 ? 'text-amber-600' : 'text-slate-600'}`}>
                          {pct}%
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Rack table */}
                  {isOpen && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-slate-100 bg-white text-xs font-bold uppercase tracking-wider text-slate-400">
                          <tr>
                            <th className="px-5 py-2.5">Rack Code</th>
                            <th className="px-5 py-2.5">Physical Location</th>
                            <th className="px-5 py-2.5">Configuration</th>
                            <th className="px-5 py-2.5">Tire Sizes</th>
                            <th className="px-5 py-2.5">Capacity</th>
                            <th className="px-5 py-2.5">Utilization</th>
                            <th className="px-5 py-2.5">Status</th>
                            <th className="px-5 py-2.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {locs
                            .sort((a, b) => {
                              const aMeta = a.metadata || {}, bMeta = b.metadata || {};
                              const aRow  = aMeta.rowNumber  ?? parseInt(a.aisle) ?? 0;
                              const bRow  = bMeta.rowNumber  ?? parseInt(b.aisle) ?? 0;
                              if (aRow !== bRow) return aRow - bRow;
                              return (aMeta.rackNumber ?? parseInt(a.rack) ?? 0) - (bMeta.rackNumber ?? parseInt(b.rack) ?? 0);
                            })
                            .map(location => {
                              const meta        = location.metadata || {};
                              const rowNumber   = meta.rowNumber   ?? parseInt(location.aisle);
                              const rackNumber  = meta.rackNumber  ?? parseInt(location.rack);
                              const sections    = meta.sectionsPerRack       ?? parseInt(location.shelf) ?? 0;
                              const shelves     = meta.shelvesPerSection     ?? 8;
                              const subsections = meta.subsectionsPerSection ?? 2;
                              const tires       = meta.tiresPerSubsection    ?? 0;
                              const locPct      = location.capacity > 0
                                ? Math.round((location.current_stock / location.capacity) * 100) : 0;
                              const tireSummary = getRackTireSummary(location);

                              return (
                                <tr key={location.id} className="transition-colors hover:bg-blue-50/30">

                                  {/* Rack Code */}
                                  <td className="px-5 py-4">
                                    <div className="flex flex-col gap-0.5">
                                      <span className="font-mono text-xs font-bold text-blue-700">{location.code}</span>
                                      <span className="text-[10px] text-slate-400">
                                        {calcStoragePositions({ sectionsPerRack: sections, shelvesPerSection: shelves, subsectionsPerSection: subsections }).toLocaleString()} storage positions
                                      </span>
                                    </div>
                                  </td>

                                  {/* Physical Location */}
                                  <td className="px-5 py-4">
                                    <div className="flex items-center gap-2">
                                      <Rows3 size={15} className="text-blue-500" />
                                      <div>
                                        <p className="text-xs font-semibold text-slate-700">Row {padNumber(rowNumber)}</p>
                                        <p className="text-xs text-slate-500">Rack {padNumber(rackNumber)}</p>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Configuration */}
                                  <td className="px-5 py-4">
                                    <div className="space-y-0.5 text-xs">
                                      <div className="font-medium text-slate-700">{sections} Sec × {shelves} Sh × {subsections} Sub</div>
                                      <div className="font-semibold text-emerald-700">{tires} max/subsection</div>
                                    </div>
                                  </td>

                                  {/* Tire Sizes */}
                                  <td className="max-w-xs px-5 py-4">
                                    {tireSummary.length === 0 ? (
                                      <div className="flex flex-col gap-1">
                                        <span className="inline-flex w-fit items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                                          No tire assigned
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => openPositions(location)}
                                          className="w-fit text-[10px] font-semibold text-blue-600 hover:text-blue-800"
                                        >
                                          Assign tire →
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex max-w-xs flex-wrap gap-1.5">
                                        {tireSummary.slice(0, 4).map(([size, qty]) => (
                                          <TireSizeBadge key={size} tireSize={size} quantity={qty} />
                                        ))}
                                        {tireSummary.length > 4 && (
                                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                                            +{tireSummary.length - 4} more
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </td>

                                  {/* Capacity */}
                                  <td className="px-5 py-4">
                                    <span className={`text-sm font-semibold ${capacityColor(location.current_stock, location.capacity)}`}>
                                      {Number(location.current_stock || 0).toLocaleString()}
                                    </span>
                                    <span className="text-xs text-slate-400"> / {Number(location.capacity || 0).toLocaleString()}</span>
                                  </td>

                                  {/* Utilization */}
                                  <td className="px-5 py-4">
                                    <div className="flex items-center gap-2">
                                      <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-200">
                                        <div
                                          className={`h-full rounded-full ${locPct >= 90 ? 'bg-red-500' : locPct >= 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                                          style={{ width: `${Math.min(locPct, 100)}%` }}
                                        />
                                      </div>
                                      <span className="text-xs text-slate-500">{locPct}%</span>
                                    </div>
                                  </td>

                                  {/* Status */}
                                  <td className="px-5 py-4">
                                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge(location.status)}`}>
                                      {(location.status || 'unknown').charAt(0).toUpperCase() + (location.status || 'unknown').slice(1)}
                                    </span>
                                  </td>

                                  {/* Actions */}
                                  <td className="px-5 py-4 text-right">
                                    <div className="flex justify-end gap-1.5">
                                      <button
                                        onClick={() => openPositions(location)}
                                        className="rounded-lg p-1.5 text-emerald-600 transition-colors hover:bg-emerald-100"
                                        title="View Storage Positions"
                                      >
                                        <Eye size={14} />
                                      </button>
                                      {hasRole('admin', 'manager', 'operational_staff') && (
                                        <button
                                          onClick={() => handleEdit(location)}
                                          className="rounded-lg p-1.5 text-blue-600 transition-colors hover:bg-blue-100"
                                          title="Edit Rack"
                                        >
                                          <Edit size={14} />
                                        </button>
                                      )}
                                      {hasRole('admin', 'manager') && (
                                        <button
                                          onClick={() => handleDelete(location.id)}
                                          className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50"
                                          title="Delete Rack"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* ================================================================
          ADD / EDIT RACK MODAL
      ================================================================ */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        size="lg"
        title={
          <span className="flex items-center gap-2">
            <MapPin size={16} className="text-blue-500" />
            {editingLocation ? 'Edit Physical Rack' : 'Add Physical Rack'}
          </span>
        }
      >
        <form onSubmit={handleSubmit} className="flex h-full max-h-[calc(90vh-120px)] flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto pr-2">

            {/* ── Warehouse ── */}
            <div className="space-y-3">
              <SectionHeader icon={Warehouse} label="Warehouse" />
              <Field label="Select Warehouse" required hint="Choose the warehouse where this physical rack is located">
                <div className="relative">
                  <Warehouse className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <select
                    value={formData.warehouseCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, warehouseCode: e.target.value }))}
                    className="w-full cursor-pointer rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    required
                  >
                    <option value="" disabled>Select Warehouse...</option>
                    {warehouses.map(wh => (
                      <option key={wh.id} value={wh.code}>{wh.name} ({wh.code})</option>
                    ))}
                  </select>
                </div>
                {warehouses.length === 0 && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-700">
                    <AlertCircle size={13} />
                    No warehouses found. Add warehouses first before creating rack locations.
                  </p>
                )}
              </Field>
            </div>

            <hr className="border-slate-100" />

            {/* ── Physical Rack Position ── */}
            <div className="space-y-3">
              <SectionHeader icon={Rows3} label="Physical Rack Position" />
              <p className="text-xs text-slate-500">
                Each location represents one physical rack.
                Tire sizes are assigned to individual storage positions, not to the entire rack.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Rack Row" required hint="Example: Row 1 to Row 7">
                  <TextInput icon={Rows3}    type="number" min="1" max="100" value={formData.rowNumber}  onChange={setField('rowNumber')}  required />
                </Field>
                <Field label="Rack Number" required hint="Example: Rack 1 or Rack 2">
                  <TextInput icon={Grid2x2} type="number" min="1" max="100" value={formData.rackNumber} onChange={setField('rackNumber')} required />
                </Field>
              </div>
              <Field label="Rack Type" hint="Optional physical rack description">
                <TextInput icon={Archive} value={formData.rackType} onChange={setField('rackType')} placeholder="Standard Tire Rack" />
              </Field>
            </div>

            <hr className="border-slate-100" />

            {/* ── Rack Code ── */}
            <div className="space-y-3">
              <SectionHeader icon={Hash} label="Rack Location Code" />
              <Field label="Rack Code" required hint="Automatically generated from Warehouse + Row + Rack">
                <TextInput icon={Hash} value={formData.code} readOnly className="cursor-not-allowed bg-slate-100 font-mono font-semibold" />
              </Field>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-blue-600">Example Exact Product Location</p>
                <p className="font-mono text-xs font-bold text-blue-800">
                  {generateExactLocationExample(formData.warehouseCode, formData.rowNumber, formData.rackNumber)}
                </p>
                <p className="mt-1 text-[10px] text-blue-600">
                  Example: Section → Shelf → Subsection can each hold different tire sizes.
                </p>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* ── Rack Configuration ── */}
            <div className="space-y-3">
              <SectionHeader icon={Layers} label="Rack Configuration" />
              <p className="text-xs text-slate-600">
                Configure the physical structure. These define maximum physical capacity, not tire size.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Sections / Rack"    required hint="Example: 6">
                  <TextInput icon={Box}        type="number" min="1" max="50"  value={formData.sectionsPerRack}       onChange={setField('sectionsPerRack')}       required />
                </Field>
                <Field label="Shelves / Section"  required hint="Example: 8">
                  <TextInput icon={Layers}     type="number" min="1" max="50"  value={formData.shelvesPerSection}     onChange={setField('shelvesPerSection')}     required />
                </Field>
                <Field label="Subsections / Shelf" required hint="Example: 2">
                  <TextInput icon={LayoutGrid} type="number" min="1" max="20"  value={formData.subsectionsPerSection} onChange={setField('subsectionsPerSection')} required />
                </Field>
                <Field label="Max Tires / Subsection" required hint="Maximum physical capacity">
                  <TextInput icon={Package}    type="number" min="1" max="100" value={formData.tiresPerSubsection}    onChange={setField('tiresPerSubsection')}    required />
                </Field>
              </div>

              <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
                <p className="mb-3 text-xs font-bold text-blue-700">Physical Rack Structure</p>
                <div className="space-y-2">
                  <div className="rounded-lg bg-white/70 p-2 text-xs text-slate-700">
                    <span className="font-semibold">Warehouse:</span> {formData.warehouseCode || '—'}
                  </div>
                  <div className="rounded-lg bg-white/70 p-2 text-xs text-slate-700">
                    <span className="font-semibold">Row:</span> {padNumber(formData.rowNumber)}
                    {' → '}
                    <span className="font-semibold">Rack:</span> {padNumber(formData.rackNumber)}
                  </div>
                  <div className="rounded-lg bg-white/70 p-2 text-xs text-slate-700">
                    {formData.sectionsPerRack} Sections × {formData.shelvesPerSection} Shelves × {formData.subsectionsPerSection} Subsections
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-indigo-100 p-3 text-center">
                    <p className="text-[10px] font-semibold text-indigo-600">Storage Positions</p>
                    <p className="text-2xl font-black text-indigo-800">{calcStoragePositions(formData).toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-100 p-3 text-center">
                    <p className="text-[10px] font-semibold text-emerald-600">Maximum Rack Capacity</p>
                    <p className="text-2xl font-black text-emerald-800">{calcRackCapacity(formData).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* ── Capacity ── */}
            <div className="space-y-3">
              <SectionHeader icon={Package} label="Capacity" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Max Capacity" hint="Automatically calculated">
                  <TextInput icon={Package} readOnly value={calcRackCapacity(formData).toLocaleString()} className="cursor-not-allowed border-emerald-300 bg-emerald-50 font-bold text-emerald-800" />
                </Field>
                <Field label="Current Stock" required hint="Current tires stored">
                  <TextInput icon={Box} type="number" min="0" max={calcRackCapacity(formData) || undefined} value={formData.current_stock} onChange={setField('current_stock')} required />
                </Field>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* ── Status ── */}
            <div className="space-y-3 pb-4">
              <SectionHeader icon={CheckCircle2} label="Status" />
              <StatusPicker value={formData.status || 'active'} onChange={(v) => setFormData(prev => ({ ...prev, status: v }))} />
            </div>

          </div>

          {/* Fixed Buttons */}
          <div className="mt-4 flex-shrink-0 border-t border-slate-200 bg-white pt-4">
            <div className="flex gap-3">
              <button type="button" onClick={closeModal} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
                <X size={15} /> Cancel
              </button>
              <button type="submit" disabled={submitting} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                {submitting
                  ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  : editingLocation ? <Edit size={15} /> : <Plus size={15} />
                }
                {submitting ? 'Saving...' : editingLocation ? 'Update Rack' : 'Create Rack'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* ================================================================
          STORAGE POSITIONS MODAL
      ================================================================ */}
      <Modal
        isOpen={showPositionsModal}
        onClose={closePositionsModal}
        size="xl"
        title={
          <span className="flex items-center gap-2">
            <LayoutGrid size={16} className="text-blue-500" />
            Storage Positions
          </span>
        }
      >
        {selectedRack && (
          <div className="space-y-5">
            {/* Rack summary */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex flex-col justify-between gap-3 md:flex-row">
                <div>
                  <p className="font-mono text-sm font-bold text-blue-800">{selectedRack.code}</p>
                  <p className="mt-1 text-xs text-blue-600">
                    Row {padNumber(selectedRack.metadata?.rowNumber ?? parseInt(selectedRack.aisle))}
                    {' / '}
                    Rack {padNumber(selectedRack.metadata?.rackNumber ?? parseInt(selectedRack.rack))}
                  </p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-xs text-slate-500">Rack Stock</p>
                  <p className="text-xl font-bold text-slate-800">
                    {Number(selectedRack.current_stock || 0).toLocaleString()} / {Number(selectedRack.capacity || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Positions */}
            {loadingPositions[selectedRack.id] ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw size={22} className="animate-spin text-blue-500" />
                <span className="ml-2 text-sm text-slate-500">Loading storage positions...</span>
              </div>
            ) : (
              <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
                {Object.entries(
                  (rackPositions[selectedRack.id] || []).reduce((groups, pos) => {
                    const key = `Section ${pos.section_number}`;
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(pos);
                    return groups;
                  }, {})
                ).map(([sectionName, positions]) => (
                  <div key={sectionName} className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Box size={15} className="text-blue-500" />
                        <p className="text-sm font-bold text-slate-800">{sectionName}</p>
                      </div>
                    </div>
                    <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                      {positions
                        .sort((a, b) => a.shelf_number !== b.shelf_number ? a.shelf_number - b.shelf_number : a.subsection_number - b.subsection_number)
                        .map(position => {
                          const quantity    = Number(position.current_stock || position.quantity || 0);
                          const capacity    = Number(position.capacity || 0);
                          const utilization = getPositionUtilization(position);
                          const tireSize    = position.tire_size || position.tireSize;

                          return (
                            <button
                              type="button"
                              key={position.id}
                              onClick={() => selectPosition(position)}
                              className="group rounded-xl border border-slate-200 bg-white p-3 text-left transition-all hover:border-blue-300 hover:bg-blue-50/30 hover:shadow-sm"
                            >
                              {/* Position code */}
                              <div className="mb-3 flex items-start justify-between gap-2">
                                <div>
                                  <p className="font-mono text-[10px] font-bold text-blue-700">
                                    {position.position_code || position.positionCode}
                                  </p>
                                  <p className="mt-0.5 text-[10px] text-slate-400">
                                    Shelf {padNumber(position.shelf_number)} · Subsection {padNumber(position.subsection_number)}
                                  </p>
                                </div>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  quantity === 0 ? 'bg-slate-100 text-slate-500'
                                  : utilization >= 90 ? 'bg-red-100 text-red-600'
                                  : utilization >= 70 ? 'bg-amber-100 text-amber-600'
                                  : 'bg-green-100 text-green-600'
                                }`}>
                                  {quantity === 0 ? 'Empty' : `${utilization}%`}
                                </span>
                              </div>

                              {/* Tire size */}
                              <div className="mb-3 min-h-[42px]">
                                {tireSize ? (
                                  <>
                                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Tire Size</p>
                                    <p className="text-sm font-bold text-slate-800">{tireSize}</p>
                                  </>
                                ) : (
                                  <div className="flex h-full items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                                    <Tag size={14} className="text-slate-400" />
                                    <span className="text-xs text-slate-400">No tire assigned</span>
                                  </div>
                                )}
                              </div>

                              {/* Quantity bar */}
                              <div>
                                <div className="mb-1 flex items-center justify-between">
                                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Quantity</span>
                                  <span className="text-xs font-bold text-slate-700">{quantity} / {capacity}</span>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                                  <div
                                    className={`h-full rounded-full transition-all ${utilization >= 90 ? 'bg-red-500' : utilization >= 70 ? 'bg-amber-500' : 'bg-blue-500'}`}
                                    style={{ width: `${utilization}%` }}
                                  />
                                </div>
                              </div>

                              <div className="mt-3 flex items-center justify-end gap-1 text-[10px] font-semibold text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
                                <Edit size={11} /> Assign / Edit
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end border-t border-slate-200 pt-4">
              <button type="button" onClick={closePositionsModal} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ================================================================
          TIRE ASSIGNMENT MODAL
      ================================================================ */}
      <Modal
        isOpen={!!selectedPosition}
        onClose={() => setSelectedPosition(null)}
        size="md"
        title={
          <span className="flex items-center gap-2">
            <Tag size={16} className="text-blue-500" />
            Assign Tire to Position
          </span>
        }
      >
        {selectedPosition && (
          <div className="space-y-5">
            {/* Position info */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Storage Position</p>
              <p className="mt-1 font-mono text-sm font-bold text-blue-800">
                {selectedPosition.position_code || selectedPosition.positionCode}
              </p>
              <p className="mt-1 text-xs text-blue-600">
                Section {padNumber(selectedPosition.section_number)}
                {' · '}
                Shelf {padNumber(selectedPosition.shelf_number)}
                {' · '}
                Subsection {padNumber(selectedPosition.subsection_number)}
              </p>
            </div>

            {/* Tire size */}
            <Field label="Tire Size" required={Number(quantityInput) > 0} hint="Example: Dual Sport 90/90-17">
              <TextInput
                icon={Tag}
                value={tireSizeInput}
                onChange={(e) => setTireSizeInput(e.target.value)}
                placeholder="Dual Sport 90/90-17"
              />
            </Field>

            {/* Quantity */}
            <Field label="Quantity" required hint={`Maximum capacity: ${selectedPosition.capacity || 0} tires`}>
              <TextInput
                icon={Package}
                type="number"
                min="0"
                max={selectedPosition.capacity || undefined}
                value={quantityInput}
                onChange={(e) => setQuantityInput(e.target.value)}
              />
            </Field>

            {/* Capacity bar */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Position Capacity</span>
                <span className="text-sm font-bold text-slate-800">
                  {quantityInput || 0} / {selectedPosition.capacity || 0}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${Math.min(100, (Number(quantityInput) / Number(selectedPosition.capacity || 1)) * 100)}%` }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 border-t border-slate-200 pt-4">
              <button type="button" onClick={() => setSelectedPosition(null)} className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={savePosition} disabled={positionSaving} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                {positionSaving
                  ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  : <Save size={15} />
                }
                {positionSaving ? 'Saving...' : 'Save Position'}
              </button>
            </div>
          </div>
        )}
      </Modal>

    </motion.div>
  );
}
