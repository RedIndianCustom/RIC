import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClipboardCheck, Search, Camera, CheckCircle, XCircle, AlertTriangle, 
  X, ChevronRight, Clock, Upload, Image as ImageIcon, Trash2, 
  FileText, TrendingUp, Calendar, AlertCircle, Package, BarChart3, Info, 
  Video, SwitchCamera, Timer, Target, Zap, Award, Activity
} from 'lucide-react';
import api from '../../../services/api';
import BarcodeScanner from '../../../components/scanner/BarcodeScanner';
import { QCDeadlineBadge } from '../../../components/qc/QCDeadlineIndicator';

export default function QCInspectionEnhanced() {
  const [inspections, setInspections] = useState([]);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [currentItem, setCurrentItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectedItems, setInspectedItems] = useState([]);
  const [expectedItems, setExpectedItems] = useState([]);
  const [receivingReport, setReceivingReport] = useState(null);
  const [showReport, setShowReport] = useState(false);
  
  // Session Statistics - Enhanced
  const [sessionStats, setSessionStats] = useState({
    startTime: null,
    totalScanned: 0,
    goodCount: 0,
    minorDefectCount: 0,
    majorDefectCount: 0,
    inspectionRate: 0,
    qualityScore: 100,
    elapsedTime: 0
  });
  
  // Inspection form state
  const [classification, setClassification] = useState('GOOD');
  const [defectType, setDefectType] = useState('');
  const [defectLocation, setDefectLocation] = useState('');
  const [defectDescription, setDefectDescription] = useState('');
  const [defectSeverity, setDefectSeverity] = useState('');
  const [isSellable, setIsSellable] = useState(true);
  const [recommendedAction, setRecommendedAction] = useState('SELL_NORMAL');
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [photos, setPhotos] = useState([]);
  const [qualityNotes, setQualityNotes] = useState('');
  const [scanInput, setScanInput] = useState('');
  const [productInfo, setProductInfo] = useState(null); // Store product details
  const [showCamera, setShowCamera] = useState(false); // Camera modal state
  const [isProcessing, setIsProcessing] = useState(false); // Prevent duplicate scans
  
  const scanInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastScannedBarcode = useRef(null);
  const timerInterval = useRef(null); // Timer for session stats

  useEffect(() => {
    loadPendingInspections();
  }, []);

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  useEffect(() => {
    if (currentItem && scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [currentItem]);

  // Timer for inspection session - Enhanced
  useEffect(() => {
    if (selectedInspection && sessionStats.startTime) {
      timerInterval.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - sessionStats.startTime) / 1000);
        const rate = sessionStats.totalScanned > 0 
          ? (sessionStats.totalScanned / (elapsed / 60)).toFixed(1)
          : 0;
        
        setSessionStats(prev => ({
          ...prev,
          elapsedTime: elapsed,
          inspectionRate: rate
        }));
      }, 1000);

      return () => {
        if (timerInterval.current) {
          clearInterval(timerInterval.current);
        }
      };
    }
  }, [selectedInspection, sessionStats.startTime, sessionStats.totalScanned]);

  const loadPendingInspections = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/receiving-qc/qc-inspection/pending/all');
      setInspections((data.data || []).filter(inspection => (
        !inspection.inspection_number?.startsWith('QC-ADHOC-') ||
        (inspection.items_inspected || 0) > 0
      )));
    } catch (error) {
      console.error('Error loading inspections:', error);
      setAlert({ type: 'error', message: 'Failed to load inspections' });
    } finally {
      setLoading(false);
    }
  };

  const startAdHocInspection = async () => {
    try {
      setSelectedInspection({
        id: null,
        inspection_number: 'New ad hoc defect report',
        shipment: null,
        items: [],
        items_inspected: 0,
        total_items: 1,
        has_deadline: false,
        deadline_type: 'NONE'
      });
      setInspectedItems([]);
      setExpectedItems([]);
      setReceivingReport(null);
      setShowReport(false);
      setSessionStats({
        startTime: Date.now(),
        totalScanned: 0,
        goodCount: 0,
        minorDefectCount: 0,
        majorDefectCount: 0,
        inspectionRate: 0,
        qualityScore: 100,
        elapsedTime: 0
      });
      resetItemForm();
      setShowCamera(true);
    } catch (error) {
      console.error('Error starting ad hoc QC inspection:', error);
      setAlert({ type: 'error', message: 'Could not start quick QC report' });
    }
  };

  const startInspection = async (inspection) => {
    try {
      setLoading(true);
      const { data } = await api.get(`/receiving-qc/qc-inspection/${inspection.id}`);
      setSelectedInspection(data.data);
      setInspectedItems(data.data.items || []);
      if (data.data.shipment_id) {
        const [{ data: expectedData }, { data: reportData }] = await Promise.all([
          api.get(`/receiving-qc/expected-items/${data.data.shipment_id}`),
          api.get('/receiving/reports', { params: { shipment_id: data.data.shipment_id, limit: 1 } })
        ]);
        setExpectedItems(expectedData.data || []);
        setReceivingReport(reportData.data?.[0] || null);
      } else {
        setExpectedItems([]);
        setReceivingReport(null);
      }
      setShowReport(false);
      
      // Initialize session stats with timer
      setSessionStats({
        startTime: Date.now(),
        totalScanned: data.data.items?.length || 0,
        goodCount: data.data.good_quality_count || 0,
        minorDefectCount: data.data.minor_defect_count || 0,
        majorDefectCount: data.data.major_defect_count || 0,
        inspectionRate: 0,
        qualityScore: data.data.items?.length > 0 
          ? ((data.data.good_quality_count || 0) / data.data.items.length * 100).toFixed(1)
          : 100,
        elapsedTime: 0
      });
      
      resetItemForm();
    } catch (error) {
      console.error('Error loading inspection details:', error);
      setAlert({ type: 'error', message: 'Failed to load inspection details' });
    } finally {
      setLoading(false);
    }
  };

  const resetItemForm = () => {
    setCurrentItem(null);
    setClassification('GOOD');
    setDefectType('');
    setDefectLocation('');
    setDefectDescription('');
    setDefectSeverity('');
    setIsSellable(true);
    setRecommendedAction('SELL_NORMAL');
    setDiscountPercentage('');
    setPhotos([]);
    setQualityNotes('');
    setScanInput('');
    setIsProcessing(false);
    lastScannedBarcode.current = null; // Clear last scanned barcode
  };

  const handleScan = async (e) => {
    e.preventDefault();
    
    if (!scanInput.trim()) return;
    if (isProcessing) {
      console.log('Already processing a scan, please wait...');
      return;
    }

    const barcode = scanInput.trim();
    
    // Prevent duplicate scans of the same barcode
    if (lastScannedBarcode.current === barcode) {
      console.log('Barcode already scanned, skipping duplicate');
      setScanInput('');
      return;
    }
    
    await processBarcode(barcode);
  };

  const handleCameraScan = async (barcode) => {
    setShowCamera(false);
    
    // Prevent duplicate scans
    if (isProcessing) {
      console.log('Already processing a scan, please wait...');
      return;
    }
    
    if (lastScannedBarcode.current === barcode) {
      console.log('Barcode already scanned, skipping duplicate');
      return;
    }
    
    await processBarcode(barcode);
  };

  const closeCamera = () => {
    setShowCamera(false);
    if (selectedInspection && !selectedInspection.id) {
      setSelectedInspection(null);
      setInspectedItems([]);
      resetItemForm();
    }
  };

  const processBarcode = async (barcode) => {
    // Prevent duplicate processing
    if (isProcessing) {
      console.log('Already processing, skipping...');
      return;
    }
    
    try {
      setIsProcessing(true);
      setLoading(true);
      
      console.log('Looking up barcode:', barcode);
      
      // Fetch product info from barcode using traceability endpoint
      const { data } = await api.get(`/barcodes/trace/${barcode}`);
      
      console.log('Barcode trace response:', data);
      console.log('Traceability object:', data.traceability);
      
      if (data.success && data.traceability) {
        const trace = data.traceability;
        
        // IMPORTANT: API returns 'products' (not 'product'), 'batches' (not 'batch'), 'inventory_units' (not 'inventory_unit')
        const product = trace.products || {};  // Note: plural
        const batch = trace.batches || {};      // Note: plural
        const inventoryUnit = trace.inventory_units || {};  // Note: plural and underscore
        
        console.log('Product data:', product);
        console.log('Batch data:', batch);
        console.log('Inventory unit data:', inventoryUnit);
        
        // Build product name from brand + model
        const brandText = product.brand || '';
        const modelText = product.model || '';
        const categoryText = product.category || '';
        const skuText = product.sku || '';
        
        // Try multiple strategies to build a useful product name
        let productName = 'Unknown Product';
        if (brandText && modelText) {
          productName = `${brandText} ${modelText}`.trim();
        } else if (brandText && categoryText) {
          productName = `${brandText} ${categoryText}`.trim();
        } else if (skuText) {
          productName = skuText;
        } else if (brandText) {
          productName = brandText;
        } else if (modelText) {
          productName = modelText;
        } else if (categoryText) {
          productName = categoryText;
        }
        
        // Get size from product dimensions
        const productSize = product.dimensions || inventoryUnit.product_size || '';
        
        // Get brand
        const productBrand = product.brand || '';
        
        // Get batch_id and inventory_unit_id for backend
        const batchId = batch.id || null;
        const inventoryUnitId = inventoryUnit.id || null;
        
        setProductInfo({
          barcode: barcode,
          product_name: productName,
          product_brand: productBrand,
          product_size: productSize,
          product_id: product.id || null,
          batch_id: batchId,
          inventory_unit_id: inventoryUnitId
        });
        
        // Set current item for inspection
        setCurrentItem({
          barcode: barcode,
          product_id: product.id || null,
          product_size: productSize,
          product_name: productName,
          product_brand: productBrand,
          batch_id: batchId,
          inventory_unit_id: inventoryUnitId
        });
        
        // Store last scanned barcode
        lastScannedBarcode.current = barcode;
        
        setAlert({ 
          type: 'success', 
          message: `Product loaded: ${productName}${productSize ? ` (${productSize})` : ''}` 
        });
        
        console.log('Product loaded successfully:', {
          name: productName,
          brand: productBrand,
          size: productSize
        });
      } else {
        // Barcode not found in system
        console.warn('Barcode not found in traceability system');
        
        // Still allow inspection with manual entry
        setCurrentItem({
          barcode: barcode,
          product_id: null,
          product_size: '',
          product_name: '',
          product_brand: ''
        });
        
        lastScannedBarcode.current = barcode;
        
        setAlert({ 
          type: 'warning', 
          message: 'Barcode not found. Please enter product details manually.' 
        });
      }
      
    } catch (error) {
      console.error('Error looking up barcode:', error);
      console.error('Error details:', error.response?.data);
      
      // If lookup fails, still allow inspection with manual entry
      setCurrentItem({
        barcode: barcode,
        product_id: null,
        product_size: '',
        product_name: '',
        product_brand: ''
      });
      
      lastScannedBarcode.current = barcode;
      
      setAlert({ 
        type: 'warning', 
        message: `Could not load product details: ${error.response?.data?.error || error.message}. Please enter manually.` 
      });
    } finally {
      setScanInput('');
      setLoading(false);
      setIsProcessing(false);
    }
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    
    // In production, upload to file storage and get URLs
    // For now, create local preview URLs
    const newPhotos = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      uploaded: false
    }));
    
    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const removePhoto = (index) => {
    setPhotos(prev => {
      const newPhotos = [...prev];
      if (newPhotos[index].preview) {
        URL.revokeObjectURL(newPhotos[index].preview);
      }
      newPhotos.splice(index, 1);
      return newPhotos;
    });
  };

  const recordInspectionItem = async () => {
    if (!currentItem) {
      setAlert({ type: 'error', message: 'No item scanned' });
      return;
    }

    // Check if this barcode has already been inspected locally
    const alreadyInspected = inspectedItems.some(item => item.barcode === currentItem.barcode);
    if (alreadyInspected) {
      setAlert({ 
        type: 'error', 
        message: `Barcode ${currentItem.barcode} has already been inspected. Please scan a different item.` 
      });
      resetItemForm();
      setProductInfo(null);
      return;
    }

    try {
      setLoading(true);

      let inspectionId = selectedInspection.id;
      if (!inspectionId) {
        const { data } = await api.post('/receiving-qc/qc-inspection/create-ad-hoc');
        inspectionId = data.data.id;
        setSelectedInspection(prev => ({
          ...prev,
          ...data.data,
          shipment: null,
          items: [],
          items_inspected: 0,
          total_items: 1
        }));
      }

      // Upload photos first (in production)
      const photoUrls = photos.map(p => p.preview); // Replace with actual upload URLs

      const payload = {
        qc_inspection_id: inspectionId,
        barcode: currentItem.barcode,
        product_id: currentItem.product_id,
        product_size: currentItem.product_size,
        batch_id: currentItem.batch_id,
        inventory_unit_id: currentItem.inventory_unit_id,
        classification,
        defect_type: classification !== 'GOOD' ? defectType : null,
        defect_location: classification !== 'GOOD' ? defectLocation : null,
        defect_description: classification !== 'GOOD' ? defectDescription : null,
        defect_severity: classification !== 'GOOD' ? defectSeverity : null,
        is_sellable: isSellable,
        recommended_action: recommendedAction,
        suggested_discount_percentage: discountPercentage ? parseFloat(discountPercentage) : null,
        photos: photoUrls,
        quality_notes: qualityNotes
      };

      console.log('📤 Sending inspection payload:', payload);

      const { data } = await api.post('/receiving-qc/qc-inspection/record-item', payload);

      console.log('✅ Inspection recorded:', data);

      // Add to inspected items list
      const newItem = {
        ...currentItem,
        classification,
        defect_type: defectType,
        defect_severity: defectSeverity,
        quality_notes: qualityNotes,
        inspected_at: new Date().toISOString()
      };
      
      setInspectedItems(prev => [...prev, newItem]);

      // Update session stats - Enhanced
      setSessionStats(prev => ({
        ...prev,
        totalScanned: prev.totalScanned + 1,
        goodCount: classification === 'GOOD' ? prev.goodCount + 1 : prev.goodCount,
        minorDefectCount: classification === 'MINOR_DEFECT' ? prev.minorDefectCount + 1 : prev.minorDefectCount,
        majorDefectCount: classification === 'MAJOR_DEFECT' ? prev.majorDefectCount + 1 : prev.majorDefectCount,
        qualityScore: ((prev.goodCount + (classification === 'GOOD' ? 1 : 0)) / (prev.totalScanned + 1) * 100).toFixed(1)
      }));
      
      // Update local inspection state
      setSelectedInspection(prev => ({
        ...prev,
        items_inspected: (prev.items_inspected || 0) + 1,
        good_quality_count: classification === 'GOOD' ? (prev.good_quality_count || 0) + 1 : prev.good_quality_count,
        minor_defect_count: classification === 'MINOR_DEFECT' ? (prev.minor_defect_count || 0) + 1 : prev.minor_defect_count,
        major_defect_count: classification === 'MAJOR_DEFECT' ? (prev.major_defect_count || 0) + 1 : prev.major_defect_count
      }));

      resetItemForm();
      setProductInfo(null);
    } catch (error) {
      console.error('❌ Error recording inspection:', error);
      
      // Handle duplicate error specifically
      if (error.response?.status === 409 || error.response?.data?.duplicate) {
        setAlert({ 
          type: 'error', 
          message: error.response?.data?.error || 'This barcode has already been inspected. Please scan a different item.' 
        });
        resetItemForm();
        setProductInfo(null);
      } else {
        setAlert({ 
          type: 'error', 
          message: error.response?.data?.error || 'Failed to record inspection' 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const completeInspection = async () => {
    try {
      setLoading(true);

      const { data } = await api.put(`/receiving-qc/qc-inspection/${selectedInspection.id}/complete`, {
        inspector_notes: qualityNotes,
        overall_assessment: 'COMPLETED',
        recommendations: ''
      });

      setAlert({ 
        type: 'success', 
        message: 'Inspection completed! Awaiting manager approval.' 
      });

      setSelectedInspection(null);
      await loadPendingInspections();
    } catch (error) {
      console.error('Error completing inspection:', error);
      setAlert({ type: 'error', message: error.response?.data?.error || 'Failed to complete inspection' });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getDaysRemaining = (dueDate) => {
    if (!dueDate) return null;
    const days = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getDeadlineStatus = (dueDate, isOverdue) => {
    if (isOverdue) {
      return { color: 'red', text: 'OVERDUE', icon: AlertCircle };
    }
    
    const days = getDaysRemaining(dueDate);
    if (days === null) return { color: 'gray', text: 'No deadline', icon: Clock };
    if (days < 0) return { color: 'red', text: 'OVERDUE', icon: AlertCircle };
    if (days <= 3) return { color: 'yellow', text: `${days} days left`, icon: AlertTriangle };
    return { color: 'green', text: `${days} days left`, icon: Clock };
  };

  const filteredInspections = inspections.filter(inspection =>
    inspection.inspection_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inspection.shipment_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate statistics for report
  const stats = {
    total: inspectedItems.length,
    good: inspectedItems.filter(i => i.classification === 'GOOD').length,
    minor: inspectedItems.filter(i => i.classification === 'MINOR_DEFECT').length,
    major: inspectedItems.filter(i => i.classification === 'MAJOR_DEFECT').length,
    goodPercent: inspectedItems.length > 0 ? ((inspectedItems.filter(i => i.classification === 'GOOD').length / inspectedItems.length) * 100).toFixed(1) : 0,
    minorPercent: inspectedItems.length > 0 ? ((inspectedItems.filter(i => i.classification === 'MINOR_DEFECT').length / inspectedItems.length) * 100).toFixed(1) : 0,
    majorPercent: inspectedItems.length > 0 ? ((inspectedItems.filter(i => i.classification === 'MAJOR_DEFECT').length / inspectedItems.length) * 100).toFixed(1) : 0
  };

  // Inspection Report View
  if (selectedInspection && showReport) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-4 overflow-x-hidden p-2 sm:space-y-6 sm:p-0">
        {/* Header - Mobile Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
              QC Inspection Report
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mt-1 truncate">
              {selectedInspection.inspection_number}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 truncate">
              {selectedInspection.shipment?.shipment_number
                ? `Shipment: ${selectedInspection.shipment.shipment_number}`
                : 'Ad hoc defect report'}
            </p>
          </div>
          
          <div className="flex gap-2 sm:gap-3 flex-shrink-0">
            <button
              onClick={() => setShowReport(false)}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
            >
              <span className="hidden sm:inline">Back to Inspection</span>
              <span className="sm:hidden">Back</span>
            </button>
            <button
              onClick={() => setSelectedInspection(null)}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Statistics Cards - Mobile Responsive Grid */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 truncate">Total Inspected</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <Package className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600 flex-shrink-0" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-md border border-green-200 p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-green-700 font-medium truncate">Good Quality</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-900 mt-1">{stats.good}</p>
                <p className="text-xs sm:text-sm text-green-600 mt-1">{stats.goodPercent}%</p>
              </div>
              <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-600 flex-shrink-0" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl shadow-md border border-yellow-200 p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-yellow-700 font-medium truncate">Minor Defects</p>
                <p className="text-2xl sm:text-3xl font-bold text-yellow-900 mt-1">{stats.minor}</p>
                <p className="text-xs sm:text-sm text-yellow-600 mt-1">{stats.minorPercent}%</p>
              </div>
              <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-600 flex-shrink-0" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl shadow-md border border-red-200 p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-red-700 font-medium truncate">Major Defects</p>
                <p className="text-2xl sm:text-3xl font-bold text-red-900 mt-1">{stats.major}</p>
                <p className="text-xs sm:text-sm text-red-600 mt-1">{stats.majorPercent}%</p>
              </div>
              <XCircle className="w-8 h-8 sm:w-10 sm:h-10 text-red-600 flex-shrink-0" />
            </div>
          </div>
        </div>

        {/* Quality Distribution Chart - Mobile Responsive */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-3 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            <span className="truncate">Quality Distribution</span>
          </h3>
          <div className="space-y-3 sm:space-y-4">
            <div>
              <div className="flex justify-between mb-1 sm:mb-2 text-xs sm:text-sm">
                <span className="font-medium text-green-700 truncate">Good Quality</span>
                <span className="font-bold text-green-900 flex-shrink-0 ml-2">{stats.good} ({stats.goodPercent}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 sm:h-4">
                <div 
                  className="bg-gradient-to-r from-green-500 to-emerald-600 h-3 sm:h-4 rounded-full transition-all duration-500"
                  style={{ width: `${stats.goodPercent}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1 sm:mb-2 text-xs sm:text-sm">
                <span className="font-medium text-yellow-700 truncate">Minor Defects</span>
                <span className="font-bold text-yellow-900 flex-shrink-0 ml-2">{stats.minor} ({stats.minorPercent}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 sm:h-4">
                <div 
                  className="bg-gradient-to-r from-yellow-500 to-amber-600 h-3 sm:h-4 rounded-full transition-all duration-500"
                  style={{ width: `${stats.minorPercent}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1 sm:mb-2 text-xs sm:text-sm">
                <span className="font-medium text-red-700 truncate">Major Defects</span>
                <span className="font-bold text-red-900 flex-shrink-0 ml-2">{stats.major} ({stats.majorPercent}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 sm:h-4">
                <div 
                  className="bg-gradient-to-r from-red-500 to-rose-600 h-3 sm:h-4 rounded-full transition-all duration-500"
                  style={{ width: `${stats.majorPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Inspected Items List - Mobile Responsive */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              <span>Inspection Details ({inspectedItems.length})</span>
            </h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {inspectedItems.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-gray-500">
                <Package className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm sm:text-base">No items inspected yet</p>
              </div>
            ) : (
              inspectedItems.map((item, index) => (
                <div key={index} className="p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-xs sm:text-sm font-mono text-gray-600 flex-shrink-0">#{index + 1}</span>
                        <h4 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                          {item.product_name || 'Unknown Product'}
                        </h4>
                        {item.product_brand && (
                          <span className="text-xs sm:text-sm text-gray-600 hidden sm:inline">({item.product_brand})</span>
                        )}
                        <span className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-medium ${
                          item.classification === 'GOOD' 
                            ? 'bg-green-100 text-green-700' 
                            : item.classification === 'MINOR_DEFECT'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {item.classification === 'GOOD' ? 'Good' : 
                           item.classification === 'MINOR_DEFECT' ? 'Minor' : 
                           'Major'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs sm:text-sm">
                        <div className="truncate">
                          <span className="text-gray-600">Barcode:</span>
                          <span className="ml-1 sm:ml-2 font-mono text-gray-900">{item.barcode}</span>
                        </div>
                        <div className="truncate">
                          <span className="text-gray-600">Size:</span>
                          <span className="ml-1 sm:ml-2 font-medium text-gray-900">{item.product_size || 'N/A'}</span>
                        </div>
                        {item.defect_type && (
                          <div className="truncate">
                            <span className="text-gray-600">Defect:</span>
                            <span className="ml-1 sm:ml-2 font-medium text-gray-900">{item.defect_type}</span>
                          </div>
                        )}
                        {item.defect_severity && (
                          <div className="truncate">
                            <span className="text-gray-600">Severity:</span>
                            <span className="ml-1 sm:ml-2 font-medium text-gray-900">{item.defect_severity}</span>
                          </div>
                        )}
                      </div>
                      
                      {item.quality_notes && (
                        <p className="mt-2 text-xs sm:text-sm text-gray-600 bg-gray-50 p-2 rounded break-words">
                          {item.quality_notes}
                        </p>
                      )}
                    </div>
                    
                    {item.classification === 'GOOD' ? (
                      <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" />
                    ) : item.classification === 'MINOR_DEFECT' ? (
                      <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Complete Inspection Button - Mobile Responsive */}
        {selectedInspection.total_items > 0 && selectedInspection.items_inspected >= selectedInspection.total_items && (
          <div className="sticky bottom-2 z-10 flex justify-end px-2 sm:static sm:px-0">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={completeInspection}
              disabled={loading}
              className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 font-semibold disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              Complete QC Inspection
            </motion.button>
          </div>
        )}
      </div>
    );
  }

  // Inspection Form View
  if (selectedInspection) {
    const progress = selectedInspection.total_items > 0 
      ? (selectedInspection.items_inspected / selectedInspection.total_items) * 100 
      : 0;
    const inspectionProducts = [...new Set(expectedItems
      .map(item => item.product_id || item.product?.id || item.product?.name)
      .filter(Boolean))];
    const inspectionSizes = [...new Set(expectedItems
      .map(item => item.product_size || item.product?.dimensions)
      .filter(Boolean))];
    const receivedByProductSize = (receivingReport?.size_breakdown || []).reduce((summary, item) => {
      summary[`${item.product_id || ''}-${item.size || ''}`] = item.scanned || 0;
      return summary;
    }, {});
    const expectedProductSummary = expectedItems.reduce((summary, item) => {
      const productName = item.product
        ? `${item.product.brand || ''} ${item.product.model || item.product.name || ''}`.trim()
        : 'Unknown Product';
      const size = item.product_size || item.product?.dimensions || 'N/A';
      const key = `${productName}-${size}`;
      const receivedKey = `${item.product_id || item.product?.id || ''}-${size}`;
      summary[key] = {
        productName,
        size,
        expectedQuantity: (summary[key]?.expectedQuantity || 0) + (item.expected_quantity || 0),
        receivedQuantity: (summary[key]?.receivedQuantity || 0) + (receivedByProductSize[receivedKey] ?? item.expected_quantity ?? 0)
      };
      return summary;
    }, {});

    return (
      <div className="mx-auto w-full max-w-7xl space-y-4 overflow-x-hidden p-2 sm:space-y-6 sm:p-0">
        {/* Header - Mobile Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
              QC Inspection
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mt-1 truncate">
              {selectedInspection.inspection_number}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 truncate">
              {selectedInspection.shipment?.shipment_number
                ? `Shipment: ${selectedInspection.shipment.shipment_number}`
                : 'Ad hoc defect report'}
            </p>
          </div>
          
          <button
            onClick={() => setSelectedInspection(null)}
            className="self-end sm:self-auto text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Alert */}
        <AnimatePresence>
          {alert && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-3 sm:p-4 rounded-lg text-sm sm:text-base ${
                alert.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}
            >
              {alert.message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress & Deadline & Actions - Mobile Responsive Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900">Progress</h3>
              <span className="text-xl sm:text-2xl font-bold text-blue-600">{Math.round(progress)}%</span>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mb-2">
              {selectedInspection.items_inspected} of {selectedInspection.total_items} items
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 sm:h-3 rounded-full"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900">Deadline</h3>
              {(() => {
                const status = getDeadlineStatus(selectedInspection.due_date, selectedInspection.is_overdue);
                const StatusIcon = status.icon;
                return (
                  <div className={`flex items-center gap-1 sm:gap-2 text-${status.color}-600`}>
                    <StatusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-xs sm:text-sm font-bold">{status.text}</span>
                  </div>
                );
              })()}
            </div>
            <p className="text-xs sm:text-sm text-gray-600 truncate">
              Due: {selectedInspection.due_date 
                ? new Date(selectedInspection.due_date).toLocaleDateString() 
                : 'No deadline'}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900">Actions</h3>
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <button
              onClick={() => setShowReport(true)}
              className="w-full px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <BarChart3 className="w-4 h-4" />
              View Report
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 sm:p-5">
            <p className="text-[11px] font-medium text-blue-700 sm:text-sm">QC Items</p>
            <p className="mt-1 text-2xl font-bold text-blue-900 sm:text-3xl">{selectedInspection.total_items || 0}</p>
            <p className="mt-1 text-[10px] text-blue-600 sm:text-xs">Received for inspection</p>
          </div>
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 sm:p-5">
            <p className="text-[11px] font-medium text-indigo-700 sm:text-sm">Products</p>
            <p className="mt-1 text-2xl font-bold text-indigo-900 sm:text-3xl">{inspectionProducts.length}</p>
            <p className="mt-1 text-[10px] text-indigo-600 sm:text-xs">Product types</p>
          </div>
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 sm:p-5">
            <p className="text-[11px] font-medium text-violet-700 sm:text-sm">Sizes</p>
            <p className="mt-1 text-2xl font-bold text-violet-900 sm:text-3xl">{inspectionSizes.length}</p>
            <p className="mt-1 text-[10px] text-violet-600 sm:text-xs">Size variations</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-md sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-slate-900">Received Products & Sizes</h3>
          </div>
          <div className="space-y-2">
            {Object.values(expectedProductSummary).map(item => (
              <div key={`${item.productName}-${item.size}`} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{item.productName}</p>
                  <p className="text-xs text-slate-500">Size: {item.size}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <span className="rounded-md bg-blue-100 px-2 py-1 font-bold text-blue-800">{item.receivedQuantity}</span>
                  <p className="mt-1 text-[10px] text-slate-500">of {item.expectedQuantity} expected</p>
                </div>
              </div>
            ))}
            {expectedItems.length === 0 && (
              <p className="text-sm text-slate-500">Expected item details are unavailable.</p>
            )}
          </div>
        </div>

        {/* Scan Input - Mobile Responsive */}
        {!currentItem && (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
              <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              <span>Scan Product Barcode</span>
            </h3>
            <form onSubmit={handleScan} className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <div className="flex-1 relative">
                  <Camera className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                  <input
                    ref={scanInputRef}
                    type="text"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    placeholder="Scan or enter barcode..."
                    className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-lg"
                  />
                </div>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={loading || !scanInput.trim()}
                  className="px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  Scan
                </motion.button>
              </div>
              
              {/* Camera Button */}
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setShowCamera(true)}
                  className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-white border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium text-sm sm:text-base w-full sm:w-auto justify-center"
                >
                  <Video className="w-4 h-4 sm:w-5 sm:h-5" />
                  Open Camera Scanner
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Inspection Form - Mobile Responsive */}
        {currentItem && (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-3 sm:p-6">
            <div className="flex items-start gap-3 mb-4 sm:mb-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 sm:gap-3 mb-2">
                  <Package className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
                  <h3 className="min-w-0 font-semibold text-gray-900 text-base sm:text-lg break-words">
                    {currentItem.product_name || 'Unknown Product'}
                  </h3>
                  {currentItem.product_brand && (
                    <span className="hidden sm:inline px-2 sm:px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs sm:text-sm flex-shrink-0">
                      {currentItem.product_brand}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:gap-4 sm:text-sm text-gray-600">
                  <span className="flex items-start gap-1 break-words">
                    <strong>Size:</strong> {currentItem.product_size || 'N/A'}
                  </span>
                  <span className="flex items-start gap-1 min-w-0">
                    <strong className="flex-shrink-0">Barcode:</strong>
                    <code className="min-w-0 break-all bg-gray-100 px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs">{currentItem.barcode}</code>
                  </span>
                </div>
              </div>
              <button
                onClick={resetItemForm}
                className="flex-shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Cancel current inspection item"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            <div className="space-y-3 sm:space-y-6">
              {/* Classification - Mobile Responsive */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                  Classification *
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
                  {['GOOD', 'MINOR_DEFECT', 'MAJOR_DEFECT'].map((cls) => (
                    <motion.button
                      key={cls}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setClassification(cls);
                        if (cls === 'GOOD') {
                          setRecommendedAction('SELL_NORMAL');
                          setIsSellable(true);
                        } else if (cls === 'MINOR_DEFECT') {
                          setRecommendedAction('SELL_DISCOUNT');
                          setIsSellable(true);
                        } else {
                          setRecommendedAction('RETURN_SUPPLIER');
                          setIsSellable(false);
                        }
                      }}
                      className={`min-h-14 p-3 sm:min-h-0 sm:p-4 rounded-lg border-2 transition-all ${
                        classification === cls
                          ? cls === 'GOOD'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : cls === 'MINOR_DEFECT'
                            ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                            : 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-300 bg-white text-gray-700'
                      }`}
                    >
                      {cls === 'GOOD' && <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2" />}
                      {cls === 'MINOR_DEFECT' && <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2" />}
                      {cls === 'MAJOR_DEFECT' && <XCircle className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2" />}
                      <div className="font-semibold text-xs sm:text-sm text-center">
                        {cls === 'GOOD' ? 'Good Quality' : cls === 'MINOR_DEFECT' ? 'Minor Defect' : 'Major Defect'}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Defect Details (shown if not GOOD) - Mobile Responsive */}
              {classification !== 'GOOD' && (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        Defect Type
                      </label>
                      <select
                        value={defectType}
                        onChange={(e) => setDefectType(e.target.value)}
                        className="w-full min-h-11 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      >
                        <option value="">Select Type</option>
                        <option value="SCRATCH">Scratch</option>
                        <option value="CRACK">Crack</option>
                        <option value="TEAR">Tear</option>
                        <option value="STAIN">Stain</option>
                        <option value="DEFORMATION">Deformation</option>
                        <option value="WRONG_PRODUCT">Wrong Product</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        Location
                      </label>
                      <select
                        value={defectLocation}
                        onChange={(e) => setDefectLocation(e.target.value)}
                        className="w-full min-h-11 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      >
                        <option value="">Select Location</option>
                        <option value="TREAD">Tread</option>
                        <option value="SIDEWALL">Sidewall</option>
                        <option value="BEAD">Bead</option>
                        <option value="SHOULDER">Shoulder</option>
                        <option value="MULTIPLE">Multiple Areas</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        Severity
                      </label>
                      <select
                        value={defectSeverity}
                        onChange={(e) => setDefectSeverity(e.target.value)}
                        className="w-full min-h-11 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      >
                        <option value="">Select Severity</option>
                        <option value="COSMETIC">Cosmetic (Minor)</option>
                        <option value="FUNCTIONAL">Functional</option>
                        <option value="CRITICAL">Critical (Severe)</option>
                      </select>
                    </div>

                    {classification === 'MINOR_DEFECT' && (
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                          Discount %
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="5"
                          value={discountPercentage}
                          onChange={(e) => setDiscountPercentage(e.target.value)}
                          className="w-full min-h-11 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                          placeholder="10"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Defect Description
                    </label>
                    <textarea
                      value={defectDescription}
                      onChange={(e) => setDefectDescription(e.target.value)}
                      rows={3}
                      className="w-full min-h-20 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      placeholder="Describe the defect in detail..."
                    />
                  </div>

                  {/* Photo Upload - Mobile Responsive */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Defect Photos
                    </label>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full sm:w-auto px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                      >
                        <Upload className="w-4 h-4" />
                        Upload Photos
                      </motion.button>
                      <span className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                        {photos.length} photo(s) uploaded
                      </span>
                    </div>

                    {photos.length > 0 && (
                      <div className="mt-3 sm:mt-4 grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
                        {photos.map((photo, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={photo.preview}
                              alt={`Defect ${index + 1}`}
                              className="w-full h-20 sm:h-24 object-cover rounded-lg border border-gray-300"
                            />
                            <button
                              type="button"
                              onClick={() => removePhoto(index)}
                              className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Quality Notes - Mobile Responsive */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Quality Notes
                </label>
                <textarea
                  value={qualityNotes}
                  onChange={(e) => setQualityNotes(e.target.value)}
                  rows={2}
                  className="w-full min-h-16 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  placeholder="Additional notes..."
                />
              </div>

              {/* Actions - Mobile Responsive */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={resetItemForm}
                  className="w-full min-h-11 sm:w-auto sm:px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
                >
                  Cancel
                </button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={recordInspectionItem}
                  disabled={loading}
                  className="w-full min-h-11 sm:w-auto sm:px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <CheckCircle className="w-4 h-4" />
                  Record Inspection
                </motion.button>
              </div>
            </div>
          </div>
        )}

        {/* Complete Button - Mobile Responsive */}
        {selectedInspection.total_items > 0 && selectedInspection.items_inspected >= selectedInspection.total_items && (
          <div className="sticky bottom-2 z-10 flex justify-end px-2 sm:static sm:px-0">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={completeInspection}
              disabled={loading}
              className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 font-semibold disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              Complete QC Inspection
            </motion.button>
          </div>
        )}

        {/* Camera Scanner Modal - Mobile Responsive */}
        <AnimatePresence>
          {showCamera && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-1.5 backdrop-blur-sm sm:p-4"
              onClick={closeCamera}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="my-auto min-h-[calc(100dvh-0.75rem)] max-h-[calc(100dvh-0.75rem)] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl sm:min-h-0 sm:max-h-[95vh] sm:rounded-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 text-white sticky top-0 z-10">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <Video className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                    <div className="min-w-0">
                      <h3 className="text-lg sm:text-xl font-bold truncate">Barcode Scanner</h3>
                      <p className="text-xs sm:text-sm text-blue-100 truncate">Position code in frame</p>
                    </div>
                  </div>
                  <button
                    onClick={closeCamera}
                    className="p-1.5 sm:p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors flex-shrink-0 ml-2"
                  >
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>

                <div className="p-2 sm:p-6">
                  <BarcodeScanner
                    onScan={handleCameraScan}
                    onError={(error) => {
                      console.error('Scanner error:', error);
                      setAlert({ type: 'error', message: 'Camera error. Please check permissions.' });
                      closeCamera();
                    }}
                  />
                </div>

                <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
                    <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p><strong>Tip:</strong> Hold steady with good lighting</p>
                      <p>• Supports QR codes and barcodes</p>
                      <p>• Auto-detects codes in frame</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Inspections List View
  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 overflow-x-hidden p-2 sm:space-y-6 sm:p-0">
      {/* Header - Mobile Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
            <span className="truncate">QC Inspection</span>
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Quality Control Inspection Dashboard</p>
        </div>
        <button
          type="button"
          onClick={startAdHocInspection}
          disabled={loading}
          aria-label="Report a defective product"
          title="Report a defective product"
          className="flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-red-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-44 sm:w-auto sm:text-base"
        >
          <Camera className="h-5 w-5" />
          <span>Report Defect</span>
        </button>
      </div>

      {/* Alert */}
      <AnimatePresence>
        {alert && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-3 sm:p-4 rounded-lg text-sm sm:text-base ${
              alert.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 
              alert.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
              'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {alert.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Overview Cards - Enhanced - Always visible */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <motion.div
            whileHover={{ y: -4 }}
            className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-md border border-blue-200 p-3 sm:p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-blue-700">Pending Inspections</p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-900 mt-1">
                  {inspections.filter(i => i.status === 'PENDING').length}
                </p>
                <p className="text-xs text-blue-600 mt-1">Ready to inspect</p>
              </div>
              <div className="hidden rounded-lg bg-blue-100 p-3 sm:block">
                <ClipboardCheck className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl shadow-md border border-yellow-200 p-3 sm:p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-yellow-700">In Progress</p>
                <p className="text-2xl sm:text-3xl font-bold text-yellow-900 mt-1">
                  {inspections.filter(i => i.status === 'IN_PROGRESS').length}
                </p>
                <p className="text-xs text-yellow-600 mt-1">Currently inspecting</p>
              </div>
              <div className="hidden rounded-lg bg-yellow-100 p-3 sm:block">
                <Activity className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl shadow-md border border-red-200 p-3 sm:p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-red-700">Overdue</p>
                <p className="text-2xl sm:text-3xl font-bold text-red-900 mt-1">
                  {inspections.filter(i => i.is_overdue).length}
                </p>
                <p className="text-xs text-red-600 mt-1">Requires attention</p>
              </div>
              <div className="hidden rounded-lg bg-red-100 p-3 sm:block">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-md border border-green-200 p-3 sm:p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-green-700">Total Items</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-900 mt-1">
                  {inspections.reduce((sum, i) => sum + (i.total_items || 0), 0)}
                </p>
                <p className="text-xs text-green-600 mt-1">Awaiting inspection</p>
              </div>
              <div className="hidden rounded-lg bg-green-100 p-3 sm:block">
                <Package className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </motion.div>
        </div>

      {/* Search - Mobile Responsive */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-3 sm:p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search inspections..."
            className="w-full pl-9 sm:pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
          />
        </div>
      </div>

      {/* Inspections List - Mobile Responsive */}
      <div className="grid gap-3 sm:gap-4">
        {loading && filteredInspections.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-sm sm:text-base">Loading inspections...</p>
          </div>
        ) : filteredInspections.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <ClipboardCheck className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-sm sm:text-base">No pending QC inspections</p>
          </div>
        ) : (
          filteredInspections.map((inspection) => {
            const deadlineStatus = getDeadlineStatus(inspection.due_date, inspection.is_overdue);
            const DeadlineIcon = deadlineStatus.icon;
            const progress = inspection.total_items > 0 
              ? (inspection.items_inspected / inspection.total_items) * 100 
              : 0;

            return (
              <motion.div
                key={inspection.id}
                whileHover={{ scale: 1.01, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                className={`bg-white rounded-xl shadow-md border-2 p-4 sm:p-6 cursor-pointer transition-all ${
                  inspection.is_overdue ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
                onClick={() => startInspection(inspection)}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                        {inspection.inspection_number}
                      </h3>
                      
                      {/* QC Deadline Badge */}
                      <QCDeadlineBadge 
                        urgencyLevel={inspection.urgency_level}
                        daysRemaining={inspection.days_remaining}
                        hasDeadline={inspection.has_deadline}
                        deadlineType={inspection.deadline_type}
                      />
                      
                      {inspection.status === 'IN_PROGRESS' && (
                        <span className="px-2 sm:px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">
                          IN PROGRESS
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600">
                      Shipment: <span className="font-semibold text-gray-900">{inspection.shipment_number}</span>
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-md bg-blue-50 px-2 py-1 font-medium text-blue-700">
                        Expected: {inspection.total_items || 0} items
                      </span>
                      {(inspection.product_count || inspection.products_count) && (
                        <span className="rounded-md bg-indigo-50 px-2 py-1 font-medium text-indigo-700">
                          Products: {inspection.product_count || inspection.products_count}
                        </span>
                      )}
                      {(inspection.size_count || inspection.sizes_count) && (
                        <span className="rounded-md bg-violet-50 px-2 py-1 font-medium text-violet-700">
                          Sizes: {inspection.size_count || inspection.sizes_count}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 flex-shrink-0" />
                </div>

                {/* Stats Grid - Enhanced */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-blue-600 font-medium">Total Items</p>
                    <p className="text-2xl font-bold text-blue-900">{inspection.total_items}</p>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-green-600 font-medium">Inspected</p>
                    <p className="text-2xl font-bold text-green-900">{inspection.items_inspected}</p>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-xs text-purple-600 font-medium">Remaining</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {inspection.total_items - inspection.items_inspected}
                    </p>
                  </div>
                  
                  <div className="bg-indigo-50 rounded-lg p-3">
                    <p className="text-xs text-indigo-600 font-medium">Progress</p>
                    <p className="text-2xl font-bold text-indigo-900">{Math.round(progress)}%</p>
                  </div>
                </div>

                {/* Progress Bar - Enhanced */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Inspection Progress</span>
                    <span className="text-sm font-bold text-gray-900">{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${
                        progress === 100 ? 'bg-green-500' :
                        progress >= 75 ? 'bg-blue-500' :
                        progress >= 50 ? 'bg-yellow-500' :
                        'bg-orange-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Footer Info */}
                <div className="pt-4 border-t border-gray-200 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Due: {inspection.due_date 
                          ? new Date(inspection.due_date).toLocaleDateString()
                          : 'No deadline'}
                      </span>
                    </div>
                  </div>
                  
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                    {inspection.status === 'IN_PROGRESS' ? 'Continue' : 'Start Inspection'}
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
