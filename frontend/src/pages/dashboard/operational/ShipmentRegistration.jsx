import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Package, Search, Calendar, Truck, CheckCircle2, XCircle, 
  Clock, Edit, Trash2, X, Ship, Box, FileText, User, AlertTriangle,
  MapPin, Tag, ChevronRight, TrendingUp, Layers, Warehouse, Navigation,
  Zap, Save, RefreshCw, ChevronDown
} from 'lucide-react';
import { fetchShipments, createShipment, updateShipment, deleteShipment, fetchSuppliers, fetchWarehouseLocations } from '../../../services/api';
import api from '../../../services/api';

export default function ShipmentRegistration() {
  const [shipments, setShipments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouseLocations, setWarehouseLocations] = useState([]);
  const [racks, setRacks] = useState([]); // For position picker - rack_configurations
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingShipment, setEditingShipment] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Location picker state

  // Product catalog state
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // NEW: Two-step selection
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [availableSizes, setAvailableSizes] = useState([]);

  // Position picker state
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [editingProductIndex, setEditingProductIndex] = useState(null);
  const [selectedWarehouseCode, setSelectedWarehouseCode] = useState(null); // NEW: Warehouse selection
  const [selectedRackId, setSelectedRackId] = useState(null);
  const [selectedPositionIds, setSelectedPositionIds] = useState([]);
  const [rackPositions, setRackPositions] = useState({});
  const [loadingPositions, setLoadingPositions] = useState({});
  const [expandedSections, setExpandedSections] = useState({}); // NEW: Track which sections are expanded

  // Quantity input modal state
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [quantityModalProduct, setQuantityModalProduct] = useState(null);
  const [quantityInput, setQuantityInput] = useState('');

  const [formData, setFormData] = useState({
    supplier_id: '',
    shipment_number: '',
    container_number: '',
    bl_number: '',
    expected_quantity: '',
    expected_arrival_date: '',
    notes: '',
    product_breakdown: [],
  });

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), alert.type === 'success' ? 3000 : 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);
  
  // Prevent formData reset when editing shipment
  useEffect(() => {
    if (editingShipment && showForm) {
      // Only update if formData is empty/default
      if (formData.product_breakdown.length === 0 && 
          editingShipment.product_breakdown && 
          editingShipment.product_breakdown.length > 0) {
        console.log('🔧 Restoring product_breakdown from editingShipment:', editingShipment.product_breakdown);
        setFormData(prev => ({
          ...prev,
          product_breakdown: JSON.parse(JSON.stringify(editingShipment.product_breakdown))
        }));
      }
    }
  }, [showForm, editingShipment]);
  
  // DEBUG: Log formData changes
  useEffect(() => {
    console.log('🔄 formData changed:');
    console.log('   product_breakdown length:', formData.product_breakdown?.length);
    if (formData.product_breakdown && formData.product_breakdown.length > 0) {
      console.log('   Products:', formData.product_breakdown);
    }
  }, [formData.product_breakdown]);

  /* ==========================================================================
     LOAD PRODUCTS (for product picker)
  ========================================================================== */

  const loadProducts = async () => {
    if (products.length > 0) return; // already loaded
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
     GET UNIQUE BRAND/MODEL COMBINATIONS
  ========================================================================== */

  const getUniqueBrands = () => {
    const brandMap = new Map();
    
    // Define specific brand order we want to show
    const brandOrder = [
      'Red Indian Customs Street Dual Sport',
      'Red Indian Customs Dual Sport XT',
      'Red Indian Customs Classic Sawtooth',
      'Red Indian Customs Enduro Trail',
      'Red Indian Customs Armor XT',
      'Red Indian Customs Armor ADV',
      'Red Indian Customs ARMOR ST',
      'Red Indian Customs ARMOR ST-X'
    ];
    
    products.forEach(product => {
      // Combine brand and model as unique key
      const brandModel = `${product.brand} ${product.model}`.trim();
      
      if (!brandMap.has(brandModel)) {
        brandMap.set(brandModel, {
          brand: product.brand,
          model: product.model,
          fullName: brandModel,
          count: 0
        });
      }
      
      const entry = brandMap.get(brandModel);
      entry.count += 1;
    });
    
    // Convert to array and sort by custom order, then alphabetically
    const brandsArray = Array.from(brandMap.values());
    
    return brandsArray.sort((a, b) => {
      const aIndex = brandOrder.indexOf(a.fullName);
      const bIndex = brandOrder.indexOf(b.fullName);
      
      // If both are in the custom order, sort by that order
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      
      // If only a is in custom order, it comes first
      if (aIndex !== -1) return -1;
      
      // If only b is in custom order, it comes first
      if (bIndex !== -1) return 1;
      
      // Otherwise, sort alphabetically
      return a.fullName.localeCompare(b.fullName);
    });
  };

  /* ==========================================================================
     GET SIZES FOR SELECTED BRAND
  ========================================================================== */

  const getSizesForBrand = (brandModel) => {
    return products.filter(p => 
      `${p.brand} ${p.model}`.trim() === brandModel
    );
  };

  /* ==========================================================================
     LOAD RACKS (for position picker)
  ========================================================================== */

  const loadRacks = async () => {
    if (racks.length > 0) return; // already loaded
    try {
      // Use warehouse-locations to get rack data
      const { data } = await api.get('/warehouse-locations');
      console.log('📦 Loaded warehouse locations:', data);
      
      // Group by rack code from position_code or code field
      const locations = data.locations || [];
      const rackMap = new Map();
      
      locations.forEach(loc => {
        // Extract rack code from position_code (e.g., "WH1-R05-RK05-S01-SH01-SUB02" → "WH1-R05-RK05")
        const posCode = loc.position_code || loc.code || '';
        const rackMatch = posCode.match(/^(WH\d+-R\d+-RK\d+)/);
        
        if (rackMatch) {
          const rackCode = rackMatch[1];
          if (!rackMap.has(rackCode)) {
            rackMap.set(rackCode, {
              id: loc.id, // Use first location ID as rack ID
              rack_code: rackCode,
              position_code_prefix: rackCode,
              warehouse_name: 'Main Warehouse'
            });
          }
        }
      });
      
      const racksData = Array.from(rackMap.values());
      console.log('📦 Grouped into racks:', racksData);
      setRacks(racksData);
    } catch (err) {
      console.warn('Could not load racks:', err);
    }
  };

  /* ==========================================================================
     LOAD RACK POSITIONS
  ========================================================================== */

  const loadRackPositions = async (rackId, force = false) => {
    if (!rackId) return;

    if (rackPositions[rackId] && !force) {
      return;
    }

    setLoadingPositions(prev => ({ ...prev, [rackId]: true }));

    try {
      // Get the rack info
      const rack = racks.find(r => r.id === rackId);
      if (!rack) {
        console.warn('Rack not found:', rackId);
        setRackPositions(prev => ({ ...prev, [rackId]: [] }));
        return;
      }

      console.log(`📍 Loading positions for rack ${rack.rack_code} (ID: ${rackId})...`);

      // Load storage positions from the dedicated endpoint
      const response = await api.get(`/warehouse-locations/${rackId}/positions`);
      const positions = response.data.positions || [];
      
      console.log(`📍 Loaded ${positions.length} storage positions for rack ${rack.rack_code}`);
      
      if (positions.length > 0) {
        console.log('Sample position:', positions[0]);
      }
      
      setRackPositions(prev => ({ ...prev, [rackId]: positions }));
    } catch (err) {
      console.warn(`Could not load positions for rack ${rackId}:`, err.message);
      setRackPositions(prev => ({ ...prev, [rackId]: [] }));
    } finally {
      setLoadingPositions(prev => ({ ...prev, [rackId]: false }));
    }
  };

  /* ==========================================================================
     GET AVAILABLE POSITIONS FOR RACK
  ========================================================================== */

  const getAvailablePositionsForRack = (rackId, tireSize) => {
    const positions = rackPositions[rackId] || [];
    
    return positions.filter(position => {
      // warehouse_storage_positions table uses: current_stock, capacity, tire_size, status
      const currentQty = Number(position.current_stock || 0);
      const capacity = Number(position.capacity || 0);
      const positionTireSize = position.tire_size;
      const status = position.status;
      
      // Only show active/available/empty positions
      if (status && status !== 'active' && status !== 'available' && status !== 'empty') return false;
      
      // Position must have available capacity
      if (currentQty >= capacity) return false;
      
      // If position is empty (no tire size assigned), it's available
      if (!positionTireSize || positionTireSize === '') return true;
      
      // If position has a tire size, it must match the product's tire size
      if (tireSize && positionTireSize === tireSize) return true;
      
      // Position has a different tire size - not compatible
      return false;
    });
  };

  /* ==========================================================================
     GET OCCUPIED POSITIONS SUMMARY FOR RACK
  ========================================================================== */

  const getOccupiedPositionsSummary = (rackId) => {
    const positions = rackPositions[rackId] || [];
    
    // Group occupied positions by section → shelf → subsection
    const occupancyMap = {};
    
    positions.forEach(pos => {
      if (pos.current_stock && pos.current_stock > 0) {
        // Check if section_number, shelf_number, and subsection_number exist
        if (!pos.section_number || !pos.shelf_number || !pos.subsection_number) {
          console.warn('Position missing section/shelf/subsection numbers:', pos);
          return; // Skip this position
        }
        
        const section = `S${String(pos.section_number).padStart(2, '0')}`;
        const shelf = `SH${String(pos.shelf_number).padStart(2, '0')}`;
        const subsection = `SUB${String(pos.subsection_number).padStart(2, '0')}`;
        
        if (!occupancyMap[section]) {
          occupancyMap[section] = {};
        }
        if (!occupancyMap[section][shelf]) {
          occupancyMap[section][shelf] = [];
        }
        
        occupancyMap[section][shelf].push({
          subsection,
          position_code: pos.position_code,
          tire_size: pos.tire_size,
          quantity: pos.current_stock,
          capacity: pos.capacity
        });
      }
    });
    
    return occupancyMap;
  };

  /* ==========================================================================
     DISTRIBUTE QUANTITY ACROSS POSITIONS
  ========================================================================== */

  const distributeQuantityAcrossPositions = (totalQuantity, positions, rackId) => {
    let remaining = totalQuantity;
    const distribution = [];
    
    for (const position of positions) {
      if (remaining <= 0) break;
      
      const currentQty = Number(position.current_stock || 0);
      const capacity = Number(position.capacity || 0);
      const availableSpace = capacity - currentQty;
      
      const qtyToStore = Math.min(remaining, availableSpace);
      
      if (qtyToStore > 0) {
        distribution.push({
          position_id: position.id,
          rack_id: rackId, // Include rack_id for reservation
          position_code: position.position_code || position.code || `Position-${position.id}`,
          quantity: qtyToStore
        });
        
        remaining -= qtyToStore;
      }
    }
    
    return { distribution, remaining };
  };

  /* ==========================================================================
     MIGRATE LEGACY PRODUCT BREAKDOWN
  ========================================================================== */

  const migrateProductBreakdown = (oldBreakdown) => {
    if (!Array.isArray(oldBreakdown)) return [];
    
    return oldBreakdown.map(item => {
      // Already new format?
      if (item.product_id && item.assigned_positions) {
        return item;
      }
      
      // Old format: {category, size, quantity}
      return {
        product_id: null,
        product_name: `${item.category || 'Unknown'} ${item.size || ''}`.trim(),
        brand: item.category || 'Legacy',
        model: '',
        dimensions: item.size || '',
        sku: '',
        quantity: item.quantity || 0,
        assigned_positions: [], // Empty for legacy data
        _legacy: true // Flag for UI
      };
    });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [shipmentsData, suppliersData, locationsData] = await Promise.all([
        fetchShipments({ status: statusFilter === 'all' ? null : statusFilter }),
        fetchSuppliers(),
        fetchWarehouseLocations()
      ]);
      setShipments(shipmentsData.shipments || []);
      setSuppliers(suppliersData.suppliers || []);
      setWarehouseLocations(locationsData.locations || []);
      setError(null);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation: Check if Expected Arrival Date is filled
    if (!formData.expected_arrival_date) {
      setAlert({ 
        type: 'error', 
        message: '⚠️ Expected Arrival Date is required! Please select a date before creating the shipment.' 
      });
      return;
    }
    
    // Declare this at function scope so it's accessible everywhere
    let expectedItemsToRegister = [];
    
    try {
      setLoading(true);
      
      // Auto-calculate expected_quantity from product breakdown
      const calculatedQuantity = getTotalBreakdownQty();
      const submissionData = {
        ...formData,
        expected_quantity: calculatedQuantity || formData.expected_quantity,
        // Convert empty string to null for date field
        expected_arrival_date: formData.expected_arrival_date || null
      };
      
      console.log('💾 Saving shipment...');
      console.log('📦 formData.product_breakdown:', formData.product_breakdown);
      console.log('📊 Product count:', formData.product_breakdown?.length);
      console.log('📤 Full submission data:', JSON.stringify(submissionData, null, 2));
      
      let savedShipment;
      
      if (editingShipment) {
        console.log(`✏️ UPDATING shipment: ${editingShipment.id}`);
        const result = await updateShipment(editingShipment.id, submissionData);
        savedShipment = result.shipment;
        console.log('✅ Update result:', result);
      } else {
        console.log('➕ CREATING new shipment');
        const result = await createShipment(submissionData);
        savedShipment = result.shipment;
        console.log('✅ Create result:', result);
      }

      // 🆕 NOW RESERVE POSITIONS: After shipment is saved successfully
      if (savedShipment && formData.product_breakdown && formData.product_breakdown.length > 0) {
        console.log('📍 Reserving positions for saved shipment...');
        
        try {
          const reservationPromises = [];
          
          for (const product of formData.product_breakdown) {
            if (product.assigned_positions && product.assigned_positions.length > 0) {
              for (const assignment of product.assigned_positions) {
                reservationPromises.push(
                  api.put(
                    `/warehouse-locations/${assignment.rack_id}/positions/${assignment.position_id}`,
                    {
                      quantity: assignment.quantity,
                      tire_size: `${product.brand} ${product.model} - ${product.dimensions}`,
                      status: 'reserved',
                      reserved_quantity: assignment.quantity,
                      reserved_for_shipment: savedShipment.shipment_number,
                      product_metadata: {
                        product_id: product.product_id,
                        brand: product.brand,
                        model: product.model,
                        dimensions: product.dimensions,
                        sku: product.sku
                      }
                    }
                  )
                );
              }
            }
          }
          
          if (reservationPromises.length > 0) {
            await Promise.all(reservationPromises);
            console.log(`✅ Reserved ${reservationPromises.length} positions`);
          }
        } catch (reserveErr) {
          console.error('⚠️ Failed to reserve some positions:', reserveErr);
          // Don't fail the whole operation, shipment is already saved
          setAlert({ 
            type: 'warning', 
            message: 'Shipment saved but some position reservations failed. Please reserve positions manually.' 
          });
        }

        // Also sync to shipment_expected_items for receiving & QC scanning workflow
        try {
          expectedItemsToRegister = formData.product_breakdown
            .filter(item => item.product_id)
            .map(item => ({
              product_id: item.product_id,
              product_size: item.dimensions || item.size || '',
              expected_quantity: parseInt(item.quantity) || 0,
              unit_price: parseFloat(item.unit_price) || 0,
              notes: item.notes || ''
            }));

          console.log('📦 Registering expected items:', expectedItemsToRegister);
          console.log('📦 Shipment ID:', savedShipment.id);
          console.log('📦 Items count:', expectedItemsToRegister.length);

          if (expectedItemsToRegister.length > 0) {
            const response = await api.post('/receiving-qc/expected-items', {
              shipment_id: savedShipment.id,
              items: expectedItemsToRegister
            });
            console.log('✅ Registered expected items for receiving/QC workflow:', response.data);
            setAlert({ 
              type: 'success', 
              message: `${editingShipment ? 'Shipment updated' : 'Shipment created'} and ${expectedItemsToRegister.length} expected items registered for receiving!`
            });
          } else {
            console.warn('⚠️ No items to register (no product_id found)');
            setAlert({ 
              type: 'warning', 
              message: `${editingShipment ? 'Shipment updated' : 'Shipment created'} but no expected items registered. Please add products with valid IDs.`
            });
          }
        } catch (expectedErr) {
          console.error('❌ Failed to register expected items for receiving-qc:', expectedErr);
          console.error('❌ Error details:', expectedErr.response?.data);
          // Show error to user
          setAlert({ 
            type: 'error', 
            message: `Shipment saved but failed to register expected items: ${expectedErr.response?.data?.error || expectedErr.message}. Go to Receiving page to manually register items.`
          });
        }
      }

      // Don't override alert if we already set one above
      if (expectedItemsToRegister.length === 0) {
        setAlert({ 
          type: 'success', 
          message: editingShipment ? 'Shipment updated successfully!' : 'Shipment created successfully!' 
        });
      }

      resetForm();
      await loadData();
    } catch (err) {
      console.error('❌ Error saving shipment:', err);
      console.error('❌ Error response:', err.response?.data);
      setAlert({ type: 'error', message: err.response?.data?.error || 'Failed to save shipment' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (shipment) => {
    console.log('📝 ========== EDITING SHIPMENT ==========');
    console.log('📝 Shipment number:', shipment.shipment_number);
    console.log('📦 RAW shipment object:', shipment);
    console.log('📦 product_breakdown field:', shipment.product_breakdown);
    console.log('📦 product_breakdown type:', typeof shipment.product_breakdown);
    console.log('📦 product_breakdown is array?:', Array.isArray(shipment.product_breakdown));
    console.log('📊 Products length:', shipment.product_breakdown?.length);
    
    if (shipment.product_breakdown) {
      console.log('📦 Product breakdown content:', JSON.stringify(shipment.product_breakdown, null, 2));
    }
    
    // Show alert to user if no products
    if (!shipment.product_breakdown || shipment.product_breakdown.length === 0) {
      console.warn(`⚠️ Shipment ${shipment.shipment_number} has NO products - you can add them now!`);
    } else {
      console.log(`✅ Shipment has ${shipment.product_breakdown.length} products - they should load into the form`);
    }
    
    const formDataToSet = {
      supplier_id: shipment.supplier_id || '',
      shipment_number: shipment.shipment_number || '',
      container_number: shipment.container_number || '',
      bl_number: shipment.bl_number || '',
      expected_quantity: shipment.expected_quantity || '',
      expected_arrival_date: shipment.expected_arrival_date || '',
      notes: shipment.notes || '',
      product_breakdown: Array.isArray(shipment.product_breakdown) ? migrateProductBreakdown(shipment.product_breakdown) : []
    };

    
    
    console.log('📤 Setting formData to:', formDataToSet);
    console.log('📤 formData.product_breakdown:', formDataToSet.product_breakdown);
    console.log('📤 formData.product_breakdown length:', formDataToSet.product_breakdown?.length);
    console.log('========================================\n');
    
    // Set editing shipment and formData TOGETHER in one update
    setEditingShipment(shipment);
    setFormData(formDataToSet);
    setShowForm(true);
  };

  const handleDeleteClick = (shipment) => {
    setDeleteConfirm(deleteConfirm === shipment.id ? null : shipment.id);
  };

  const handleCancelShipment = async (id) => {
    try {
      // Update shipment status to CANCELLED (soft delete - preserves record)
      await updateShipment(id, { status: 'CANCELLED' });
      setAlert({ type: 'success', message: 'Shipment cancelled successfully!' });
      setDeleteConfirm(null);
      await loadData();
    } catch (err) {
      console.error('Error cancelling shipment:', err);
      setAlert({ type: 'error', message: 'Failed to cancel shipment' });
    }
  };

  const handleDeleteConfirm = async (id) => {
    try {
      // Permanently delete the shipment from database (hard delete with cascading)
      await deleteShipment(id, true); // Pass true to force cascading delete
      setAlert({ type: 'success', message: 'Shipment permanently deleted!' });
      setDeleteConfirm(null);
      await loadData();
    } catch (err) {
      console.error('Error deleting shipment:', err);
      setAlert({ type: 'error', message: err.response?.data?.error || err.message || 'Failed to delete shipment' });
    }
  };

  const resetForm = () => {
    setFormData({
      supplier_id: '',
      shipment_number: '',
      container_number: '',
      bl_number: '',
      expected_quantity: '',
      expected_arrival_date: '',
      notes: '',
      product_breakdown: [],
    });
    setEditingShipment(null);
    setShowForm(false);
    
  };

  // Product breakdown helpers
  const TIRE_CATEGORIES = [
    'Dual Sport',
    'Sawtooth',
    'Enduro',
    'Trail',
    'Scooter'
  ];

  const TIRE_SIZES = [
    '90/90-17',
    '100/90-17',
    '110/90-17',
    '120/80-17',
    '130/80-17',
    '90/90-18',
    '100/90-18',
    '120/80-18',
    '90/90-19',
    '150/60-17'
  ];

  const addProductLine = () => {
    // Open brand selection modal (Step 1)
    loadProducts();
    setSelectedBrand(null);
    setAvailableSizes([]);
    setShowBrandModal(true);
  };

  const openProductPicker = () => {
    // Open brand selection modal (Step 1)
    loadProducts();
    setSelectedBrand(null);
    setAvailableSizes([]);
    setShowBrandModal(true);
  };

  const selectBrand = (brandModel) => {
    setSelectedBrand(brandModel);
    const sizes = getSizesForBrand(brandModel);
    setAvailableSizes(sizes);
    setShowBrandModal(false);
    setShowSizeModal(true);
  };

  const selectSize = (product) => {
    setQuantityModalProduct(product);
    setQuantityInput('');
    setShowSizeModal(false);
    setShowQuantityModal(true);
  };

  const addProductWithPositions = (productData) => {
    setFormData({
      ...formData,
      product_breakdown: [
        ...formData.product_breakdown,
        productData
      ]
    });
    
    // Auto-update expected_quantity
    setTimeout(() => {
      const newTotal = getTotalBreakdownQty();
      setFormData(prev => ({ ...prev, expected_quantity: newTotal }));
    }, 0);
  };

  const confirmProductQuantity = () => {
    const quantity = parseInt(quantityInput);
    if (!quantity || quantity <= 0) {
      setAlert({ type: 'error', message: 'Please enter a valid quantity' });
      return;
    }

    if (!quantityModalProduct) return;

    addProductWithPositions({
      product_id: quantityModalProduct.id,
      product_name: `${quantityModalProduct.brand} ${quantityModalProduct.model} ${quantityModalProduct.dimensions}`,
      brand: quantityModalProduct.brand,
      model: quantityModalProduct.model,
      dimensions: quantityModalProduct.dimensions,
      sku: quantityModalProduct.sku,
      quantity: quantity,
      assigned_positions: []
    });

    // Close modals
    setShowQuantityModal(false);
    setShowProductDropdown(false);
    setQuantityModalProduct(null);
    setQuantityInput('');
  };

  const openPositionPicker = (productIndex) => {
    setEditingProductIndex(productIndex);
    setSelectedRackId(null);
    setSelectedPositionIds([]);
    setExpandedSections({}); // Reset expanded sections
    setShowPositionModal(true);
    loadRacks(); // Load racks when opening modal
  };

  // NEW: Toggle section expansion
  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  // NEW: Expand all sections
  const expandAllSections = (groupedPositions) => {
    const allExpanded = {};
    Object.keys(groupedPositions).forEach(key => {
      allExpanded[key] = true;
    });
    setExpandedSections(allExpanded);
  };

  // NEW: Collapse all sections
  const collapseAllSections = () => {
    setExpandedSections({});
  };

  const confirmPositionAssignment = async () => {
    if (editingProductIndex === null) return;
    
    const product = formData.product_breakdown[editingProductIndex];
    const selectedPositions = (rackPositions[selectedRackId] || []).filter(p => 
      selectedPositionIds.includes(p.id)
    );
    
    const { distribution, remaining } = distributeQuantityAcrossPositions(
      product.quantity,
      selectedPositions,
      selectedRackId // Pass the rack ID
    );
    
    if (remaining > 0) {
      setAlert({
        type: 'error',
        message: `Cannot store all ${product.quantity} tires. ${remaining} remaining after distribution. Select more positions.`
      });
      return;
    }
    
    // 🆕 DON'T RESERVE YET - Just save the assignment locally
    // Positions will be reserved when the shipment is actually saved
    console.log(`📍 Assigned ${distribution.length} positions (will reserve on shipment save)`);
    
    // Update product with position assignments
    const updatedBreakdown = [...formData.product_breakdown];
    updatedBreakdown[editingProductIndex] = {
      ...product,
      assigned_positions: distribution
    };
    
    setFormData({
      ...formData,
      product_breakdown: updatedBreakdown
    });
    
    // Close modal
    setShowPositionModal(false);
    setEditingProductIndex(null);
    setSelectedWarehouseCode(null); // Reset warehouse selection
    setSelectedRackId(null);
    setSelectedPositionIds([]);
    
    setAlert({
      type: 'success',
      message: `✅ Assigned ${distribution.length} positions for ${product.product_name} (will reserve when shipment is saved)`
    });
  };

  const removeProductLine = (index) => {
    const newBreakdown = formData.product_breakdown.filter((_, i) => i !== index);
    setFormData({ ...formData, product_breakdown: newBreakdown });
  };

  const updateProductLine = (index, field, value) => {
    const newBreakdown = [...formData.product_breakdown];
    newBreakdown[index] = { ...newBreakdown[index], [field]: value };
    setFormData({ ...formData, product_breakdown: newBreakdown });
  };

  const getTotalBreakdownQty = () => {
    if (!formData.product_breakdown || formData.product_breakdown.length === 0) return 0;
    return formData.product_breakdown.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
  };

  const getStatusConfig = (status) => {
    const configs = {
      'PENDING': { 
        bg: 'bg-gradient-to-r from-yellow-50 to-amber-50', 
        text: 'text-yellow-700',
        icon: Clock,
        border: 'border-yellow-200'
      },
      'IN_TRANSIT': { 
        bg: 'bg-gradient-to-r from-blue-50 to-indigo-50', 
        text: 'text-blue-700',
        icon: Truck,
        border: 'border-blue-200'
      },
      'RECEIVED': { 
        bg: 'bg-gradient-to-r from-green-50 to-emerald-50', 
        text: 'text-green-700',
        icon: CheckCircle2,
        border: 'border-green-200'
      },
      'CANCELLED': { 
        bg: 'bg-gradient-to-r from-red-50 to-rose-50', 
        text: 'text-red-700',
        icon: XCircle,
        border: 'border-red-200'
      }
    };
    return configs[status] || { 
      bg: 'bg-gray-50', 
      text: 'text-gray-700', 
      icon: Package,
      border: 'border-gray-200'
    };
  };

  const filteredShipments = shipments.filter(shipment => {
    const matchesSearch = 
      shipment.shipment_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.container_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.suppliers?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  const stats = {
    total: shipments.length,
    pending: shipments.filter(s => s.status === 'PENDING').length,
    inTransit: shipments.filter(s => s.status === 'IN_TRANSIT').length,
    received: shipments.filter(s => s.status === 'RECEIVED').length
  };

  if (loading && shipments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-emerald-200 border-t-teal-600 rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Alert */}
        <AnimatePresence>
          {alert && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`${
                alert.type === 'success'
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-800'
                  : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200 text-red-800'
              } border-2 rounded-2xl px-6 py-4 shadow-lg backdrop-blur-sm`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {alert.type === 'success' ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                  <span className="font-medium">{alert.message}</span>
                </div>
                <button onClick={() => setAlert(null)} className="text-gray-500 hover:text-gray-700">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        >
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
              All Shipments
            </h1>
            <p className="mt-2 text-slate-600">Register and manage all tire shipments</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Shipment
          </motion.button>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ y: -4 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-emerald-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Shipments</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent mt-1">
                  {stats.total}
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl shadow-lg">
                <Ship className="h-8 w-8 text-white" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ y: -4 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-yellow-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Pending</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent mt-1">
                  {stats.pending}
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-2xl shadow-lg">
                <Clock className="h-8 w-8 text-white" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ y: -4 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-blue-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">In Transit</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mt-1">
                  {stats.inTransit}
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                <Truck className="h-8 w-8 text-white" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ y: -4 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-green-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Received</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mt-1">
                  {stats.received}
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg">
                <CheckCircle2 className="h-8 w-8 text-white" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Form Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={resetForm}
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
              >
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-8 py-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                        <Plus className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">
                          {editingShipment ? 'Edit Shipment' : 'New Shipment'}
                        </h2>
                        <p className="text-emerald-100 text-sm mt-1">Enter shipment details below</p>
                      </div>
                    </div>
                    <button
                      onClick={resetForm}
                      className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                    >
                      <X className="h-6 w-6 text-white" />
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <form onSubmit={handleSubmit} className="p-8 overflow-y-auto max-h-[calc(90vh-180px)] space-y-6">
                  {/* Shipment Info Section */}
                  <div>
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                        <Ship className="h-4 w-4 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-800">Shipment Information</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Supplier *</label>
                        <select
                          value={formData.supplier_id}
                          onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                          required
                          className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        >
                          <option value="">Select Supplier</option>
                          {suppliers.map(supplier => (
                            <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Shipment Number *</label>
                        <input
                          type="text"
                          value={formData.shipment_number}
                          onChange={(e) => setFormData({ ...formData, shipment_number: e.target.value })}
                          required
                          placeholder="SHIP-2026-001"
                          className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Container Number *</label>
                        <input
                          type="text"
                          value={formData.container_number}
                          onChange={(e) => setFormData({ ...formData, container_number: e.target.value })}
                          required
                          placeholder="MSKU1234567"
                          className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Bill of Lading (BL)</label>
                        <input
                          type="text"
                          value={formData.bl_number}
                          onChange={(e) => setFormData({ ...formData, bl_number: e.target.value })}
                          placeholder="BL-2026-001"
                          className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Product Breakdown Section - REDESIGNED */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg">
                          <Layers className="h-4 w-4 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800">Product Breakdown</h3>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={openProductPicker}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-lg text-xs font-medium shadow-md hover:shadow-lg transition-all"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Product
                      </motion.button>
                    </div>

                    {formData.product_breakdown.length === 0 ? (
                      <div className="text-center py-8 px-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50">
                        <Package className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                        <p className="text-sm text-slate-600 font-medium">No products added yet</p>
                        <p className="text-xs text-slate-500 mt-1">Click "Add Product" to search the product catalog</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {formData.product_breakdown.map((item, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="rounded-xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 p-4"
                          >
                            {/* Product Header */}
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                                  <Package className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div>
                                  <p className="font-bold text-emerald-900">{item.product_name || `${item.category} ${item.size}`}</p>
                                  <div className="mt-1 flex gap-2 text-xs text-emerald-700">
                                    {item.dimensions && <span className="flex items-center gap-1"><Tag size={9} /> {item.dimensions}</span>}
                                    {item.sku && <span className="font-mono opacity-70">{item.sku}</span>}
                                    {item._legacy && (
                                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                        Legacy
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Actions */}
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => openPositionPicker(index)}
                                  className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                  title="Assign Positions"
                                >
                                  <MapPin size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    removeProductLine(index);
                                    setTimeout(() => {
                                      const newTotal = getTotalBreakdownQty();
                                      setFormData(prev => ({ ...prev, expected_quantity: newTotal }));
                                    }, 0);
                                  }}
                                  className="rounded-lg p-2 text-red-500 hover:bg-red-50 transition-colors"
                                  title="Remove Product"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                            
                            {/* Quantity Summary - EDITABLE (only for new shipments) */}
                            <div className={`mt-3 flex items-center justify-between rounded-lg px-3 py-2 ${editingShipment ? 'bg-slate-50' : 'bg-white/70 border-2 border-emerald-200'}`}>
                              <span className="text-xs font-medium text-slate-600">Total Quantity:</span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={item.quantity || ''}
                                  onChange={(e) => {
                                    if (editingShipment) return; // Prevent changes to saved shipments
                                    const newQty = parseInt(e.target.value) || 0;
                                    updateProductLine(index, 'quantity', newQty);
                                    // Auto-update expected_quantity
                                    setTimeout(() => {
                                      const newTotal = getTotalBreakdownQty();
                                      setFormData(prev => ({ ...prev, expected_quantity: newTotal }));
                                    }, 0);
                                  }}
                                  disabled={!!editingShipment}
                                  min="1"
                                  className={`w-24 px-3 py-1 text-center text-lg font-bold rounded-lg focus:outline-none ${
                                    editingShipment 
                                      ? 'bg-slate-100 text-slate-500 border-2 border-slate-300 cursor-not-allowed' 
                                      : 'text-emerald-700 bg-white border-2 border-emerald-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
                                  }`}
                                  placeholder="0"
                                />
                                <span className="text-sm font-medium text-slate-600">tires</span>
                              </div>
                            </div>
                            
                            {/* Position Assignments */}
                            {item.assigned_positions && item.assigned_positions.length > 0 && (
                              <div className="mt-3 space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                                  Assigned Positions ({item.assigned_positions.length})
                                </p>
                                {item.assigned_positions.map((pos, i) => (
                                  <div key={i} className="flex items-center justify-between rounded-lg bg-white/50 px-2 py-1">
                                    <span className="font-mono text-[11px] text-slate-700">{pos.position_code}</span>
                                    <span className="text-xs font-bold text-emerald-700">+{pos.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Warning if no positions assigned */}
                            {(!item.assigned_positions || item.assigned_positions.length === 0) && !item._legacy && (
                              <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                                <AlertTriangle size={13} />
                                <span>No positions assigned yet. Click the map pin icon to assign.</span>
                              </div>
                            )}
                          </motion.div>
                        ))}

                        {/* Total Summary */}
                        {formData.product_breakdown.length > 0 && (
                          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border-2 border-emerald-200">
                            <span className="text-sm font-semibold text-emerald-800">Total Breakdown Quantity:</span>
                            <span className="text-xl font-bold text-emerald-700">{getTotalBreakdownQty()} tires</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quantity & Schedule Section */}
                  <div>
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
                        <Box className="h-4 w-4 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-800">Quantity & Schedule</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Expected Quantity (Auto-calculated)</label>
                        <input
                          type="number"
                          value={getTotalBreakdownQty()}
                          readOnly
                          min="0"
                          placeholder="Add products to calculate"
                          className="w-full px-4 py-2.5 border-2 border-slate-300 bg-slate-100 rounded-xl text-slate-700 font-semibold cursor-not-allowed"
                        />
                        <p className="text-xs text-slate-500 mt-1">Automatically calculated from product breakdown</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Expected Arrival Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          value={formData.expected_arrival_date}
                          onChange={(e) => setFormData({ ...formData, expected_arrival_date: e.target.value })}
                          className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        />
                        {!formData.expected_arrival_date && (
                          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            This field is required
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows="3"
                      placeholder="Additional notes about this shipment..."
                      className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>


                  {/* Modal Footer */}
                  <div className="flex justify-end space-x-3 pt-6 border-t border-slate-200">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={resetForm}
                      className="px-6 py-2.5 border-2 border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={loading}
                      className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-medium disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : editingShipment ? 'Update Shipment' : 'Create Shipment'}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ============================================ */}
        {/* STEP 1: BRAND/MODEL SELECTION MODAL */}
        {/* ============================================ */}
        <AnimatePresence>
          {showBrandModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowBrandModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
              >
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                        <Package className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">Step 1: Select Product Brand</h3>
                        <p className="text-emerald-100 text-xs">Choose a tire brand/model first</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowBrandModal(false)}
                      className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                    >
                      <X className="h-5 w-5 text-white" />
                    </button>
                  </div>
                </div>

                {/* Brand List */}
                <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                  {loadingProducts ? (
                    <div className="text-center py-8">
                      <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin mx-auto mb-3" />
                      <p className="text-sm text-slate-600">Loading brands...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {getUniqueBrands().map((brandInfo) => (
                        <motion.button
                          key={brandInfo.fullName}
                          whileHover={{ scale: 1.02, x: 4 }}
                          whileTap={{ scale: 0.98 }}
                          type="button"
                          onClick={() => selectBrand(brandInfo.fullName)}
                          className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-slate-200 hover:border-emerald-400 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 transition-all text-left group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-green-100 group-hover:from-emerald-200 group-hover:to-green-200 transition-all">
                              <Layers className="h-6 w-6 text-emerald-600" />
                            </div>
                            <div>
                              <p className="font-bold text-lg text-slate-800 group-hover:text-emerald-700 transition-colors">
                                {brandInfo.fullName}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                {brandInfo.count} size{brandInfo.count !== 1 ? 's' : ''} available
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                        </motion.button>
                      ))}
                      
                      {getUniqueBrands().length === 0 && (
                        <div className="text-center py-12">
                          <Package className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                          <p className="text-sm text-slate-600 font-medium">No products found</p>
                          <p className="text-xs text-slate-500 mt-1">Please add products to the catalog first</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ============================================ */}
        {/* STEP 2: SIZE SELECTION MODAL */}
        {/* ============================================ */}
        <AnimatePresence>
          {showSizeModal && selectedBrand && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => {
                setShowSizeModal(false);
                setShowBrandModal(true); // Go back to brand selection
              }}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
              >
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => {
                          setShowSizeModal(false);
                          setShowBrandModal(true);
                        }}
                        className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                      >
                        <ChevronRight className="h-5 w-5 text-white transform rotate-180" />
                      </button>
                      <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                        <Tag className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">Step 2: Select Tire Size</h3>
                        <p className="text-emerald-100 text-xs">{selectedBrand} - Choose a size</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowSizeModal(false);
                        setShowBrandModal(false);
                      }}
                      className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                    >
                      <X className="h-5 w-5 text-white" />
                    </button>
                  </div>
                </div>

                {/* Size List */}
                <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availableSizes.map((product) => (
                      <motion.button
                        key={product.id}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        onClick={() => selectSize(product)}
                        className="flex flex-col items-start p-4 rounded-xl border-2 border-slate-200 hover:border-emerald-400 hover:bg-gradient-to-br hover:from-emerald-50 hover:to-green-50 transition-all text-left group"
                      >
                        <div className="flex items-center gap-3 w-full mb-2">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-100 to-green-100 group-hover:from-emerald-200 group-hover:to-green-200 transition-all flex-shrink-0">
                            <Package className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-lg text-emerald-700 group-hover:text-emerald-800 transition-colors">
                              {product.dimensions}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            {product.sku}
                          </span>
                          {product.stock_quantity !== undefined && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              product.stock_quantity > 0 
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              Stock: {product.stock_quantity}
                            </span>
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                  
                  {availableSizes.length === 0 && (
                    <div className="text-center py-12">
                      <Tag className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-sm text-slate-600 font-medium">No sizes available</p>
                      <p className="text-xs text-slate-500 mt-1">This brand has no tire sizes in the catalog</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ============================================ */}
        {/* OLD PRODUCT PICKER MODAL (KEPT FOR FALLBACK) */}
        {/* ============================================ */}
        <AnimatePresence>
          {showProductDropdown && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowProductDropdown(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
              >
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                        <Search className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">Search Products</h3>
                        <p className="text-emerald-100 text-xs">Select a product from the catalog</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowProductDropdown(false)}
                      className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                    >
                      <X className="h-5 w-5 text-white" />
                    </button>
                  </div>
                </div>

                {/* Search Box */}
                <div className="p-4 border-b border-slate-200">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by brand, model, or tire size..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Product List */}
                <div className="p-4 overflow-y-auto max-h-[50vh]">
                  {loadingProducts ? (
                    <div className="text-center py-8">
                      <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin mx-auto mb-3" />
                      <p className="text-sm text-slate-600">Loading products...</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {products
                        .filter(p => {
                          const search = productSearch.toLowerCase();
                          if (!search) return true;
                          return (
                            (p.brand || '').toLowerCase().includes(search) ||
                            (p.model || '').toLowerCase().includes(search) ||
                            (p.dimensions || '').toLowerCase().includes(search) ||
                            (p.sku || '').toLowerCase().includes(search)
                          );
                        })
                        .map(product => (
                          <motion.button
                            key={product.id}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            type="button"
                            onClick={() => {
                              setQuantityModalProduct(product);
                              setQuantityInput('');
                              setShowQuantityModal(true);
                            }}
                            className="w-full flex items-center justify-between p-3 rounded-xl border-2 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all text-left"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                                <Package className="h-5 w-5 text-emerald-600" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-800">{product.brand} {product.model}</p>
                                <div className="flex gap-2 text-xs text-slate-600 mt-0.5">
                                  <span className="flex items-center gap-1"><Tag size={10} /> {product.dimensions}</span>
                                  <span className="font-mono opacity-70">{product.sku}</span>
                                </div>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          </motion.button>
                        ))}
                      
                      {products.filter(p => {
                        const search = productSearch.toLowerCase();
                        if (!search) return true;
                        return (
                          (p.brand || '').toLowerCase().includes(search) ||
                          (p.model || '').toLowerCase().includes(search) ||
                          (p.dimensions || '').toLowerCase().includes(search) ||
                          (p.sku || '').toLowerCase().includes(search)
                        );
                      }).length === 0 && (
                        <div className="text-center py-8">
                          <Package className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                          <p className="text-sm text-slate-600 font-medium">No products found</p>
                          <p className="text-xs text-slate-500 mt-1">Try a different search term</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ============================================ */}
        {/* QUANTITY INPUT MODAL */}
        {/* ============================================ */}
        <AnimatePresence>
          {showQuantityModal && quantityModalProduct && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
              onClick={() => {
                setShowQuantityModal(false);
                setQuantityModalProduct(null);
                setQuantityInput('');
              }}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
              >
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                        <Package className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">Enter Quantity</h3>
                        <p className="text-emerald-100 text-xs">How many tires in this shipment?</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowQuantityModal(false);
                        setQuantityModalProduct(null);
                        setQuantityInput('');
                      }}
                      className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                    >
                      <X className="h-5 w-5 text-white" />
                    </button>
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-6">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border-2 border-emerald-200 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100">
                      <Package className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-emerald-900">
                        {quantityModalProduct.brand} {quantityModalProduct.model}
                      </p>
                      <div className="flex gap-2 text-xs text-emerald-700 mt-1">
                        <span className="flex items-center gap-1">
                          <Tag size={10} /> {quantityModalProduct.dimensions}
                        </span>
                        <span className="font-mono opacity-70">{quantityModalProduct.sku}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quantity Input */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Quantity (Number of Tires)
                    </label>
                    <input
                      type="number"
                      value={quantityInput}
                      onChange={(e) => setQuantityInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          confirmProductQuantity();
                        }
                      }}
                      placeholder="Enter quantity (e.g., 100)"
                      min="1"
                      autoFocus
                      className="w-full px-4 py-3 text-lg font-semibold border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      💡 Tip: You'll assign storage positions after adding the product
                    </p>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end space-x-3 p-6 border-t border-slate-200 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuantityModal(false);
                      setQuantityModalProduct(null);
                      setQuantityInput('');
                    }}
                    className="px-6 py-2.5 border-2 border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmProductQuantity}
                    disabled={!quantityInput || parseInt(quantityInput) <= 0}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add to Shipment
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ============================================ */}
        {/* POSITION ASSIGNMENT MODAL */}
        {/* ============================================ */}
        <AnimatePresence>
          {showPositionModal && editingProductIndex !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => {
                setShowPositionModal(false);
                setEditingProductIndex(null);
                setSelectedRackId(null);
                setSelectedPositionIds([]);
              }}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden"
              >
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                        <MapPin className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">Assign Storage Positions</h3>
                        <p className="text-emerald-100 text-xs">
                          {formData.product_breakdown[editingProductIndex]?.product_name} - 
                          {formData.product_breakdown[editingProductIndex]?.quantity} tires
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowPositionModal(false);
                        setEditingProductIndex(null);
                        setSelectedRackId(null);
                        setSelectedPositionIds([]);
                      }}
                      className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                    >
                      <X className="h-5 w-5 text-white" />
                    </button>
                  </div>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(85vh-200px)]">
                  {/* Step 1: Select Warehouse */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      <span className="flex items-center gap-2">
                        <Warehouse className="h-4 w-4 text-emerald-600" />
                        Step 1: Select Warehouse
                      </span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {['WH1', 'WH2'].map((whCode) => (
                        <button
                          key={whCode}
                          type="button"
                          onClick={() => {
                            setSelectedWarehouseCode(whCode);
                            setSelectedRackId(null);
                            setSelectedPositionIds([]);
                          }}
                          className={`flex items-center justify-center gap-3 px-4 py-4 rounded-xl border-2 transition-all ${
                            selectedWarehouseCode === whCode
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/50'
                          }`}
                        >
                          <Warehouse className={`h-5 w-5 ${selectedWarehouseCode === whCode ? 'text-emerald-600' : 'text-slate-400'}`} />
                          <span className="font-bold">{whCode}</span>
                          {selectedWarehouseCode === whCode && (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 2: Select Rack (only show if warehouse selected) */}
                  {selectedWarehouseCode && (
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        <span className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-emerald-600" />
                          Step 2: Choose a Rack
                        </span>
                      </label>
                      <select
                        value={selectedRackId || ''}
                        onChange={(e) => {
                          const rackId = e.target.value;
                          setSelectedRackId(rackId);
                          setSelectedPositionIds([]);
                          if (rackId) {
                            loadRackPositions(rackId);
                          }
                        }}
                        className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      >
                        <option value="">Choose a rack...</option>
                        {racks
                          .filter(rack => rack.rack_code.startsWith(selectedWarehouseCode))
                          .map(rack => (
                            <option key={rack.id} value={rack.id}>
                              {rack.rack_code}
                            </option>
                          ))}
                      </select>
                      {racks.filter(rack => rack.rack_code.startsWith(selectedWarehouseCode)).length === 0 && (
                        <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          No racks found for {selectedWarehouseCode}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Step 3: Rack Occupancy Overview */}
                  {selectedRackId && !loadingPositions[selectedRackId] && (() => {
                    const occupancyMap = getOccupiedPositionsSummary(selectedRackId);
                    const hasOccupiedPositions = Object.keys(occupancyMap).length > 0;
                    
                    return hasOccupiedPositions && (
                      <div className="mb-6">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Current Rack Occupancy
                        </label>
                        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 space-y-3">
                          {Object.entries(occupancyMap).map(([section, shelves]) => (
                            <div key={section} className="bg-white rounded-lg p-3 shadow-sm">
                              <div className="flex items-center gap-2 mb-2">
                                <Layers className="h-4 w-4 text-blue-600" />
                                <span className="font-bold text-sm text-blue-900">{section}</span>
                              </div>
                              <div className="space-y-2 pl-6">
                                {Object.entries(shelves).map(([shelf, subsections]) => (
                                  <div key={shelf} className="space-y-1">
                                    <div className="flex items-center gap-1.5">
                                      <ChevronRight className="h-3 w-3 text-blue-500" />
                                      <span className="text-xs font-semibold text-slate-700">{shelf}</span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-1 pl-5">
                                      {subsections.map((sub, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-xs bg-slate-50 rounded px-2 py-1">
                                          <span className="font-mono text-[10px] text-slate-600">{sub.subsection}</span>
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-blue-700">{sub.tire_size}</span>
                                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                              {sub.quantity}/{sub.capacity}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Step 4: Select Positions */}
                  {selectedRackId && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        <span className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-emerald-600" />
                          {getOccupiedPositionsSummary(selectedRackId) && Object.keys(getOccupiedPositionsSummary(selectedRackId)).length > 0 ? 'Step 4' : 'Step 3'}: Select Positions (Multiple)
                        </span>
                      </label>
                      
                      {loadingPositions[selectedRackId] ? (
                        <div className="text-center py-8 bg-slate-50 rounded-xl">
                          <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin mx-auto mb-3" />
                          <p className="text-sm text-slate-600">Loading positions...</p>
                        </div>
                      ) : (
                        <>
                          {(() => {
                            const tireSize = formData.product_breakdown[editingProductIndex]?.dimensions;
                            const availablePositions = getAvailablePositionsForRack(selectedRackId, tireSize);
                            const selectedPositions = availablePositions.filter(p => selectedPositionIds.includes(p.id));
                            const totalCapacity = selectedPositions.reduce((sum, pos) => {
                              const current = Number(pos.current_stock || 0);
                              const cap = Number(pos.capacity || 0);
                              return sum + (cap - current);
                            }, 0);
                            const quantityNeeded = formData.product_breakdown[editingProductIndex]?.quantity || 0;
                            const isEnoughCapacity = totalCapacity >= quantityNeeded;

                            // Group positions by section → shelf
                            const groupedPositions = {};
                            availablePositions.forEach(pos => {
                              const section = `S${String(pos.section_number).padStart(2, '0')}`;
                              const shelf = `SH${String(pos.shelf_number).padStart(2, '0')}`;
                              const key = `${section}-${shelf}`;
                              
                              if (!groupedPositions[key]) {
                                groupedPositions[key] = {
                                  section,
                                  shelf,
                                  positions: []
                                };
                              }
                              groupedPositions[key].positions.push(pos);
                            });

                            return (
                              <>
                                {/* Capacity Summary */}
                                {selectedPositions.length > 0 && (
                                  <div className={`mb-4 rounded-lg border p-3 ${
                                    isEnoughCapacity 
                                      ? 'border-emerald-200 bg-emerald-50' 
                                      : 'border-amber-200 bg-amber-50'
                                  }`}>
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-medium">Selected capacity: {totalCapacity} tires</span>
                                      <span className="text-xs font-medium">Need: {quantityNeeded} tires</span>
                                      {!isEnoughCapacity && (
                                        <span className="text-xs font-bold text-amber-600">
                                          Short by: {quantityNeeded - totalCapacity}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Position List (Grouped with Expand/Collapse) */}
                                {availablePositions.length === 0 ? (
                                  <div className="text-center py-8 bg-slate-50 rounded-xl">
                                    <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                                    <p className="text-sm text-slate-600 font-medium">No available positions</p>
                                    <p className="text-xs text-slate-500 mt-1">All positions in this rack are full or incompatible</p>
                                  </div>
                                ) : (
                                  <>
                                    {/* Expand/Collapse All Buttons */}
                                    <div className="mb-3 flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => expandAllSections(groupedPositions)}
                                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                                      >
                                        <ChevronDown size={12} />
                                        Expand All
                                      </button>
                                      <button
                                        type="button"
                                        onClick={collapseAllSections}
                                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                                      >
                                        <ChevronRight size={12} />
                                        Collapse All
                                      </button>
                                    </div>

                                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                                      {Object.entries(groupedPositions).map(([key, group]) => {
                                        const isExpanded = expandedSections[key];
                                        const sectionSelectedCount = group.positions.filter(p => selectedPositionIds.includes(p.id)).length;

                                        // Check if all positions in this section are selected
                                        const allSectionSelected = group.positions.length > 0 && 
                                          group.positions.every(p => selectedPositionIds.includes(p.id));

                                        // Calculate section capacity
                                        const sectionTotalCapacity = group.positions.reduce((sum, p) => 
                                          sum + Number(p.capacity || 0), 0
                                        );
                                        const sectionCurrentStock = group.positions.reduce((sum, p) => 
                                          sum + Number(p.current_stock || p.quantity || 0), 0
                                        );
                                        const sectionAvailable = sectionTotalCapacity - sectionCurrentStock;
                                        const sectionUtilization = sectionTotalCapacity > 0 
                                          ? Math.round((sectionCurrentStock / sectionTotalCapacity) * 100) 
                                          : 0;

                                        return (
                                          <div key={key} className="rounded-lg border border-slate-200 overflow-hidden">
                                            {/* Section/Shelf Header */}
                                            <div className="bg-gradient-to-r from-slate-100 to-slate-50 px-3 py-2.5 border-b border-slate-200">
                                              <div className="flex items-center justify-between">
                                                <button
                                                  type="button"
                                                  onClick={() => toggleSection(key)}
                                                  className="flex items-center gap-2 hover:opacity-75 transition-opacity"
                                                >
                                                  {isExpanded ? (
                                                    <ChevronDown className="h-4 w-4 text-slate-600" />
                                                  ) : (
                                                    <ChevronRight className="h-4 w-4 text-slate-600" />
                                                  )}
                                                  <Layers className="h-3.5 w-3.5 text-slate-600" />
                                                  <div className="flex flex-col items-start">
                                                    <div className="flex items-center gap-2">
                                                      <span className="text-xs font-bold text-slate-700">
                                                        {group.section} · {group.shelf}
                                                      </span>
                                                      <span className="text-[10px] text-slate-500">
                                                        ({group.positions.length} positions)
                                                      </span>
                                                    </div>
                                                    {/* Capacity Info */}
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                      <span className={`text-[10px] font-bold ${
                                                        sectionAvailable >= 100 ? 'text-emerald-600' :
                                                        sectionAvailable >= 50 ? 'text-amber-600' :
                                                        'text-red-600'
                                                      }`}>
                                                        {sectionAvailable} available
                                                      </span>
                                                      <span className="text-[10px] text-slate-400">
                                                        · {sectionCurrentStock}/{sectionTotalCapacity} capacity
                                                      </span>
                                                      <span className={`text-[10px] font-semibold ${
                                                        sectionUtilization >= 90 ? 'text-red-600' :
                                                        sectionUtilization >= 70 ? 'text-amber-600' :
                                                        'text-emerald-600'
                                                      }`}>
                                                        ({sectionUtilization}% full)
                                                      </span>
                                                    </div>
                                                  </div>
                                                </button>
                                                
                                                <div className="flex items-center gap-2">
                                                  {/* Select All Section Button */}
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      const sectionPositionIds = group.positions.map(p => p.id);
                                                      if (allSectionSelected) {
                                                        // Deselect all from this section
                                                        setSelectedPositionIds(
                                                          selectedPositionIds.filter(id => !sectionPositionIds.includes(id))
                                                        );
                                                      } else {
                                                        // Select all from this section
                                                        const newIds = [...selectedPositionIds];
                                                        sectionPositionIds.forEach(id => {
                                                          if (!newIds.includes(id)) {
                                                            newIds.push(id);
                                                          }
                                                        });
                                                        setSelectedPositionIds(newIds);
                                                      }
                                                    }}
                                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                                      allSectionSelected
                                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                        : 'bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                                                    }`}
                                                  >
                                                    {allSectionSelected ? (
                                                      <>
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        Deselect All
                                                      </>
                                                    ) : (
                                                      <>
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        Select All
                                                      </>
                                                    )}
                                                  </button>
                                                  
                                                  {sectionSelectedCount > 0 && (
                                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                                      {sectionSelectedCount} selected
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                            
                                            {/* Positions in this section/shelf - Only show when expanded */}
                                            {isExpanded && (
                                              <div className="p-2 space-y-2 bg-white">
                                                {group.positions.map(position => {
                                                  const currentQty = Number(position.current_stock || position.quantity || 0);
                                                  const capacity = Number(position.capacity || 0);
                                                  const available = capacity - currentQty;
                                                  const utilization = (currentQty / capacity) * 100;
                                                  const isSelected = selectedPositionIds.includes(position.id);

                                                  return (
                                                    <label
                                                      key={position.id}
                                                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                                        isSelected
                                                          ? 'border-emerald-300 bg-emerald-50'
                                                          : 'border-slate-200 hover:border-emerald-200 hover:bg-slate-50'
                                                      }`}
                                                    >
                                                      <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                          if (e.target.checked) {
                                                            setSelectedPositionIds([...selectedPositionIds, position.id]);
                                                          } else {
                                                            setSelectedPositionIds(selectedPositionIds.filter(id => id !== position.id));
                                                          }
                                                        }}
                                                        className="h-4 w-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                                                      />
                                                      <div className="flex-1">
                                                        <p className="font-mono text-sm font-bold text-slate-800">
                                                          {position.position_code || position.code || `Position-${position.id}`}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                                            available > 0 
                                                              ? 'bg-emerald-100 text-emerald-700'
                                                              : 'bg-red-100 text-red-700'
                                                          }`}>
                                                            {available} available
                                                          </span>
                                                          {position.tire_size && (
                                                            <span className="text-xs text-slate-600">
                                                              Current: {position.tire_size}
                                                            </span>
                                                          )}
                                                        </div>
                                                        {/* Capacity Bar */}
                                                        <div className="mt-2">
                                                          <div className="mb-1 flex items-center justify-between">
                                                            <span className="text-[10px] font-semibold uppercase text-slate-400">Capacity</span>
                                                            <span className="text-xs font-bold text-slate-700">{currentQty} / {capacity}</span>
                                                          </div>
                                                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                                                            <div
                                                              className={`h-full rounded-full transition-all ${
                                                                utilization >= 90 ? 'bg-red-500'
                                                                : utilization >= 70 ? 'bg-amber-500'
                                                                : 'bg-emerald-500'
                                                              }`}
                                                              style={{ width: `${utilization}%` }}
                                                            />
                                                          </div>
                                                        </div>
                                                      </div>
                                                    </label>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </>
                                )}
                              </>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end space-x-3 p-6 border-t border-slate-200 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPositionModal(false);
                      setEditingProductIndex(null);
                      setSelectedRackId(null);
                      setSelectedPositionIds([]);
                    }}
                    className="px-6 py-2.5 border-2 border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmPositionAssignment}
                    disabled={selectedPositionIds.length === 0}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Save size={16} />
                    Confirm Assignment
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl p-6 border border-slate-200"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search shipments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="relative">
              <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all appearance-none bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="RECEIVED">Received</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Shipments Grid */}
        {filteredShipments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-12 text-center border border-slate-200"
          >
            <div className="p-6 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <Ship className="h-12 w-12 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">No shipments found</h3>
            <p className="text-slate-600 mb-6">Create your first shipment to get started</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Your First Shipment
            </motion.button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredShipments.map((shipment, index) => {
                const statusConfig = getStatusConfig(shipment.status);
                const StatusIcon = statusConfig.icon;
                const isDeleting = deleteConfirm === shipment.id;
                const canCancel = true; // Allow deleting shipments at any status

                return (
                  <motion.div
                    key={shipment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -4 }}
                    className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
                  >
                    {/* Card Header */}
                    <div className="bg-gradient-to-r from-emerald-600 to-green-600 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white line-clamp-1">
                            {shipment.shipment_number}
                          </h3>
                          <p className="text-xs text-emerald-50 mt-1">
                            {shipment.suppliers?.name || 'Unknown Supplier'}
                          </p>
                        </div>
                        <div className={`px-3 py-1 ${statusConfig.bg} ${statusConfig.text} rounded-lg border ${statusConfig.border} flex items-center space-x-1`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          <span className="text-xs font-semibold">{shipment.status}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 space-y-4">
                      {/* Container & BL */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Box className="h-4 w-4 text-slate-400" />
                          <span className="text-sm text-slate-600">Container:</span>
                          <span className="text-sm font-semibold text-slate-800">{shipment.container_number}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-slate-400" />
                          <span className="text-sm text-slate-600">BL:</span>
                          <span className="text-sm font-semibold text-slate-800">{shipment.bl_number || 'N/A'}</span>
                        </div>
                      </div>

                      {/* Quantity */}
                      <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-600">Quantity:</span>
                          <span className="text-lg font-bold text-emerald-700">
                            {shipment.actual_quantity || 0} / {shipment.expected_quantity || 0}
                          </span>
                        </div>
                      </div>

                      {/* Expected Arrival */}
                      {shipment.expected_arrival_date && (
                        <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          <span className="text-xs text-slate-600">Arrival:</span>
                          <span className="text-sm font-medium text-blue-700">
                            {new Date(shipment.expected_arrival_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      {/* Assigned Location */}
                      <div className="flex space-x-2 pt-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleEdit(shipment)}
                          className={`${canCancel ? 'flex-1' : 'w-full'} inline-flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-medium`}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </motion.button>
                        {canCancel && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleDeleteClick(shipment)}
                            className={`flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-medium ${
                              isDeleting
                                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white'
                                : 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 hover:from-red-50 hover:to-rose-50 hover:text-red-600'
                            }`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Cancel
                          </motion.button>
                        )}
                      </div>

                      {/* Delete Confirmation */}
                      <AnimatePresence>
                        {isDeleting && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-xl p-4 space-y-3">
                              <div className="flex items-start space-x-3">
                                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-sm font-semibold text-red-800">Choose Action</p>
                                  <p className="text-xs text-red-600 mt-1">
                                    <strong>Cancel:</strong> Marks as CANCELLED (keeps record for audit)<br/>
                                    <strong>Delete:</strong> Permanently removes shipment + all batches + inventory
                                  </p>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleCancelShipment(shipment.id)}
                                  className="flex-1 px-3 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg font-medium text-sm hover:shadow-lg transition-all"
                                >
                                  Cancel Shipment
                                </button>
                                <button
                                  onClick={() => handleDeleteConfirm(shipment.id)}
                                  className="flex-1 px-3 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg font-medium text-sm hover:shadow-lg transition-all"
                                >
                                  Delete Permanently
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="px-4 py-2 bg-white text-slate-700 rounded-lg font-medium text-sm border border-slate-300 hover:bg-slate-50 transition-all"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
