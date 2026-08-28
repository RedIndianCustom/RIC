import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScanBarcode, Barcode, Package, Printer, Download, QrCode,
  CheckCircle2, AlertTriangle, RefreshCw, Plus, X, Search,
  PackageCheck, Boxes, Copy, Eye, Settings, Edit, Trash2, ExternalLink,
  ChevronDown, ChevronRight, MapPin, Truck
} from 'lucide-react';
import api from '../../../services/api.js';
import PremiumModal from '../../../components/shared/PremiumModal.jsx';

export default function BarcodeGeneration() {
  const [config, setConfig] = useState(null);
  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [racks, setRacks] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [generatedBarcodes, setGeneratedBarcodes] = useState([]);
  const [selectedBarcodes, setSelectedBarcodes] = useState([]); // NEW: For bulk delete
  const [expandedFolders, setExpandedFolders] = useState([]); // NEW: Track expanded folders
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true); // NEW: Initial page load state
  const [refreshing, setRefreshing] = useState(false); // NEW: Refresh animation state
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [batchMode, setBatchMode] = useState(false);
  const [batchQuantity, setBatchQuantity] = useState(1);
  const [labelFormat, setLabelFormat] = useState('4x2');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Premium Modal States
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false); // NEW: Progress modal
  const [showDeleteProgressModal, setShowDeleteProgressModal] = useState(false); // NEW: Delete progress modal
  const [generationProgress, setGenerationProgress] = useState(0); // NEW: Progress percentage
  const [generationCount, setGenerationCount] = useState(0); // Realtime items created counter
  const [deleteProgress, setDeleteProgress] = useState(0); // NEW: Delete progress percentage
  const [modalMessage, setModalMessage] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  // Traceability Panel States
  const [showTraceabilityPanel, setShowTraceabilityPanel] = useState(false);
  const [selectedBarcodeForTrace, setSelectedBarcodeForTrace] = useState(null);
  const [traceabilityData, setTraceabilityData] = useState(null);
  const [loadingTrace, setLoadingTrace] = useState(false);

  // Form data for barcode generation
  const [formData, setFormData] = useState({
    batchId: '',
    productId: '',
    shipmentId: '',
    warehouseId: '',
    warehouseCode: '', // NEW: Add warehouse code to form state
    rackId: '',
    rackCode: '',
    rackDesignatedSize: '',
    rackLocationId: '',
    shelfNumber: '',
    sectionNumber: '',
    subsectionNumber: ''
  });

  // NEW: Rack configuration data for hierarchical selection
  const [selectedRackConfig, setSelectedRackConfig] = useState(null);
  const [availablePositionCode, setAvailablePositionCode] = useState('');
  
  // NEW: Capacity tracking data
  const [capacityData, setCapacityData] = useState(null);
  const [loadingCapacity, setLoadingCapacity] = useState(false);

  // Load barcode configuration
  useEffect(() => {
    const initializeData = async () => {
      setInitialLoading(true);
      await Promise.all([
        loadConfig(),
        loadProducts(),
        loadBatches(),
        loadShipments(),
        loadWarehouses(),
        loadGeneratedBarcodes()
      ]);
      setInitialLoading(false);
    };
    
    initializeData();
    // Auto-enable batch mode for easier workflow
    setBatchMode(true);
  }, []);

  // Load racks when warehouse is selected (don't wait for product)
  useEffect(() => {
    if (formData.warehouseId) {
      // If we have a product, filter by category
      if (formData.productId) {
        loadRacksForProduct(formData.productId);
      } else {
        // No product yet, load all racks for this warehouse
        loadAllRacksForWarehouse(formData.warehouseId);
      }
    }
  }, [formData.warehouseId, formData.productId]);

  // NEW: Update position code preview when rack location selections change
  useEffect(() => {
    if (formData.rackId && formData.shelfNumber && formData.sectionNumber && formData.subsectionNumber) {
      const selectedRack = racks.find(r => r.id === formData.rackId);
      if (selectedRack) {
        // Format: RACK-S##-SH##-SUB##
        // where S## is Section, SH## is Shelf, SUB## is Subsection
        const sectionPadded = String(formData.sectionNumber).padStart(2, '0');
        const shelfPadded = String(formData.shelfNumber).padStart(2, '0');
        const subsectionPadded = String(formData.subsectionNumber).padStart(2, '0');
        const positionCode = `${selectedRack.rack_code}-S${sectionPadded}-SH${shelfPadded}-SUB${subsectionPadded}`;
        setAvailablePositionCode(positionCode);
      }
    } else {
      setAvailablePositionCode('');
    }
  }, [formData.rackId, formData.shelfNumber, formData.sectionNumber, formData.subsectionNumber, racks]);

  // NEW: Load rack configuration when rack is selected
  useEffect(() => {
    if (formData.rackId) {
      const rack = racks.find(r => r.id === formData.rackId);
      setSelectedRackConfig(rack || null);
    } else {
      setSelectedRackConfig(null);
    }
  }, [formData.rackId, racks]);

  // NEW: Fetch capacity data when warehouse and rack are selected
  useEffect(() => {
    const fetchCapacityData = async () => {
      if (formData.warehouseId && formData.rackId) {
        setLoadingCapacity(true);
        try {
          const { data } = await api.get(`/warehouses/${formData.warehouseId}/racks/${formData.rackId}/capacity`);
          if (data?.success && data?.capacity) {
            setCapacityData(data.capacity);
            console.log('📊 Capacity data loaded:', data.capacity);
          }
        } catch (err) {
          console.error('❌ Failed to load capacity data:', err);
          setCapacityData(null);
        } finally {
          setLoadingCapacity(false);
        }
      } else {
        setCapacityData(null);
      }
    };

    fetchCapacityData();
  }, [formData.warehouseId, formData.rackId]);

  // Helper function to get capacity display info
  const getCapacityDisplay = (type, shelf, section, subsection) => {
    if (!capacityData || !capacityData.usage) return null;

    let key, data, maxCapacity;

    if (type === 'shelf') {
      key = `shelf_${shelf}`;
      data = capacityData.usage.shelves[key] || 0;
      // Shelf capacity is sum of all its sections
      maxCapacity = (capacityData.sectionsPerShelf || 6) * 30; // sections * max per section
    } else if (type === 'section') {
      key = `shelf_${shelf}_section_${section}`;
      data = capacityData.usage.sections[key];
      if (data) {
        return {
          used: data.used,
          max: data.maxCapacity,
          percent: data.percentFull,
          indicator: data.percentFull < 80 ? '🟢' : data.percentFull <= 100 ? '🟡' : '🔴'
        };
      }
      return { used: 0, max: 30, percent: 0, indicator: '🟢' };
    } else if (type === 'subsection') {
      key = `shelf_${shelf}_section_${section}_subsection_${subsection}`;
      data = capacityData.usage.subsections[key];
      if (data) {
        return {
          used: data.used,
          max: data.maxCapacity,
          percent: data.percentFull,
          indicator: data.percentFull < 80 ? '🟢' : data.percentFull <= 100 ? '🟡' : '🔴'
        };
      }
      return { used: 0, max: 15, percent: 0, indicator: '🟢' };
    }

    if (typeof data === 'number') {
      const percent = Math.round((data / maxCapacity) * 100);
      return {
        used: data,
        max: maxCapacity,
        percent,
        indicator: percent < 80 ? '🟢' : percent <= 100 ? '🟡' : '🔴'
      };
    }

    return null;
  };

  const loadConfig = async () => {
    try {
      const { data } = await api.get('/barcodes/config');
      if (data?.config) {
        setConfig(data.config);
        setLabelFormat(data.config.label_size || '4x2');
      }
    } catch (err) {
      console.warn('Using default barcode config');
      setConfig({
        format: 'CODE128',
        prefix: 'RIC',
        include_date_stamp: false,
        include_checksum: true,
        serial_length: 12,
        label_size: '4x2',
        printer_dpi: 300
      });
    }
  };

  const loadProducts = async () => {
    try {
      const { data } = await api.get('/products');
      
      if (!data?.products || data.products.length === 0) {
        console.info('📦 Using demo product catalog (database products not available)');
        const fallbackProducts = [
          { id: '1', sku: 'SAW-15-130/90', brand: 'Red Indian Customs', model: 'Classic Sawtooth', product_name: 'Classic Sawtooth Tire', dimensions: '130/90-15', category: 'Sawtooth', status: 'active' },
          { id: '2', sku: 'SAW-15-170/80', brand: 'Red Indian Customs', model: 'Classic Sawtooth', product_name: 'Classic Sawtooth Tire', dimensions: '170/80-15', category: 'Sawtooth', status: 'active' },
          { id: '3', sku: 'END-17-70/90', brand: 'Red Indian Customs', model: 'Enduro Trail', product_name: 'Enduro Trail Tire', dimensions: '70/90-17', category: 'Enduro', status: 'active' },
          { id: '4', sku: 'STD-17-90/90', brand: 'Red Indian Customs', model: 'ST Dual Sport', product_name: 'ST Dual Sport Tire', dimensions: '90/90-17', category: 'Dual Sport', status: 'active' },
          { id: '5', sku: 'MX-18-80/100', brand: 'Red Indian Customs', model: 'MX Motocross', product_name: 'MX Motocross Tire', dimensions: '80/100-18', category: 'Motocross', status: 'active' },
          { id: '6', sku: 'TRL-17-110/80', brand: 'Red Indian Customs', model: 'Trail Master', product_name: 'Trail Master Tire', dimensions: '110/80-17', category: 'Trail', status: 'active' },
        ];
        setProducts(fallbackProducts);
        return;
      }
      
      setProducts(data.products);
    } catch (err) {
      console.error('Product load error:', err);
      setError('Failed to load products');
      setTimeout(() => setError(''), 5000);
    }
  };

  const loadBatches = async () => {
    try {
      const { data } = await api.get('/batches');
      console.log('📦 Loaded batches:', data);
      
      if (data.batches && data.batches.length > 0) {
        console.log(`✅ Successfully loaded ${data.batches.length} batches`);
        console.log('🔍 First batch structure:', data.batches[0]);
        console.log('🔍 First batch products:', data.batches[0]?.products);
        
        // Check if products field exists
        const batchesWithProducts = data.batches.filter(b => b.products);
        const batchesWithoutProducts = data.batches.filter(b => !b.products);
        
        console.log(`✅ Batches with products: ${batchesWithProducts.length}`);
        console.log(`⚠️ Batches without products: ${batchesWithoutProducts.length}`);
        
        if (batchesWithoutProducts.length > 0) {
          console.warn('⚠️ Some batches missing product data:', batchesWithoutProducts);
        }
      } else {
        console.warn('⚠️ No batches found in database');
      }
      
      setBatches(data.batches || []);
    } catch (err) {
      console.error('❌ Error loading batches:', err);
      setBatches([]);
    }
  };

  const loadShipments = async () => {
    try {
      const { data} = await api.get('/shipments?status=RECEIVED');
      setShipments(data.shipments || []);
    } catch (err) {
      console.warn('Could not load shipments:', err);
      setShipments([]);
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

  const loadAllRacksForWarehouse = async (warehouseId) => {
    if (!warehouseId) return;
    
    try {
      console.log('🏭 Loading all racks for warehouse:', warehouseId);
      console.log('🔍 Warehouse ID type:', typeof warehouseId);
      console.log('🔍 Warehouse ID length:', warehouseId.length);
      
      // Add timestamp to bust cache (prevent 304 responses)
      const timestamp = new Date().getTime();
      const url = `/racks?warehouse_id=${warehouseId}&_t=${timestamp}`;
      console.log('🌐 API URL:', url);
      
      const { data } = await api.get(url);
      console.log('✅ Racks API response:', data);
      console.log('📊 Number of racks returned:', data.racks?.length || 0);
      
      if (data.racks && data.racks.length > 0) {
        console.log('📦 First rack details:', data.racks[0]);
      }
      
      setRacks(data.racks || []);
      
      if (!data.racks || data.racks.length === 0) {
        console.warn('⚠️ No racks found for warehouse:', warehouseId);
        console.warn('💡 This means rack_configurations table has no records with this warehouse_id');
        console.warn('💡 Check database: SELECT * FROM rack_configurations WHERE warehouse_id = \'' + warehouseId + '\'');
      }
    } catch (err) {
      console.error('❌ Could not load racks:', err);
      console.error('Error details:', err.response?.data || err.message);
      setRacks([]);
    }
  };

  const loadRacksForProduct = async (productId) => {
    if (!productId || !formData.warehouseId) return;
    
    try {
      // Get product to determine size category
      const product = products.find(p => p.id === productId);
      if (!product) {
        console.warn('Product not found:', productId);
        return;
      }
      
      console.log('🔍 Loading racks for product:', product);
      
      // Use category field, or fallback to 'General' if not available
      const sizeCategory = product.category || product.size_category || 'General';
      
      console.log('📦 Size category:', sizeCategory);
      console.log('🏭 Warehouse ID:', formData.warehouseId);
      
      // Add timestamp to bust cache (prevent 304 responses)
      const timestamp = new Date().getTime();
      const url = `/racks?warehouse_id=${formData.warehouseId}&size_category=${encodeURIComponent(sizeCategory)}&_t=${timestamp}`;
      console.log('🌐 API URL:', url);
      
      const { data } = await api.get(url);
      console.log('✅ Racks response:', data);
      
      if (!data.racks || data.racks.length === 0) {
        console.warn('⚠️ No racks found for category:', sizeCategory);
        console.log('🔄 Falling back to load ALL racks for this warehouse...');
        
        // Fallback: Load all racks for this warehouse
        await loadAllRacksForWarehouse(formData.warehouseId);
      } else {
        setRacks(data.racks || []);
      }
    } catch (err) {
      console.error('❌ Could not load racks:', err);
      console.error('Error details:', err.response?.data || err.message);
      setRacks([]);
    }
  };

  const loadGeneratedBarcodes = async () => {
    setRefreshing(true);
    try {
      // Backend already returns nested data from RPC function
      // NO LIMIT - fetch ALL barcodes
      const { data } = await api.get('/barcodes');
      console.log('🏷️ Loaded barcodes:', data);
      if (data?.barcodes) {
        setGeneratedBarcodes(data.barcodes);
        console.log('📊 Total barcodes loaded:', data.barcodes.length);
        console.log('📊 First barcode sample:', data.barcodes[0]);
        if (data.barcodes[0]) {
          console.log('📊 First barcode structure check:', {
            has_products_key: !!data.barcodes[0].products,
            has_product_key: !!data.barcodes[0].product,
            has_batches_key: !!data.barcodes[0].batches,
            has_batch_key: !!data.barcodes[0].batch,
            product_id: data.barcodes[0].product_id,
            batch_id: data.barcodes[0].batch_id,
            keys: Object.keys(data.barcodes[0])
          });
        }
      }
    } catch (err) {
      console.error('❌ Failed to load barcodes:', err);
    } finally {
      // Keep spinning for at least 600ms for smooth animation
      setTimeout(() => setRefreshing(false), 600);
    }
  };

  const handleGenerateSingle = async (product) => {
    setModalTitle('Batch Mode Required');
    setModalMessage('Please enable Batch Mode and select a batch from the dropdown to generate barcodes.');
    setShowErrorModal(true);
  };

  const handleGenerateBatch = async () => {
    if (!formData.batchId) {
      setModalTitle('Missing Batch');
      setModalMessage('Please select a batch first before generating barcodes.');
      setShowErrorModal(true);
      return;
    }

    if (!formData.productId) {
      setModalTitle('Missing Product');
      setModalMessage('Please select a product first before generating barcodes.');
      setShowErrorModal(true);
      return;
    }

    if (!batchQuantity || batchQuantity < 1) {
      setModalTitle('Invalid Quantity');
      setModalMessage('Please enter a valid quantity (minimum 1).');
      setShowErrorModal(true);
      return;
    }

    // Show progress modal
    setShowProgressModal(true);
    setGenerationProgress(0);
    setGenerationCount(0);
    setLoading(true);

    const totalToGenerate = batchQuantity || 1;
    const startTime = Date.now();

    // Smooth real-time item counter and continuous progress ticker
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      
      // Calculate realistic item progress continuously
      const progressFraction = 1 - Math.exp(-elapsed / 1100);
      const computedItems = Math.min(totalToGenerate - 1, Math.floor(progressFraction * totalToGenerate));
      const computedPct = Math.min(99, Math.round((computedItems / totalToGenerate) * 98) + 1);

      setGenerationCount(prev => Math.max(prev, computedItems));
      setGenerationProgress(prev => Math.max(prev, computedPct));
    }, 40);

    try {
      const requestData = {
        productId: formData.productId,
        batchId: formData.batchId,
        shipmentId: formData.shipmentId,
        quantity: batchQuantity
      };

      // Add warehouse location if provided
      if (formData.warehouseId) {
        requestData.warehouseId = formData.warehouseId;
      }
      if (formData.rackId) {
        requestData.rackId = formData.rackId;
      }
      if (formData.rackLocationId) {
        requestData.rackLocationId = formData.rackLocationId;
      }
      // NEW: Add hierarchical position data
      if (formData.shelfNumber) {
        requestData.shelfNumber = parseInt(formData.shelfNumber);
      }
      if (formData.sectionNumber) {
        requestData.sectionNumber = parseInt(formData.sectionNumber);
      }
      if (formData.subsectionNumber) {
        requestData.subsectionNumber = parseInt(formData.subsectionNumber);
      }
      if (availablePositionCode) {
        requestData.positionCode = availablePositionCode;
      }

      const { data } = await api.post('/barcodes', requestData);

      // Complete progress to 100%
      clearInterval(progressInterval);
      setGenerationProgress(100);

      // Wait a brief moment to show 100% before closing
      await new Promise(resolve => setTimeout(resolve, 400));

      if (data?.barcodes) {
        // Close progress modal
        setShowProgressModal(false);
        
        // Add new barcodes to the beginning of the list (prepend)
        setGeneratedBarcodes(prev => [...data.barcodes, ...prev]);
        setModalTitle('Success!');
        setModalMessage(`Successfully generated ${data.barcodes.length} barcode${data.barcodes.length > 1 ? 's' : ''} and assigned to warehouse location. They are now ready for printing or export.`);
        setShowSuccessModal(true);
        
        // Reset form to initial state for next barcode generation
        setFormData({
          batchId: '',
          productId: '',
          shipmentId: '',
          warehouseId: '',
          warehouseCode: '', // Reset warehouse code
          rackId: '',
          rackLocationId: '',
          shelfNumber: '',
          sectionNumber: '',
          subsectionNumber: ''
        });
        setBatchQuantity(1);
        setRacks([]); // Clear rack list since warehouse was cleared
        setSelectedRackConfig(null);
        setAvailablePositionCode('');
        
        // Reload all barcodes to ensure we have the latest data
        await loadGeneratedBarcodes();
      }
    } catch (err) {
      clearInterval(progressInterval);
      setShowProgressModal(false);
      console.error('Batch generate error:', err);
      setModalTitle('Generation Failed');
      setModalMessage(err.response?.data?.error || 'Failed to generate barcodes. Please try again or contact support.');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Bulk delete handler
  const handleBulkDelete = () => {
    if (selectedBarcodes.length === 0) {
      setModalTitle('No Selection');
      setModalMessage('Please select at least one barcode to delete.');
      setShowErrorModal(true);
      return;
    }

    setModalTitle('Delete Multiple Barcodes');
    setModalMessage(`Are you sure you want to delete ${selectedBarcodes.length} barcode${selectedBarcodes.length > 1 ? 's' : ''}? This action cannot be undone.`);
    setPendingDeleteId('bulk');
    setShowDeleteModal(true);
  };

  const confirmBulkDelete = async () => {
    console.log('🔄 Fast bulk delete for:', selectedBarcodes.length, 'barcodes');
    
    // Close delete confirm modal immediately
    setShowDeleteModal(false);

    // Show delete progress modal
    setShowDeleteProgressModal(true);
    setDeleteProgress(20);

    const totalCount = selectedBarcodes.length;
    const deletedBarcodes = generatedBarcodes.filter(b => selectedBarcodes.includes(b.id));

    // Progress animation for bulk delete
    const progressInterval = setInterval(() => {
      setDeleteProgress(prev => {
        if (prev >= 85) return 85;
        return prev + 15;
      });
    }, 100);

    try {
      // Execute fast batch deletion on backend in 1 request
      await api.post('/barcodes/bulk-delete', { ids: selectedBarcodes });

      clearInterval(progressInterval);
      setDeleteProgress(100);

      // Brief delay to display 100% completion
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Close progress modal
      setShowDeleteProgressModal(false);
      
      // Remove from UI immediately
      setGeneratedBarcodes(prev => prev.filter(b => !selectedBarcodes.includes(b.id)));
      setSelectedBarcodes([]);
      
      console.log('✅ Bulk delete successful');
      setModalTitle('Deleted Successfully');
      setModalMessage(`Successfully deleted ${totalCount} barcode${totalCount > 1 ? 's' : ''}.`);
      setShowSuccessModal(true);
      setPendingDeleteId(null);
    } catch (err) {
      clearInterval(progressInterval);
      console.error('❌ Bulk delete failed:', err);
      
      // Close progress modal
      setShowDeleteProgressModal(false);
      
      // Rollback
      setGeneratedBarcodes(prev => [...deletedBarcodes, ...prev]);
      setModalTitle('Delete Failed');
      setModalMessage(err.response?.data?.error || 'Failed to delete barcodes. Please try again.');
      setShowErrorModal(true);
      setPendingDeleteId(null);
    }
  };

  const handleDeleteBarcode = async (barcodeId) => {
    console.log('🗑️ Delete requested for barcode:', barcodeId);
    setModalTitle('Delete Barcode');
    setModalMessage('Are you sure you want to delete this barcode? This action cannot be undone.');
    setPendingDeleteId(barcodeId);
    setShowDeleteModal(true);
  };

  const confirmDeleteBarcode = async () => {
    if (!pendingDeleteId) {
      console.error('❌ No pending delete ID');
      return;
    }

    if (pendingDeleteId === 'bulk') {
      await confirmBulkDelete();
      return;
    }

    console.log('🔄 Attempting to delete barcode:', pendingDeleteId);

    // Close delete modal immediately for better UX
    setShowDeleteModal(false);

    // Show delete progress modal
    setShowDeleteProgressModal(true);
    setDeleteProgress(0);

    // Simulate progress animation (single item deletes quickly)
    const progressInterval = setInterval(() => {
      setDeleteProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 30;
      });
    }, 100);

    // Optimistic update - remove from UI immediately
    const deletedBarcode = generatedBarcodes.find(b => b.id === pendingDeleteId);
    setGeneratedBarcodes(prev => prev.filter(b => b.id !== pendingDeleteId));

    try {
      await api.delete(`/barcodes/${pendingDeleteId}`);
      
      // Complete progress to 100%
      clearInterval(progressInterval);
      setDeleteProgress(100);
      
      // Wait a moment to show 100% before closing
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('✅ Delete successful');
      
      // Close progress modal
      setShowDeleteProgressModal(false);
      
      // Show success modal
      setModalTitle('Deleted Successfully');
      setModalMessage('Barcode has been permanently deleted.');
      setShowSuccessModal(true);
      setPendingDeleteId(null);
    } catch (err) {
      clearInterval(progressInterval);
      console.error('❌ Delete failed:', err);
      
      // Close progress modal
      setShowDeleteProgressModal(false);
      
      // Rollback - restore the deleted barcode on error
      if (deletedBarcode) {
        setGeneratedBarcodes(prev => [deletedBarcode, ...prev]);
      }
      
      setModalTitle('Delete Failed');
      setModalMessage(err.response?.data?.error || err.response?.data?.message || 'Failed to delete barcode. Please try again.');
      setShowErrorModal(true);
      setPendingDeleteId(null);
    }
  };

  // NEW: Toggle barcode selection
  const toggleBarcodeSelection = (barcodeId) => {
    setSelectedBarcodes(prev => {
      if (prev.includes(barcodeId)) {
        return prev.filter(id => id !== barcodeId);
      } else {
        return [...prev, barcodeId];
      }
    });
  };

  // NEW: Select/deselect all barcodes
  const toggleSelectAll = () => {
    if (selectedBarcodes.length === generatedBarcodes.length) {
      setSelectedBarcodes([]);
    } else {
      setSelectedBarcodes(generatedBarcodes.map(b => b.id));
    }
  };

  // NEW: Toggle folder expand/collapse
  const toggleFolder = (groupKey) => {
    setExpandedFolders(prev => {
      if (prev.includes(groupKey)) {
        return prev.filter(key => key !== groupKey);
      } else {
        return [...prev, groupKey];
      }
    });
  };

  const handlePrintBarcode = (barcode) => {
    const product = barcode.products || {};
    const productName = `${product.brand || 'Unknown'} ${product.model || 'Product'}`.trim();
    const sku = product.sku || 'N/A';
    const batch = barcode.batches?.batch_number || 'N/A';

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcode - ${barcode.barcode_value}</title>
          <meta charset="UTF-8">
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            @page { 
              margin: 0.2in; 
              size: 4in 3.5in;
            }
            html, body { 
              width: 100%;
              height: 100%;
              margin: 0;
              padding: 0;
            }
            body { 
              font-family: 'Segoe UI', Arial, sans-serif; 
              padding: 8px;
              display: flex;
              justify-content: center;
              align-items: center;
              background: #f5f5f5;
            }
            .label { 
              border: 3px solid #000; 
              padding: 12px; 
              width: 3.75in;
              background: white;
              page-break-after: avoid;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              display: flex;
              flex-direction: column;
            }
            .header { 
              font-size: 11px; 
              font-weight: bold; 
              margin-bottom: 6px; 
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 4px;
              letter-spacing: 0.3px;
              color: #000;
              flex-shrink: 0;
            }
            .content-wrapper {
              display: flex;
              gap: 8px;
              align-items: flex-start;
              margin: 6px 0;
              flex-shrink: 0;
            }
            .barcode-section { 
              flex: 1;
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 5px;
              background: #ffffff;
              border: none; /* Remove border */
              border-radius: 0;
            }
            .barcode-container {
              width: 100%;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 65px; /* Increased from 50px */
              margin-bottom: 3px;
            }
            svg#barcode {
              max-width: 100%;
              height: auto;
            }
            .barcode-text { 
              font-family: 'Courier New', monospace; 
              font-size: 10px; 
              font-weight: bold; 
              letter-spacing: 1px; 
              text-align: center;
              color: #000;
              padding: 2px;
              background: transparent; /* Remove background */
              border-radius: 0;
            }
            .qr-section { 
              flex: 0 0 80px; /* Increased from 65px */
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              border-left: 2px solid #e0e0e0;
              padding-left: 8px;
            }
            .qr-section img { 
              width: 80px; /* Increased from 65px */
              height: 80px; /* Increased from 65px */
              border: none; /* Remove border */
              border-radius: 3px;
              background: white;
            }
            .qr-label { 
              font-size: 6px; 
              margin-top: 2px;
              font-weight: bold;
              text-align: center;
              color: #000;
            }
            .info { 
              font-size: 8px; 
              margin-top: 6px; 
              line-height: 1.4;
              border-top: 2px solid #e0e0e0;
              padding-top: 6px;
              color: #000;
              flex-shrink: 0;
            }
            .info-row {
              display: flex;
              margin-bottom: 1px;
            }
            .info-row strong {
              min-width: 70px;
              font-weight: bold;
              color: #000;
            }
            .info-row span {
              flex: 1;
              color: #333;
              font-size: 8px;
            }
            @media print { 
              html, body { 
                width: 100%;
                height: 100%;
                margin: 0; 
                padding: 0;
                background: white;
              } 
              body {
                padding: 0;
              }
              .label { 
                border: 3px solid #000;
                page-break-after: avoid;
                page-break-inside: avoid;
                box-shadow: none;
                margin: 0;
                padding: 12px;
              }
            }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="header">RED INDIAN CUSTOMS - TIRE REGISTRY</div>
            <div class="content-wrapper">
              <div class="barcode-section">
                <div class="barcode-container">
                  <svg id="barcode"></svg>
                </div>
                <div class="barcode-text">${barcode.barcode_value}</div>
              </div>
              ${barcode.qr_code_data ? `
                <div class="qr-section">
                  <img src="${barcode.qr_code_data}" alt="QR Code" />
                  <div class="qr-label">SCAN TO TRACE</div>
                </div>
              ` : ''}
            </div>
            <div class="info">
              <div class="info-row">
                <strong>Product:</strong>
                <span>${productName}</span>
              </div>
              <div class="info-row">
                <strong>SKU:</strong>
                <span>${sku}</span>
              </div>
              <div class="info-row">
                <strong>Batch:</strong>
                <span>${batch}</span>
              </div>
              <div class="info-row">
                <strong>Generated:</strong>
                <span>${new Date(barcode.created_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
          <script>
            // Wait for JsBarcode to load
            function generateBarcode() {
              if (typeof JsBarcode === 'undefined') {
                console.log('Waiting for JsBarcode to load...');
                setTimeout(generateBarcode, 100);
                return;
              }
              
              try {
                console.log('Generating barcode for: ${barcode.barcode_value}');
                JsBarcode("#barcode", "${barcode.barcode_value}", {
                  format: "CODE128",
                  width: 2.5, // Increased width for better scanning (was 1.8)
                  height: 60, // Increased height (was 45)
                  displayValue: false,
                  margin: 0, // Remove margin/border (was 3)
                  background: "#ffffff",
                  lineColor: "#000000",
                  flat: true // Flat rendering for print quality
                });
                console.log('Barcode generated successfully');
                
                // Wait a bit more for rendering, then print
                setTimeout(() => {
                  console.log('Opening print dialog...');
                  window.print();
                }, 800);
              } catch(e) {
                console.error('Barcode generation error:', e);
                alert('Failed to generate barcode. Please check the barcode value.');
              }
            }
            
            // Start generation when page loads
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', generateBarcode);
            } else {
              generateBarcode();
            }
            
            // Close window after printing
            window.onafterprint = () => {
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintAll = () => {
    if (generatedBarcodes.length === 0) return;
    
    const printWindow = window.open('', '_blank');
    const labels = generatedBarcodes.map((barcode, index) => {
      const product = barcode.products || {};
      const productName = `${product.brand || 'Unknown'} ${product.model || 'Product'}`.trim();
      const sku = product.sku || 'N/A';
      const batch = barcode.batches?.batch_number || 'N/A';

      return `
        <div class="label">
          <div class="header">RED INDIAN CUSTOMS - TIRE REGISTRY</div>
          <div class="content-wrapper">
            <div class="barcode-section">
              <div class="barcode-container">
                <svg id="barcode-${index}"></svg>
              </div>
              <div class="barcode-text">${barcode.barcode_value}</div>
            </div>
            ${barcode.qr_code_data ? `
              <div class="qr-section">
                <img src="${barcode.qr_code_data}" alt="QR" />
                <div class="qr-label">SCAN TO TRACE</div>
              </div>
            ` : ''}
          </div>
          <div class="info">
            <div class="info-row">
              <strong>Product:</strong> <span>${productName}</span>
            </div>
            <div class="info-row">
              <strong>SKU:</strong> <span>${sku}</span>
            </div>
            <div class="info-row">
              <strong>Batch:</strong> <span>${batch}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print All Barcodes (${generatedBarcodes.length})</title>
          <meta charset="UTF-8">
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            @page { 
              margin: 0.25in; 
              size: letter;
            }
            body { 
              font-family: 'Segoe UI', Arial, sans-serif; 
              padding: 10px;
              background: #f5f5f5;
              display: flex;
              flex-wrap: wrap; /* Allow wrapping */
              justify-content: space-between; /* Space between columns */
              align-content: flex-start;
            }
            .label { 
              border: 3px solid #000; 
              padding: 12px; 
              width: 48%; /* Two columns with 48% each (2% gap) */
              min-height: 2.25in;
              margin-bottom: 15px; 
              page-break-inside: avoid;
              background: white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              box-sizing: border-box;
            }
            .header { 
              font-size: 12px; 
              font-weight: bold; 
              margin-bottom: 10px; 
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 5px;
              letter-spacing: 0.5px;
              color: #000;
            }
            .content-wrapper {
              display: flex;
              gap: 10px;
              align-items: flex-start;
              margin: 10px 0;
              min-height: 80px;
            }
            .barcode-section { 
              flex: 1;
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 6px;
              background: #ffffff;
              border: none; /* Remove border */
              border-radius: 0;
            }
            .barcode-container {
              width: 100%;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 70px; /* Increased from 55px */
              margin-bottom: 5px;
            }
            svg {
              max-width: 100%;
              height: auto;
            }
            .barcode-text { 
              font-family: 'Courier New', monospace; 
              font-size: 11px; 
              font-weight: bold; 
              letter-spacing: 1.5px; 
              text-align: center; 
              color: #000;
              padding: 3px;
              background: transparent; /* Remove background */
              border-radius: 0;
            }
            .qr-section { 
              flex: 0 0 85px; /* Increased from 75px */
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              border-left: 2px solid #e0e0e0;
              padding-left: 10px;
            }
            .qr-section img { 
              width: 85px; /* Increased from 70px */
              height: 85px; /* Increased from 70px */
              border: none; /* Remove border */
              border-radius: 0;
              background: white;
            }
            .qr-label { 
              font-size: 7px; 
              margin-top: 3px;
              font-weight: bold;
              text-align: center;
              color: #000;
            }
            .info { 
              font-size: 9px; 
              margin-top: 10px;
              border-top: 2px solid #e0e0e0;
              padding-top: 8px;
              line-height: 1.6;
            }
            .info-row {
              display: flex;
              margin-bottom: 2px;
            }
            .info-row strong {
              min-width: 65px;
              font-weight: bold;
              color: #000;
            }
            .info-row span {
              flex: 1;
              color: #333;
            }
            @media print { 
              body { 
                margin: 0; 
                padding: 10px;
                background: white;
                display: flex;
                flex-wrap: wrap; /* Two columns via flex wrap */
                justify-content: space-between;
              }
              .label {
                page-break-inside: avoid;
                box-shadow: none;
                width: 48%; /* 48% width for 2 columns */
                margin-bottom: 15px;
              }
            }
          </style>
        </head>
        <body>
          ${labels}
          <script>
            // Wait for JsBarcode to load
            function generateAllBarcodes() {
              if (typeof JsBarcode === 'undefined') {
                console.log('Waiting for JsBarcode to load...');
                setTimeout(generateAllBarcodes, 100);
                return;
              }
              
              console.log('Generating ${generatedBarcodes.length} barcodes...');
              let successCount = 0;
              
              ${generatedBarcodes.map((barcode, index) => `
                try {
                  JsBarcode("#barcode-${index}", "${barcode.barcode_value}", {
                    format: "CODE128",
                    width: 2.5, // Increased for better scanning
                    height: 65, // Increased from 50
                    displayValue: false,
                    margin: 0, // Remove margin (was 5)
                    background: "#ffffff",
                    lineColor: "#000000",
                    flat: true // Flat rendering for print quality
                  });
                  successCount++;
                } catch(e) {
                  console.error('Barcode ${index} generation error:', e);
                }
              `).join('\n')}
              
              console.log('Successfully generated ' + successCount + ' barcodes');
              
              // Wait for all barcodes to render, then print
              setTimeout(() => {
                console.log('Opening print dialog...');
                window.print();
              }, 1200);
            }
            
            // Start generation when page loads
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', generateAllBarcodes);
            } else {
              generateAllBarcodes();
            }
            
            // Close window after printing
            window.onafterprint = () => {
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExport = () => {
    const csv = [
      ['Barcode', 'Product Name', 'SKU', 'Batch', 'Format', 'Status', 'Generated At'].join(','),
      ...generatedBarcodes.map(b => {
        const product = b.products || {};
        const productName = `${product.brand || 'Unknown'} ${product.model || 'Product'}`.trim();
        return [
          b.barcode_value,
          `"${productName}"`,
          product.sku || 'N/A',
          b.batches?.batch_number || 'N/A',
          b.barcode_type || 'CODE128',
          b.status,
          new Date(b.created_at).toLocaleString()
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `barcodes-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const toggleProductSelection = (product) => {
    setSelectedProducts(prev => {
      const exists = prev.find(p => p.id === product.id);
      return exists ? prev.filter(p => p.id !== product.id) : [...prev, product];
    });
  };

  const filteredProducts = products.filter(p => {
    const searchLower = searchTerm.toLowerCase();
    const productName = p.model && p.brand ? `${p.brand} ${p.model}` : (p.name || p.product_name || '');
    return productName.toLowerCase().includes(searchLower) ||
           (p.sku || '').toLowerCase().includes(searchLower) ||
           (p.dimensions || '').toLowerCase().includes(searchLower);
  });

  const viewTraceability = async (barcode) => {
    setSelectedBarcodeForTrace(barcode);
    setShowTraceabilityPanel(true);
    setLoadingTrace(true);
    
    try {
      // Use the correct endpoint that matches the backend route
      const { data } = await api.get(`/barcodes/trace/${barcode.barcode_value}`);
      
      // The backend returns { success: true, traceability: {...} }
      if (data?.success && data?.traceability) {
        setTraceabilityData(data.traceability);
      } else {
        setTraceabilityData({
          error: true,
          message: 'No traceability data found'
        });
      }
    } catch (err) {
      console.error('Failed to load traceability:', err);
      setTraceabilityData({
        error: true,
        message: err.response?.data?.error || 'Failed to load traceability data'
      });
    } finally {
      setLoadingTrace(false);
    }
  };

  // NEW: Group barcodes by product for better organization
  const groupedBarcodes = generatedBarcodes.reduce((acc, barcode) => {
    // Handle both nested object and null values from backend
    const product = barcode.products || {};
    const batch = barcode.batches || {};
    
    // Debug logging (can be removed after verification)
    if (generatedBarcodes.indexOf(barcode) === 0) {
      console.log('🔍 First barcode structure:', {
        id: barcode.id,
        product_id: barcode.product_id,
        batch_id: barcode.batch_id,
        products: barcode.products,
        batches: barcode.batches
      });
    }
    
    // Create a unique key for each product-batch combination
    const productId = product.id || barcode.product_id || 'unknown';
    const batchId = batch.id || barcode.batch_id || 'unknown';
    const groupKey = `${productId}_${batchId}`;
    
    // Generate proper group name with all required fields
    const brandName = product.brand || 'Unknown Brand';
    const modelName = product.model || 'Unknown Model';
    const skuValue = product.sku || 'N/A';
    const batchNumber = batch.batch_number || 'N/A';
    
    const groupName = productId !== 'unknown'
      ? `${brandName} ${modelName} - SKU: ${skuValue} | Batch: ${batchNumber}`
      : 'Unassigned Barcodes';
    
    if (!acc[groupKey]) {
      acc[groupKey] = {
        key: groupKey, // NEW: Store the key for folder toggling
        name: groupName,
        product: product,
        batch: batch,
        barcodes: []
      };
    }
    
    acc[groupKey].barcodes.push(barcode);
    return acc;
  }, {});

  const groupedBarcodesArray = Object.values(groupedBarcodes);
  
  // Console log for debugging (can be removed after verification)
  console.log('📁 Grouped barcodes:', {
    totalBarcodes: generatedBarcodes.length,
    groupCount: groupedBarcodesArray.length,
    groups: groupedBarcodesArray.map(g => ({ 
      name: g.name, 
      count: g.barcodes.length,
      hasProduct: !!g.product.id,
      hasBatch: !!g.batch.id
    }))
  });

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 -m-6 p-4">
      {/* Initial Loading State */}
      {initialLoading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-xl p-8 max-w-md"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <ScanBarcode className="w-10 h-10 text-white animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">Loading Barcode System</h2>
              <div className="space-y-2 text-sm text-slate-600 mb-6">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <span>Loading products...</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <span>Loading batches...</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  <span>Loading generated barcodes...</span>
                </div>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 2, ease: 'easeInOut' }}
                  className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"
                />
              </div>
            </motion.div>
          </div>
        </div>
      ) : (
        <>
      {/* Header */}
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 mb-2">
              <ScanBarcode className="w-3 h-3" />
              OPERATIONAL STAFF
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 bg-clip-text text-transparent tracking-tight">
              Barcode & QR Generation
            </h1>
            <div className="text-slate-600 text-xs flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
              Generate unique barcodes with QR codes for full traceability
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setBatchMode(!batchMode)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${
                batchMode
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/40'
                  : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-amber-400'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              {batchMode ? 'Batch: ON' : 'Batch'}
            </button>
            <button
              onClick={loadGeneratedBarcodes}
              disabled={refreshing}
              className={`p-1.5 rounded-lg bg-white border-2 border-slate-200 transition-all duration-300 ${
                refreshing 
                  ? 'text-blue-600 border-blue-400 cursor-wait' 
                  : 'text-slate-700 hover:border-blue-400 hover:text-blue-600 active:scale-95'
              }`}
              title="Refresh barcodes"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Premium Modals */}
      <PremiumModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        type="success"
        title={modalTitle}
        message={modalMessage}
      />

      <PremiumModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        type="error"
        title={modalTitle}
        message={modalMessage}
      />

      <PremiumModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setPendingDeleteId(null);
        }}
        type="delete"
        title={modalTitle}
        message={modalMessage}
        onConfirm={confirmDeleteBarcode}
        confirmText="Delete"
        cancelText="Cancel"
      />

      {/* Progress Modal */}
      <AnimatePresence>
        {showProgressModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative overflow-hidden"
            >
              {/* Animated Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 opacity-50"></div>
              
              {/* Content */}
              <div className="relative z-10">
                {/* Icon */}
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                    <ScanBarcode className={`w-10 h-10 text-white ${generationProgress < 100 ? 'animate-pulse' : ''}`} />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-center text-slate-900 mb-2">
                  Generating Barcodes
                </h3>
                <p className="text-center text-slate-600 mb-6">
                  Please wait while we generate {batchQuantity} barcode{batchQuantity > 1 ? 's' : ''}...
                </p>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
                      Created: <span className="text-blue-700 font-extrabold text-sm">{generationCount}</span> / {batchQuantity}
                    </span>
                    <span className="text-lg font-black text-blue-600">{generationProgress}%</span>
                  </div>
                  <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${generationProgress}%` }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full relative overflow-hidden"
                    >
                      {/* Shimmer effect */}
                      <div 
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                        style={{
                          animation: 'shimmer 1.5s infinite',
                          backgroundSize: '200% 100%'
                        }}
                      ></div>
                    </motion.div>
                  </div>
                </div>

                {/* Real-time Status Messages */}
                <div className="text-center">
                  {generationProgress < 100 ? (
                    <p className="text-sm text-slate-700 font-medium animate-pulse">
                      🏷️ Creating barcode <span className="font-bold text-blue-600">{generationCount}</span> of <span className="font-bold text-slate-900">{batchQuantity}</span>...
                    </p>
                  ) : (
                    <p className="text-sm text-emerald-600 font-bold">
                      ✨ All {batchQuantity} barcodes generated successfully!
                    </p>
                  )}
                </div>

                {/* Loading Dots */}
                {generationProgress < 100 && (
                  <div className="flex justify-center gap-2 mt-6">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                )}
              </div>

              {/* Inline shimmer animation */}
              <style>{`
                @keyframes shimmer {
                  0% { background-position: -200% 0; }
                  100% { background-position: 200% 0; }
                }
              `}</style>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Progress Modal */}
      <AnimatePresence>
        {showDeleteProgressModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative overflow-hidden"
            >
              {/* Animated Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-orange-50 to-red-50 opacity-50"></div>
              
              {/* Content */}
              <div className="relative z-10">
                {/* Icon */}
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
                    <Trash2 className={`w-10 h-10 text-white ${deleteProgress < 100 ? 'animate-pulse' : ''}`} />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-center text-slate-900 mb-2">
                  Deleting Barcodes
                </h3>
                <p className="text-center text-slate-600 mb-6">
                  {pendingDeleteId === 'bulk' 
                    ? `Please wait while we delete ${selectedBarcodes.length} barcode${selectedBarcodes.length > 1 ? 's' : ''}...`
                    : 'Please wait while we delete this barcode...'
                  }
                </p>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-slate-700">Progress</span>
                    <span className="text-lg font-bold text-red-600">{deleteProgress}%</span>
                  </div>
                  <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${deleteProgress}%` }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-red-500 via-orange-500 to-red-600 rounded-full relative overflow-hidden"
                    >
                      {/* Shimmer effect */}
                      <div 
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                        style={{
                          animation: 'shimmer 2s infinite',
                          backgroundSize: '200% 100%'
                        }}
                      ></div>
                    </motion.div>
                  </div>
                </div>

                {/* Status Messages */}
                <div className="text-center">
                  {deleteProgress < 30 && (
                    <p className="text-sm text-slate-600 animate-pulse">
                      🗑️ Preparing to delete...
                    </p>
                  )}
                  {deleteProgress >= 30 && deleteProgress < 70 && (
                    <p className="text-sm text-slate-600 animate-pulse">
                      🔄 Removing barcodes from database...
                    </p>
                  )}
                  {deleteProgress >= 70 && deleteProgress < 100 && (
                    <p className="text-sm text-slate-600 animate-pulse">
                      ✅ Finalizing deletion...
                    </p>
                  )}
                  {deleteProgress === 100 && (
                    <p className="text-sm text-green-600 font-semibold">
                      ✨ Complete! Barcodes deleted successfully.
                    </p>
                  )}
                </div>

                {/* Loading Dots */}
                {deleteProgress < 100 && (
                  <div className="flex justify-center gap-2 mt-6">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                )}
              </div>

              {/* Inline shimmer animation */}
              <style>{`
                @keyframes shimmer {
                  0% { background-position: -200% 0; }
                  100% { background-position: 200% 0; }
                }
              `}</style>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Product Selection */}
        <div className="space-y-3">
          <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                  <Package className="w-4 h-4 text-white" />
                </div>
                Select Products
              </h2>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all bg-slate-50/50"
              />
            </div>

            {/* Batch Controls */}
            {batchMode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-3 p-3 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 shadow-sm space-y-3"
              >
                {/* Batch Selector */}
                <div>
                  <label className="text-xs font-bold text-amber-900 block mb-1.5">
                    Select Batch *
                  </label>
                  <select
                    value={formData.batchId}
                    onChange={(e) => {
                      const batchId = e.target.value;
                      const batch = batches.find(b => b.id === batchId);
                      
                      if (batch) {
                        const shipmentProducts = batch.shipments?.product_breakdown || [];
                        
                        // Calculate total quantity from all products
                        const totalQuantity = shipmentProducts.reduce((sum, product) => {
                          return sum + (parseInt(product.quantity) || 0);
                        }, 0);
                        
                        // Auto-select first product if available
                        let selectedProductId = batch.product_id || '';
                        
                        // If no direct product_id but has shipment products, try to match first one
                        if (!selectedProductId && shipmentProducts.length > 0) {
                          const firstProduct = shipmentProducts[0];
                          const matchingProduct = products.find(p => {
                            const sizeDimMatch = p.dimensions === (firstProduct.dimensions || firstProduct.size);
                            const catMatch = p.category?.toLowerCase() === firstProduct.category?.toLowerCase();
                            return sizeDimMatch || (catMatch && p.dimensions?.includes(firstProduct.size));
                          });
                          selectedProductId = matchingProduct?.id || '';
                        }
                        
                        // Auto-detect warehouse and rack from assigned positions
                        let warehouseId = '';
                        let warehouseCode = ''; // NEW: Extract warehouse code
                        let rackId = '';
                        let rackCode = '';
                        let rackDesignatedSize = '';
                        
                        console.log('🔍 Shipment Products:', shipmentProducts);
                        console.log('🔍 First Product Assigned Positions:', shipmentProducts[0]?.assigned_positions);
                        
                        if (shipmentProducts.length > 0 && shipmentProducts[0].assigned_positions?.length > 0) {
                          const firstPosition = shipmentProducts[0].assigned_positions[0];
                          // Extract from position_code (e.g., "WH1-R05-RK05-S01-SH05-SUB01")
                          const positionCode = firstPosition.position_code || '';
                          
                          console.log('🔍 Position Code to Parse:', positionCode);
                          
                          // Extract warehouse
                          const warehouseCodeMatch = positionCode.match(/^(WH\d+)/);
                          if (warehouseCodeMatch) {
                            warehouseCode = warehouseCodeMatch[1]; // Store the warehouse code (e.g., "WH1")
                            const warehouse = warehouses.find(w => w.code === warehouseCode);
                            if (warehouse) {
                              warehouseId = warehouse.id;
                            }
                          }
                          
                          // Extract rack (format: WH1-RCS-RK01 or WH1-RACK-1 or WH1-R05)
                          // Match any alphanumeric code after WH\d+-
                          const rackCodeMatch = positionCode.match(/^WH\d+-([A-Z0-9]+(?:-[A-Z0-9]+)?)-/);
                          if (rackCodeMatch && warehouseCodeMatch) {
                            const extractedRackCode = rackCodeMatch[1];
                            // Full rack code is WH + extracted part
                            rackCode = `${warehouseCodeMatch[1]}-${extractedRackCode}`;
                            
                            console.log('🔍 Extracted Rack Code:', rackCode, 'from position:', positionCode);
                            
                            // Try to find rack in racks array (if loaded)
                            const rack = racks.find(r => r.rack_code === rackCode);
                            if (rack) {
                              rackId = rack.id;
                              rackDesignatedSize = rack.designated_size;
                              console.log('✅ Found rack in database:', rack);
                            } else {
                              console.log('⚠️ Rack not in database, trying fallback mapping');
                              // Fallback: use hardcoded mapping
                              const rackMapping = {
                                'WH1-RACK-1': { id: 'RACK-1', designated_size: '90/90-18' },
                                'WH1-RACK-2': { id: 'RACK-2', designated_size: '100/90-17' },
                                'WH1-RACK-3': { id: 'RACK-3', designated_size: '110/90-17' },
                                'WH1-RACK-4': { id: 'RACK-4', designated_size: '120/80-17' },
                                'WH1-RACK-5': { id: 'RACK-5', designated_size: 'General' },
                                'WH1-RCS': { id: 'RCS', designated_size: 'Enduro 80/90-18' }
                              };
                              const mappedRack = rackMapping[rackCode];
                              if (mappedRack) {
                                rackId = mappedRack.id;
                                rackDesignatedSize = mappedRack.designated_size;
                                console.log('✅ Found rack in fallback mapping:', mappedRack);
                              } else {
                                console.log('❌ Rack not found in mapping:', rackCode);
                              }
                            }
                          } else {
                            console.log('❌ Could not extract rack code from:', positionCode);
                          }
                        }
                        
                        setFormData({
                          ...formData,
                          batchId: batchId,
                          productId: selectedProductId,
                          shipmentId: batch.shipment_id || '',
                          warehouseId: warehouseId,
                          warehouseCode: warehouseCode, // NEW: Store warehouse code
                          rackId: rackId,
                          rackCode: rackCode,
                          rackDesignatedSize: rackDesignatedSize,
                          rackLocationId: '',
                          shelfNumber: '',
                          sectionNumber: '',
                          subsectionNumber: ''
                        });
                        
                        // Set batch quantity to total from all products
                        setBatchQuantity(totalQuantity > 0 ? totalQuantity : 1);
                        
                        // Load racks if warehouse detected
                        if (warehouseId) {
                          loadAllRacksForWarehouse(warehouseId);
                        }
                        
                        // Set rack config if rack is detected
                        if (rackId) {
                          const hardcodedRacks = {
                            'RACK-1': {
                              id: 'RACK-1',
                              rack_code: 'WH1-RACK-1',
                              designated_size: '90/90-18',
                              total_shelves: 4,
                              sections_per_shelf: 5,
                              subsections_per_section: 2,
                              capacity_per_subsection: 15,
                              total_capacity: 600
                            },
                            'RACK-2': {
                              id: 'RACK-2',
                              rack_code: 'WH1-RACK-2',
                              designated_size: '100/90-17',
                              total_shelves: 4,
                              sections_per_shelf: 5,
                              subsections_per_section: 2,
                              capacity_per_subsection: 15,
                              total_capacity: 600
                            },
                            'RACK-3': {
                              id: 'RACK-3',
                              rack_code: 'WH1-RACK-3',
                              designated_size: '110/90-17',
                              total_shelves: 4,
                              sections_per_shelf: 5,
                              subsections_per_section: 2,
                              capacity_per_subsection: 15,
                              total_capacity: 600
                            },
                            'RACK-4': {
                              id: 'RACK-4',
                              rack_code: 'WH1-RACK-4',
                              designated_size: '120/80-17',
                              total_shelves: 4,
                              sections_per_shelf: 4,
                              subsections_per_section: 2,
                              capacity_per_subsection: 15,
                              total_capacity: 480
                            },
                            'RACK-5': {
                              id: 'RACK-5',
                              rack_code: 'WH1-RACK-5',
                              designated_size: 'General',
                              total_shelves: 5,
                              sections_per_shelf: 6,
                              subsections_per_section: 2,
                              capacity_per_subsection: 15,
                              total_capacity: 900
                            },
                            'RCS': {
                              id: 'RCS',
                              rack_code: 'WH1-RCS',
                              designated_size: 'Enduro 80/90-18',
                              total_shelves: 5,
                              sections_per_shelf: 6,
                              subsections_per_section: 2,
                              capacity_per_subsection: 15,
                              total_capacity: 900
                            }
                          };
                          
                          setSelectedRackConfig(hardcodedRacks[rackId] || null);
                        } else {
                          setSelectedRackConfig(null);
                        }
                      } else {
                        setFormData({
                          ...formData,
                          batchId: '',
                          productId: '',
                          shipmentId: '',
                          warehouseId: '',
                          warehouseCode: '', // Reset warehouse code
                          rackId: '',
                          rackCode: '',
                          rackDesignatedSize: '',
                          rackLocationId: '',
                          shelfNumber: '',
                          sectionNumber: '',
                          subsectionNumber: ''
                        });
                        setBatchQuantity(1);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-amber-200 text-xs focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none cursor-pointer bg-white"
                  >
                    <option value="" disabled>Choose a batch...</option>
                    {batches.map(batch => {
                      const product = batch.products;
                      let productInfo;
                      
                      if (product) {
                        // Batch has a single assigned product
                        productInfo = `${product.brand || 'Unknown'} ${product.model || 'Product'} - ${product.sku || ''}`;
                      } else if (batch.shipments?.product_breakdown?.length > 0) {
                        // Batch has multiple products in shipment
                        const productCount = batch.shipments.product_breakdown.length;
                        productInfo = `${productCount} Products in Shipment (${batch.shipments.shipment_number})`;
                      } else {
                        productInfo = 'No Product Info';
                      }
                      
                      return (
                        <option key={batch.id} value={batch.id}>
                          {batch.batch_number} | {productInfo} ({batch.batch_month}/{batch.batch_year})
                        </option>
                      );
                    })}
                  </select>
                  {batches.length === 0 && !initialLoading && (
                    <p className="mt-1 text-xs text-amber-700">
                      No active batches. Create a batch in Batch Management first.
                    </p>
                  )}
                </div>

                {/* Product Display - Enhanced with Category, Size, and Assigned Positions */}
                {formData.batchId && (() => {
                  const batch = batches.find(b => b.id === formData.batchId);
                  const product = batch?.products;
                  const shipmentProducts = batch?.shipments?.product_breakdown;
                  
                  console.log('🔍 Batch selected for barcode generation:', batch);
                  console.log('🔍 Products field:', product);
                  console.log('🔍 Shipment products field:', shipmentProducts);
                  
                  // Case 1: Batch has a single assigned product
                  if (product) {
                    return (
                      <div>
                        <label className="text-xs font-bold text-amber-900 block mb-1.5 flex items-center gap-1">
                          <Package className="w-3.5 h-3.5" />
                          Product Details (Auto-filled from Batch)
                        </label>
                        <div className="px-3 py-3 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-300 shadow-sm space-y-3">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="font-semibold text-emerald-800">SKU:</span>
                              <p className="text-slate-700 font-mono mt-0.5">{product.sku || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="font-semibold text-emerald-800">Brand:</span>
                              <p className="text-slate-700 mt-0.5">{product.brand || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="font-semibold text-emerald-800">Model:</span>
                              <p className="text-slate-700 mt-0.5">{product.model || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="font-semibold text-emerald-800">Dimensions:</span>
                              <p className="text-slate-700 mt-0.5">{product.dimensions || 'N/A'}</p>
                            </div>
                            {product.category && (
                              <div className="col-span-2">
                                <span className="font-semibold text-emerald-800">Category:</span>
                                <p className="text-slate-700 mt-0.5">{product.category}</p>
                              </div>
                            )}
                          </div>
                          <div className="mt-2 pt-2 border-t border-emerald-200 flex items-center gap-1 text-[10px] text-emerald-700">
                            <CheckCircle2 className="w-3 h-3" />
                            <span className="font-medium">Product automatically selected from batch</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  // Case 2: Batch has multiple products from shipment with full details
                  if (shipmentProducts && shipmentProducts.length > 0) {
                    // Count total assigned positions across all products
                    const totalPositions = shipmentProducts.reduce((sum, item) => {
                      return sum + (item.assigned_positions?.length || 0);
                    }, 0);
                    
                    const productsWithPositions = shipmentProducts.filter(item => 
                      item.assigned_positions && item.assigned_positions.length > 0
                    ).length;
                    
                    console.log(`✅ Detected ${productsWithPositions}/${shipmentProducts.length} products with positions (${totalPositions} total)`);
                    
                    return (
                      <div className="space-y-3">
                        <label className="text-xs font-bold text-amber-900 block flex items-center gap-1">
                          <Package className="w-3.5 h-3.5" />
                          Products in Shipment
                        </label>
                        
                        {/* Position Detection Summary - NEW */}
                        {totalPositions > 0 && (
                          <div className="p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300">
                            <div className="flex items-center gap-2 mb-2">
                              <MapPin className="w-4 h-4 text-blue-600" />
                              <span className="text-xs font-bold text-blue-900">Assigned Positions Detected</span>
                              <span className="ml-auto px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                                ✓ Ready for Barcodes
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="bg-white rounded-lg p-2 border border-blue-200 text-center">
                                <p className="text-[9px] font-bold text-blue-600 uppercase">Products</p>
                                <p className="text-xl font-black text-blue-900">{productsWithPositions}</p>
                              </div>
                              <div className="bg-white rounded-lg p-2 border border-blue-200 text-center">
                                <p className="text-[9px] font-bold text-blue-600 uppercase">Positions</p>
                                <p className="text-xl font-black text-blue-900">{totalPositions}</p>
                              </div>
                              <div className="bg-white rounded-lg p-2 border border-blue-200 text-center">
                                <p className="text-[9px] font-bold text-blue-600 uppercase">Warehouse</p>
                                <p className="text-sm font-black text-blue-900">{formData.warehouseCode || 'N/A'}</p>
                              </div>
                            </div>
                            <div className="mt-2 flex items-center gap-1 text-[10px] text-blue-700">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="font-medium">Each barcode will include its exact storage position</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Product Cards - Show all products with details */}
                        <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                          {shipmentProducts.map((item, idx) => {
                            // Support both legacy (category/size) and new format (brand/model/dimensions)
                            const displayName = item.product_name || `${item.brand || ''} ${item.model || ''}`.trim() || item.category || 'Unknown Product';
                            const displaySize = item.dimensions || item.size || 'N/A';
                            const hasPositions = item.assigned_positions && item.assigned_positions.length > 0;
                            
                            return (
                              <div 
                                key={idx}
                                className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 hover:border-blue-400 transition-all"
                              >
                                {/* Product Header */}
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="text-sm font-bold text-slate-900 mb-1">{displayName}</div>
                                    {item.brand && item.model && (
                                      <div className="flex items-center gap-2 text-[10px] mb-1">
                                        <span className="font-semibold text-blue-700">Brand:</span>
                                        <span className="text-slate-700">{item.brand}</span>
                                        <span className="text-slate-300">|</span>
                                        <span className="font-semibold text-blue-700">Model:</span>
                                        <span className="text-slate-700">{item.model}</span>
                                      </div>
                                    )}
                                  </div>
                                  <span className="px-2 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold">
                                    {item.quantity} pcs
                                  </span>
                                </div>

                                {/* Category & Size/Dimensions */}
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                  {item.category && (
                                    <div className="px-2 py-1.5 rounded bg-white border border-blue-200">
                                      <span className="text-[9px] font-semibold text-blue-700 block">Category</span>
                                      <span className="text-xs font-bold text-slate-900">{item.category}</span>
                                    </div>
                                  )}
                                  <div className="px-2 py-1.5 rounded bg-white border border-blue-200">
                                    <span className="text-[9px] font-semibold text-blue-700 block">Size/Dimensions</span>
                                    <span className="text-xs font-bold text-slate-900">{displaySize}</span>
                                  </div>
                                </div>

                                {/* SKU */}
                                {item.sku && (
                                  <div className="mb-2 px-2 py-1.5 rounded bg-slate-50 border border-slate-200">
                                    <span className="text-[9px] font-semibold text-slate-600 block">SKU</span>
                                    <span className="text-xs font-mono font-bold text-slate-900">{item.sku}</span>
                                  </div>
                                )}

                                {/* Assigned Positions - ENHANCED */}
                                {hasPositions && (
                                  <div className="mt-2 pt-2 border-t border-blue-200">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                      <MapPin className="w-3 h-3 text-blue-600" />
                                      <span className="text-[10px] font-bold text-blue-900 uppercase">
                                        {item.assigned_positions.length} Assigned Position{item.assigned_positions.length !== 1 ? 's' : ''}
                                      </span>
                                      <span className="ml-auto px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold">
                                        ✓ Will be in barcodes
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {item.assigned_positions.slice(0, 3).map((pos, posIdx) => (
                                        <span 
                                          key={posIdx}
                                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-blue-300 text-[10px] font-bold text-blue-700"
                                        >
                                          <MapPin className="w-2.5 h-2.5" />
                                          {pos.position_code} ×{pos.quantity}
                                        </span>
                                      ))}
                                      {item.assigned_positions.length > 3 && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-[10px] font-bold text-blue-700">
                                          +{item.assigned_positions.length - 3} more
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {/* No Positions Warning */}
                                {!hasPositions && (
                                  <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-1.5 text-[10px] text-amber-800">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>⚠️ No positions assigned - barcodes will not have location data</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Shipment Summary */}
                        <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                          <p className="text-[10px] text-amber-800">
                            📦 <strong>{shipmentProducts.length} product{shipmentProducts.length !== 1 ? 's' : ''}</strong> in shipment {batch?.shipments?.shipment_number}
                          </p>
                        </div>

                        {/* Product Selector for Barcode Generation - REMOVED, auto-selected above */}
                      </div>
                    );
                  }
                  
                  // Case 3: No product information at all
                  return (
                    <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span>⚠️ No product information available for this batch</span>
                    </div>
                  );
                })()}




                {/* Generate Button */}
                <button
                  type="button"
                  onClick={handleGenerateBatch}
                  disabled={
                    loading || 
                    !formData.batchId || 
                    batchQuantity < 1
                  }
                  className="w-full px-3 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <ScanBarcode className="w-3.5 h-3.5" />
                      Generate {batchQuantity} Barcode{batchQuantity > 1 ? 's' : ''}
                    </>
                  )}
                </button>

                {/* Validation Helper Text */}
                {formData.batchId && batchQuantity < 1 && (
                  <div className="text-[10px] text-amber-700 flex items-start gap-1 mt-1">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    <div>⚠️ Quantity must be at least 1</div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Product List */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold">No products found</p>
                </div>
              ) : (
                filteredProducts.map(product => (
                  <div
                    key={product.id}
                    className="p-2.5 rounded-lg border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-slate-900 block truncate">
                          {product.brand && product.model ? `${product.brand} ${product.model}` : (product.name || product.product_name)}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono font-semibold text-[10px]">
                            {product.sku}
                          </span>
                          {product.dimensions && (
                            <span className="text-[10px]">{product.dimensions}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Generated Barcodes */}
        <div className="space-y-3">
          <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
                  <Barcode className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold">Generated Barcodes</div>
                  <div className="text-[10px] text-slate-500">{generatedBarcodes.length} items</div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* NEW: Bulk Actions */}
                {selectedBarcodes.length > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    className="p-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-all text-[10px] font-bold flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete ({selectedBarcodes.length})
                  </button>
                )}
                <button onClick={handlePrintAll} className="p-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100" title="Print All">
                  <Printer className="w-3 h-3" />
                </button>
                <button onClick={handleExport} className="p-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 hover:bg-green-100" title="Export CSV">
                  <Download className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* NEW: Select All Checkbox */}
            {generatedBarcodes.length > 0 && (
              <div className="mb-2 pb-2 border-b border-slate-200">
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer hover:text-slate-900">
                  <input
                    type="checkbox"
                    checked={selectedBarcodes.length === generatedBarcodes.length}
                    onChange={toggleSelectAll}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
                  />
                  <span className="font-medium">Select All ({generatedBarcodes.length})</span>
                </label>
              </div>
            )}

            {/* Barcode List - Grouped by Product (Folder Style) */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
              {generatedBarcodes.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  <QrCode className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="font-semibold">No barcodes generated yet</p>
                  <p className="text-[10px] mt-1">Select a batch and generate barcodes</p>
                </div>
              ) : (
                groupedBarcodesArray.map((group, groupIndex) => {
                  const allSelected = group.barcodes.every(b => selectedBarcodes.includes(b.id));
                  const someSelected = group.barcodes.some(b => selectedBarcodes.includes(b.id));
                  const isExpanded = expandedFolders.includes(group.key);
                  
                  return (
                    <div key={`group-${groupIndex}`} className="rounded-lg border border-slate-200 bg-gradient-to-br from-white to-slate-50 overflow-hidden">
                      {/* Folder Header - Clickable - ENHANCED: Show full text */}
                      <div 
                        className="p-3 bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-200 flex items-start justify-between cursor-pointer hover:from-slate-150 hover:to-slate-100 transition-colors"
                        onClick={() => toggleFolder(group.key)}
                      >
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          {/* Expand/Collapse Icon */}
                          <button 
                            className="p-0.5 hover:bg-slate-200 rounded transition-colors mt-0.5 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFolder(group.key);
                            }}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-600" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-600" />
                            )}
                          </button>
                          
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={input => {
                              if (input) input.indeterminate = someSelected && !allSelected;
                            }}
                            onChange={(e) => {
                              e.stopPropagation();
                              if (allSelected) {
                                // Deselect all in this group
                                setSelectedBarcodes(prev => prev.filter(id => !group.barcodes.find(b => b.id === id)));
                              } else {
                                // Select all in this group
                                setSelectedBarcodes(prev => [...new Set([...prev, ...group.barcodes.map(b => b.id)])]);
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 cursor-pointer mt-0.5 flex-shrink-0"
                            title={allSelected ? "Deselect all in folder" : "Select all in folder"}
                          />
                          <Package className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            {/* Multi-line folder name - NO truncation */}
                            <div className="text-xs font-bold text-slate-900 break-words">{group.name}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{group.barcodes.length} barcode{group.barcodes.length > 1 ? 's' : ''}</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-1 ml-2 flex-shrink-0 mt-0.5">
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                            {group.barcodes.length}
                          </span>
                        </div>
                      </div>

                      {/* Barcodes in this folder - Only show when expanded */}
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="divide-y divide-slate-100"
                        >
                        {group.barcodes.map((barcode) => {
                          const product = barcode.products || group.product || {};
                          const batch = barcode.batches || group.batch || {};
                          const productName = `${product.brand || 'Unknown'} ${product.model || 'Product'}`.trim();
                          const sku = product.sku || 'N/A';
                          const batchNumber = batch.batch_number || 'N/A';

                          return (
                            <div
                              key={barcode.id}
                              className={`p-2 transition-all ${
                                selectedBarcodes.includes(barcode.id)
                                  ? 'bg-blue-50'
                                  : 'bg-white hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <input
                                  type="checkbox"
                                  checked={selectedBarcodes.includes(barcode.id)}
                                  onChange={() => toggleBarcodeSelection(barcode.id)}
                                  className="mt-1 h-3.5 w-3.5 rounded border-slate-300 text-blue-600 cursor-pointer"
                                />

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-bold text-slate-900 font-mono truncate">{barcode.barcode_value}</div>
                                      <div className="text-[10px] text-slate-600 truncate">{productName}</div>
                                    </div>
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                      barcode.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {barcode.status}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1 mb-2">
                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[9px] font-semibold text-slate-700">SKU: {sku}</span>
                                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-[9px] font-semibold text-blue-700">Batch: {batchNumber}</span>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handlePrintBarcode(barcode)}
                                      className="p-1 rounded bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-all"
                                      title="Print"
                                    >
                                      <Printer className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => viewTraceability(barcode)}
                                      className="p-1 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-all"
                                      title="View Traceability"
                                    >
                                      <Eye className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(barcode.barcode_value);
                                        setSuccess('Copied!');
                                        setTimeout(() => setSuccess(''), 2000);
                                      }}
                                      className="p-1 rounded bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition-all"
                                      title="Copy"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteBarcode(barcode.id)}
                                      className="p-1 rounded bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-all ml-auto"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        </motion.div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Traceability Modal - Centered & Compact */}
      <AnimatePresence>
        {showTraceabilityPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowTraceabilityPanel(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4"
          >
            {/* Modal - Centered & Compact */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Modal Header - Compact */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Barcode Traceability</h2>
                    <p className="text-indigo-100 text-xs">
                      {selectedBarcodeForTrace?.barcode_value || 'Loading...'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTraceabilityPanel(false)}
                  className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content - Compact */}
              <div className="flex-1 overflow-y-auto p-4">
                {loadingTrace ? (
                  <div className="flex items-center justify-center h-full min-h-[300px]">
                    <div className="text-center">
                      <RefreshCw className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-3" />
                      <p className="text-slate-600 text-sm">Loading traceability data...</p>
                    </div>
                  </div>
                ) : traceabilityData?.error ? (
                  <div className="flex items-center justify-center h-full min-h-[300px]">
                    <div className="text-center max-w-md px-4">
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Barcode Not Found</h3>
                      <p className="text-slate-600 text-sm mb-3">{traceabilityData.message}</p>
                      <div className="bg-slate-100 rounded-lg p-3 mb-4">
                        <p className="text-xs text-slate-500 mb-1">Barcode searched:</p>
                        <p className="font-mono font-bold text-slate-900 text-sm">{selectedBarcodeForTrace?.barcode_value}</p>
                      </div>
                      <div className="text-left bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <p className="text-xs font-semibold text-blue-900 mb-1.5">💡 Possible Reasons:</p>
                        <ul className="text-xs text-blue-800 space-y-1 ml-4">
                          <li className="list-disc">This is an old test barcode that was deleted</li>
                          <li className="list-disc">The barcode hasn't been generated yet</li>
                          <li className="list-disc">There was a typo in the barcode value</li>
                        </ul>
                        <div className="mt-2 pt-2 border-t border-blue-200">
                          <p className="text-xs font-semibold text-blue-900">✅ Solution:</p>
                          <p className="text-xs text-blue-800 mt-0.5">Generate a new barcode and view its traceability!</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : traceabilityData ? (
                  <div className="space-y-4">
                    {/* Product Info - Compact */}
                    {traceabilityData.products && (
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                        <div className="flex items-center gap-2 mb-3">
                          <Package className="w-5 h-5 text-blue-600" />
                          <h3 className="text-base font-bold text-slate-900">Product Information</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-slate-600 mb-0.5">Brand</p>
                            <p className="font-semibold text-slate-900 text-sm">
                              {traceabilityData.products?.brand || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-600 mb-0.5">Model</p>
                            <p className="font-semibold text-slate-900 text-sm">
                              {traceabilityData.products?.model || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-600 mb-0.5">SKU</p>
                            <p className="font-mono font-semibold text-slate-900 text-xs">
                              {traceabilityData.products?.sku || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-600 mb-0.5">Dimensions</p>
                            <p className="font-semibold text-slate-900 text-sm">
                              {traceabilityData.products?.dimensions || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Batch Info - Compact */}
                    {traceabilityData.batches && (
                      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                        <div className="flex items-center gap-2 mb-3">
                          <Boxes className="w-5 h-5 text-amber-600" />
                          <h3 className="text-base font-bold text-slate-900">Batch Information</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-slate-600 mb-0.5">Batch Number</p>
                            <p className="font-mono font-semibold text-slate-900 text-sm">
                              {traceabilityData.batches?.batch_number || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-600 mb-0.5">Production Date</p>
                            <p className="font-semibold text-slate-900 text-sm">
                              {traceabilityData.batches?.batch_month || 'N/A'}/{traceabilityData.batches?.batch_year || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Shipment Info - Compact */}
                    {traceabilityData.batches?.shipments && (
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                        <div className="flex items-center gap-2 mb-3">
                          <Truck className="w-5 h-5 text-purple-600" />
                          <h3 className="text-base font-bold text-slate-900">Shipment Information</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-slate-600 mb-0.5">Shipment Number</p>
                            <p className="font-mono font-semibold text-slate-900 text-sm">
                              {traceabilityData.batches.shipments?.shipment_number || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-600 mb-0.5">Container</p>
                            <p className="font-semibold text-slate-900 text-sm">
                              {traceabilityData.batches.shipments?.container_number || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* WAREHOUSE LOCATION - HIERARCHICAL DISPLAY */}
                    {traceabilityData.inventory_units && (
                      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 rounded-xl p-5 border-2 border-emerald-300 shadow-lg">
                        {/* Decorative background */}
                        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                        
                        <div className="relative z-10">
                          {/* Header */}
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow">
                              <MapPin className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xl font-black text-white">📍 Exact Storage Location</h3>
                              <p className="text-emerald-50 text-xs font-medium">Precise hierarchical position</p>
                            </div>
                          </div>

                          {/* Main Location Display */}
                          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/50 space-y-3">
                            {/* Warehouse */}
                            <div className="text-center pb-3 border-b-2 border-emerald-200">
                              <p className="text-[10px] font-bold text-emerald-700 mb-1.5 uppercase tracking-wide">🏢 Warehouse</p>
                              <p className="text-2xl font-black text-emerald-900">
                                {traceabilityData.inventory_units.warehouses?.name || 'Not Assigned'}
                              </p>
                              <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                                {traceabilityData.inventory_units.warehouses?.code || 'N/A'}
                              </p>
                            </div>
                              
                            {/* Hierarchical Location Breakdown - UPDATED TO USE POSITION_CODE */}
                            {traceabilityData.inventory_units.position_code ? (
                              <div className="space-y-2.5">
                                {/* Full Position Code - PRIMARY DISPLAY */}
                                <div className="p-4 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl border-2 border-emerald-400 shadow-lg">
                                  <p className="text-[10px] font-bold text-emerald-100 mb-2 text-center uppercase tracking-wide">📍 Storage Position</p>
                                  <p className="text-center font-mono text-xl font-black text-white break-all tracking-wider">
                                    {traceabilityData.inventory_units.position_code}
                                  </p>
                                </div>

                                {/* Rack Info (if available) */}
                                {(traceabilityData.inventory_units.rack || traceabilityData.inventory_units.position_code) && (
                                  <div className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                                    <div className="flex items-center gap-1.5">
                                      <Boxes className="w-4 h-4 text-emerald-600" />
                                      <span className="text-xs font-bold text-emerald-900">Rack</span>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-base font-black text-emerald-800">
                                        {traceabilityData.inventory_units.rack || traceabilityData.inventory_units.position_code.split('-').slice(0, 3).join('-')}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {/* Position Details - Shelf, Section, Subsection */}
                                {(traceabilityData.inventory_units.shelf_number || 
                                  traceabilityData.inventory_units.section_number || 
                                  traceabilityData.inventory_units.subsection_number) && (
                                  <div className="grid grid-cols-3 gap-1.5">
                                    {/* Shelf */}
                                    {traceabilityData.inventory_units.shelf_number && (
                                      <div className="text-center p-2 bg-blue-50 rounded-lg border border-blue-200">
                                        <div className="text-[9px] font-semibold text-blue-700 mb-0.5">🗄️ Shelf</div>
                                        <p className="text-lg font-black text-blue-900">
                                          {traceabilityData.inventory_units.shelf_number}
                                        </p>
                                      </div>
                                    )}

                                    {/* Section */}
                                    {traceabilityData.inventory_units.section_number && (
                                      <div className="text-center p-2 bg-purple-50 rounded-lg border border-purple-200">
                                        <div className="text-[9px] font-semibold text-purple-700 mb-0.5">📦 Section</div>
                                        <p className="text-lg font-black text-purple-900">
                                          {traceabilityData.inventory_units.section_number}
                                        </p>
                                      </div>
                                    )}

                                    {/* Subsection */}
                                    {traceabilityData.inventory_units.subsection_number && (
                                      <div className="text-center p-2 bg-amber-50 rounded-lg border border-amber-200">
                                        <div className="text-[9px] font-semibold text-amber-700 mb-0.5">🔖 Subsection</div>
                                        <p className="text-lg font-black text-amber-900">
                                          {traceabilityData.inventory_units.subsection_number}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : traceabilityData.inventory_units.rack ? (
                              <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                                <Boxes className="w-5 h-5 text-emerald-600 mx-auto mb-1.5" />
                                <p className="text-sm font-bold text-emerald-900">
                                  {traceabilityData.inventory_units.rack}
                                </p>
                                <p className="text-[10px] text-slate-600 mt-0.5">Rack assigned (no detailed position)</p>
                              </div>
                            ) : (
                              <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-200">
                                <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-1.5" />
                                <p className="text-xs font-semibold text-amber-800">No Rack Location Assigned</p>
                                <p className="text-[10px] text-amber-600 mt-0.5">This tire needs to be assigned to a storage location</p>
                              </div>
                            )}
                          </div>

                          {/* Additional Details - Compact */}
                          <div className="grid grid-cols-2 gap-2 mt-3">
                            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2.5 border border-white/30">
                              <p className="text-xs text-emerald-100 font-semibold mb-0.5 uppercase">Unit Code</p>
                              <p className="font-mono font-bold text-white text-xs break-all">
                                {traceabilityData.inventory_units.inventory_unit_code?.slice(0, 18) || 'N/A'}...
                              </p>
                            </div>
                            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2.5 border border-white/30">
                              <p className="text-xs text-emerald-100 font-semibold mb-0.5 uppercase">Status</p>
                              <span className={`px-2 py-0.5 rounded-lg text-xs font-bold inline-block ${
                                traceabilityData.inventory_units.status === 'NEW' 
                                  ? 'bg-white text-emerald-600' 
                                  : traceabilityData.inventory_units.status === 'AVAILABLE'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {traceabilityData.inventory_units.status || 'N/A'}
                              </span>
                            </div>
                          </div>

                          {/* Assignment Date */}
                          {traceabilityData.inventory_units.assigned_at && (
                            <div className="mt-2 text-center">
                              <p className="text-xs text-emerald-100">
                                📅 Assigned: {new Date(traceabilityData.inventory_units.assigned_at).toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Barcode Status - Compact */}
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Barcode className="w-5 h-5 text-slate-600" />
                        <h3 className="text-base font-bold text-slate-900">Barcode Status</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-slate-600 mb-0.5">Status</p>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            traceabilityData.status === 'active' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {traceabilityData.status?.toUpperCase() || 'UNKNOWN'}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-slate-600 mb-0.5">Generated</p>
                          <p className="font-semibold text-slate-900 text-xs">
                            {traceabilityData.created_at 
                              ? new Date(traceabilityData.created_at).toLocaleDateString()
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* QR Code - Compact */}
                    {traceabilityData.qr_code_data && (
                      <div className="bg-white rounded-xl p-4 border border-slate-200 text-center">
                        <h3 className="text-base font-bold text-slate-900 mb-3">QR Code</h3>
                        <img
                          src={traceabilityData.qr_code_data}
                          alt="QR Code"
                          className="w-32 h-32 mx-auto border border-slate-300 rounded-lg"
                        />
                        <p className="text-xs text-slate-500 mt-2">Scan to trace this product</p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Modal Footer - Compact */}
              <div className="border-t border-slate-200 p-3 bg-slate-50">
                <button
                  onClick={() => setShowTraceabilityPanel(false)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold transition-all shadow-md text-sm"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
        </>
      )}
    </div>
  );
}
