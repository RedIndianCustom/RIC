import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Edit,
  Trash2,
  MapPin,
  Package,
  Search,
  Filter,
  Hash,
  Tag,
  Grid2x2,
  Layers,
  Box,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Wrench,
  X,
  Warehouse,
  ChevronDown,
  ChevronRight,
  Rows3,
  LayoutGrid,
  Archive,
  Eye,
  Save,
  RefreshCw,
  Car,
  Zap,
} from 'lucide-react';

import Modal from '../../../components/common/Modal';
import Loading from '../../../components/common/Loading';
import { showToast } from '../../../utils/toast';
import api from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';


/* ============================================================================
   ANIMATION
============================================================================ */

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};


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

      {hint && (
        <p className="text-xs text-slate-400">
          {hint}
        </p>
      )}
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
        className={`w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 ${
          Icon ? 'pl-9 pr-3' : 'px-3'
        } ${className}`}
        {...props}
      />
    </div>
  );
}


/* ============================================================================
   STATUS OPTIONS
============================================================================ */

const STATUS_OPTIONS = [
  {
    value: 'active',
    label: 'Active',
    Icon: CheckCircle2,
    color: 'text-green-600 bg-green-50 border-green-200',
  },
  {
    value: 'full',
    label: 'Full',
    Icon: AlertCircle,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  {
    value: 'empty',
    label: 'Empty',
    Icon: XCircle,
    color: 'text-slate-500 bg-slate-50 border-slate-200',
  },
  {
    value: 'maintenance',
    label: 'Maintenance',
    Icon: Wrench,
    color: 'text-red-600 bg-red-50 border-red-200',
  },
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
   DEFAULT FORM
============================================================================ */

const EMPTY_FORM = {
  code: '',
  warehouseCode: '',
  rowNumber: '1',
  rackNumber: '1',
  rackType: 'Standard Tire Rack',

  sectionsPerRack: '6',
  shelvesPerSection: '8',
  subsectionsPerSection: '2',

  // This now means MAXIMUM physical capacity per subsection.
  tiresPerSubsection: '14',

  capacity: '',
  current_stock: '0',
  status: 'active',
};


/* ============================================================================
   HELPERS
============================================================================ */

function padNumber(value, length = 2) {
  return String(value || 0).padStart(length, '0');
}


function generateRackCode(
  warehouseCode,
  rowNumber,
  rackNumber
) {
  if (!warehouseCode) return '';

  return `${warehouseCode}-R${padNumber(rowNumber)}-RK${padNumber(rackNumber)}`;
}


function generatePositionCode(
  warehouseCode,
  rowNumber,
  rackNumber,
  sectionNumber,
  shelfNumber,
  subsectionNumber
) {
  const rackCode = generateRackCode(
    warehouseCode,
    rowNumber,
    rackNumber
  );

  return `${rackCode}-S${padNumber(sectionNumber)}-SH${padNumber(
    shelfNumber
  )}-SUB${padNumber(subsectionNumber)}`;
}


function calcRackCapacity(form) {
  const sections = parseInt(form.sectionsPerRack || 0);
  const shelves = parseInt(form.shelvesPerSection || 0);
  const subsections = parseInt(
    form.subsectionsPerSection || 0
  );
  const tires = parseInt(form.tiresPerSubsection || 0);

  if (
    !sections ||
    !shelves ||
    !subsections ||
    !tires
  ) {
    return 0;
  }

  return sections * shelves * subsections * tires;
}


function calcStoragePositions(form) {
  const sections = parseInt(form.sectionsPerRack || 0);
  const shelves = parseInt(form.shelvesPerSection || 0);
  const subsections = parseInt(
    form.subsectionsPerSection || 0
  );

  if (!sections || !shelves || !subsections) {
    return 0;
  }

  return sections * shelves * subsections;
}


function generateExactLocationExample(
  warehouseCode,
  rowNumber,
  rackNumber
) {
  if (!warehouseCode) {
    return 'Select warehouse first';
  }

  return generatePositionCode(
    warehouseCode,
    rowNumber,
    rackNumber,
    1,
    1,
    1
  );
}


function getPositionUtilization(position) {
  const capacity = Number(position.capacity || 0);
  const stock = Number(position.current_stock || position.quantity || 0);

  if (!capacity) return 0;

  return Math.min(
    100,
    Math.round((stock / capacity) * 100)
  );
}


function capacityColor(current, capacity) {
  if (!capacity) return 'text-slate-500';

  const pct = (current / capacity) * 100;

  if (pct >= 90) return 'text-red-600';
  if (pct >= 70) return 'text-amber-600';

  return 'text-green-600';
}


/* ============================================================================
   POSITION HELPERS
============================================================================ */

function buildEmptyPositions(location) {
  const meta = location?.metadata || {};

  const warehouseCode =
    meta.warehouseCode ||
    location.zone ||
    '';

  const rowNumber =
    Number(
      meta.rowNumber ??
      parseInt(location.aisle) ??
      1
    );

  const rackNumber =
    Number(
      meta.rackNumber ??
      parseInt(location.rack) ??
      1
    );

  const sections =
    Number(
      meta.sectionsPerRack ??
      parseInt(location.shelf) ??
      0
    );

  const shelves =
    Number(
      meta.shelvesPerSection ?? 0
    );

  const subsections =
    Number(
      meta.subsectionsPerSection ?? 0
    );

  const capacityPerSubsection =
    Number(
      meta.tiresPerSubsection ?? 0
    );

  const positions = [];

  for (
    let section = 1;
    section <= sections;
    section++
  ) {
    for (
      let shelf = 1;
      shelf <= shelves;
      shelf++
    ) {
      for (
        let subsection = 1;
        subsection <= subsections;
        subsection++
      ) {
        positions.push({
          id: `generated-${section}-${shelf}-${subsection}`,

          warehouse_location_id: location.id,

          section_number: section,
          shelf_number: shelf,
          subsection_number: subsection,

          position_code: generatePositionCode(
            warehouseCode,
            rowNumber,
            rackNumber,
            section,
            shelf,
            subsection
          ),

          capacity: capacityPerSubsection,

          current_stock: 0,

          tire_size_id: null,
          tire_size: null,

          status: 'empty',
        });
      }
    }
  }

  return positions;
}


/* ============================================================================
   TIRE SIZE BADGE
============================================================================ */

// Distinct palette for up to 6 different tire sizes in one rack
const TIRE_BADGE_PALETTE = [
  {
    badge: 'border-blue-200 bg-blue-50 text-blue-700',
    pill:  'bg-blue-500 text-white',
    icon:  'text-blue-400',
  },
  {
    badge: 'border-violet-200 bg-violet-50 text-violet-700',
    pill:  'bg-violet-500 text-white',
    icon:  'text-violet-400',
  },
  {
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    pill:  'bg-emerald-500 text-white',
    icon:  'text-emerald-400',
  },
  {
    badge: 'border-amber-200 bg-amber-50 text-amber-700',
    pill:  'bg-amber-500 text-white',
    icon:  'text-amber-400',
  },
  {
    badge: 'border-rose-200 bg-rose-50 text-rose-700',
    pill:  'bg-rose-500 text-white',
    icon:  'text-rose-400',
  },
  {
    badge: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    pill:  'bg-cyan-500 text-white',
    icon:  'text-cyan-400',
  },
];

function TireSizeBadge({ tireSize, quantity, colorIndex = 0 }) {
  if (!tireSize) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-400">
        Empty
      </span>
    );
  }

  const palette = TIRE_BADGE_PALETTE[colorIndex % TIRE_BADGE_PALETTE.length];

  return (
    <span
      title={`${tireSize} × ${quantity}`}
      className={`inline-flex max-w-[140px] items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-sm transition-shadow hover:shadow-md ${palette.badge}`}
    >
      {/* Colored left dot instead of icon — saves horizontal space */}
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${palette.pill}`} />

      <span className="truncate">
        {tireSize}
      </span>

      {quantity !== undefined && (
        <span
          className={`inline-flex min-w-[18px] shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${palette.pill}`}
        >
          {quantity}
        </span>
      )}
    </span>
  );
}


/* ============================================================================
   MAIN COMPONENT
============================================================================ */

export default function WarehouseLocations() {
  const { hasRole } = useAuth();

  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterZone, setFilterZone] = useState('all');

  const [openFolders, setOpenFolders] = useState({});

  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] =
    useState(EMPTY_FORM);

  const [dbReady, setDbReady] =
    useState(true);

  const [warehouses, setWarehouses] =
    useState([]);

  /*
   * Stores positions for each rack.
   *
   * Example:
   *
   * {
   *   1: [
   *     {
   *       section_number: 1,
   *       shelf_number: 1,
   *       subsection_number: 1,
   *       tire_size: "Dual Sport 90/90-17",
   *       current_stock: 8
   *     }
   *   ]
   * }
   */
  const [rackPositions, setRackPositions] =
    useState({});

  const [loadingPositions, setLoadingPositions] =
    useState({});

  const [selectedRack, setSelectedRack] =
    useState(null);

  const [showPositionsModal, setShowPositionsModal] =
    useState(false);

  const [selectedPosition, setSelectedPosition] =
    useState(null);

  const [positionSaving, setPositionSaving] =
    useState(false);

  const [tireSizeInput, setTireSizeInput] =
    useState('');

  const [quantityInput, setQuantityInput] =
    useState('0');

  // Bulk assignment state
  const [bulkMode, setBulkMode] =
    useState(false);

  const [selectedPositionIds, setSelectedPositionIds] =
    useState(new Set());

  const [bulkTireSize, setBulkTireSize] =
    useState('');

  const [bulkQuantity, setBulkQuantity] =
    useState('');

  const [bulkProduct, setBulkProduct] =
    useState(null);

  const [bulkProductSearch, setBulkProductSearch] =
    useState('');

  const [showBulkProductDropdown, setShowBulkProductDropdown] =
    useState(false);

  const [bulkSaving, setBulkSaving] =
    useState(false);

  // Product catalogue for the tire picker
  const [products, setProducts] =
    useState([]);

  const [productSearch, setProductSearch] =
    useState('');

  const [selectedProduct, setSelectedProduct] =
    useState(null);

  const [loadingProducts, setLoadingProducts] =
    useState(false);

  const [showProductDropdown, setShowProductDropdown] =
    useState(false);


  /* ==========================================================================
     LOAD PRODUCTS (for tire picker)
  ========================================================================== */

  const loadProducts = async () => {
    if (products.length > 0) return;           // already loaded
    setLoadingProducts(true);
    try {
      const { data } = await api.get('/products');
      setProducts(data.products || []);
    } catch (err) {
      console.warn('Could not load products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };


  /* ==========================================================================
     AUTO-GENERATE RACK CODE
  ========================================================================== */

  useEffect(() => {
    if (
      formData.warehouseCode &&
      formData.rowNumber &&
      formData.rackNumber &&
      !editingLocation
    ) {
      const generatedCode =
        generateRackCode(
          formData.warehouseCode,
          formData.rowNumber,
          formData.rackNumber
        );

      setFormData(prev => ({
        ...prev,
        code: generatedCode,
      }));
    }
  }, [
    formData.warehouseCode,
    formData.rowNumber,
    formData.rackNumber,
    editingLocation,
  ]);


  /* ==========================================================================
     AUTO-CALCULATE CAPACITY
  ========================================================================== */

  useEffect(() => {
    const total =
      calcRackCapacity(formData);

    if (total > 0) {
      setFormData(prev => ({
        ...prev,
        capacity: String(total),
      }));
    }
  }, [
    formData.sectionsPerRack,
    formData.shelvesPerSection,
    formData.subsectionsPerSection,
    formData.tiresPerSubsection,
  ]);


  /* ==========================================================================
     INITIAL LOAD
  ========================================================================== */

  useEffect(() => {
    loadLocations();
    loadWarehouses();
  }, []);


  /* ==========================================================================
     LOAD LOCATIONS
  ========================================================================== */

  const loadLocations = async () => {
    setLoading(true);

    try {
      const response =
        await api.get('/warehouse-locations');

      const fetched =
        response.data.locations || [];

      setLocations(fetched);

      setDbReady(true);

      const allOpen = {};

      fetched.forEach(loc => {
        if (loc.zone) {
          allOpen[loc.zone] = true;
        }
      });

      setOpenFolders(allOpen);

      /*
       * Auto-load positions for every rack in
       * the background so the Tire Sizes column
       * is populated on the first render without
       * requiring the user to open the eye modal.
       *
       * Racks that already have stock are
       * prioritised (loaded first).
       */
      preloadAllPositions(fetched);

      return fetched;

    } catch (err) {
      setLocations([]);

      const is503 =
        err.response?.status === 503 ||
        err.status === 503 ||
        err.message
          ?.toLowerCase()
          .includes('not configured');

      if (is503) {
        setDbReady(false);
      } else {
        console.warn(
          'Warehouse locations API error:',
          err.message
        );
      }

    } finally {
      setLoading(false);
    }
  };



  /* ==========================================================================
     LOAD WAREHOUSES
  ========================================================================== */

  const loadWarehouses = async () => {
    try {
      const { data } =
        await api.get('/warehouses');

      setWarehouses(
        data.warehouses || []
      );

    } catch (err) {
      console.warn(
        'Could not load warehouses:',
        err
      );

      setWarehouses([]);
    }
  };


  /* ==========================================================================
     LOAD RACK POSITIONS
  ========================================================================== */

  const loadRackPositions = async (
    location,
    force = false
  ) => {
    if (!location?.id) return;

    if (
      rackPositions[location.id] &&
      !force
    ) {
      return;
    }

    setLoadingPositions(prev => ({
      ...prev,
      [location.id]: true,
    }));

    try {
      /*
       * Expected backend:
       *
       * GET /warehouse-locations/:locationId/positions
       *
       * Response:
       * {
       *   positions: [...]
       * }
       */

      const response =
        await api.get(
          `/warehouse-locations/${location.id}/positions`
        );

      const positions =
        response.data.positions || [];

      setRackPositions(prev => ({
        ...prev,
        [location.id]: positions,
      }));

    } catch (err) {

      /*
       * If the backend does not yet provide
       * positions, generate the physical
       * positions on the frontend.
       *
       * This allows the UI to work while
       * the backend is being implemented.
       */

      console.warn(
        `Could not load positions for rack ${location.code}:`,
        err.message
      );

      setRackPositions(prev => ({
        ...prev,
        [location.id]:
          buildEmptyPositions(location),
      }));

    } finally {
      setLoadingPositions(prev => ({
        ...prev,
        [location.id]: false,
      }));
    }
  };


  /* ==========================================================================
     PRELOAD ALL RACK POSITIONS (background, called from loadLocations)
  ========================================================================== */

  const preloadAllPositions = (locs = []) => {
    if (!locs.length) return;

    // Racks with stock > 0 first so visible badges appear immediately.
    const sorted = [...locs].sort((a, b) =>
      Number(b.current_stock || 0) - Number(a.current_stock || 0)
    );

    // Stagger requests by 120 ms each to avoid hammering the server.
    sorted.forEach((loc, i) => {
      setTimeout(() => loadRackPositions(loc), i * 120);
    });
  };


  /* ==========================================================================
     FIELD HANDLER
  ========================================================================== */

  const setField =
    field =>
    event => {
      setFormData(prev => ({
        ...prev,
        [field]: event.target.value,
      }));
    };


  /* ==========================================================================
     CLOSE RACK FORM
  ========================================================================== */

  const closeModal = () => {
    setShowModal(false);

    setEditingLocation(null);

    setFormData(EMPTY_FORM);
  };


  /* ==========================================================================
     CREATE / UPDATE RACK
  ========================================================================== */

  const handleSubmit = async event => {
    event.preventDefault();

    setSubmitting(true);

    try {

      if (!formData.warehouseCode) {
        showToast(
          'Warehouse is required',
          'error'
        );
        return;
      }

      if (!formData.rowNumber) {
        showToast(
          'Rack row is required',
          'error'
        );
        return;
      }

      if (!formData.rackNumber) {
        showToast(
          'Rack number is required',
          'error'
        );
        return;
      }

      const rackCapacity =
        calcRackCapacity(formData);

      if (rackCapacity <= 0) {
        showToast(
          'Please configure sections, shelves, subsections and tire capacity',
          'error'
        );
        return;
      }

      const currentStock =
        parseInt(
          formData.current_stock
        ) || 0;

      if (
        currentStock >
        rackCapacity
      ) {
        showToast(
          'Current stock cannot exceed rack capacity',
          'error'
        );
        return;
      }

      const locationCode =
        formData.code ||
        generateRackCode(
          formData.warehouseCode,
          formData.rowNumber,
          formData.rackNumber
        );


      /* ----------------------------------------------------------------------
         PHYSICAL RACK METADATA
      ---------------------------------------------------------------------- */

      const locationMetadata = {
        structureVersion: 3,

        warehouseCode:
          formData.warehouseCode,

        rowNumber:
          parseInt(formData.rowNumber),

        rackNumber:
          parseInt(formData.rackNumber),

        rackType:
          formData.rackType,

        sectionsPerRack:
          parseInt(formData.sectionsPerRack),

        shelvesPerSection:
          parseInt(formData.shelvesPerSection),

        subsectionsPerSection:
          parseInt(
            formData.subsectionsPerSection
          ),

        /*
         * IMPORTANT:
         *
         * This is maximum physical capacity
         * of each subsection.
         *
         * It does NOT define a tire size.
         */

        tiresPerSubsection:
          parseInt(
            formData.tiresPerSubsection
          ),

        exactLocationFormat:
          `${locationCode}-S##-SH##-SUB##`,
      };


      /* ----------------------------------------------------------------------
         DATABASE PAYLOAD
      ---------------------------------------------------------------------- */

      const dbData = {
        code: locationCode.trim(),

        name:
          `${formData.warehouseCode} - Row ${padNumber(
            formData.rowNumber
          )} - Rack ${padNumber(
            formData.rackNumber
          )}`,

        zone:
          formData.warehouseCode,

        aisle:
          padNumber(formData.rowNumber),

        rack:
          padNumber(formData.rackNumber),

        shelf:
          String(
            formData.sectionsPerRack
          ).padStart(2, '0'),

        capacity:
          rackCapacity,

        current_stock:
          currentStock,

        status:
          formData.status || 'active',

        metadata:
          locationMetadata,
      };


      const saveLocation =
        async (
          payload,
          locationId
        ) => {

          if (locationId) {
            return api.put(
              `/warehouse-locations/${locationId}`,
              payload
            );
          }

          return api.post(
            '/warehouse-locations',
            payload
          );
        };


      await saveLocation(
        dbData,
        editingLocation?.id
      );


      showToast(
        editingLocation
          ? 'Rack location updated successfully'
          : 'Rack location created successfully',
        'success'
      );


      await loadLocations();

      closeModal();

    } catch (error) {

      console.error(
        'Warehouse location submit error:',
        error
      );

      showToast(
        error.response?.data?.error ||
          error.message ||
          'Operation failed',
        'error'
      );

    } finally {
      setSubmitting(false);
    }
  };


  /* ==========================================================================
     EDIT RACK
  ========================================================================== */

  const handleEdit = location => {
    const meta =
      location.metadata || {};

    setEditingLocation(location);

    setFormData({
      ...EMPTY_FORM,

      code:
        location.code || '',

      warehouseCode:
        meta.warehouseCode ||
        location.zone ||
        '',

      rowNumber:
        String(
          meta.rowNumber ??
          parseInt(location.aisle) ??
          1
        ),

      rackNumber:
        String(
          meta.rackNumber ??
          parseInt(location.rack) ??
          1
        ),

      rackType:
        meta.rackType ||
        'Standard Tire Rack',

      sectionsPerRack:
        String(
          meta.sectionsPerRack ??
          parseInt(location.shelf) ??
          6
        ),

      shelvesPerSection:
        String(
          meta.shelvesPerSection ??
          8
        ),

      subsectionsPerSection:
        String(
          meta.subsectionsPerSection ??
          2
        ),

      tiresPerSubsection:
        String(
          meta.tiresPerSubsection ??
          14
        ),

      current_stock:
        String(
          location.current_stock ??
          0
        ),

      status:
        location.status ||
        'active',
    });

    setShowModal(true);
  };


  /* ==========================================================================
     DELETE RACK
  ========================================================================== */

  const handleDelete = async id => {

    if (
      !confirm(
        'Are you sure you want to delete this rack location?'
      )
    ) {
      return;
    }

    try {

      await api.delete(
        `/warehouse-locations/${id}`
      );

      showToast(
        'Rack location deleted successfully',
        'success'
      );

      await loadLocations();

    } catch (error) {

      showToast(
        error.response?.data?.error ||
          'Failed to delete rack',
        'error'
      );
    }
  };


  /* ==========================================================================
     OPEN POSITION VIEWER
  ========================================================================== */

  const openPositions = async location => {

    setSelectedRack(location);

    await loadRackPositions(location);

    setShowPositionsModal(true);
  };


  /* ==========================================================================
     SELECT POSITION
  ========================================================================== */

  const selectPosition = position => {

    setSelectedPosition(position);

    setTireSizeInput(
      position.tire_size ||
      position.tireSize ||
      ''
    );

    setQuantityInput(
      String(
        position.current_stock ||
        position.quantity ||
        0
      )
    );

    // Reset product picker state
    setSelectedProduct(null);
    setProductSearch('');
    setShowProductDropdown(false);

    // Pre-load products for the picker
    loadProducts();
  };


  /* ==========================================================================
     CLOSE POSITION MODAL
  ========================================================================== */

  const closePositionsModal = () => {

    setShowPositionsModal(false);

    setSelectedRack(null);

    setSelectedPosition(null);

    setTireSizeInput('');

    setQuantityInput('0');

    setSelectedProduct(null);
    setProductSearch('');
    setShowProductDropdown(false);

    // Reset bulk state
    setBulkMode(false);
    setSelectedPositionIds(new Set());
    setBulkTireSize('');
    setBulkQuantity('');
    setBulkProduct(null);
    setBulkProductSearch('');
    setShowBulkProductDropdown(false);
  };


  /* ==========================================================================
     SAVE TIRE ASSIGNMENT
  ========================================================================== */

  const savePosition = async () => {

    if (
      !selectedRack ||
      !selectedPosition
    ) {
      return;
    }

    const quantity =
      parseInt(quantityInput) || 0;

    const capacity =
      Number(
        selectedPosition.capacity || 0
      );

    if (quantity < 0) {
      showToast(
        'Quantity cannot be negative',
        'error'
      );
      return;
    }

    if (quantity > capacity) {
      showToast(
        `Quantity cannot exceed position capacity of ${capacity}`,
        'error'
      );
      return;
    }

    if (
      quantity > 0 &&
      !tireSizeInput.trim()
    ) {
      showToast(
        'Tire size is required when quantity is greater than zero',
        'error'
      );
      return;
    }

    setPositionSaving(true);

    try {

      /*
       * Expected backend:
       *
       * PUT
       * /warehouse-locations/:locationId/positions/:positionId
       *
       * Body:
       * {
       *   tire_size: "Dual Sport 90/90-17",
       *   quantity: 8
       * }
       */

      await api.put(
        `/warehouse-locations/${selectedRack.id}/positions/${selectedPosition.id}`,
        {
          tire_size:
            quantity > 0
              ? tireSizeInput.trim()
              : null,

          quantity,
        }
      );

      showToast(
        'Tire position updated successfully',
        'success'
      );

      await loadRackPositions(
        selectedRack,
        true
      );

      /*
       * Reload rack data so
       * current_stock is updated.
       */

      const refreshedLocations =
        await loadLocations();

      const updatedRack =
        refreshedLocations?.find(
          location =>
            location.id === selectedRack.id
        );

      if (updatedRack) {
        setSelectedRack(updatedRack);
      }

      setSelectedPosition(null);

      setTireSizeInput('');

      setQuantityInput('0');

    } catch (error) {

      console.error(
        'Position update error:',
        error
      );

      showToast(
        error.response?.data?.error ||
          error.message ||
          'Failed to update tire position',
        'error'
      );

    } finally {

      setPositionSaving(false);
    }
  };


  /* ==========================================================================
     SAVE BULK TIRE ASSIGNMENT
  ========================================================================== */

  const saveBulkPositions = async () => {

    if (!selectedRack || selectedPositionIds.size === 0) return;

    const tireSizeValue = bulkTireSize.trim();
    const quantityValue = parseInt(bulkQuantity) || 0;

    if (quantityValue > 0 && !tireSizeValue) {
      showToast('Tire size is required when quantity > 0', 'error');
      return;
    }

    setBulkSaving(true);

    try {

      const positions =
        rackPositions[selectedRack.id] || [];

      const targets = positions.filter(p =>
        selectedPositionIds.has(p.id)
      );

      // Check quantity doesn't exceed any position's capacity
      const overCapacity = targets.find(
        p => quantityValue > Number(p.capacity || 0)
      );

      if (overCapacity) {
        showToast(
          `Quantity exceeds capacity (${overCapacity.capacity}) of position ${overCapacity.position_code}`,
          'error'
        );
        return;
      }

      // Fire all saves in parallel
      await Promise.all(
        targets.map(p =>
          api.put(
            `/warehouse-locations/${selectedRack.id}/positions/${p.id}`,
            {
              tire_size: quantityValue > 0 ? tireSizeValue : null,
              quantity: quantityValue,
            }
          )
        )
      );

      showToast(
        `Updated ${targets.length} position${targets.length !== 1 ? 's' : ''} successfully`,
        'success'
      );

      // Refresh data
      await loadRackPositions(selectedRack, true);
      const refreshed = await loadLocations();
      const updatedRack = refreshed?.find(l => l.id === selectedRack.id);
      if (updatedRack) setSelectedRack(updatedRack);

      // Reset bulk panel
      setSelectedPositionIds(new Set());
      setBulkTireSize('');
      setBulkQuantity('');
      setBulkProduct(null);
      setBulkProductSearch('');

    } catch (error) {

      showToast(
        error.response?.data?.error || error.message || 'Bulk update failed',
        'error'
      );

    } finally {
      setBulkSaving(false);
    }
  };


  /* ==========================================================================
     FILTERING
  ========================================================================== */

  const warehouseCodes =
    [
      ...new Set(
        locations
          .map(l => l.zone)
          .filter(Boolean)
      ),
    ];


  const filteredLocations =
    locations.filter(location => {

      const query =
        searchQuery.toLowerCase();

      const meta =
        location.metadata || {};

      const searchableText = [
        location.code,
        location.name,
        location.zone,
        meta.rowNumber,
        meta.rackNumber,
        meta.rackType,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return (
        searchableText.includes(query) &&
        (
          filterZone === 'all' ||
          location.zone === filterZone
        )
      );
    });


  /* ==========================================================================
     RACK TIRE SUMMARY
  ========================================================================== */

  const getRackTireSummary =
    location => {

      const positions =
        rackPositions[location.id] ||
        [];

      const summary = {};

      positions.forEach(position => {

        const tireSize =
          position.tire_size ||
          position.tireSize;

        const quantity =
          Number(
            position.current_stock ||
            position.quantity ||
            0
          );

        if (
          tireSize &&
          quantity > 0
        ) {

          summary[tireSize] =
            (summary[tireSize] || 0) +
            quantity;
        }
      });

      return Object.entries(summary)
        .sort((a, b) => b[1] - a[1]);
    };


  /* ==========================================================================
     RENDER HELPERS
  ========================================================================== */

  const statusBadge = status => ({
    active:
      'bg-green-100 text-green-700',

    full:
      'bg-amber-100 text-amber-700',

    empty:
      'bg-slate-100 text-slate-600',

    maintenance:
      'bg-red-100 text-red-700',

  }[status] ||
    'bg-slate-100 text-slate-600');


  /* ==========================================================================
     SUMMARY
  ========================================================================== */

  const totalCapacity =
    locations.reduce(
      (sum, location) =>
        sum +
        (
          parseInt(
            location.capacity
          ) || 0
        ),
      0
    );


  const totalStock =
    locations.reduce(
      (sum, location) =>
        sum +
        (
          parseInt(
            location.current_stock
          ) || 0
        ),
      0
    );


  /* ==========================================================================
     LOADING
  ========================================================================== */

  if (loading) {
    return <Loading />;
  }


  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      className="space-y-6"
    >

      {/* =====================================================================
          HEADER
      ===================================================================== */}

      <div className="flex items-center justify-between">

        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Warehouse Locations
          </h1>

          <p className="mt-0.5 text-sm text-slate-500">
            Manage racks, storage positions, and tire assignments
          </p>
        </div>

        {hasRole(
          'admin',
          'manager',
          'operational_staff'
        ) && (
          <button
            onClick={() => {
              setEditingLocation(null);
              setFormData(EMPTY_FORM);
              setShowModal(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <Plus size={16} />
            Add Rack
          </button>
        )}

      </div>


      {/* =====================================================================
          SUMMARY CARDS
      ===================================================================== */}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">

        {[
          {
            label: 'Total Racks',
            value: locations.length,
            Icon: LayoutGrid,
            bg: 'bg-blue-50',
            iconCls:
              'bg-blue-100 text-blue-600',
            val:
              'text-blue-700',
          },

          {
            label: 'Total Capacity',
            value: totalCapacity,
            Icon: Package,
            bg: 'bg-green-50',
            iconCls:
              'bg-green-100 text-green-600',
            val:
              'text-green-700',
          },

          {
            label: 'Current Stock',
            value: totalStock,
            Icon: Box,
            bg: 'bg-amber-50',
            iconCls:
              'bg-amber-100 text-amber-600',
            val:
              'text-amber-700',
          },

          {
            label: 'Warehouses',
            value: warehouseCodes.length,
            Icon: Warehouse,
            bg: 'bg-purple-50',
            iconCls:
              'bg-purple-100 text-purple-600',
            val:
              'text-purple-700',
          },
        ].map(
          ({
            label,
            value,
            Icon,
            bg,
            iconCls,
            val,
          }) => (

            <div
              key={label}
              className={`${bg} rounded-xl border border-slate-200 p-4`}
            >

              <div className="flex items-center gap-3">

                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconCls}`}
                >
                  <Icon size={20} />
                </div>

                <div>

                  <p className="text-xs text-slate-500">
                    {label}
                  </p>

                  <p
                    className={`text-2xl font-bold ${val}`}
                  >
                    {Number(value).toLocaleString()}
                  </p>

                </div>

              </div>

            </div>

          )
        )}

      </div>


      {/* =====================================================================
          FILTERS
      ===================================================================== */}

      <div className="rounded-xl border border-slate-200 bg-white p-4">

        <div className="flex flex-col gap-3 md:flex-row">

          <div className="relative flex-1">

            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />

            <input
              type="text"
              placeholder="Search rack code, row, rack number..."
              value={searchQuery}
              onChange={e =>
                setSearchQuery(
                  e.target.value
                )
              }
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />

          </div>


          <div className="relative w-full md:w-52">

            <Filter
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />

            <select
              value={filterZone}
              onChange={e =>
                setFilterZone(
                  e.target.value
                )
              }
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >

              <option value="all">
                All Warehouses
              </option>

              {warehouseCodes.map(code => (
                <option
                  key={code}
                  value={code}
                >
                  {code}
                </option>
              ))}

            </select>

          </div>

        </div>

      </div>


      {/* =====================================================================
          DATABASE NOT READY
      ===================================================================== */}

      {!dbReady ? (

        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-slate-200 bg-white px-6 py-14 text-center">

          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
            <Layers
              size={28}
              className="text-amber-600"
            />
          </div>

          <div>

            <p className="text-base font-semibold text-slate-800">
              Database table not set up yet
            </p>

            <p className="mt-1 text-sm text-slate-500">
              The warehouse_locations table does not exist.
              Run your warehouse location migration first.
            </p>

          </div>

        </div>


      ) : filteredLocations.length === 0 ? (

        /* ===================================================================
           EMPTY
        =================================================================== */

        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-slate-200 bg-white px-6 py-14 text-center">

          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
            <MapPin
              size={26}
              className="text-blue-400"
            />
          </div>

          <div>

            <p className="text-base font-semibold text-slate-800">
              No rack locations yet
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Add your physical racks to start generating exact tire locations.
            </p>

          </div>

          {hasRole(
            'admin',
            'manager',
            'operational_staff'
          ) && (

            <button
              onClick={() => {
                setEditingLocation(null);
                setFormData(EMPTY_FORM);
                setShowModal(true);
              }}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <Plus size={15} />
              Add First Rack
            </button>

          )}

        </div>


      ) : (

        /* ===================================================================
           WAREHOUSE GROUPS
        =================================================================== */

        <div className="space-y-3">

          {(() => {

            const groups = {};

            filteredLocations.forEach(
              location => {

                const key =
                  location.zone ||
                  'Unknown';

                if (!groups[key]) {
                  groups[key] = [];
                }

                groups[key].push(
                  location
                );
              }
            );


            return Object.entries(
              groups
            ).map(
              ([warehouseCode, locs]) => {

                const isOpen =
                  openFolders[
                    warehouseCode
                  ] !== false;

                const totalCap =
                  locs.reduce(
                    (sum, location) =>
                      sum +
                      (
                        parseInt(
                          location.capacity
                        ) || 0
                      ),
                    0
                  );

                const totalStock =
                  locs.reduce(
                    (sum, location) =>
                      sum +
                      (
                        parseInt(
                          location.current_stock
                        ) || 0
                      ),
                    0
                  );

                const pct =
                  totalCap > 0
                    ? Math.round(
                        (
                          totalStock /
                          totalCap
                        ) *
                          100
                      )
                    : 0;

                const whName =
                  warehouses.find(
                    w =>
                      w.code ===
                      warehouseCode
                  )?.name ||
                  warehouseCode;


                return (

                  <div
                    key={warehouseCode}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                  >

                    {/* =====================================================
                        WAREHOUSE HEADER
                    ===================================================== */}

                    <button
                      type="button"
                      onClick={() =>
                        setOpenFolders(
                          prev => ({
                            ...prev,

                            [warehouseCode]:
                              !isOpen,
                          })
                        )
                      }
                      className="flex w-full items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3.5 transition-colors hover:bg-slate-100"
                    >

                      <div className="flex items-center gap-3">

                        {isOpen ? (
                          <ChevronDown
                            size={16}
                            className="shrink-0 text-slate-500"
                          />
                        ) : (
                          <ChevronRight
                            size={16}
                            className="shrink-0 text-slate-500"
                          />
                        )}

                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
                          <Warehouse
                            size={17}
                            className="text-blue-600"
                          />
                        </div>

                        <div className="text-left">

                          <p className="text-sm font-bold text-slate-900">
                            {whName}
                          </p>

                          <p className="text-xs text-slate-500">
                            {locs.length} physical rack
                            {locs.length !== 1
                              ? 's'
                              : ''}
                          </p>

                        </div>

                      </div>


                      <div className="flex items-center gap-3 pr-1">

                        <div className="hidden items-center gap-1.5 text-xs text-slate-500 sm:flex">

                          <Package size={13} />

                          <span className="font-semibold text-slate-700">
                            {totalStock.toLocaleString()}
                          </span>

                          <span>/</span>

                          <span>
                            {totalCap.toLocaleString()}
                            {' '}
                            tires
                          </span>

                        </div>


                        <div className="hidden items-center gap-2 md:flex">

                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">

                            <div
                              className={`h-full rounded-full transition-all ${
                                pct >= 90
                                  ? 'bg-red-500'
                                  : pct >= 70
                                  ? 'bg-amber-500'
                                  : 'bg-blue-500'
                              }`}
                              style={{
                                width: `${pct}%`,
                              }}
                            />

                          </div>

                          <span
                            className={`text-xs font-bold ${
                              pct >= 90
                                ? 'text-red-600'
                                : pct >= 70
                                ? 'text-amber-600'
                                : 'text-slate-600'
                            }`}
                          >
                            {pct}%
                          </span>

                        </div>

                      </div>

                    </button>


                    {/* =====================================================
                        RACK TABLE
                    ===================================================== */}

                    {isOpen && (

                      <div className="overflow-x-auto">

                        <table className="w-full text-left text-sm">

                          <thead className="border-b border-slate-100 bg-white text-xs font-bold uppercase tracking-wider text-slate-400">

                            <tr>

                              <th className="px-5 py-2.5">
                                Rack Code
                              </th>

                              <th className="px-5 py-2.5">
                                Physical Location
                              </th>

                              <th className="px-5 py-2.5">
                                Configuration
                              </th>

                              <th className="px-5 py-2.5">
                                Tire Sizes
                              </th>

                              <th className="px-5 py-2.5">
                                Capacity
                              </th>

                              <th className="px-5 py-2.5">
                                Utilization
                              </th>

                              <th className="px-5 py-2.5">
                                Status
                              </th>

                              <th className="px-5 py-2.5 text-right">
                                Actions
                              </th>

                            </tr>

                          </thead>


                          <tbody className="divide-y divide-slate-50">

                            {locs
                              .sort(
                                (a, b) => {

                                  const aMeta =
                                    a.metadata ||
                                    {};

                                  const bMeta =
                                    b.metadata ||
                                    {};

                                  const aRow =
                                    aMeta.rowNumber ??
                                    parseInt(
                                      a.aisle
                                    ) ??
                                    0;

                                  const bRow =
                                    bMeta.rowNumber ??
                                    parseInt(
                                      b.aisle
                                    ) ??
                                    0;

                                  if (
                                    aRow !==
                                    bRow
                                  ) {
                                    return (
                                      aRow -
                                      bRow
                                    );
                                  }

                                  const aRack =
                                    aMeta.rackNumber ??
                                    parseInt(
                                      a.rack
                                    ) ??
                                    0;

                                  const bRack =
                                    bMeta.rackNumber ??
                                    parseInt(
                                      b.rack
                                    ) ??
                                    0;

                                  return (
                                    aRack -
                                    bRack
                                  );
                                }
                              )
                              .map(
                                location => {

                                  const meta =
                                    location.metadata ||
                                    {};

                                  const rowNumber =
                                    meta.rowNumber ??
                                    parseInt(
                                      location.aisle
                                    );

                                  const rackNumber =
                                    meta.rackNumber ??
                                    parseInt(
                                      location.rack
                                    );

                                  const sections =
                                    meta.sectionsPerRack ??
                                    parseInt(
                                      location.shelf
                                    ) ??
                                    0;

                                  const shelves =
                                    meta.shelvesPerSection ??
                                    8;

                                  const subsections =
                                    meta.subsectionsPerSection ??
                                    2;

                                  const tires =
                                    meta.tiresPerSubsection ??
                                    0;

                                  const locPct =
                                    location.capacity >
                                    0
                                      ? Math.round(
                                          (
                                            location.current_stock /
                                            location.capacity
                                          ) *
                                            100
                                        )
                                      : 0;

                                  const tireSummary =
                                    getRackTireSummary(
                                      location
                                    );


                                  return (

                                    <tr
                                      key={location.id}
                                      className="transition-colors hover:bg-blue-50/30"
                                    >

                                      {/* =================================================
                                          RACK CODE
                                      ================================================= */}

                                      <td className="px-5 py-4">

                                        <div className="flex flex-col gap-0.5">

                                          <span className="font-mono text-xs font-bold text-blue-700">
                                            {location.code}
                                          </span>

                                          <span className="text-[10px] text-slate-400">
                                            {calcStoragePositions({
                                              sectionsPerRack:
                                                sections,
                                              shelvesPerSection:
                                                shelves,
                                              subsectionsPerSection:
                                                subsections,
                                            }).toLocaleString()}
                                            {' '}
                                            storage positions
                                          </span>

                                        </div>

                                      </td>


                                      {/* =================================================
                                          PHYSICAL LOCATION
                                      ================================================= */}

                                      <td className="px-5 py-4">

                                        <div className="flex items-center gap-2">

                                          <Rows3
                                            size={15}
                                            className="text-blue-500"
                                          />

                                          <div>

                                            <p className="text-xs font-semibold text-slate-700">
                                              Row{' '}
                                              {padNumber(
                                                rowNumber
                                              )}
                                            </p>

                                            <p className="text-xs text-slate-500">
                                              Rack{' '}
                                              {padNumber(
                                                rackNumber
                                              )}
                                            </p>

                                          </div>

                                        </div>

                                      </td>


                                      {/* =================================================
                                          CONFIGURATION
                                      ================================================= */}

                                      <td className="px-5 py-4">

                                        <div className="space-y-0.5 text-xs">

                                          <div className="font-medium text-slate-700">
                                            {sections}
                                            {' '}
                                            Sec ×
                                            {' '}
                                            {shelves}
                                            {' '}
                                            Sh ×
                                            {' '}
                                            {subsections}
                                            {' '}
                                            Sub
                                          </div>

                                          <div className="font-semibold text-emerald-700">
                                            {tires}
                                            {' '}
                                            max/subsection
                                          </div>

                                        </div>

                                      </td>


                                      {/* =================================================
                                          TIRE SIZES
                                      ================================================= */}

                                      <td className="px-5 py-4">

                                        {tireSummary.length === 0 ? (

                                          /* ---- empty state: single inline button ---- */
                                          <button
                                            type="button"
                                            onClick={() => openPositions(location)}
                                            className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-300 bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-400 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                                          >
                                            <Plus size={10} />
                                            Assign tire
                                          </button>

                                        ) : (

                                          /* ---- filled state ---- */
                                          <div className="flex flex-wrap items-center gap-1">

                                            {/* show 2 badges max */}
                                            {tireSummary.slice(0, 2).map(([size, qty], idx) => (
                                              <TireSizeBadge
                                                key={size}
                                                tireSize={size}
                                                quantity={qty}
                                                colorIndex={idx}
                                              />
                                            ))}

                                            {/* single pill: overflow count + add more */}
                                            <button
                                              type="button"
                                              onClick={() => openPositions(location)}
                                              title="View all tire sizes or add more"
                                              className="inline-flex items-center gap-1 rounded-full border border-dashed border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-600 transition-all hover:border-blue-400 hover:bg-blue-100 hover:text-blue-800"
                                            >
                                              {tireSummary.length > 2 && (
                                                <span className="mr-0.5 text-blue-500">
                                                  +{tireSummary.length - 2}
                                                </span>
                                              )}
                                              <Plus size={9} />
                                              {tireSummary.length > 2 ? 'more' : 'Add more'}
                                            </button>

                                          </div>

                                        )}

                                      </td>


                                      {/* =================================================
                                          CAPACITY
                                      ================================================= */}

                                      <td className="px-5 py-4">

                                        <span
                                          className={`text-sm font-semibold ${capacityColor(
                                            location.current_stock,
                                            location.capacity
                                          )}`}
                                        >
                                          {Number(
                                            location.current_stock ||
                                              0
                                          ).toLocaleString()}
                                        </span>

                                        <span className="text-xs text-slate-400">
                                          {' '}
                                          /
                                          {' '}
                                          {Number(
                                            location.capacity ||
                                              0
                                          ).toLocaleString()}
                                        </span>

                                      </td>


                                      {/* =================================================
                                          UTILIZATION
                                      ================================================= */}

                                      <td className="px-5 py-4">

                                        <div className="flex items-center gap-2">

                                          <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-200">

                                            <div
                                              className={`h-full rounded-full ${
                                                locPct >= 90
                                                  ? 'bg-red-500'
                                                  : locPct >= 70
                                                  ? 'bg-amber-500'
                                                  : 'bg-green-500'
                                              }`}
                                              style={{
                                                width: `${Math.min(
                                                  locPct,
                                                  100
                                                )}%`,
                                              }}
                                            />

                                          </div>

                                          <span className="text-xs text-slate-500">
                                            {locPct}%
                                          </span>

                                        </div>

                                      </td>


                                      {/* =================================================
                                          STATUS
                                      ================================================= */}

                                      <td className="px-5 py-4">

                                        <span
                                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge(
                                            location.status
                                          )}`}
                                        >
                                          {(location.status ||
                                            'unknown')
                                            .charAt(
                                              0
                                            )
                                            .toUpperCase() +
                                            (
                                              location.status ||
                                              'unknown'
                                            ).slice(
                                              1
                                            )}
                                        </span>

                                      </td>


                                      {/* =================================================
                                          ACTIONS
                                      ================================================= */}

                                      <td className="px-5 py-4 text-right">

                                        <div className="flex justify-end gap-1.5">

                                          <button
                                            onClick={() =>
                                              openPositions(
                                                location
                                              )
                                            }
                                            className="rounded-lg p-1.5 text-emerald-600 transition-colors hover:bg-emerald-100"
                                            title="View Storage Positions"
                                          >
                                            <Eye
                                              size={14}
                                            />
                                          </button>


                                          {hasRole(
                                            'admin',
                                            'manager',
                                            'operational_staff'
                                          ) && (

                                            <button
                                              onClick={() =>
                                                handleEdit(
                                                  location
                                                )
                                              }
                                              className="rounded-lg p-1.5 text-blue-600 transition-colors hover:bg-blue-100"
                                              title="Edit Rack"
                                            >
                                              <Edit
                                                size={14}
                                              />
                                            </button>

                                          )}


                                          {hasRole(
                                            'admin',
                                            'manager'
                                          ) && (

                                            <button
                                              onClick={() =>
                                                handleDelete(
                                                  location.id
                                                )
                                              }
                                              className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50"
                                              title="Delete Rack"
                                            >
                                              <Trash2
                                                size={14}
                                              />
                                            </button>

                                          )}

                                        </div>

                                      </td>

                                    </tr>

                                  );
                                }
                              )}

                          </tbody>

                        </table>

                      </div>

                    )}

                  </div>

                );
              }
            );

          })()}

        </div>

      )}


      {/* =====================================================================
          ADD / EDIT RACK MODAL
      ===================================================================== */}

      <Modal
        isOpen={showModal}
        onClose={closeModal}
        size="lg"
        title={
          <span className="flex items-center gap-2">
            <MapPin
              size={16}
              className="text-blue-500"
            />

            {editingLocation
              ? 'Edit Physical Rack'
              : 'Add Physical Rack'}
          </span>
        }
      >

        <form
          onSubmit={handleSubmit}
          className="flex h-full max-h-[calc(90vh-120px)] flex-col"
        >

          <div className="flex-1 space-y-5 overflow-y-auto pr-2">

            {/* ===============================================================
                WAREHOUSE
            =============================================================== */}

            <div className="space-y-3">

              <SectionHeader
                icon={Warehouse}
                label="Warehouse"
              />

              <Field
                label="Select Warehouse"
                required
                hint="Choose the warehouse where this physical rack is located"
              >

                <div className="relative">

                  <Warehouse
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={15}
                  />

                  <select
                    value={
                      formData.warehouseCode
                    }
                    onChange={e =>
                      setFormData(
                        prev => ({
                          ...prev,
                          warehouseCode:
                            e.target.value,
                        })
                      )
                    }
                    className="w-full cursor-pointer rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    required
                  >

                    <option
                      value=""
                      disabled
                    >
                      Select Warehouse...
                    </option>

                    {warehouses.map(
                      warehouse => (

                        <option
                          key={
                            warehouse.id
                          }
                          value={
                            warehouse.code
                          }
                        >
                          {warehouse.name}
                          {' '}
                          (
                          {
                            warehouse.code
                          }
                          )
                        </option>

                      )
                    )}

                  </select>

                </div>

                {warehouses.length ===
                  0 && (

                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-700">

                    <AlertCircle
                      size={13}
                    />

                    No warehouses found.
                    Add warehouses first.

                  </p>

                )}

              </Field>

            </div>


            <hr className="border-slate-100" />


            {/* ===============================================================
                PHYSICAL RACK
            =============================================================== */}

            <div className="space-y-3">

              <SectionHeader
                icon={Rows3}
                label="Physical Rack Position"
              />

              <p className="text-xs text-slate-500">
                Each location represents one physical rack.
                Tire sizes are assigned to individual storage positions,
                not to the entire rack.
              </p>

              <div className="grid grid-cols-2 gap-3">

                <Field
                  label="Rack Row"
                  required
                  hint="Example: Row 1 to Row 7"
                >

                  <TextInput
                    icon={Rows3}
                    type="number"
                    min="1"
                    max="100"
                    value={
                      formData.rowNumber
                    }
                    onChange={setField(
                      'rowNumber'
                    )}
                    required
                  />

                </Field>


                <Field
                  label="Rack Number"
                  required
                  hint="Example: Rack 1 or Rack 2"
                >

                  <TextInput
                    icon={Grid2x2}
                    type="number"
                    min="1"
                    max="100"
                    value={
                      formData.rackNumber
                    }
                    onChange={setField(
                      'rackNumber'
                    )}
                    required
                  />

                </Field>

              </div>


              <Field
                label="Rack Type"
                hint="Optional physical rack description"
              >

                <TextInput
                  icon={Archive}
                  value={
                    formData.rackType
                  }
                  onChange={setField(
                    'rackType'
                  )}
                  placeholder="Standard Tire Rack"
                />

              </Field>

            </div>


            <hr className="border-slate-100" />


            {/* ===============================================================
                RACK CODE
            =============================================================== */}

            <div className="space-y-3">

              <SectionHeader
                icon={Hash}
                label="Rack Location Code"
              />

              <Field
                label="Rack Code"
                required
                hint="Automatically generated from Warehouse + Row + Rack"
              >

                <TextInput
                  icon={Hash}
                  value={
                    formData.code
                  }
                  readOnly
                  className="cursor-not-allowed bg-slate-100 font-mono font-semibold"
                />

              </Field>


              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">

                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-blue-600">
                  Example Exact Product Location
                </p>

                <p className="font-mono text-xs font-bold text-blue-800">
                  {
                    generateExactLocationExample(
                      formData.warehouseCode,
                      formData.rowNumber,
                      formData.rackNumber
                    )
                  }
                </p>

                <p className="mt-1 text-[10px] text-blue-600">
                  Example:
                  {' '}
                  Section → Shelf → Subsection
                  {' '}
                  can contain different tire sizes.
                </p>

              </div>

            </div>


            <hr className="border-slate-100" />


            {/* ===============================================================
                RACK CONFIGURATION
            =============================================================== */}

            <div className="space-y-3">

              <SectionHeader
                icon={Layers}
                label="Rack Configuration"
              />

              <p className="text-xs text-slate-600">
                Configure the physical structure of the rack.
                These settings define maximum physical capacity,
                not tire size.
              </p>


              <div className="grid grid-cols-2 gap-3">

                <Field
                  label="Sections / Rack"
                  required
                  hint="Example: 6"
                >

                  <TextInput
                    icon={Box}
                    type="number"
                    min="1"
                    max="50"
                    value={
                      formData.sectionsPerRack
                    }
                    onChange={setField(
                      'sectionsPerRack'
                    )}
                    required
                  />

                </Field>


                <Field
                  label="Shelves / Section"
                  required
                  hint="Example: 8"
                >

                  <TextInput
                    icon={Layers}
                    type="number"
                    min="1"
                    max="50"
                    value={
                      formData.shelvesPerSection
                    }
                    onChange={setField(
                      'shelvesPerSection'
                    )}
                    required
                  />

                </Field>


                <Field
                  label="Subsections / Shelf"
                  required
                  hint="Example: 2"
                >

                  <TextInput
                    icon={LayoutGrid}
                    type="number"
                    min="1"
                    max="20"
                    value={
                      formData.subsectionsPerSection
                    }
                    onChange={setField(
                      'subsectionsPerSection'
                    )}
                    required
                  />

                </Field>


                <Field
                  label="Max Tires / Subsection"
                  required
                  hint="Maximum physical capacity"
                >

                  <TextInput
                    icon={Package}
                    type="number"
                    min="1"
                    max="100"
                    value={
                      formData.tiresPerSubsection
                    }
                    onChange={setField(
                      'tiresPerSubsection'
                    )}
                    required
                  />

                </Field>

              </div>


              {/* =============================================================
                  CONFIGURATION SUMMARY
              ============================================================= */}

              <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">

                <p className="mb-3 text-xs font-bold text-blue-700">
                  Physical Rack Structure
                </p>


                <div className="space-y-2">

                  <div className="rounded-lg bg-white/70 p-2 text-xs text-slate-700">

                    <span className="font-semibold">
                      Warehouse:
                    </span>

                    {' '}

                    {
                      formData.warehouseCode ||
                      '—'
                    }

                  </div>


                  <div className="rounded-lg bg-white/70 p-2 text-xs text-slate-700">

                    <span className="font-semibold">
                      Row:
                    </span>

                    {' '}

                    {padNumber(
                      formData.rowNumber
                    )}

                    {' → '}

                    <span className="font-semibold">
                      Rack:
                    </span>

                    {' '}

                    {padNumber(
                      formData.rackNumber
                    )}

                  </div>


                  <div className="rounded-lg bg-white/70 p-2 text-xs text-slate-700">

                    {formData.sectionsPerRack}
                    {' '}
                    Sections ×
                    {' '}
                    {formData.shelvesPerSection}
                    {' '}
                    Shelves ×
                    {' '}
                    {formData.subsectionsPerSection}
                    {' '}
                    Subsections

                  </div>

                </div>


                <div className="mt-3 grid grid-cols-2 gap-3">

                  <div className="rounded-lg bg-indigo-100 p-3 text-center">

                    <p className="text-[10px] font-semibold text-indigo-600">
                      Storage Positions
                    </p>

                    <p className="text-2xl font-black text-indigo-800">

                      {calcStoragePositions(
                        formData
                      ).toLocaleString()}

                    </p>

                  </div>


                  <div className="rounded-lg bg-emerald-100 p-3 text-center">

                    <p className="text-[10px] font-semibold text-emerald-600">
                      Maximum Rack Capacity
                    </p>

                    <p className="text-2xl font-black text-emerald-800">

                      {calcRackCapacity(
                        formData
                      ).toLocaleString()}

                    </p>

                  </div>

                </div>

              </div>

            </div>


            <hr className="border-slate-100" />


            {/* ===============================================================
                CAPACITY
            =============================================================== */}

            <div className="space-y-3">

              <SectionHeader
                icon={Package}
                label="Capacity"
              />

              <div className="grid grid-cols-2 gap-3">

                <Field
                  label="Max Capacity"
                  hint="Automatically calculated"
                >

                  <TextInput
                    icon={Package}
                    readOnly
                    value={calcRackCapacity(
                      formData
                    ).toLocaleString()}
                    className="cursor-not-allowed border-emerald-300 bg-emerald-50 font-bold text-emerald-800"
                  />

                </Field>


                <Field
                  label="Current Stock"
                  required
                  hint="Current tires stored"
                >

                  <TextInput
                    icon={Box}
                    type="number"
                    min="0"
                    max={
                      calcRackCapacity(
                        formData
                      ) || undefined
                    }
                    value={
                      formData.current_stock
                    }
                    onChange={setField(
                      'current_stock'
                    )}
                    required
                  />

                </Field>

              </div>

            </div>


            <hr className="border-slate-100" />


            {/* ===============================================================
                STATUS
            =============================================================== */}

            <div className="space-y-3 pb-4">

              <SectionHeader
                icon={CheckCircle2}
                label="Status"
              />

              <StatusPicker
                value={
                  formData.status ||
                  'active'
                }
                onChange={value =>
                  setFormData(
                    prev => ({
                      ...prev,
                      status: value,
                    })
                  )
                }
              />

            </div>

          </div>


          {/* ===============================================================
              ACTIONS
          =============================================================== */}

          <div className="mt-4 flex-shrink-0 border-t border-slate-200 bg-white pt-4">

            <div className="flex gap-3">

              <button
                type="button"
                onClick={closeModal}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >

                <X size={15} />

                Cancel

              </button>


              <button
                type="submit"
                disabled={submitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >

                {submitting ? (

                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />

                ) : editingLocation ? (

                  <Edit size={15} />

                ) : (

                  <Plus size={15} />

                )}

                {submitting
                  ? 'Saving...'
                  : editingLocation
                  ? 'Update Rack'
                  : 'Create Rack'}

              </button>

            </div>

          </div>

        </form>

      </Modal>


      {/* =====================================================================
          STORAGE POSITIONS MODAL
      ===================================================================== */}

      <Modal
        isOpen={showPositionsModal}
        onClose={closePositionsModal}
        size="xl"
        title={
          <span className="flex items-center gap-2">

            <LayoutGrid
              size={16}
              className="text-blue-500"
            />

            Storage Positions

          </span>
        }
      >

        {selectedRack && (

          <div className="space-y-5">

            {/* ===============================================================
                RACK HEADER
            =============================================================== */}

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">

              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">

                <div>

                  <p className="font-mono text-sm font-bold text-blue-800">
                    {selectedRack.code}
                  </p>

                  <p className="mt-1 text-xs text-blue-600">
                    Row{' '}
                    {
                      padNumber(
                        selectedRack.metadata?.rowNumber ??
                        parseInt(selectedRack.aisle)
                      )
                    }
                    {' / '}
                    Rack{' '}
                    {
                      padNumber(
                        selectedRack.metadata?.rackNumber ??
                        parseInt(selectedRack.rack)
                      )
                    }
                  </p>

                </div>

                <div className="flex items-center gap-3">

                  {/* Bulk mode toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      setBulkMode(prev => !prev);
                      setSelectedPositionIds(new Set());
                      setBulkTireSize('');
                      setBulkQuantity('');
                      setBulkProduct(null);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${
                      bulkMode
                        ? 'border-violet-300 bg-violet-600 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700'
                    }`}
                  >
                    <LayoutGrid size={13} />
                    {bulkMode ? 'Exit Bulk Mode' : 'Bulk Assign'}
                  </button>

                  <div className="text-right">
                    <p className="text-xs text-slate-500">Rack Stock</p>
                    <p className="text-xl font-bold text-slate-800">
                      {Number(selectedRack.current_stock || 0).toLocaleString()}
                      {' / '}
                      {Number(selectedRack.capacity || 0).toLocaleString()}
                    </p>
                  </div>

                </div>

              </div>

              {/* Bulk mode hint */}
              {bulkMode && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-700">
                  <Layers size={13} />
                  <span>
                    <strong>Bulk mode ON</strong> — check positions below, then set tire size &amp; quantity in the panel that appears.
                  </span>
                </div>
              )}

            </div>


            {/* ===============================================================
                POSITIONS
            =============================================================== */}

            {loadingPositions[
              selectedRack.id
            ] ? (

              <div className="flex items-center justify-center py-12">

                <RefreshCw
                  size={22}
                  className="animate-spin text-blue-500"
                />

                <span className="ml-2 text-sm text-slate-500">
                  Loading storage positions...
                </span>

              </div>

            ) : (

              <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">

                {Object.entries(
                  (
                    rackPositions[
                      selectedRack.id
                    ] || []
                  ).reduce(
                    (groups, position) => {

                      const key =
                        `Section ${
                          position.section_number
                        }`;

                      if (!groups[key]) {
                        groups[key] = [];
                      }

                      groups[key].push(
                        position
                      );

                      return groups;

                    },
                    {}
                  )
                ).map(
                  ([
                    sectionName,
                    positions,
                  ]) => (

                    <div
                      key={sectionName}
                      className="overflow-hidden rounded-xl border border-slate-200"
                    >

                      {/* ===================================================
                          SECTION HEADER
                      =================================================== */}

                      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">

                        <div className="flex items-center justify-between gap-2">

                          <div className="flex items-center gap-2">
                            <Box size={15} className="text-blue-500" />
                            <p className="text-sm font-bold text-slate-800">
                              {sectionName}
                            </p>
                          </div>

                          {/* Select-all toggle for this section */}
                          {bulkMode && (() => {
                            const sectionIds = positions.map(p => p.id);
                            const allSelected = sectionIds.every(id => selectedPositionIds.has(id));
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPositionIds(prev => {
                                    const next = new Set(prev);
                                    if (allSelected) {
                                      sectionIds.forEach(id => next.delete(id));
                                    } else {
                                      sectionIds.forEach(id => next.add(id));
                                    }
                                    return next;
                                  });
                                }}
                                className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-all ${
                                  allSelected
                                    ? 'border-violet-300 bg-violet-100 text-violet-700'
                                    : 'border-slate-200 bg-white text-slate-500 hover:border-violet-300 hover:text-violet-600'
                                }`}
                              >
                                {allSelected ? '✓ All selected' : 'Select all'}
                              </button>
                            );
                          })()}

                        </div>

                      </div>


                      {/* ===================================================
                          POSITION GRID
                      =================================================== */}

                      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">

                        {positions
                          .sort(
                            (a, b) => {

                              if (
                                a.shelf_number !==
                                b.shelf_number
                              ) {
                                return (
                                  a.shelf_number -
                                  b.shelf_number
                                );
                              }

                              return (
                                a.subsection_number -
                                b.subsection_number
                              );
                            }
                          )
                          .map(
                            position => {

                              const quantity =
                                Number(
                                  position.current_stock ||
                                    position.quantity ||
                                    0
                                );

                              const capacity =
                                Number(
                                  position.capacity ||
                                    0
                                );

                              const utilization =
                                getPositionUtilization(
                                  position
                                );

                              const tireSize =
                                position.tire_size ||
                                position.tireSize;


                              return (

                                <div
                                  key={position.id}
                                  className={`relative rounded-xl border bg-white p-3 text-left transition-all ${
                                    bulkMode
                                      ? selectedPositionIds.has(position.id)
                                        ? 'border-violet-400 bg-violet-50 shadow-md ring-2 ring-violet-300'
                                        : 'cursor-pointer border-slate-200 hover:border-violet-300 hover:bg-violet-50/40'
                                      : 'cursor-pointer border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 hover:shadow-sm'
                                  }`}
                                  onClick={() => {
                                    if (bulkMode) {
                                      setSelectedPositionIds(prev => {
                                        const next = new Set(prev);
                                        if (next.has(position.id)) {
                                          next.delete(position.id);
                                        } else {
                                          next.add(position.id);
                                        }
                                        return next;
                                      });
                                    } else {
                                      selectPosition(position);
                                    }
                                  }}
                                >

                                  {/* Bulk checkbox overlay */}
                                  {bulkMode && (
                                    <div className={`absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                                      selectedPositionIds.has(position.id)
                                        ? 'border-violet-500 bg-violet-500 text-white'
                                        : 'border-slate-300 bg-white'
                                    }`}>
                                      {selectedPositionIds.has(position.id) && (
                                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                          <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                      )}
                                    </div>
                                  )}

                                  {/* =================================
                                      POSITION CODE
                                  ================================= */}

                                  <div className="mb-3 flex items-start justify-between gap-2">

                                    <div>

                                      <p className="font-mono text-[10px] font-bold text-blue-700">
                                        {position.position_code || position.positionCode}
                                      </p>

                                      <p className="mt-0.5 text-[10px] text-slate-400">
                                        Shelf{' '}{padNumber(position.shelf_number)}
                                        {' · '}
                                        Subsection{' '}{padNumber(position.subsection_number)}
                                      </p>

                                    </div>

                                    <span
                                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                        quantity === 0
                                          ? 'bg-slate-100 text-slate-500'
                                          : utilization >= 90
                                          ? 'bg-red-100 text-red-600'
                                          : utilization >= 70
                                          ? 'bg-amber-100 text-amber-600'
                                          : 'bg-green-100 text-green-600'
                                      }`}
                                    >
                                      {quantity === 0 ? 'Empty' : `${utilization}%`}
                                    </span>

                                  </div>


                                  {/* =================================
                                      TIRE SIZE
                                  ================================= */}

                                  <div className="mb-3 min-h-[42px]">

                                    {tireSize ? (
                                      <>
                                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                          Tire Size
                                        </p>
                                        <p className="text-sm font-bold text-slate-800">{tireSize}</p>
                                      </>
                                    ) : (
                                      <div className="flex h-full items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                                        <Tag size={14} className="text-slate-400" />
                                        <span className="text-xs text-slate-400">No tire assigned</span>
                                      </div>
                                    )}

                                  </div>


                                  {/* =================================
                                      QUANTITY BAR
                                  ================================= */}

                                  <div>
                                    <div className="mb-1 flex items-center justify-between">
                                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                        Quantity
                                      </span>
                                      <span className="text-xs font-bold text-slate-700">
                                        {quantity} / {capacity}
                                      </span>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                                      <div
                                        className={`h-full rounded-full transition-all ${
                                          utilization >= 90 ? 'bg-red-500'
                                          : utilization >= 70 ? 'bg-amber-500'
                                          : 'bg-blue-500'
                                        }`}
                                        style={{ width: `${utilization}%` }}
                                      />
                                    </div>
                                  </div>


                                  {/* =================================
                                      HOVER ACTION HINT
                                  ================================= */}

                                  {!bulkMode && (
                                    <div className="group mt-3 flex items-center justify-end gap-1 text-[10px] font-semibold text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
                                      <Edit size={11} />
                                      Assign / Edit
                                    </div>
                                  )}

                                </div>

                              );

                            }
                          )}

                      </div>

                    </div>

                  )
                )}

              </div>

            )}


            {/* ===============================================================
                BULK ASSIGN PANEL  (shown when positions are selected)
            =============================================================== */}

            {bulkMode && selectedPositionIds.size > 0 && (

              <div className="rounded-xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-4 shadow-lg">

                <div className="mb-3 flex items-center justify-between">

                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100">
                      <Layers size={14} className="text-violet-600" />
                    </div>
                    <p className="text-sm font-bold text-violet-800">
                      Bulk Assign —{' '}
                      <span className="text-violet-600">
                        {selectedPositionIds.size} position{selectedPositionIds.size !== 1 ? 's' : ''} selected
                      </span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedPositionIds(new Set())}
                    className="rounded-lg p-1 text-violet-400 hover:bg-violet-100 hover:text-violet-700"
                    title="Clear selection"
                  >
                    <X size={14} />
                  </button>

                </div>


                {/* Product picker (reused from single assign) */}
                {bulkProduct ? (

                  <div className="mb-3 flex items-center gap-3 rounded-xl border border-violet-200 bg-white p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                      <Zap size={14} className="text-violet-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-violet-900">
                        {bulkProduct.brand} {bulkProduct.model}
                      </p>
                      <p className="text-[11px] text-violet-600">
                        {bulkProduct.dimensions}
                        {bulkProduct.sku && <span className="ml-2 font-mono opacity-70">{bulkProduct.sku}</span>}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setBulkProduct(null); setBulkTireSize(''); }}
                      className="shrink-0 rounded-lg p-1 text-violet-400 hover:bg-violet-200"
                    >
                      <X size={12} />
                    </button>
                  </div>

                ) : (

                  <div className="relative mb-3">
                    <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder={loadingProducts ? 'Loading...' : 'Search product to auto-fill size...'}
                      value={bulkProductSearch}
                      disabled={loadingProducts}
                      onChange={e => { setBulkProductSearch(e.target.value); setShowBulkProductDropdown(true); }}
                      onFocus={() => { loadProducts(); setShowBulkProductDropdown(true); }}
                      className="w-full rounded-lg border border-violet-200 bg-white py-2 pl-9 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:opacity-60"
                    />

                    {showBulkProductDropdown && products.length > 0 && (
                      <div className="absolute z-50 mt-1 max-h-40 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                        {products
                          .filter(p => {
                            const q = bulkProductSearch.toLowerCase();
                            return !q || p.brand?.toLowerCase().includes(q) || p.model?.toLowerCase().includes(q) || p.dimensions?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q);
                          })
                          .map(product => {
                            const label = [product.brand, product.model, product.dimensions].filter(Boolean).join(' ');
                            return (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() => {
                                  setBulkProduct(product);
                                  setBulkTireSize(label);
                                  setBulkProductSearch('');
                                  setShowBulkProductDropdown(false);
                                }}
                                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-violet-50"
                              >
                                <Tag size={12} className="shrink-0 text-slate-400" />
                                <span className="font-medium">{product.brand} {product.model}</span>
                                <span className="ml-auto text-[11px] text-slate-400">{product.dimensions}</span>
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>

                )}


                {/* Tire size + quantity row */}
                <div className="flex gap-2">

                  <div className="relative flex-1">
                    <Tag size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tire size..."
                      value={bulkTireSize}
                      onChange={e => setBulkTireSize(e.target.value)}
                      className={`w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm outline-none transition focus:ring-2 ${
                        bulkProduct
                          ? 'border-violet-300 bg-violet-50 font-semibold text-violet-900 focus:border-violet-400 focus:ring-violet-100'
                          : 'border-slate-200 bg-white focus:border-violet-400 focus:ring-violet-100'
                      }`}
                    />
                  </div>

                  <div className="relative w-24">
                    <Package size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      min="0"
                      placeholder="Qty"
                      value={bulkQuantity}
                      onChange={e => setBulkQuantity(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={saveBulkPositions}
                    disabled={bulkSaving || !bulkTireSize.trim()}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {bulkSaving
                      ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      : <Save size={14} />
                    }
                    {bulkSaving ? 'Saving...' : 'Apply'}
                  </button>

                </div>

                <p className="mt-2 text-[11px] text-violet-500">
                  This will overwrite the tire size and quantity for all {selectedPositionIds.size} selected position{selectedPositionIds.size !== 1 ? 's' : ''}.
                </p>

              </div>

            )}


            {/* ===============================================================
                CLOSE
            =============================================================== */}

            <div className="flex items-center justify-between border-t border-slate-200 pt-4">

              {bulkMode && (
                <p className="text-xs text-slate-400">
                  {selectedPositionIds.size === 0
                    ? 'Click positions to select them'
                    : `${selectedPositionIds.size} selected`
                  }
                </p>
              )}

              <button
                type="button"
                onClick={closePositionsModal}
                className="ml-auto rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>

            </div>

          </div>

        )}

      </Modal>


      {/* =====================================================================
          TIRE ASSIGNMENT MODAL
      ===================================================================== */}

      <Modal
        isOpen={
          !!selectedPosition
        }
        onClose={() =>
          setSelectedPosition(
            null
          )
        }
        size="md"
        title={
          <span className="flex items-center gap-2">

            <Tag
              size={16}
              className="text-blue-500"
            />

            Assign Tire to Position

          </span>
        }
      >

        {selectedPosition && (

          <div className="space-y-5">

            {/* ===============================================================
                LOCATION
            =============================================================== */}

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">

              <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">
                Storage Position
              </p>

              <p className="mt-1 font-mono text-sm font-bold text-blue-800">
                {
                  selectedPosition.position_code ||
                  selectedPosition.positionCode
                }
              </p>

              <p className="mt-1 text-xs text-blue-600">

                Section{' '}
                {
                  padNumber(
                    selectedPosition.section_number
                  )
                }

                {' · '}

                Shelf{' '}
                {
                  padNumber(
                    selectedPosition.shelf_number
                  )
                }

                {' · '}

                Subsection{' '}
                {
                  padNumber(
                    selectedPosition.subsection_number
                  )
                }

              </p>

            </div>


            {/* ===============================================================
                PRODUCT PICKER
            =============================================================== */}

            <div className="space-y-2">

              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Car size={12} />
                  Select Tire Product
                  <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-600">
                    Recommended
                  </span>
                </span>
              </label>

              {/* Selected product card */}
              {selectedProduct ? (

                <div className="flex items-start gap-3 rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-3">

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                    <Zap size={16} className="text-blue-600" />
                  </div>

                  <div className="min-w-0 flex-1">

                    <p className="truncate text-sm font-bold text-blue-900">
                      {selectedProduct.brand} {selectedProduct.model}
                    </p>

                    <div className="mt-0.5 flex flex-wrap gap-2 text-[11px] text-blue-700">

                      {selectedProduct.dimensions && (
                        <span className="inline-flex items-center gap-1">
                          <Tag size={9} />
                          {selectedProduct.dimensions}
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1">
                        <Package size={9} />
                        Stock: {selectedProduct.current_stock ?? 0}
                      </span>

                      {selectedProduct.sku && (
                        <span className="font-mono opacity-70">
                          {selectedProduct.sku}
                        </span>
                      )}

                    </div>

                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProduct(null);
                      setTireSizeInput('');
                      setProductSearch('');
                    }}
                    className="shrink-0 rounded-lg p-1 text-blue-400 transition-colors hover:bg-blue-200 hover:text-blue-700"
                    title="Clear selection"
                  >
                    <X size={13} />
                  </button>

                </div>

              ) : (

                /* Search box + dropdown */
                <div className="relative">

                  <div className="relative">

                    <Search
                      size={14}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="text"
                      placeholder={loadingProducts ? 'Loading products...' : 'Search brand, model, size...'}
                      value={productSearch}
                      disabled={loadingProducts}
                      onChange={e => {
                        setProductSearch(e.target.value);
                        setShowProductDropdown(true);
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-9 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                    />

                    <ChevronDown
                      size={14}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                  </div>


                  {/* Dropdown list */}
                  {showProductDropdown && products.length > 0 && (

                    <div className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl">

                      {(() => {
                        const q = productSearch.toLowerCase();
                        const filtered = products.filter(p =>
                          !q ||
                          p.brand?.toLowerCase().includes(q) ||
                          p.model?.toLowerCase().includes(q) ||
                          p.dimensions?.toLowerCase().includes(q) ||
                          p.sku?.toLowerCase().includes(q)
                        );

                        if (filtered.length === 0) {
                          return (
                            <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-400">
                              <Search size={13} />
                              No matching products
                            </div>
                          );
                        }

                        return filtered.map(product => {
                          const tireLabel =
                            [product.brand, product.model, product.dimensions]
                              .filter(Boolean)
                              .join(' ');

                          return (
                            <button
                              key={product.id}
                              type="button"
                              onClick={() => {
                                setSelectedProduct(product);
                                setTireSizeInput(tireLabel);
                                setProductSearch('');
                                setShowProductDropdown(false);
                              }}
                              className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-blue-50"
                            >

                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                                <Tag size={12} className="text-slate-500" />
                              </div>

                              <div className="min-w-0 flex-1">

                                <p className="truncate text-sm font-semibold text-slate-800">
                                  {product.brand} {product.model}
                                </p>

                                <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-slate-500">

                                  {product.dimensions && (
                                    <span>{product.dimensions}</span>
                                  )}

                                  {product.sku && (
                                    <span className="font-mono">{product.sku}</span>
                                  )}

                                </div>

                              </div>

                              {/* stock badge */}
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  (product.current_stock ?? 0) === 0
                                    ? 'bg-red-100 text-red-600'
                                    : (product.current_stock ?? 0) <= (product.reorder_level ?? 10)
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-green-100 text-green-700'
                                }`}
                              >
                                {product.current_stock ?? 0} in stock
                              </span>

                            </button>
                          );
                        });
                      })()}

                    </div>

                  )}

                </div>

              )}

              <p className="text-[11px] text-slate-400">
                Can't find it? Type manually in the Tire Size field below.
              </p>

            </div>


            {/* ===============================================================
                TIRE SIZE (manual / auto-filled)
            =============================================================== */}

            <Field
              label="Tire Size"
              required={Number(quantityInput) > 0}
              hint={
                selectedProduct
                  ? 'Auto-filled from selected product'
                  : 'Example: Dual Sport 90/90-17'
              }
            >

              <TextInput
                icon={Tag}
                value={tireSizeInput}
                onChange={e => setTireSizeInput(e.target.value)}
                placeholder="Dual Sport 90/90-17"
                className={selectedProduct ? 'border-blue-300 bg-blue-50 font-semibold text-blue-800' : ''}
              />

            </Field>


            {/* ===============================================================
                QUANTITY
            =============================================================== */}

            <Field
              label="Quantity"
              required
              hint={`Maximum capacity: ${
                selectedPosition.capacity ||
                0
              } tires`}
            >

              <TextInput
                icon={Package}
                type="number"
                min="0"
                max={
                  selectedPosition.capacity ||
                  undefined
                }
                value={
                  quantityInput
                }
                onChange={e =>
                  setQuantityInput(
                    e.target.value
                  )
                }
              />

            </Field>


            {/* ===============================================================
                CAPACITY SUMMARY
            =============================================================== */}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

              <div className="flex items-center justify-between">

                <span className="text-xs font-semibold text-slate-500">
                  Position Capacity
                </span>

                <span className="text-sm font-bold text-slate-800">

                  {quantityInput || 0}
                  {' / '}
                  {
                    selectedPosition.capacity ||
                    0
                  }

                </span>

              </div>


              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">

                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      (
                        Number(
                          quantityInput
                        ) /
                        Number(
                          selectedPosition.capacity ||
                            1
                        )
                      ) *
                        100
                    )}%`,
                  }}
                />

              </div>

            </div>


            {/* ===============================================================
                ACTIONS
            =============================================================== */}

            <div className="flex gap-3 border-t border-slate-200 pt-4">

              <button
                type="button"
                onClick={() =>
                  setSelectedPosition(
                    null
                  )
                }
                className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >

                Cancel

              </button>


              <button
                type="button"
                onClick={savePosition}
                disabled={
                  positionSaving
                }
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >

                {positionSaving ? (

                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />

                ) : (

                  <Save size={15} />

                )}

                {positionSaving
                  ? 'Saving...'
                  : 'Save Position'}

              </button>

            </div>

          </div>

        )}

      </Modal>

    </motion.div>
  );
}