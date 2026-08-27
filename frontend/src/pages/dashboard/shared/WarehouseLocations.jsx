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
  Clock,
  History,
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
    value: 'almost_full',
    label: 'Almost Full',
    Icon: AlertCircle,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  {
    value: 'full',
    label: 'Full',
    Icon: XCircle,
    color: 'text-red-600 bg-red-50 border-red-200',
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
    color: 'text-purple-600 bg-purple-50 border-purple-200',
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


function getAutoStatus(current, capacity) {
  if (!capacity) return 'empty';
  
  const pct = (current / capacity) * 100;
  
  if (pct >= 100) return 'full';
  if (pct >= 90) return 'almost_full';
  if (pct === 0) return 'empty';
  
  return 'active';
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

  const [showAvailablePositionsModal, setShowAvailablePositionsModal] =
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

  // Receive & Place Shipment state
  const [showReceiveModal, setShowReceiveModal] =
    useState(false);

  const [shipmentData, setShipmentData] =
    useState({
      selectedProduct: null,
      quantityToStore: '',
      targetRackId: null,
      targetPositionIds: [], // Changed to array for multiple positions
    });

  const [receiving, setReceiving] =
    useState(false);

  const [shipmentProductSearch, setShipmentProductSearch] =
    useState('');

  const [showShipmentProductDropdown, setShowShipmentProductDropdown] =
    useState(false);

  // Shipment history state
  const [shipmentHistory, setShipmentHistory] =
    useState([]);

  const [showHistoryModal, setShowHistoryModal] =
    useState(false);

  // Inline quantity edit state
  const [editingQuantityPositionId, setEditingQuantityPositionId] =
    useState(null);

  const [editingQuantityValue, setEditingQuantityValue] =
    useState('');

  const [savingInlineQuantity, setSavingInlineQuantity] =
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
     OPEN AVAILABLE POSITIONS MODAL
  ========================================================================== */

  const openAvailablePositions = async location => {
    setSelectedRack(location);
    await loadRackPositions(location);
    setShowAvailablePositionsModal(true);
  };


  /* ==========================================================================
     GET AVAILABLE RACKS FOR SHIPMENT (active + has capacity)
  ========================================================================== */

  const getAvailableRacksForShipment = () => {
    return locations.filter(rack => {
      const availableCapacity = Number(rack.capacity || 0) - Number(rack.current_stock || 0);
      return rack.status === 'active' && availableCapacity > 0;
    });
  };


  /* ==========================================================================
     GET AVAILABLE POSITIONS FOR RACK (considering tire size match)
  ========================================================================== */

  const getAvailablePositionsForRack = (rackId) => {
    const positions = rackPositions[rackId] || [];
    const selectedProduct = shipmentData.selectedProduct;
    
    return positions.filter(position => {
      const currentQty = Number(position.current_stock || position.quantity || 0);
      const capacity = Number(position.capacity || 0);
      const tireSize = position.tire_size || position.tireSize;
      
      // Position must have available capacity
      if (currentQty >= capacity) return false;
      
      // If position is empty, it's available
      if (!tireSize && currentQty === 0) return true;
      
      // If position has a tire size, it must match the product dimensions
      if (tireSize && selectedProduct?.dimensions) {
        return tireSize === selectedProduct.dimensions;
      }
      
      return false;
    });
  };


  /* ==========================================================================
     HANDLE ASSIGN SHIPMENT TO LOCATION (with multiple positions)
  ========================================================================== */

  const handleAssignShipmentToLocation = async () => {
    const { selectedProduct, quantityToStore, targetRackId, targetPositionIds } = shipmentData;
    
    if (!selectedProduct) {
      showToast('Please select a product', 'error');
      return;
    }
    
    if (!quantityToStore || Number(quantityToStore) <= 0) {
      showToast('Please enter a valid quantity', 'error');
      return;
    }
    
    if (!targetRackId) {
      showToast('Please select a rack', 'error');
      return;
    }
    
    if (!targetPositionIds || targetPositionIds.length === 0) {
      showToast('Please select at least one position', 'error');
      return;
    }
    
    const positions = rackPositions[targetRackId] || [];
    const selectedPositions = positions.filter(p => targetPositionIds.includes(p.id));
    
    if (selectedPositions.length === 0) {
      showToast('Selected positions not found', 'error');
      return;
    }
    
    // Calculate total available capacity across selected positions
    const totalAvailableCapacity = selectedPositions.reduce((sum, pos) => {
      const currentQty = Number(pos.current_stock || pos.quantity || 0);
      const capacity = Number(pos.capacity || 0);
      return sum + (capacity - currentQty);
    }, 0);
    
    const totalQuantity = Number(quantityToStore);
    
    if (totalQuantity > totalAvailableCapacity) {
      showToast(
        `Cannot store ${totalQuantity} tires. Selected positions only have ${totalAvailableCapacity} total capacity available.`,
        'error'
      );
      return;
    }
    
    setReceiving(true);
    
    try {
      const tireLabel = [selectedProduct.brand, selectedProduct.model, selectedProduct.dimensions]
        .filter(Boolean)
        .join(' ');
      
      // Distribute quantity across positions
      let remainingQty = totalQuantity;
      const updates = [];
      
      for (const position of selectedPositions) {
        if (remainingQty <= 0) break;
        
        const currentQty = Number(position.current_stock || position.quantity || 0);
        const capacity = Number(position.capacity || 0);
        const availableSpace = capacity - currentQty;
        
        // How much can we store in this position?
        const qtyToStore = Math.min(remainingQty, availableSpace);
        
        if (qtyToStore > 0) {
          updates.push({
            positionId: position.id,
            newQuantity: currentQty + qtyToStore,
            qtyStored: qtyToStore,
            positionCode: position.position_code || position.positionCode,
          });
          
          remainingQty -= qtyToStore;
        }
      }
      
      // Execute all updates in parallel
      await Promise.all(
        updates.map(update =>
          api.put(
            `/warehouse-locations/${targetRackId}/positions/${update.positionId}`,
            {
              tire_size: tireLabel,
              quantity: update.newQuantity,
            }
          )
        )
      );
      
      const positionSummary = updates.map(u => `${u.positionCode} (+${u.qtyStored})`).join(', ');
      
      showToast(
        `Successfully stored ${totalQuantity} × ${tireLabel} across ${updates.length} position${updates.length > 1 ? 's' : ''}: ${positionSummary}`,
        'success'
      );
      
      // Add to shipment history
      const historyEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        product: {
          name: `${selectedProduct.brand} ${selectedProduct.model}`,
          dimensions: selectedProduct.dimensions,
          sku: selectedProduct.sku,
        },
        quantity: totalQuantity,
        rack: locations.find(l => l.id === targetRackId),
        positions: updates,
        totalPositions: updates.length,
      };
      
      setShipmentHistory(prev => [historyEntry, ...prev]);
      
      // Refresh data
      await loadRackPositions({ id: targetRackId }, true);
      await loadLocations();
      
      // Reset shipment form
      setShipmentData({
        selectedProduct: null,
        quantityToStore: '',
        targetRackId: null,
        targetPositionIds: [],
      });
      setShipmentProductSearch('');
      setShowReceiveModal(false);
      
    } catch (error) {
      console.error('Shipment assignment error:', error);
      showToast(
        error.response?.data?.error || error.message || 'Failed to assign shipment',
        'error'
      );
    } finally {
      setReceiving(false);
    }
  };


  /* ==========================================================================
     CLOSE AVAILABLE POSITIONS MODAL
  ========================================================================== */

  const closeAvailablePositionsModal = () => {
    setShowAvailablePositionsModal(false);
    setSelectedRack(null);
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
     SAVE INLINE QUANTITY EDIT
  ========================================================================== */

  const saveInlineQuantity = async (position) => {

    if (!selectedRack) return;

    const newQuantity = parseInt(editingQuantityValue) || 0;
    const capacity = Number(position.capacity || 0);

    if (newQuantity < 0) {
      showToast('Quantity cannot be negative', 'error');
      setEditingQuantityPositionId(null);
      return;
    }

    if (newQuantity > capacity) {
      showToast(`Quantity cannot exceed capacity of ${capacity}`, 'error');
      setEditingQuantityPositionId(null);
      return;
    }

    // If setting quantity to 0, clear tire size
    // If setting quantity > 0 and no tire size exists, show error
    const currentTireSize = position.tire_size || position.tireSize;
    if (newQuantity > 0 && !currentTireSize) {
      showToast('Please assign a tire size first using the "Assign Tire" button', 'error');
      setEditingQuantityPositionId(null);
      return;
    }

    setSavingInlineQuantity(true);

    try {

      await api.put(
        `/warehouse-locations/${selectedRack.id}/positions/${position.id}`,
        {
          tire_size: newQuantity > 0 ? currentTireSize : null,
          quantity: newQuantity,
        }
      );

      showToast('Quantity updated', 'success');

      // Refresh positions
      await loadRackPositions(selectedRack, true);

      // Refresh rack data
      const refreshedLocations = await loadLocations();
      const updatedRack = refreshedLocations?.find(l => l.id === selectedRack.id);
      if (updatedRack) {
        setSelectedRack(updatedRack);
      }

      setEditingQuantityPositionId(null);

    } catch (error) {

      console.error('Inline quantity update error:', error);
      showToast(
        error.response?.data?.error || error.message || 'Failed to update quantity',
        'error'
      );

    } finally {
      setSavingInlineQuantity(false);
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
     RACK POSITION AVAILABILITY
  ========================================================================== */

  const getRackPositionAvailability = location => {
    const positions = rackPositions[location.id];

    const totalPositions = calcStoragePositions({
      sectionsPerRack: Number(location.metadata?.sectionsPerRack ?? parseInt(location.shelf) ?? 0),
      shelvesPerSection: Number(location.metadata?.shelvesPerSection ?? 8),
      subsectionsPerSection: Number(location.metadata?.subsectionsPerSection ?? 2),
    });

    if (!positions) {
      return { loaded: false, total: totalPositions, available: 0, bySection: {} };
    }

    const available = positions.filter(position => {
      const quantity = Number(position.current_stock ?? position.quantity ?? 0);
      const tireSize = position.tire_size || position.tireSize || null;
      return quantity === 0 && !tireSize;
    }).length;

    // Group by section and subsection
    const bySection = {};
    positions.forEach(position => {
      const sectionKey = `Section ${position.section_number}`;
      const subsectionKey = `Subsection ${position.subsection_number}`;
      
      if (!bySection[sectionKey]) {
        bySection[sectionKey] = {
          total: 0,
          available: 0,
          subsections: {}
        };
      }

      if (!bySection[sectionKey].subsections[subsectionKey]) {
        bySection[sectionKey].subsections[subsectionKey] = {
          total: 0,
          available: 0,
          shelves: []
        };
      }

      const isAvailable = isPositionAvailable(position);
      
      bySection[sectionKey].total++;
      bySection[sectionKey].subsections[subsectionKey].total++;
      
      if (isAvailable) {
        bySection[sectionKey].available++;
        bySection[sectionKey].subsections[subsectionKey].available++;
      }

      bySection[sectionKey].subsections[subsectionKey].shelves.push({
        shelf_number: position.shelf_number,
        position,
        available: isAvailable
      });
    });

    return {
      loaded: true,
      total: positions.length || totalPositions,
      available,
      bySection
    };
  };


  const isPositionAvailable = position => {
    const quantity = Number(position.current_stock ?? position.quantity ?? 0);
    const capacity = Number(position.capacity ?? 0);
    const tireSize = position.tire_size || position.tireSize || null;
    
    // Truly available means: no tire assigned AND no quantity AND has capacity
    return !tireSize && quantity === 0 && capacity > 0;
  };


  /* ==========================================================================
     RENDER HELPERS
  ========================================================================== */

  const statusBadge = status => ({
    active:
      'bg-green-100 text-green-700',

    almost_full:
      'bg-amber-100 text-amber-700',

    full:
      'bg-red-100 text-red-700',

    empty:
      'bg-slate-100 text-slate-600',

    maintenance:
      'bg-purple-100 text-purple-700',

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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistoryModal(true)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              title="View Shipment History"
            >
              <History size={16} />
              History
              {shipmentHistory.length > 0 && (
                <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                  {shipmentHistory.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setShipmentData({
                  selectedProduct: null,
                  quantityToStore: '',
                  targetRackId: null,
                  targetPositionIds: [],
                });
                setShipmentProductSearch('');
                setShowReceiveModal(true);
                loadProducts();
              }}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              <Package size={16} />
              Receive & Place Shipment
            </button>

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
          </div>
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

                        <table className="w-full text-left" style={{ fontSize: '13px' }}>

                          <thead className="border-b border-slate-100 bg-white text-xs font-bold uppercase tracking-wider text-slate-400" style={{ height: '52px' }}>

                            <tr>

                              <th className="px-3 py-2.5" style={{ padding: '10px 12px' }}>
                                Rack Code
                              </th>

                              <th className="px-3 py-2.5" style={{ padding: '10px 12px' }}>
                                Physical Location
                              </th>

                              <th className="px-3 py-2.5" style={{ padding: '10px 12px' }}>
                                Configuration
                              </th>

                              <th className="px-3 py-2.5" style={{ padding: '10px 12px' }}>
                                Total Tires
                              </th>

                              <th className="px-3 py-2.5" style={{ padding: '10px 12px' }}>
                                Available Positions
                              </th>

                              <th className="px-3 py-2.5" style={{ padding: '10px 12px' }}>
                                Capacity
                              </th>

                              <th className="px-3 py-2.5" style={{ padding: '10px 12px' }}>
                                Utilization
                              </th>

                              <th className="px-3 py-2.5" style={{ padding: '10px 12px' }}>
                                Status
                              </th>

                              <th className="px-3 py-2.5 text-right" style={{ padding: '10px 12px' }}>
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

                                  const positionAvailability =
                                    getRackPositionAvailability(
                                      location
                                    );


                                  return (

                                    <tr
                                      key={location.id}
                                      className="transition-colors hover:bg-blue-50/30"
                                      style={{ height: '88px' }}
                                    >

                                      {/* =================================================
                                          RACK CODE
                                      ================================================= */}

                                      <td className="px-3 py-2.5" style={{ padding: '10px 12px' }}>

                                        <div className="flex flex-col gap-0.5">

                                          <span className="whitespace-nowrap font-mono font-bold text-blue-700" style={{ fontSize: '13px' }}>
                                            {location.code}
                                          </span>

                                          <span className="text-slate-400" style={{ fontSize: '11px' }}>
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

                                      <td className="px-3 py-2.5" style={{ padding: '10px 12px' }}>

                                        <div className="flex items-center gap-2">

                                          <Rows3
                                            size={15}
                                            className="text-blue-500"
                                          />

                                          <div>

                                            <p className="font-semibold text-slate-700" style={{ fontSize: '13px' }}>
                                              Row{' '}
                                              {padNumber(
                                                rowNumber
                                              )}
                                            </p>

                                            <p className="text-slate-500" style={{ fontSize: '11px' }}>
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

                                      <td className="px-3 py-2.5" style={{ padding: '10px 12px' }}>

                                        <div className="space-y-0.5" style={{ fontSize: '13px' }}>

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

                                          <div className="font-semibold text-emerald-700" style={{ fontSize: '11px' }}>
                                            {tires}
                                            {' '}
                                            max/subsection
                                          </div>

                                        </div>

                                      </td>


                                      {/* =================================================
                                          TOTAL TIRES
                                      ================================================= */}

                                      <td className="px-3 py-2.5" style={{ padding: '10px 12px' }}>

                                        {(() => {
                                          const tireSummary = getRackTireSummary(location);
                                          const totalTires = tireSummary.reduce((sum, [_, qty]) => sum + qty, 0);

                                          return (
                                            <div className="flex items-center gap-3">
                                              {totalTires === 0 ? (
                                                /* ---- empty state: single inline button ---- */
                                                <button
                                                  type="button"
                                                  onClick={() => openPositions(location)}
                                                  className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-300 bg-slate-50 px-3 text-slate-400 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                                                  style={{ height: '34px', fontSize: '11px', fontWeight: 500 }}
                                                >
                                                  <Plus size={10} />
                                                  Assign Tire
                                                </button>
                                              ) : (
                                                /* ---- filled state: show total and View Tires button ---- */
                                                <>
                                                  <div className="flex items-center gap-2">
                                                    <div className="flex items-center justify-center rounded-lg bg-blue-100" style={{ height: '40px', width: '40px' }}>
                                                      <Package size={16} className="text-blue-600" />
                                                    </div>
                                                    <div>
                                                      <p className="font-bold text-blue-700" style={{ fontSize: '16px' }}>
                                                        {totalTires.toLocaleString()}
                                                      </p>
                                                      <p className="text-slate-500" style={{ fontSize: '11px' }}>
                                                        {tireSummary.length} tire size{tireSummary.length !== 1 ? 's' : ''}
                                                      </p>
                                                    </div>
                                                  </div>

                                                  <button
                                                    type="button"
                                                    onClick={() => openPositions(location)}
                                                    className="ml-1 inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-blue-200 bg-blue-50 px-2 font-semibold text-blue-700 transition-all hover:border-blue-400 hover:bg-blue-100 hover:shadow-sm"
                                                    style={{ height: '26px', fontSize: '11px' }}
                                                  >
                                                    <Eye size={10} />
                                                    View Tires
                                                  </button>
                                                </>
                                              )}
                                            </div>
                                          );
                                        })()}

                                      </td>


                                      {/* =================================================
                                          AVAILABLE POSITIONS
                                      ================================================= */}

                                      <td className="px-3 py-2.5" style={{ padding: '10px 12px' }}>

                                        <button
                                          type="button"
                                          onClick={() => openAvailablePositions(location)}
                                          className="group flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 px-2.5 py-1.5 text-left transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-sm"
                                          style={{ minWidth: '130px', minHeight: '46px' }}
                                          title="View available storage positions"
                                        >
                                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-100">
                                            <MapPin size={12} />
                                          </div>

                                          <div className="min-w-0 flex-1">
                                            {positionAvailability.loaded ? (
                                              <>
                                                <p className="font-bold text-emerald-700" style={{ fontSize: '13px' }}>
                                                  {positionAvailability.available}
                                                  <span className="ml-1 font-medium text-emerald-500" style={{ fontSize: '11px' }}>
                                                    available
                                                  </span>
                                                </p>
                                                <p className="text-slate-500" style={{ fontSize: '11px' }}>
                                                  {positionAvailability.available} / {positionAvailability.total} positions
                                                </p>
                                              </>
                                            ) : (
                                              <>
                                                <p className="font-semibold text-slate-500" style={{ fontSize: '11px' }}>
                                                  Loading positions...
                                                </p>
                                                <p className="text-slate-400" style={{ fontSize: '11px' }}>
                                                  {positionAvailability.total.toLocaleString()} total positions
                                                </p>
                                              </>
                                            )}
                                          </div>

                                          <ChevronRight
                                            size={14}
                                            className="shrink-0 text-emerald-400 transition-transform group-hover:translate-x-0.5"
                                          />
                                        </button>

                                      </td>


                                      {/* =================================================
                                          CAPACITY
                                      ================================================= */}

                                      <td className="px-3 py-2.5" style={{ padding: '10px 12px' }}>

                                        <span
                                          className={`font-semibold ${capacityColor(
                                            location.current_stock,
                                            location.capacity
                                          )}`}
                                          style={{ fontSize: '13px' }}
                                        >
                                          {Number(
                                            location.current_stock ||
                                              0
                                          ).toLocaleString()}
                                        </span>

                                        <span className="text-slate-400" style={{ fontSize: '11px' }}>
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

                                      <td className="px-3 py-2.5" style={{ padding: '10px 12px' }}>

                                        <div className="flex items-center gap-2">

                                          <div className="overflow-hidden rounded-full bg-slate-200" style={{ height: '8px', width: '100px' }}>

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

                                          <span className="text-slate-500" style={{ fontSize: '13px' }}>
                                            {locPct}%
                                          </span>

                                        </div>

                                      </td>


                                      {/* =================================================
                                          STATUS
                                      ================================================= */}

                                      <td className="px-3 py-2.5" style={{ padding: '10px 12px' }}>

                                        <span
                                          className={`inline-flex rounded-full px-3 py-1.5 font-medium ${statusBadge(
                                            getAutoStatus(location.current_stock, location.capacity)
                                          )}`}
                                          style={{ minWidth: '65px', height: '32px', fontSize: '12px', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                          {(() => {
                                            const autoStatus = getAutoStatus(location.current_stock, location.capacity);
                                            const statusLabels = {
                                              active: 'Active',
                                              almost_full: 'Almost Full',
                                              full: 'Full',
                                              empty: 'Empty',
                                              maintenance: 'Maintenance'
                                            };
                                            return statusLabels[autoStatus] || 'Unknown';
                                          })()}
                                        </span>

                                      </td>


                                      {/* =================================================
                                          ACTIONS
                                      ================================================= */}

                                      <td className="px-3 py-2.5 text-right" style={{ padding: '10px 12px' }}>

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

              {/* Products in rack */}
              {!bulkMode && (() => {
                const tireSummary = getRackTireSummary(selectedRack);
                return (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Products in Rack
                    </p>
                    {tireSummary.length === 0 ? (
                      <p className="text-xs italic text-slate-400">No tires assigned yet</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {tireSummary.map(([tireName, qty], idx) => {
                          const palette = TIRE_BADGE_PALETTE[idx % TIRE_BADGE_PALETTE.length];
                          return (
                            <span
                              key={tireName}
                              title={`${tireName} — ${qty.toLocaleString()} tires`}
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-sm ${palette.badge}`}
                            >
                              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${palette.pill}`} />
                              <span>{tireName}</span>
                              <span className={`inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${palette.pill}`}>
                                {qty.toLocaleString()}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

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
                                      
                                      {/* Inline editable quantity */}
                                      {editingQuantityPositionId === position.id ? (
                                        <div className="flex items-center gap-1">
                                          <input
                                            type="number"
                                            min="0"
                                            max={capacity}
                                            value={editingQuantityValue}
                                            onChange={e => setEditingQuantityValue(e.target.value)}
                                            onKeyDown={e => {
                                              if (e.key === 'Enter') {
                                                saveInlineQuantity(position);
                                              } else if (e.key === 'Escape') {
                                                setEditingQuantityPositionId(null);
                                              }
                                            }}
                                            onBlur={() => saveInlineQuantity(position)}
                                            autoFocus
                                            disabled={savingInlineQuantity}
                                            className="w-16 rounded border border-blue-300 bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60"
                                          />
                                          <span className="text-xs text-slate-400">/ {capacity}</span>
                                          {savingInlineQuantity && (
                                            <RefreshCw size={12} className="animate-spin text-blue-500" />
                                          )}
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={e => {
                                            e.stopPropagation();
                                            setEditingQuantityPositionId(position.id);
                                            setEditingQuantityValue(String(quantity));
                                          }}
                                          disabled={bulkMode}
                                          className="group flex items-center gap-1 text-xs font-bold text-slate-700 transition-colors hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                                          title="Click to edit quantity"
                                        >
                                          <span>{quantity}</span>
                                          <span className="text-slate-400">/ {capacity}</span>
                                          <Edit size={10} className="opacity-0 transition-opacity group-hover:opacity-100" />
                                        </button>
                                      )}
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
                                      ASSIGN / EDIT ACTION
                                  ================================= */}

                                  {!bulkMode && isPositionAvailable(position) && (
                                    <button
                                      type="button"
                                      onClick={event => {
                                        event.stopPropagation();
                                        selectPosition(position);
                                      }}
                                      className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-[11px] font-bold text-white transition-colors hover:bg-blue-700"
                                    >
                                      <Plus size={12} />
                                      Assign Tire
                                    </button>
                                  )}

                                  {!bulkMode && !isPositionAvailable(position) && (
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
          AVAILABLE POSITIONS MODAL
      ===================================================================== */}

      <Modal
        isOpen={showAvailablePositionsModal}
        onClose={() => {
          setShowAvailablePositionsModal(false);
          setSelectedRack(null);
        }}
        size="lg"
        title={
          <span className="flex items-center gap-2">
            <MapPin size={16} className="text-emerald-500" />
            Available Positions
          </span>
        }
      >
        {selectedRack && (() => {
          const positionAvailability = getRackPositionAvailability(selectedRack);
          const meta = selectedRack.metadata || {};

          return (
            <div className="space-y-5">
              {/* Rack Header */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                    <Warehouse size={18} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-mono text-sm font-bold text-emerald-900">
                      {selectedRack.code}
                    </p>
                    <p className="text-xs text-emerald-600">
                      Row {padNumber(meta.rowNumber ?? parseInt(selectedRack.aisle))} · Rack {padNumber(meta.rackNumber ?? parseInt(selectedRack.rack))}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-3 text-center">
                  <div className="rounded-lg bg-white/70 p-2">
                    <p className="text-[10px] uppercase text-emerald-600">Available</p>
                    <p className="text-lg font-bold text-emerald-700">
                      {positionAvailability.available}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/70 p-2">
                    <p className="text-[10px] uppercase text-slate-500">Total</p>
                    <p className="text-lg font-bold text-slate-700">
                      {positionAvailability.total}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/70 p-2">
                    <p className="text-[10px] uppercase text-blue-600">Sections</p>
                    <p className="text-lg font-bold text-blue-700">
                      {meta.sectionsPerRack || 6}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/70 p-2">
                    <p className="text-[10px] uppercase text-violet-600">Subsections</p>
                    <p className="text-lg font-bold text-violet-700">
                      {meta.subsectionsPerSection || 2}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
                    <span className="text-xs text-emerald-700">Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-amber-500"></div>
                    <span className="text-xs text-amber-700">Partially Filled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500"></div>
                    <span className="text-xs text-red-700">Full</span>
                  </div>
                </div>
              </div>

              {/* Sections Breakdown */}
              {loadingPositions[selectedRack.id] ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw size={22} className="animate-spin text-emerald-500" />
                  <span className="ml-2 text-sm text-slate-500">Loading positions...</span>
                </div>
              ) : (
                <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                  {Object.entries(positionAvailability.bySection || {}).map(([sectionName, sectionData]) => (
                    <div key={sectionName} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                      {/* Section Header */}
                      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Box size={14} className="text-blue-500" />
                          <span className="text-sm font-bold text-slate-800">{sectionName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            sectionData.available === 0 
                              ? 'bg-red-100 text-red-700'
                              : sectionData.available < sectionData.total * 0.3
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {sectionData.available} available
                          </span>
                          <span className="text-xs text-slate-500">
                            {sectionData.available} / {sectionData.total}
                          </span>
                        </div>
                      </div>

                      {/* Subsections */}
                      <div className="p-4 space-y-3">
                        {Object.entries(sectionData.subsections || {}).map(([subsectionName, subsectionData]) => {
                          const availableShelves = subsectionData.shelves.filter(s => s.available);
                          
                          return (
                            <div key={subsectionName} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                              <div className="mb-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Layers size={12} className="text-violet-500" />
                                  <span className="text-xs font-bold text-slate-700">{subsectionName}</span>
                                </div>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  subsectionData.available === 0
                                    ? 'bg-red-100 text-red-700'
                                    : subsectionData.available < subsectionData.total * 0.3
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                  {subsectionData.available} / {subsectionData.total} shelves
                                </span>
                              </div>

                              {/* Shelf List */}
                              {availableShelves.length > 0 ? (
                                <div className="grid grid-cols-4 gap-2">
                                  {availableShelves.map(shelf => (
                                    <button
                                      key={shelf.position.id}
                                      type="button"
                                      onClick={() => {
                                        // Close available positions modal
                                        setShowAvailablePositionsModal(false);
                                        // Open tire assignment modal with this position
                                        selectPosition(shelf.position);
                                      }}
                                      className="flex flex-col items-center justify-center rounded-lg border border-emerald-200 bg-white p-2 transition-all hover:border-emerald-400 hover:bg-emerald-50 hover:shadow-sm"
                                    >
                                      <span className="text-[10px] font-medium text-slate-500">Shelf</span>
                                      <span className="text-sm font-bold text-emerald-700">
                                        {padNumber(shelf.shelf_number)}
                                      </span>
                                      <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-medium text-emerald-600">
                                        <Plus size={8} />
                                        Assign
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white px-4 py-3 text-center">
                                  <span className="text-xs text-slate-400">All shelves are occupied</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {Object.keys(positionAvailability.bySection || {}).length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 py-12 text-center">
                      <MapPin size={32} className="text-slate-300" />
                      <p className="mt-2 text-sm font-semibold text-slate-600">No positions data available</p>
                      <p className="text-xs text-slate-400">Try refreshing the page</p>
                    </div>
                  )}
                </div>
              )}

              {/* Close Button */}
              <div className="flex justify-end border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAvailablePositionsModal(false);
                    setSelectedRack(null);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>


      {/* =====================================================================
          RECEIVE & PLACE SHIPMENT MODAL
      ===================================================================== */}

      <Modal
        isOpen={showReceiveModal}
        onClose={() => {
          setShowReceiveModal(false);
          setShipmentData({
            selectedProduct: null,
            quantityToStore: '',
            targetRackId: null,
            targetPositionIds: [],
          });
          setShipmentProductSearch('');
        }}
        size="lg"
        title={
          <span className="flex items-center gap-2">
            <Package size={16} className="text-emerald-500" />
            Receive & Place Shipment
          </span>
        }
      >
        <div className="space-y-5">

          {/* Header */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-800">
              Assign incoming shipment directly to warehouse position(s)
            </p>
            <p className="mt-1 text-xs text-emerald-600">
              Select product → Enter quantity → Choose rack → Choose position(s) → Confirm storage location
            </p>
          </div>

          {/* Step 1: Product Selection */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Car size={12} />
              Step 1: Select Product
              <span className="text-red-400">*</span>
            </label>

            {shipmentData.selectedProduct ? (
              <div className="flex items-start gap-3 rounded-xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                  <Zap size={16} className="text-emerald-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-emerald-900">
                    {shipmentData.selectedProduct.brand} {shipmentData.selectedProduct.model}
                  </p>
                  <div className="mt-0.5 flex flex-wrap gap-2 text-[11px] text-emerald-700">
                    {shipmentData.selectedProduct.dimensions && (
                      <span className="inline-flex items-center gap-1">
                        <Tag size={9} />
                        {shipmentData.selectedProduct.dimensions}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Package size={9} />
                      Stock: {shipmentData.selectedProduct.current_stock ?? 0}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShipmentData(prev => ({ ...prev, selectedProduct: null }));
                    setShipmentProductSearch('');
                  }}
                  className="shrink-0 rounded-lg p-1 text-emerald-400 transition-colors hover:bg-emerald-200 hover:text-emerald-700"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={loadingProducts ? 'Loading products...' : 'Search brand, model, size...'}
                  value={shipmentProductSearch}
                  disabled={loadingProducts}
                  onChange={e => {
                    setShipmentProductSearch(e.target.value);
                    setShowShipmentProductDropdown(true);
                  }}
                  onFocus={() => {
                    loadProducts();
                    setShowShipmentProductDropdown(true);
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-9 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
                />
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />

                {showShipmentProductDropdown && products.length > 0 && (
                  <div className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                    {(() => {
                      const q = shipmentProductSearch.toLowerCase();
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

                      return filtered.map(product => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => {
                            setShipmentData(prev => ({ ...prev, selectedProduct: product }));
                            setShipmentProductSearch('');
                            setShowShipmentProductDropdown(false);
                          }}
                          className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-emerald-50"
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                            <Tag size={12} className="text-slate-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {product.brand} {product.model}
                            </p>
                            <div className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-slate-500">
                              {product.dimensions && <span>{product.dimensions}</span>}
                              {product.sku && <span className="font-mono">{product.sku}</span>}
                            </div>
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            (product.current_stock ?? 0) === 0
                              ? 'bg-red-100 text-red-600'
                              : (product.current_stock ?? 0) <= (product.reorder_level ?? 10)
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {product.current_stock ?? 0}
                          </span>
                        </button>
                      ));
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Quantity */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Package size={12} />
              Step 2: Quantity to Store
              <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Package size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                min="1"
                placeholder="Enter quantity..."
                value={shipmentData.quantityToStore}
                onChange={e => setShipmentData(prev => ({ ...prev, quantityToStore: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          {/* Step 3: Rack Selection */}
          {shipmentData.selectedProduct && shipmentData.quantityToStore && (
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Warehouse size={12} />
                Step 3: Select Rack
                <span className="text-red-400">*</span>
              </label>
              <select
                value={shipmentData.targetRackId || ''}
                onChange={e => {
                  const rackId = e.target.value;
                  setShipmentData(prev => ({ ...prev, targetRackId: rackId, targetPositionIds: [] }));
                  if (rackId) {
                    loadRackPositions({ id: rackId });
                  }
                }}
                className="w-full cursor-pointer rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">Select a rack...</option>
                {getAvailableRacksForShipment().map(rack => {
                  const available = Number(rack.capacity || 0) - Number(rack.current_stock || 0);
                  return (
                    <option key={rack.id} value={rack.id}>
                      {rack.code} — {available} tires available
                    </option>
                  );
                })}
              </select>
              {getAvailableRacksForShipment().length === 0 && (
                <p className="flex items-center gap-1.5 text-xs text-amber-700">
                  <AlertCircle size={13} />
                  No racks with available capacity
                </p>
              )}
            </div>
          )}

          {/* Step 4: Position Selection (Multi-select with checkboxes) */}
          {shipmentData.targetRackId && (
            <div className="space-y-2">
              <label className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span className="flex items-center gap-1.5">
                  <MapPin size={12} />
                  Step 4: Select Position(s)
                  <span className="text-red-400">*</span>
                </span>
                {shipmentData.targetPositionIds.length > 0 && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    {shipmentData.targetPositionIds.length} selected
                  </span>
                )}
              </label>
              {loadingPositions[shipmentData.targetRackId] ? (
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  <RefreshCw size={14} className="animate-spin" />
                  Loading positions...
                </div>
              ) : (
                <>
                  {/* Calculate total capacity info */}
                  {(() => {
                    const availablePositions = getAvailablePositionsForRack(shipmentData.targetRackId);
                    const selectedPositions = availablePositions.filter(p => 
                      shipmentData.targetPositionIds.includes(p.id)
                    );
                    const totalSelectedCapacity = selectedPositions.reduce((sum, p) => {
                      const currentQty = Number(p.current_stock || p.quantity || 0);
                      const capacity = Number(p.capacity || 0);
                      return sum + (capacity - currentQty);
                    }, 0);
                    const quantityNeeded = Number(shipmentData.quantityToStore) || 0;
                    const isEnoughCapacity = totalSelectedCapacity >= quantityNeeded;
                    
                    return (
                      <>
                        {/* Capacity indicator */}
                        {selectedPositions.length > 0 && (
                          <div className={`rounded-lg border p-3 ${
                            isEnoughCapacity 
                              ? 'border-emerald-200 bg-emerald-50' 
                              : 'border-amber-200 bg-amber-50'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-medium ${
                                isEnoughCapacity ? 'text-emerald-700' : 'text-amber-700'
                              }`}>
                                Selected capacity: {totalSelectedCapacity} tires
                              </span>
                              {!isEnoughCapacity && (
                                <span className="text-[10px] font-bold text-amber-600">
                                  Need {quantityNeeded - totalSelectedCapacity} more capacity
                                </span>
                              )}
                            </div>
                            {isEnoughCapacity && (
                              <div className="mt-2 h-2 overflow-hidden rounded-full bg-emerald-200">
                                <div
                                  className="h-full bg-emerald-500 transition-all"
                                  style={{
                                    width: `${Math.min(100, (quantityNeeded / totalSelectedCapacity) * 100)}%`,
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Position list with checkboxes */}
                        <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
                          {availablePositions.length === 0 ? (
                            <p className="flex items-center gap-1.5 text-xs text-amber-700">
                              <AlertCircle size={13} />
                              No available positions in this rack for this tire size
                            </p>
                          ) : (
                            availablePositions.map(position => {
                              const isSelected = shipmentData.targetPositionIds.includes(position.id);
                              const currentQty = Number(position.current_stock || position.quantity || 0);
                              const capacity = Number(position.capacity || 0);
                              const available = capacity - currentQty;
                              
                              return (
                                <label
                                  key={position.id}
                                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${
                                    isSelected
                                      ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                                      : 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/30'
                                  }`}
                                >
                                  {/* Checkbox */}
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={e => {
                                      const checked = e.target.checked;
                                      setShipmentData(prev => ({
                                        ...prev,
                                        targetPositionIds: checked
                                          ? [...prev.targetPositionIds, position.id]
                                          : prev.targetPositionIds.filter(id => id !== position.id),
                                      }));
                                    }}
                                    className="h-4 w-4 cursor-pointer rounded border-slate-300 text-emerald-600 transition focus:ring-2 focus:ring-emerald-100"
                                  />
                                  
                                  {/* Position info */}
                                  <div className="flex-1">
                                    <p className="font-mono text-xs font-bold text-slate-800">
                                      {position.position_code || position.positionCode}
                                    </p>
                                    <p className="mt-0.5 text-[10px] text-slate-500">
                                      Sec {position.section_number} · Shelf {position.shelf_number} · Sub {position.subsection_number}
                                    </p>
                                  </div>
                                  
                                  {/* Capacity badge */}
                                  <div className="shrink-0 text-right">
                                    <p className="text-xs font-bold text-emerald-700">
                                      {available}
                                    </p>
                                    <p className="text-[10px] text-slate-400">available</p>
                                  </div>
                                </label>
                              );
                            })
                          )}
                        </div>
                        
                        {/* Helper text */}
                        {availablePositions.length > 0 && (
                          <p className="text-[11px] text-slate-500">
                            💡 Select multiple positions to distribute {quantityNeeded} tires across them
                          </p>
                        )}
                      </>
                    );
                  })()}
                </>
              )}
            </div>
          )}

          {/* Summary */}
          {shipmentData.selectedProduct && shipmentData.quantityToStore && shipmentData.targetRackId && shipmentData.targetPositionIds.length > 0 && (() => {
            const selectedPositions = (rackPositions[shipmentData.targetRackId] || []).filter(p => 
              shipmentData.targetPositionIds.includes(p.id)
            );
            const totalCapacity = selectedPositions.reduce((sum, p) => {
              const currentQty = Number(p.current_stock || p.quantity || 0);
              const capacity = Number(p.capacity || 0);
              return sum + (capacity - currentQty);
            }, 0);
            
            return (
              <div className="rounded-xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-emerald-600">Assignment Summary</p>
                <div className="space-y-1 text-sm text-emerald-800">
                  <p><strong>Product:</strong> {shipmentData.selectedProduct.brand} {shipmentData.selectedProduct.model}</p>
                  <p><strong>Quantity:</strong> {shipmentData.quantityToStore} tires</p>
                  <p><strong>Rack:</strong> {locations.find(l => l.id === shipmentData.targetRackId)?.code}</p>
                  <p><strong>Positions:</strong> {selectedPositions.length} position{selectedPositions.length > 1 ? 's' : ''} selected ({totalCapacity} total capacity)</p>
                  {selectedPositions.length <= 3 ? (
                    <ul className="ml-4 mt-1 list-disc space-y-0.5 text-xs">
                      {selectedPositions.map(p => (
                        <li key={p.id}>
                          {p.position_code || p.positionCode} 
                          <span className="ml-1 text-emerald-600">
                            ({Number(p.capacity || 0) - Number(p.current_stock || p.quantity || 0)} available)
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-emerald-600">
                      Quantity will be distributed across selected positions automatically
                    </p>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Actions */}
          <div className="flex gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowReceiveModal(false);
                setShipmentData({
                  selectedProduct: null,
                  quantityToStore: '',
                  targetRackId: null,
                  targetPositionIds: [],
                });
                setShipmentProductSearch('');
              }}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAssignShipmentToLocation}
              disabled={
                receiving ||
                !shipmentData.selectedProduct ||
                !shipmentData.quantityToStore ||
                !shipmentData.targetRackId ||
                shipmentData.targetPositionIds.length === 0
              }
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {receiving ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <Save size={15} />
              )}
              {receiving ? 'Storing...' : 'Store Shipment'}
            </button>
          </div>
        </div>
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

              <div className="mt-3 flex items-center gap-2 rounded-lg border border-blue-100 bg-white/70 px-3 py-2">
                <MapPin size={13} className="shrink-0 text-blue-500" />
                <span className="text-[11px] font-medium text-blue-700">
                  This exact Section → Shelf → Subsection is the assignment target.
                </span>
              </div>

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
                  : isPositionAvailable(selectedPosition)
                  ? 'Assign Tire'
                  : 'Update Assignment'}

              </button>

            </div>

          </div>

        )}

      </Modal>


      {/* =====================================================================
          SHIPMENT HISTORY MODAL
      ===================================================================== */}

      <Modal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        size="xl"
        title={
          <span className="flex items-center gap-2">
            <History size={16} className="text-blue-500" />
            Shipment History
          </span>
        }
      >
        <div className="space-y-4">

          {/* Header Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center">
              <p className="text-[10px] font-semibold uppercase text-blue-600">Total Shipments</p>
              <p className="text-2xl font-bold text-blue-700">{shipmentHistory.length}</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
              <p className="text-[10px] font-semibold uppercase text-emerald-600">Total Tires Stored</p>
              <p className="text-2xl font-bold text-emerald-700">
                {shipmentHistory.reduce((sum, entry) => sum + entry.quantity, 0)}
              </p>
            </div>
            <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-center">
              <p className="text-[10px] font-semibold uppercase text-violet-600">Positions Used</p>
              <p className="text-2xl font-bold text-violet-700">
                {shipmentHistory.reduce((sum, entry) => sum + entry.totalPositions, 0)}
              </p>
            </div>
          </div>

          {/* History Timeline */}
          {shipmentHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 py-12 text-center">
              <History size={48} className="text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-600">No shipment history yet</p>
              <p className="mt-1 text-xs text-slate-400">
                Use "Receive & Place Shipment" to start tracking shipments
              </p>
            </div>
          ) : (
            <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-2">
              {shipmentHistory.map((entry, index) => {
                const timeAgo = formatTimeAgo(entry.timestamp);
                const date = new Date(entry.timestamp);
                
                return (
                  <div
                    key={entry.id}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                  >
                    {/* Entry Header */}
                    <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50 px-4 py-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                            <Package size={18} className="text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">
                              Shipment #{shipmentHistory.length - index}
                            </p>
                            <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                              <Clock size={11} />
                              <span>{timeAgo}</span>
                              <span className="text-slate-300">•</span>
                              <span>{date.toLocaleDateString()} {date.toLocaleTimeString()}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Quick Stats Badge */}
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                            {entry.quantity} tires
                          </span>
                          <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-700">
                            {entry.totalPositions} pos
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Entry Details */}
                    <div className="p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        
                        {/* Product Info */}
                        <div>
                          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            <Car size={10} />
                            Product
                          </p>
                          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                            <p className="text-sm font-bold text-blue-900">{entry.product.name}</p>
                            <div className="mt-1 flex flex-wrap gap-2 text-xs text-blue-700">
                              {entry.product.dimensions && (
                                <span className="inline-flex items-center gap-1">
                                  <Tag size={9} />
                                  {entry.product.dimensions}
                                </span>
                              )}
                              {entry.product.sku && (
                                <span className="font-mono opacity-70">{entry.product.sku}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Rack Info */}
                        <div>
                          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            <Warehouse size={10} />
                            Rack Location
                          </p>
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <p className="font-mono text-sm font-bold text-slate-800">
                              {entry.rack?.code}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {entry.rack?.name}
                            </p>
                          </div>
                        </div>

                      </div>

                      {/* Positions List */}
                      <div className="mt-4">
                        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          <MapPin size={10} />
                          Storage Positions ({entry.positions.length})
                        </p>
                        
                        {entry.positions.length <= 5 ? (
                          // Show all if 5 or fewer
                          <div className="space-y-1.5">
                            {entry.positions.map((pos, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2"
                              >
                                <span className="font-mono text-xs font-semibold text-emerald-800">
                                  {pos.positionCode}
                                </span>
                                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                                  +{pos.qtyStored}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          // Show first 3, then summary for rest
                          <div className="space-y-1.5">
                            {entry.positions.slice(0, 3).map((pos, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2"
                              >
                                <span className="font-mono text-xs font-semibold text-emerald-800">
                                  {pos.positionCode}
                                </span>
                                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                                  +{pos.qtyStored}
                                </span>
                              </div>
                            ))}
                            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-center">
                              <span className="text-xs font-medium text-slate-600">
                                + {entry.positions.length - 3} more positions
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-4">
            {shipmentHistory.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Clear all shipment history? This cannot be undone.')) {
                    setShipmentHistory([]);
                    showToast('Shipment history cleared', 'success');
                  }
                }}
                className="text-xs font-medium text-red-600 transition-colors hover:text-red-700 hover:underline"
              >
                Clear History
              </button>
            )}
            
            <button
              type="button"
              onClick={() => setShowHistoryModal(false)}
              className="ml-auto rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          </div>

        </div>
      </Modal>

    </motion.div>
  );
}


/* ============================================================================
   HELPER: Format Time Ago
============================================================================ */

function formatTimeAgo(timestamp) {
  const now = new Date();
  const then = new Date(timestamp);
  const seconds = Math.floor((now - then) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return then.toLocaleDateString();
}