/**
 * ============================================================================
 * RECEIVING - WAREHOUSE STAFF (ENHANCED)
 * ============================================================================
 * Complete receiving workflow for warehouse staff
 * - View incoming shipments
 * - Start receiving process
 * - Scan and verify items
 * - Assign storage locations
 * - Complete receiving
 * ============================================================================
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck,
  Package,
  ScanBarcode,
  MapPin,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  PlayCircle,
  Calendar,
  Clock,
  User,
  FileText,
  ChevronRight,
  Search,
  Filter,
  RefreshCw,
  BoxIcon,
  Warehouse,
  CheckCheck,
  Video,
  VideoOff,
  Flashlight,
  FlashlightOff,
  SwitchCamera,
  Volume2,
  VolumeX,
  History
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import api from '../../../services/api.js';
import { toast } from '../../../utils/toast';

export default function ReceivingEnhanced() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedShipments, setExpandedShipments] = useState({});

  // Receiving modal state
  const [showReceivingModal, setShowReceivingModal] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [receivingItems, setReceivingItems] = useState([]); // All expected items with sizes
  const [receivingStep, setReceivingStep] = useState('selectSize'); // selectSize, scanSize, review, report
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [scanValue, setScanValue] = useState('');
  const [notes, setNotes] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  
  // NEW: Size-by-size receiving state
  const [selectedSize, setSelectedSize] = useState(null); // Currently selected size to scan
  const [availableSizes, setAvailableSizes] = useState([]); // All unique sizes from shipment
  const [sizeProgress, setSizeProgress] = useState({}); // Track progress per size: { size: { expected, scanned, discrepancy, items: [] } }
  const [completedSizes, setCompletedSizes] = useState([]); // Sizes that are done scanning
  const [scannedCount, setScannedCount] = useState(0); // Current scan count for selected size
  
  // Enhanced camera features
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [selectedCamera, setSelectedCamera] = useState('environment');
  const [availableCameras, setAvailableCameras] = useState([]);
  const [recentScans, setRecentScans] = useState([]);
  const [continuousScanMode, setContinuousScanMode] = useState(false);
  
  const scanInputRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const videoTrackRef = useRef(null);
  const scannerRegionId = 'receiving-qr-scanner-region';

  // Load shipments
  const loadShipments = async () => {
    try {
      setRefreshing(true);
      const { data } = await api.get('/warehouse/receiving', {
        params: { status: statusFilter === 'all' ? undefined : statusFilter }
      });
      
      if (data.success) {
        setShipments(data.shipments || []);
      }
    } catch (error) {
      console.error('Error loading shipments:', error);
      toast.error('Failed to load shipments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadShipments();
  }, [statusFilter]);

  // Load saved preferences
  useEffect(() => {
    const savedSound = localStorage.getItem('scanSoundEnabled');
    const savedVibration = localStorage.getItem('scanVibrationEnabled');
    if (savedSound !== null) setSoundEnabled(savedSound === 'true');
    if (savedVibration !== null) setVibrationEnabled(savedVibration === 'true');
    
    // Get available cameras
    getCameraDevices();
  }, []);

  // Get list of available cameras
  const getCameraDevices = async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      setAvailableCameras(devices);
      console.log('📷 Available cameras:', devices);
    } catch (err) {
      console.error('Failed to get cameras:', err);
    }
  };

  // Play scan sound
  const playScanSound = () => {
    if (!soundEnabled) return;
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      gainNode.gain.value = 0.3;
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
      
      console.log('🔊 Scan sound played');
    } catch (err) {
      console.error('Failed to play sound:', err);
    }
  };

  // Trigger vibration
  const triggerVibration = () => {
    if (!vibrationEnabled) return;
    if ('vibrate' in navigator) {
      navigator.vibrate(200);
      console.log('📳 Vibration triggered');
    }
  };

  // Toggle flash/torch
  const toggleFlash = async () => {
    if (!videoTrackRef.current) {
      try {
        const videoElement = document.querySelector(`#${scannerRegionId} video`);
        if (videoElement && videoElement.srcObject) {
          const tracks = videoElement.srcObject.getVideoTracks();
          if (tracks.length > 0) {
            videoTrackRef.current = tracks[0];
          }
        }
      } catch (err) {
        console.error('Could not access video track:', err);
      }
    }

    if (!videoTrackRef.current) {
      toast.error('Flash not available. Camera may not be started yet.');
      return;
    }
    
    try {
      const capabilities = videoTrackRef.current.getCapabilities();
      if (capabilities.torch) {
        await videoTrackRef.current.applyConstraints({
          advanced: [{ torch: !flashEnabled }]
        });
        setFlashEnabled(!flashEnabled);
        console.log('🔦 Flash toggled:', !flashEnabled);
      } else {
        toast.error('Flash not supported on this device');
      }
    } catch (err) {
      console.error('Failed to toggle flash:', err);
      toast.error('Failed to toggle flash');
    }
  };

  // Toggle camera (front/back)
  const toggleCamera = async () => {
    const newFacing = selectedCamera === 'environment' ? 'user' : 'environment';
    setSelectedCamera(newFacing);
    
    if (showCamera) {
      await stopCamera();
      setTimeout(() => startCamera(newFacing), 100);
    }
  };

  // Camera functions using html5-qrcode for real barcode detection
  const startCamera = async (facingMode = selectedCamera) => {
    try {
      setCameraError('');
      setShowCamera(true);

      await new Promise(resolve => setTimeout(resolve, 50));

      html5QrCodeRef.current = new Html5Qrcode(scannerRegionId);

      const config = {
        fps: 30, // Increased from 10 to 30 for faster scanning
        qrbox: { width: 250, height: 250 }, // Reduced from 300 to optimize detection area
        aspectRatio: 1.0,
        disableFlip: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E
        ],
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        },
        // Add advanced config for faster detection
        willReadFrequently: true,
        videoConstraints: {
          facingMode: { ideal: String(facingMode) },
          focusMode: 'continuous',
          advanced: [
            { focusMode: 'continuous' },
            { focusDistance: 0 }
          ]
        }
      };

      // Camera constraints - ensure facingMode is a string
      console.log('📷 Starting camera with facingMode:', facingMode, 'type:', typeof facingMode);
      const cameraConstraints = { facingMode: String(facingMode) };

      await html5QrCodeRef.current.start(
        cameraConstraints,
        config,
        (decodedText) => {
          console.log('🎯 Barcode detected:', decodedText);
          playScanSound();
          triggerVibration();
          
          // In continuous mode, keep camera running
          if (!continuousScanMode) {
            stopCamera();
          }
          
          setTimeout(() => {
            handleScanRef.current?.(decodedText);
          }, 100);
        },
        (errorMessage) => {
          // Scan errors are normal during scanning
        }
      );

      // Store video track for flash control
      setTimeout(() => {
        const videoElement = document.querySelector(`#${scannerRegionId} video`);
        if (videoElement && videoElement.srcObject) {
          const tracks = videoElement.srcObject.getVideoTracks();
          if (tracks.length > 0) {
            videoTrackRef.current = tracks[0];
          }
        }
      }, 500);

      toast.success('Camera started! Point at barcode to scan');
    } catch (error) {
      console.error('Camera error:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        facingMode: facingMode,
        selectedCamera: selectedCamera
      });
      setShowCamera(false);
      
      // More specific error messages
      let errorMsg = 'Unable to access camera. ';
      if (error.message.includes('Permission')) {
        errorMsg += 'Please allow camera permissions in your browser.';
      } else if (error.message.includes('facingMode')) {
        errorMsg += 'Camera configuration error. Try using manual entry.';
      } else if (error.message.includes('NotFoundError')) {
        errorMsg += 'No camera detected. Please connect a camera or use manual entry.';
      } else {
        errorMsg += 'Please check permissions or enter barcode manually.';
      }
      
      setCameraError(errorMsg);
      toast.error('Camera access denied or not available');
    }
  };

  const isStopping = useRef(false);

  const stopCamera = async () => {
    if (!html5QrCodeRef.current || isStopping.current) return;
    isStopping.current = true;
    try {
      const scanner = html5QrCodeRef.current;
      html5QrCodeRef.current = null;
      videoTrackRef.current = null;
      await scanner.stop();
      scanner.clear();
      setFlashEnabled(false);
      setContinuousScanMode(false); // Reset continuous mode when stopping
    } catch {
      // Ignore — scanner may already be stopped
    } finally {
      isStopping.current = false;
      setShowCamera(false);
      setCameraError('');
    }
  };

  // Fix video element styling to ensure it fills container properly - MOBILE RESPONSIVE
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      #${scannerRegionId} {
        width: 100% !important;
        height: 100% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        position: relative !important;
      }
      #${scannerRegionId} video {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
      }
      #${scannerRegionId} > div {
        width: 100% !important;
        height: 100% !important;
      }
      .qr-shaded-region {
        display: none !important;
      }
      
      /* Camera container styling - MOBILE RESPONSIVE */
      .receiving-camera-container {
        width: 100%;
        max-width: 640px;
        aspect-ratio: 4 / 3;
        overflow: hidden;
        margin: 0 auto;
        position: relative;
      }
      
      /* Responsive adjustments for mobile */
      @media (max-width: 768px) {
        .receiving-camera-container {
          max-width: 100%;
          aspect-ratio: 16 / 9;
          min-height: 300px;
        }
      }
      
      @media (max-width: 640px) {
        .receiving-camera-container {
          max-width: 100%;
          min-height: 250px;
        }
      }
      
      /* Mobile-optimized modal */
      @media (max-width: 640px) {
        .receiving-modal {
          margin: 0 !important;
          border-radius: 0 !important;
          max-width: 100% !important;
          max-height: 100vh !important;
          height: 100vh !important;
        }
      }
      
      /* Scanning animations */
      @keyframes scanLine {
        0%, 100% { top: 0%; opacity: 0.6; }
        50% { top: 100%; opacity: 1; }
      }
      
      @keyframes cornerPulse {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
      }
      
      @keyframes glowPulse {
        0%, 100% { box-shadow: 0 0 20px rgba(234, 179, 8, 0.5); }
        50% { box-shadow: 0 0 40px rgba(234, 179, 8, 0.8); }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      try {
        document.head.removeChild(style);
      } catch (e) {
        // Style already removed
      }
    };
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleCloseModal = async () => {
    await stopCamera();
    setContinuousScanMode(false); // Reset continuous mode
    setShowReceivingModal(false);
  };

  // Start receiving a shipment — NEW SIZE-BY-SIZE WORKFLOW
  const handleStartReceiving = async (shipment) => {
    try {
      setShowCamera(false);
      setCameraError('');
      
      // Check if shipment is already in INSPECTING status
      const isAlreadyInspecting = shipment.status === 'INSPECTING';
      
      // Only update status if not already INSPECTING
      if (!isAlreadyInspecting) {
        // Update shipment status to INSPECTING via the backend
        const { data: startData } = await api.post(`/warehouse/receiving/${shipment.id}/start`);
        
        if (!startData.success) {
          throw new Error('Failed to start receiving');
        }

        // Update local shipment state
        setSelectedShipment(startData.shipment);
        
        toast.success('Receiving started! Status updated to INSPECTING');
        
        // Reload shipments to reflect status change
        loadShipments();
      } else {
        // Already inspecting, just set the shipment
        setSelectedShipment(shipment);
        toast.info('Resuming receiving process...');
      }

      // Load expected items from the receiving-qc endpoint (has product + SKU info)
      const { data: expectedData } = await api.get(`/receiving-qc/expected-items/${shipment.id}`);
      console.log('📦 Expected items response:', expectedData);
      
      const expectedItems = expectedData.data || [];
      console.log('📦 Expected items array:', expectedItems);
      console.log('📦 Expected items count:', expectedItems.length);

      if (expectedItems.length === 0) {
        toast.error('No expected items found for this shipment. Please register expected items first.');
        return;
      }

      // Transform items with size information
      const transformedItems = expectedItems.map((item, index) => {
        console.log('📦 Transforming item:', item);
        return {
          id: `expected-${item.id || index}`,
          expectedItemId: item.id,
          productName: item.product
            ? `${item.product.brand || ''} ${item.product.model || ''}`.trim() || item.product.name
            : 'Unknown Product',
          sku: item.product?.sku || item.product?.product_code || '',
          size: item.product_size || item.product?.dimensions || '',
          quantity: item.expected_quantity || 0,
          expected: true,
          scanned: false,
          condition: 'GOOD',
          rackCode: '',
          positionCode: '',
          barcode: ''
        };
      });

      console.log('📦 Transformed items:', transformedItems);
      console.log('📦 Transformed items count:', transformedItems.length);

      // Extract unique sizes and initialize size progress tracking
      const uniqueSizes = [...new Set(transformedItems.map(item => item.size).filter(Boolean))];
      console.log('📏 Unique sizes found:', uniqueSizes);
      
      // Initialize progress for each size
      const initialProgress = {};
      uniqueSizes.forEach(size => {
        const itemsForSize = transformedItems.filter(item => item.size === size);
        const expectedQty = itemsForSize.reduce((sum, item) => sum + item.quantity, 0);
        
        initialProgress[size] = {
          expected: expectedQty,
          scanned: 0,
          discrepancy: 0,
          items: [],
          status: 'pending' // pending, scanning, completed
        };
      });

      setReceivingItems(transformedItems);
      setAvailableSizes(uniqueSizes);
      setSizeProgress(initialProgress);
      setCompletedSizes([]);
      setSelectedSize(null);
      setScannedCount(0);
      setReceivingStep('selectSize');
      setShowReceivingModal(true);

      toast.success(`Found ${uniqueSizes.length} different sizes to receive`);
    } catch (error) {
      console.error('Error starting receiving:', error);
      toast.error(error.response?.data?.error || 'Failed to start receiving process');
    }
  };

  // Stable ref so the camera callback can always call the latest handleScan
  const handleScanRef = useRef(null);

  // NEW: Handle size selection
  const handleSelectSize = (size) => {
    setSelectedSize(size);
    setScannedCount(0);
    setReceivingStep('scanSize');
    setContinuousScanMode(false); // Reset continuous mode when selecting new size
    
    // Update size status to scanning
    setSizeProgress(prev => ({
      ...prev,
      [size]: { ...prev[size], status: 'scanning' }
    }));
    
    toast.info(`Now scanning: ${size}`);
    
    // Focus scan input after a brief delay
    setTimeout(() => scanInputRef.current?.focus(), 100);
  };

  // NEW: Handle scan for size-by-size workflow with validation
  const handleScanForSize = async (scannedValue) => {
    const value = (scannedValue || scanValue).trim();
    if (!value) {
      toast.error('Please enter a barcode');
      return;
    }

    if (!selectedSize) {
      toast.error('Please select a size first');
      return;
    }

    console.log('📦 Scanning barcode for size:', selectedSize, 'Barcode:', value);

    try {
      // ✅ CHECK FOR DUPLICATE BARCODE FIRST
      const currentItems = sizeProgress[selectedSize]?.items || [];
      const isDuplicate = currentItems.some(item => item.barcode === value);
      
      if (isDuplicate) {
        // ⚠️ DUPLICATE DETECTED - Don't count it again
        console.warn('⚠️ Duplicate barcode detected:', value);
        toast.warning(`⚠️ Duplicate! This barcode was already scanned.`);
        
        // Play distinctive sound for duplicate (different pitch)
        if (soundEnabled) {
          try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 400; // Mid frequency for warning
            gainNode.gain.value = 0.3;
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
            
            // Double beep for duplicate
            setTimeout(() => {
              const osc2 = audioContext.createOscillator();
              const gain2 = audioContext.createGain();
              osc2.connect(gain2);
              gain2.connect(audioContext.destination);
              osc2.frequency.value = 400;
              gain2.gain.value = 0.3;
              osc2.start(audioContext.currentTime);
              osc2.stop(audioContext.currentTime + 0.2);
            }, 150);
          } catch (err) {
            console.error('Failed to play duplicate sound:', err);
          }
        }

        // Vibrate pattern for duplicate (two short pulses)
        if (vibrationEnabled && 'vibrate' in navigator) {
          navigator.vibrate([100, 100, 100]);
        }

        setScanValue('');
        
        // In continuous mode, keep camera running
        if (!continuousScanMode && showCamera) {
          await stopCamera();
        }
        
        return; // Don't count duplicate
      }

      // ✅ VALIDATE BARCODE AGAINST SELECTED SIZE
      // Call backend API to verify this barcode matches the selected size
      const { data: validationData } = await api.post('/warehouse/validate-barcode-size', {
        barcode: value,
        expected_size: selectedSize,
        shipment_id: selectedShipment.id
      });

      if (!validationData.success) {
        // ❌ Barcode doesn't match the selected size
        const actualSize = validationData.actual_size || 'Unknown';
        let errorMessage = validationData.message || `Wrong size! Expected: ${selectedSize}, Scanned: ${actualSize}`;
        
        // If barcode format couldn't be parsed, show helpful message
        if (validationData.source === 'unable_to_validate') {
          errorMessage = `Cannot read size from barcode. Please enter manually.\nBarcode: ${value.substring(0, 20)}...`;
        } else if (actualSize !== 'Unknown') {
          errorMessage = `❌ Wrong Size!\nExpected: ${selectedSize}\nScanned: ${actualSize}`;
        }
        
        toast.error(errorMessage);
        
        // Play error sound
        if (soundEnabled) {
          try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 200; // Lower frequency for error
            gainNode.gain.value = 0.3;
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
          } catch (err) {
            console.error('Failed to play error sound:', err);
          }
        }

        // Vibrate twice for error
        if (vibrationEnabled && 'vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }

        setScanValue('');
        return; // Don't count this scan
      }

      // ✅ Barcode is valid for this size - proceed with counting
      // Show warning if validation was uncertain
      if (validationData.warning) {
        console.warn('⚠️ Validation warning:', validationData.warning);
      }

      const newCount = scannedCount + 1;
      setScannedCount(newCount);
      setScanValue('');

      // Record the scanned item
      const scanRecord = { 
        barcode: value, 
        timestamp: new Date(),
        size: selectedSize,
        validated: true,
        validation_source: validationData.source || 'unknown'
      };
      
      setSizeProgress(prev => ({
        ...prev,
        [selectedSize]: {
          ...prev[selectedSize],
          scanned: newCount,
          discrepancy: prev[selectedSize].expected - newCount,
          items: [...prev[selectedSize].items, scanRecord]
        }
      }));

      // Add to recent scans
      setRecentScans(prev => [scanRecord, ...prev].slice(0, 10));

      // Show success with count
      toast.success(`✅ Item ${newCount} scanned for ${selectedSize}`);
      playScanSound();
      triggerVibration();

      // In continuous mode, DON'T stop camera - just keep focus
      if (!continuousScanMode) {
        // Stop camera if not in continuous mode
        if (showCamera) {
          await stopCamera();
        }
      }

      // Auto-focus for next scan (manual input or continuous camera)
      setTimeout(() => scanInputRef.current?.focus(), 50);

    } catch (error) {
      console.error('❌ Error validating barcode:', error);
      toast.error(error.response?.data?.error || 'Failed to validate barcode');
      setScanValue('');
    }
  };

  // NEW: Complete scanning for current size
  const handleCompleteSizeScanning = () => {
    if (!selectedSize) return;

    const progress = sizeProgress[selectedSize];
    const discrepancy = progress.expected - progress.scanned;

    // Mark this size as completed
    setCompletedSizes(prev => [...prev, selectedSize]);
    setSizeProgress(prev => ({
      ...prev,
      [selectedSize]: { ...prev[selectedSize], status: 'completed', discrepancy }
    }));

    if (discrepancy !== 0) {
      toast.warning(
        `Size ${selectedSize} completed with discrepancy: Expected ${progress.expected}, Received ${progress.scanned}, ${discrepancy > 0 ? 'Short' : 'Over'}: ${Math.abs(discrepancy)}`
      );
    } else {
      toast.success(`✅ Size ${selectedSize} completed - no discrepancies!`);
    }

    // Return to size selection
    setSelectedSize(null);
    setScannedCount(0);
    setReceivingStep('selectSize');

    // Check if all sizes are complete
    if (completedSizes.length + 1 === availableSizes.length) {
      setTimeout(() => {
        toast.info('All sizes scanned! Review the report.');
        setReceivingStep('report');
      }, 1500);
    }
  };

  // Original handleScan - now delegates to size-specific handler
  const handleScan = async (scannedValue) => {
    if (receivingStep === 'scanSize') {
      return handleScanForSize(scannedValue);
    }
    
    // Legacy behavior for other steps (if needed)
    const value = (scannedValue || scanValue).trim();
    if (!value) {
      toast.error('Please enter a barcode');
      return;
    }

    console.log('📦 Scanning barcode:', value);
    setScanValue('');
    toast.success(`✅ Item scanned!`);

    if (showCamera) {
      await stopCamera();
    }
  };

  // Keep handleScanRef in sync
  useEffect(() => {
    handleScanRef.current = handleScan;
  });

  // Handle item condition update
  const handleUpdateCondition = (index, condition) => {
    const updated = [...receivingItems];
    updated[index].condition = condition;
    setReceivingItems(updated);
  };

  // Assign storage location
  const handleAssignLocation = (index, rackCode, positionCode) => {
    const updated = [...receivingItems];
    updated[index].rackCode = rackCode;
    updated[index].positionCode = positionCode;
    setReceivingItems(updated);
  };

  // Complete receiving
  const handleCompleteReceiving = async () => {
    try {
      // Validate all items have locations
      const unassigned = receivingItems.filter(item => !item.rackCode || !item.positionCode);
      if (unassigned.length > 0) {
        toast.error('Please assign storage locations to all items');
        return;
      }

      const { data } = await api.post(`/warehouse/receiving/${selectedShipment.id}/complete`, {
        notes,
        receivedItems: receivingItems.map(item => ({
          id: item.id,
          condition: item.condition,
          rackCode: item.rackCode,
          positionCode: item.positionCode
        }))
      });

      if (data.success) {
        toast.success('Receiving completed successfully!');
        setShowReceivingModal(false);
        loadShipments();
      }
    } catch (error) {
      console.error('Error completing receiving:', error);
      toast.error('Failed to complete receiving');
    }
  };

  // Toggle breakdown expansion
  const toggleBreakdown = (shipmentId) => {
    setExpandedShipments(prev => ({
      ...prev,
      [shipmentId]: !prev[shipmentId]
    }));
  };

  // Filtered shipments
  const filteredShipments = shipments.filter(shipment => {
    const matchesSearch = 
      shipment.shipment_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.supplier?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.container_number?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-slate-600">Loading shipments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Mobile Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            Receiving
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Receive incoming shipments and assign storage locations
          </p>
        </div>

        <button
          onClick={loadShipments}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50 text-sm sm:text-base"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters - Mobile Responsive */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search shipments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Status</option>
          <option value="IN_TRANSIT">In Transit</option>
          <option value="ARRIVED">Arrived</option>
          <option value="INSPECTING">Inspecting</option>
          <option value="RECEIVED">Received</option>
        </select>
      </div>

      {/* Summary Cards - Always Visible */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Shipments</p>
              <p className="text-2xl font-bold text-slate-900">{shipments.length}</p>
            </div>
            <Package className="w-8 h-8 text-slate-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-indigo-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">In Transit</p>
              <p className="text-2xl font-bold text-indigo-600">
                {shipments.filter(s => s.status === 'IN_TRANSIT').length}
              </p>
            </div>
            <Truck className="w-8 h-8 text-indigo-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Inspecting</p>
              <p className="text-2xl font-bold text-blue-600">
                {shipments.filter(s => s.status === 'INSPECTING').length}
              </p>
            </div>
            <ScanBarcode className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-green-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {shipments.filter(s => s.status === 'RECEIVED').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Shipments List */}
      {filteredShipments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Package className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No shipments found</p>
          <p className="text-sm text-slate-500 mt-1">
            {searchQuery ? 'Try adjusting your search' : 'No incoming shipments at this time'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredShipments.map((shipment) => (
            <motion.div
              key={shipment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-slate-200 hover:shadow-lg transition-all overflow-hidden"
            >
              {/* Card Header - Clickable to expand/collapse - Mobile Responsive */}
              <div 
                className="p-4 sm:p-6 cursor-pointer"
                onClick={() => toggleBreakdown(shipment.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 flex-wrap">
                      <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                        {shipment.shipment_number}
                      </h3>
                      <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold whitespace-nowrap ${
                        shipment.status === 'RECEIVED' ? 'bg-green-100 text-green-700' :
                        shipment.status === 'INSPECTING' ? 'bg-blue-100 text-blue-700' :
                        shipment.status === 'IN_TRANSIT' ? 'bg-indigo-100 text-indigo-700' :
                        shipment.status === 'ARRIVED' ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {shipment.status}
                      </span>
                      <ChevronRight 
                        className={`w-4 h-4 sm:w-5 sm:h-5 text-slate-400 transition-transform ml-auto flex-shrink-0 ${
                          expandedShipments[shipment.id] ? 'rotate-90' : ''
                        }`}
                      />
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
                      <div>
                        <p className="text-slate-500 text-[10px] sm:text-xs mb-1">Supplier</p>
                        <p className="text-slate-900 font-semibold text-xs sm:text-sm truncate">
                          {shipment.supplier?.name || 'QUINGDAO MARVEL STAR INDUSTRIAL'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-[10px] sm:text-xs mb-1">Container</p>
                        <p className="text-slate-900 font-medium text-xs sm:text-sm">{shipment.container_number || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-[10px] sm:text-xs mb-1">Expected Qty</p>
                        <p className="text-slate-900 font-semibold flex items-center gap-1 text-xs sm:text-sm">
                          <BoxIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                          {shipment.expected_quantity || 0} units
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-[10px] sm:text-xs mb-1">Arrival Date</p>
                        <p className="text-slate-900 font-medium flex items-center gap-1 text-xs sm:text-sm">
                          <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                          {shipment.expected_arrival_date
                            ? new Date(shipment.expected_arrival_date).toLocaleDateString()
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>


              {/* Product Breakdown Table - Expandable */}
              <AnimatePresence>
                {expandedShipments[shipment.id] && shipment.product_breakdown && typeof shipment.product_breakdown === 'object' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-t border-slate-200"
                  >
                    <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                      <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 text-xs sm:text-sm">
                          <div>
                            <span className="text-slate-600">Total Products:</span>
                            <span className="ml-2 font-bold text-slate-900">
                              {Array.isArray(shipment.product_breakdown) 
                                ? shipment.product_breakdown.length 
                                : Object.keys(shipment.product_breakdown).length} types
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-600">Total Quantity:</span>
                            <span className="ml-2 font-bold text-blue-600">
                              {Array.isArray(shipment.product_breakdown)
                                ? shipment.product_breakdown.reduce((sum, item) => sum + (item.quantity || 0), 0)
                                : Object.values(shipment.product_breakdown).reduce((sum, item) => {
                                    return sum + (typeof item === 'number' ? item : (item.quantity || 0));
                                  }, 0)} units
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-600">Total Value:</span>
                            <span className="ml-2 font-bold text-slate-900">₱0</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <Package className="w-4 h-4 text-blue-600" />
                        <h4 className="font-semibold text-sm sm:text-base text-slate-900">Product Size Breakdown</h4>
                      </div>

                      <div className="overflow-x-auto -mx-4 sm:mx-0">
                        <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                          <table className="w-full text-xs sm:text-sm">
                            <thead>
                              <tr className="border-b border-slate-200">
                                <th className="text-left py-2 px-2 sm:px-3 text-slate-600 font-medium text-[10px] sm:text-xs">PRODUCT</th>
                                <th className="text-left py-2 px-2 sm:px-3 text-slate-600 font-medium text-[10px] sm:text-xs">SIZE</th>
                                <th className="text-center py-2 px-2 sm:px-3 text-slate-600 font-medium text-[10px] sm:text-xs">QTY</th>
                                <th className="text-left py-2 px-2 sm:px-3 text-slate-600 font-medium text-[10px] sm:text-xs hidden sm:table-cell">POSITIONS</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(Array.isArray(shipment.product_breakdown)
                                ? shipment.product_breakdown
                                : Object.entries(shipment.product_breakdown).map(([key, value]) => {
                                    // Handle both formats: { "size": quantity } or { "size": { ...details } }
                                    if (typeof value === 'number') {
                                      return { dimensions: key, quantity: value };
                                    } else if (typeof value === 'object') {
                                      return { dimensions: key, ...value };
                                    }
                                    return null;
                                  }).filter(Boolean)
                              ).map((item, index) => {
                                const size = item.dimensions || item.size || item.product_size || 'Unknown';
                                const quantity = item.quantity || 0;
                                const productName = item.product_name || item.brand || 'Red Indian Customs Dual Sport XT';
                                const sku = item.sku || `DSXT-17-${size.replace('/', '-')}`;
                                
                                return (
                                  <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="py-2 sm:py-3 px-2 sm:px-3">
                                      <div>
                                        <p className="font-medium text-slate-900 text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{productName}</p>
                                        <p className="text-[10px] sm:text-xs text-slate-500 hidden sm:block">{productName} {size}</p>
                                        <p className="text-[10px] sm:text-xs text-slate-400">SKU: {sku}</p>
                                      </div>
                                    </td>
                                    <td className="py-2 sm:py-3 px-2 sm:px-3">
                                      <span className="inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-blue-100 text-blue-700 font-medium text-[10px] sm:text-xs">
                                        {size}
                                      </span>
                                    </td>
                                    <td className="py-2 sm:py-3 px-2 sm:px-3 text-center">
                                      <span className="font-bold text-slate-900 text-xs sm:text-sm">{quantity}</span>
                                    </td>
                                    <td className="py-2 sm:py-3 px-2 sm:px-3 hidden sm:table-cell">
                                      <div className="flex flex-wrap gap-1">
                                        {item.assigned_positions && Array.isArray(item.assigned_positions) && item.assigned_positions.length > 0 ? (
                                          item.assigned_positions.slice(0, 4).map((pos, i) => {
                                            // Handle if pos is an object with position_code or if it's a string
                                            const positionCode = typeof pos === 'string' ? pos : (pos.position_code || 'N/A');
                                            return (
                                              <span key={i} className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 bg-green-100 text-green-700 rounded font-mono">
                                                {positionCode}
                                              </span>
                                            );
                                          })
                                        ) : (
                                          // Mock assigned positions if none exist
                                          Array.from({ length: Math.min(4, Math.ceil(quantity / 14)) }).map((_, i) => (
                                            <span key={i} className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 bg-green-100 text-green-700 rounded font-mono">
                                              WH2-R02-RK01-S06-SH0{i + 7}-SUB01
                                            </span>
                                          ))
                                        )}
                                        {item.assigned_positions && Array.isArray(item.assigned_positions) && item.assigned_positions.length > 4 && (
                                          <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 text-slate-600">
                                            +{item.assigned_positions.length - 4} more
                                          </span>
                                        )}
                                        {quantity > 56 && (!item.assigned_positions || item.assigned_positions.length === 0) && (
                                          <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 text-slate-600">
                                            ({Math.ceil(quantity / 14)} units)
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                              <tr className="bg-slate-50 font-bold">
                                <td colSpan="2" className="py-2 sm:py-3 px-2 sm:px-3 text-slate-900 text-xs sm:text-sm">TOTAL</td>
                                <td className="py-2 sm:py-3 px-2 sm:px-3 text-center text-slate-900 text-xs sm:text-sm">
                                  {Array.isArray(shipment.product_breakdown)
                                    ? shipment.product_breakdown.reduce((sum, item) => sum + (item.quantity || 0), 0)
                                    : Object.values(shipment.product_breakdown).reduce((sum, item) => {
                                        return sum + (typeof item === 'number' ? item : (item.quantity || 0));
                                      }, 0)}
                                </td>
                                <td className="py-2 sm:py-3 px-2 sm:px-3 hidden sm:table-cell"></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Action Card - Changes based on shipment status */}
                      {/* Action Card - IN_TRANSIT - Mobile Responsive */}
                      {shipment.status === 'IN_TRANSIT' && (
                        <div className="p-3 sm:p-4 rounded-lg bg-blue-50 border border-blue-200 flex flex-col sm:flex-row items-start gap-2 sm:gap-3">
                          <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm sm:text-base text-blue-900">Ready to Receive</p>
                            <p className="text-xs sm:text-sm text-blue-700 mt-1">
                              Click "Start Receiving" to begin the inspection and scanning process.
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartReceiving(shipment);
                            }}
                            className="w-full sm:w-auto px-3 sm:px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap shadow-md text-sm sm:text-base"
                          >
                            <PlayCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Start Receiving
                          </button>
                        </div>
                      )}

                      {/* Action Card - INSPECTING - Mobile Responsive */}
                      {shipment.status === 'INSPECTING' && (
                        <div className="p-3 sm:p-4 rounded-lg bg-orange-50 border border-orange-200 flex flex-col sm:flex-row items-start gap-2 sm:gap-3">
                          <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 flex-shrink-0 mt-0.5 animate-pulse" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm sm:text-base text-orange-900">Receiving In Progress</p>
                            <p className="text-xs sm:text-sm text-orange-700 mt-1">
                              This shipment is currently being inspected. Click to continue scanning.
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartReceiving(shipment);
                            }}
                            className="w-full sm:w-auto px-3 sm:px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap shadow-md text-sm sm:text-base"
                          >
                            <ScanBarcode className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Continue Scanning
                          </button>
                        </div>
                      )}

                      {/* Action Card - ARRIVED - Mobile Responsive */}
                      {shipment.status === 'ARRIVED' && (
                        <div className="p-3 sm:p-4 rounded-lg bg-green-50 border border-green-200 flex flex-col sm:flex-row items-start gap-2 sm:gap-3">
                          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm sm:text-base text-green-900">Shipment Arrived</p>
                            <p className="text-xs sm:text-sm text-green-700 mt-1">
                              Shipment has arrived. Start the receiving process to inspect items.
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartReceiving(shipment);
                            }}
                            className="w-full sm:w-auto px-3 sm:px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap shadow-md text-sm sm:text-base"
                          >
                            <PlayCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Begin Inspection
                          </button>
                        </div>
                      )}

                      {/* Action Card - RECEIVED - Mobile Responsive */}
                      {shipment.status === 'RECEIVED' && (
                        <div className="p-3 sm:p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start gap-2 sm:gap-3">
                          <CheckCheck className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm sm:text-base text-slate-900">Receiving Completed</p>
                            <p className="text-xs sm:text-sm text-slate-600 mt-1">
                              This shipment has been fully received and stored.
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Optional: Add view details functionality
                            }}
                            className="w-full sm:w-auto px-3 sm:px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-700 text-white font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap text-sm sm:text-base"
                            disabled
                          >
                            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Completed ✓
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      {/* Receiving Modal - Mobile Responsive */}
      <AnimatePresence>
        {showReceivingModal && selectedShipment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center sm:p-4"
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="receiving-modal bg-white sm:rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] sm:max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header - Mobile Responsive */}
              <div className="sticky top-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 mr-2">
                    <h2 className="text-base sm:text-xl font-bold text-slate-900 truncate">
                      Receiving: {selectedShipment.shipment_number}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 line-clamp-1">
                      {receivingStep === 'selectSize' && 'Select a size/dimension to start scanning'}
                      {receivingStep === 'scanSize' && `Scanning: ${selectedSize}`}
                      {receivingStep === 'report' && 'Review discrepancy report'}
                    </p>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0"
                  >
                    <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
                  </button>
                </div>

                {/* Progress Indicator - Mobile Responsive */}
                <div className="mt-3 sm:mt-4 flex items-center gap-2">
                  <div className="flex-1 bg-slate-200 rounded-full h-2 sm:h-3 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-600 to-green-600 h-full transition-all duration-500"
                      style={{ width: `${(completedSizes.length / availableSizes.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-slate-700 whitespace-nowrap">
                    {completedSizes.length} / {availableSizes.length}
                  </span>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                {/* SIZE SELECTION STEP */}
                {receivingStep === 'selectSize' && (
                  <div className="space-y-4 sm:space-y-6">
                    <div className="text-center p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                      <Package className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600 mx-auto mb-2 sm:mb-3" />
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1 sm:mb-2">
                        Select Size to Scan
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600">
                        Choose a size/dimension below. The scanner will count all items of that size.
                      </p>
                    </div>

                    {/* Available Sizes Grid - Responsive */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {availableSizes.map((size) => {
                        const progress = sizeProgress[size];
                        const isCompleted = completedSizes.includes(size);
                        
                        return (
                          <motion.button
                            key={size}
                            onClick={() => !isCompleted && handleSelectSize(size)}
                            disabled={isCompleted}
                            whileHover={!isCompleted ? { scale: 1.02 } : {}}
                            whileTap={!isCompleted ? { scale: 0.98 } : {}}
                            className={`p-4 sm:p-6 rounded-xl border-2 text-left transition-all ${
                              isCompleted
                                ? 'bg-green-50 border-green-300 cursor-not-allowed opacity-75'
                                : 'bg-white border-blue-300 hover:border-blue-500 hover:shadow-lg cursor-pointer'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2 sm:mb-3">
                              <div className="flex-1 min-w-0 mr-2">
                                <div className="flex items-center gap-2 mb-1 sm:mb-2">
                                  <BoxIcon className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${isCompleted ? 'text-green-600' : 'text-blue-600'}`} />
                                  <span className="font-bold text-base sm:text-lg text-slate-900 truncate">{size}</span>
                                </div>
                                <p className="text-xs sm:text-sm text-slate-600">
                                  Expected: <span className="font-bold text-slate-900">{progress.expected}</span> units
                                </p>
                              </div>
                              {isCompleted ? (
                                <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 flex-shrink-0" />
                              ) : (
                                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
                              )}
                            </div>
                            
                            {isCompleted && (
                              <div className={`mt-3 pt-3 border-t ${
                                progress.discrepancy === 0 
                                  ? 'border-green-200' 
                                  : 'border-orange-200'
                              }`}>
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-600">Scanned:</span>
                                  <span className="font-bold text-slate-900">{progress.scanned}</span>
                                </div>
                                <div className="flex justify-between text-sm mt-1">
                                  <span className="text-slate-600">Discrepancy:</span>
                                  <span className={`font-bold ${
                                    progress.discrepancy === 0 
                                      ? 'text-green-600' 
                                      : progress.discrepancy > 0 
                                        ? 'text-orange-600' 
                                        : 'text-red-600'
                                  }`}>
                                    {progress.discrepancy === 0 
                                      ? '✓ None' 
                                      : progress.discrepancy > 0 
                                        ? `Short: ${progress.discrepancy}` 
                                        : `Over: ${Math.abs(progress.discrepancy)}`}
                                  </span>
                                </div>
                              </div>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* Action Buttons */}
                    {completedSizes.length === availableSizes.length && (
                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => setReceivingStep('report')}
                        className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2"
                      >
                        <FileText className="w-6 h-6" />
                        View Complete Report
                      </motion.button>
                    )}
                  </div>
                )}

                {/* SCANNING STEP - For selected size - Mobile Responsive */}
                {receivingStep === 'scanSize' && selectedSize && (
                  <div className="space-y-4 sm:space-y-6">
                    {/* Current Size Info - Mobile Responsive */}
                    <div className="p-4 sm:p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <div className="flex-1 min-w-0 mr-2">
                          <p className="text-xs sm:text-sm font-medium text-slate-600 mb-1">Currently Scanning:</p>
                          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">{selectedSize}</h3>
                        </div>
                        <BoxIcon className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600 flex-shrink-0" />
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                        <div className="p-2 sm:p-3 bg-white rounded-lg">
                          <p className="text-[10px] sm:text-xs text-slate-500 mb-1">Expected</p>
                          <p className="text-lg sm:text-2xl font-bold text-slate-900">{sizeProgress[selectedSize]?.expected || 0}</p>
                        </div>
                        <div className="p-2 sm:p-3 bg-white rounded-lg">
                          <p className="text-[10px] sm:text-xs text-slate-500 mb-1">Scanned</p>
                          <p className="text-lg sm:text-2xl font-bold text-blue-600">{scannedCount}</p>
                        </div>
                        <div className="p-2 sm:p-3 bg-white rounded-lg">
                          <p className="text-[10px] sm:text-xs text-slate-500 mb-1">Remaining</p>
                          <p className="text-lg sm:text-2xl font-bold text-orange-600">
                            {Math.max(0, (sizeProgress[selectedSize]?.expected || 0) - scannedCount)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Scanner Interface - Mobile Responsive */}
                    <div className="space-y-3 sm:space-y-4">
                      <label className="block text-xs sm:text-sm font-medium text-slate-700">
                        Scan Items - One at a Time
                      </label>
                      
                      {/* Scan Input and Camera Button */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          ref={scanInputRef}
                          type="text"
                          value={scanValue}
                          onChange={(e) => setScanValue(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleScanForSize()}
                          placeholder="Scan or enter barcode..."
                          disabled={showCamera}
                          className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border-2 border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base sm:text-lg font-mono disabled:bg-slate-100 disabled:cursor-not-allowed"
                        />
                        <button
                          onClick={showCamera ? stopCamera : () => startCamera()}
                          className={`w-full sm:w-auto px-4 py-2.5 sm:py-3 rounded-lg text-white font-semibold transition-all flex items-center justify-center gap-2 ${
                            showCamera 
                              ? 'bg-red-600 hover:bg-red-700' 
                              : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg'
                          }`}
                        >
                          <ScanBarcode className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span className="sm:inline">{showCamera ? 'Stop Camera' : 'Open Camera'}</span>
                        </button>
                      </div>

                      {/* Continuous Scan Toggle - Mobile Responsive */}
                      {showCamera && (
                        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 text-blue-600 ${continuousScanMode ? 'animate-spin' : ''}`} />
                            <div>
                              <p className="text-xs sm:text-sm font-semibold text-blue-900">Continuous Scan Mode</p>
                              <p className="text-[10px] sm:text-xs text-blue-700">Camera stays active between scans</p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setContinuousScanMode(!continuousScanMode);
                              toast.info(!continuousScanMode ? '🔄 Continuous scan enabled' : 'Single scan mode enabled');
                            }}
                            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all ${
                              continuousScanMode
                                ? 'bg-green-600 text-white shadow-lg'
                                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {continuousScanMode ? 'ON' : 'OFF'}
                          </button>
                        </div>
                      )}
                      
                      <p className="text-[10px] sm:text-xs text-slate-500 text-center sm:text-left">
                        {showCamera 
                          ? continuousScanMode
                            ? '📷 Continuous mode: Camera stays active - scan multiple items quickly'
                            : '📷 Point camera at QR code - detection is automatic' 
                          : '💡 Scan each item. The system counts automatically.'}
                      </p>
                    </div>

                    {/* Camera Preview with Enhanced Controls */}
                    <AnimatePresence>
                      {showCamera && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3"
                        >
                          {/* Camera Controls Bar - Mobile Responsive */}
                          <div className="flex items-center justify-between p-2 sm:p-3 bg-slate-800 rounded-lg">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <button
                                onClick={toggleFlash}
                                className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                                  flashEnabled 
                                    ? 'bg-yellow-500 text-white' 
                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                                title="Toggle Flash"
                              >
                                {flashEnabled ? (
                                  <Flashlight className="w-4 h-4 sm:w-5 sm:h-5" />
                                ) : (
                                  <FlashlightOff className="w-4 h-4 sm:w-5 sm:h-5" />
                                )}
                              </button>
                              
                              <button
                                onClick={toggleCamera}
                                className="p-1.5 sm:p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                                title="Switch Camera"
                              >
                                <SwitchCamera className="w-4 h-4 sm:w-5 sm:h-5" />
                              </button>

                              <button
                                onClick={() => {
                                  setSoundEnabled(!soundEnabled);
                                  localStorage.setItem('scanSoundEnabled', (!soundEnabled).toString());
                                }}
                                className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                                  soundEnabled 
                                    ? 'bg-green-600 text-white' 
                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                                title="Toggle Sound"
                              >
                                {soundEnabled ? (
                                  <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                ) : (
                                  <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />
                                )}
                              </button>
                            </div>

                            <div className="text-white text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2">
                              <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                              Camera Active
                            </div>
                          </div>

                          {/* Camera View */}
                          <div className="receiving-camera-container border-4 border-blue-500 rounded-xl overflow-hidden shadow-2xl bg-black relative">
                            <div id={scannerRegionId} className="w-full h-full" />
                            
                            {/* Professional Scanning Overlay */}
                            {showCamera && (
                              <div 
                                className="absolute inset-0"
                                style={{
                                  pointerEvents: 'none',
                                  zIndex: 1000
                                }}
                              >
                                {/* Gradient Overlays for Focus */}
                                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60" />
                                <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />
                                
                                {/* Central Scanning Frame */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="relative" style={{ width: '70%', aspectRatio: '1.2' }}>
                                    
                                    {/* Corner Brackets - Top Left */}
                                    <motion.div
                                      animate={{
                                        opacity: [0.6, 1, 0.6],
                                      }}
                                      transition={{ duration: 2, repeat: Infinity }}
                                      className="absolute top-0 left-0"
                                      style={{ width: '20%', height: '20%' }}
                                    >
                                      <div className="absolute top-0 left-0 w-full h-1 rounded-r-full bg-yellow-400 shadow-[0_0_20px_rgba(234,179,8,1)]" />
                                      <div className="absolute top-0 left-0 w-1 h-full rounded-b-full bg-yellow-400 shadow-[0_0_20px_rgba(234,179,8,1)]" />
                                    </motion.div>
                                    
                                    {/* Corner Brackets - Top Right */}
                                    <motion.div
                                      animate={{
                                        opacity: [0.6, 1, 0.6],
                                      }}
                                      transition={{ duration: 2, repeat: Infinity, delay: 0.25 }}
                                      className="absolute top-0 right-0"
                                      style={{ width: '20%', height: '20%' }}
                                    >
                                      <div className="absolute top-0 right-0 w-full h-1 rounded-l-full bg-yellow-400 shadow-[0_0_20px_rgba(234,179,8,1)]" />
                                      <div className="absolute top-0 right-0 w-1 h-full rounded-b-full bg-yellow-400 shadow-[0_0_20px_rgba(234,179,8,1)]" />
                                    </motion.div>
                                    
                                    {/* Corner Brackets - Bottom Left */}
                                    <motion.div
                                      animate={{
                                        opacity: [0.6, 1, 0.6],
                                      }}
                                      transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                                      className="absolute bottom-0 left-0"
                                      style={{ width: '20%', height: '20%' }}
                                    >
                                      <div className="absolute bottom-0 left-0 w-full h-1 rounded-r-full bg-yellow-400 shadow-[0_0_20px_rgba(234,179,8,1)]" />
                                      <div className="absolute bottom-0 left-0 w-1 h-full rounded-t-full bg-yellow-400 shadow-[0_0_20px_rgba(234,179,8,1)]" />
                                    </motion.div>
                                    
                                    {/* Corner Brackets - Bottom Right */}
                                    <motion.div
                                      animate={{
                                        opacity: [0.6, 1, 0.6],
                                      }}
                                      transition={{ duration: 2, repeat: Infinity, delay: 0.75 }}
                                      className="absolute bottom-0 right-0"
                                      style={{ width: '20%', height: '20%' }}
                                    >
                                      <div className="absolute bottom-0 right-0 w-full h-1 rounded-l-full bg-yellow-400 shadow-[0_0_20px_rgba(234,179,8,1)]" />
                                      <div className="absolute bottom-0 right-0 w-1 h-full rounded-t-full bg-yellow-400 shadow-[0_0_20px_rgba(234,179,8,1)]" />
                                    </motion.div>
                                    
                                    {/* Animated Scanning Line */}
                                    <motion.div
                                      animate={{
                                        top: ['0%', '100%', '0%'],
                                      }}
                                      transition={{
                                        duration: 3,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                      }}
                                      className="absolute left-0 right-0"
                                      style={{ height: '3px' }}
                                    >
                                      <div className="w-full h-full bg-gradient-to-r from-transparent via-yellow-400 to-transparent shadow-[0_0_25px_rgba(234,179,8,1),0_0_50px_rgba(234,179,8,0.6)]" />
                                      <div className="absolute inset-x-0 -top-12 h-12 bg-gradient-to-b from-transparent to-yellow-400/30 blur-md" />
                                      <div className="absolute inset-x-0 -bottom-12 h-12 bg-gradient-to-t from-transparent to-yellow-400/30 blur-md" />
                                    </motion.div>
                                    
                                    {/* Center Crosshair Guide */}
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                      <motion.div
                                        animate={{
                                          scale: [0.9, 1.1, 0.9],
                                          opacity: [0.3, 0.7, 0.3]
                                        }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="w-16 h-px bg-yellow-400/70"
                                      />
                                      <motion.div
                                        animate={{
                                          scale: [0.9, 1.1, 0.9],
                                          opacity: [0.3, 0.7, 0.3]
                                        }}
                                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-16 w-px bg-yellow-400/70"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                            <p className="text-sm text-blue-900 font-medium text-center flex items-center justify-center gap-2">
                              <ScanBarcode className="w-4 h-4" />
                              Point camera at barcode - automatic detection enabled
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {cameraError && (
                      <div className="p-4 rounded-lg bg-orange-50 border-2 border-orange-300 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-orange-900">Camera Access Issue</p>
                          <p className="text-sm text-orange-800 mt-1">{cameraError}</p>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons - Mobile Responsive */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <button
                        onClick={() => {
                          setSelectedSize(null);
                          setScannedCount(0);
                          setReceivingStep('selectSize');
                          setSizeProgress(prev => ({
                            ...prev,
                            [selectedSize]: { ...prev[selectedSize], status: 'pending' }
                          }));
                        }}
                        className="w-full sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold transition-colors text-sm sm:text-base"
                      >
                        ← Back to Sizes
                      </button>
                      <button
                        onClick={handleCompleteSizeScanning}
                        className="w-full sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold transition-all shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base"
                      >
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                        Complete {selectedSize}
                      </button>
                    </div>

                    {/* Recent Scans History - Mobile Responsive */}
                    {scannedCount > 0 && (
                      <div className="p-3 sm:p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2 sm:space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs sm:text-sm font-medium text-slate-700 flex items-center gap-2">
                            <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Recent Scans ({scannedCount} unique items)
                          </p>
                          <span className="text-[10px] sm:text-xs text-slate-500">
                            {scannedCount >= (sizeProgress[selectedSize]?.expected || 0) 
                              ? '✅ Target reached' 
                              : `${(sizeProgress[selectedSize]?.expected || 0) - scannedCount} more`}
                          </span>
                        </div>
                        
                        <div className="text-[10px] sm:text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-lg p-2 flex items-start gap-2">
                          <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0 mt-0.5" />
                          <span>Duplicate detection is active. Each barcode can only be scanned once.</span>
                        </div>
                        
                        <div className="space-y-1.5 sm:space-y-2">
                          {sizeProgress[selectedSize]?.items.slice(-5).reverse().map((item, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="flex items-center justify-between p-1.5 sm:p-2 bg-white rounded-lg border border-green-200"
                            >
                              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" />
                                <span className="text-[10px] sm:text-xs font-mono text-slate-700 truncate">
                                  {item.barcode.length > 20 
                                    ? `${item.barcode.substring(0, 20)}...` 
                                    : item.barcode}
                                </span>
                              </div>
                              <span className="text-[10px] sm:text-xs text-slate-400 whitespace-nowrap ml-2">
                                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </motion.div>
                          ))}
                        </div>
                        
                        {scannedCount > 5 && (
                          <p className="text-[10px] sm:text-xs text-center text-slate-500">
                            Showing last 5 of {scannedCount} unique scans
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* REPORT STEP - Discrepancy Summary - Mobile Responsive */}
                {receivingStep === 'report' && (
                  <div className="space-y-4 sm:space-y-6">
                    <div className="text-center p-4 sm:p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                      <CheckCheck className="w-12 h-12 sm:w-16 sm:h-16 text-green-600 mx-auto mb-2 sm:mb-3" />
                      <h3 className="text-lg sm:text-2xl font-bold text-slate-900 mb-1 sm:mb-2">
                        Receiving Complete
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600">
                        All sizes have been scanned. Review the report below.
                      </p>
                    </div>

                    {/* Summary Cards - Mobile Responsive */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                      <div className="p-3 sm:p-4 rounded-lg bg-blue-50 border border-blue-200 text-center">
                        <p className="text-[10px] sm:text-xs text-slate-600 mb-1">Total Expected</p>
                        <p className="text-xl sm:text-3xl font-bold text-blue-600">
                          {Object.values(sizeProgress).reduce((sum, p) => sum + p.expected, 0)}
                        </p>
                      </div>
                      <div className="p-3 sm:p-4 rounded-lg bg-green-50 border border-green-200 text-center">
                        <p className="text-[10px] sm:text-xs text-slate-600 mb-1">Total Scanned</p>
                        <p className="text-xl sm:text-3xl font-bold text-green-600">
                          {Object.values(sizeProgress).reduce((sum, p) => sum + p.scanned, 0)}
                        </p>
                      </div>
                      <div className="p-3 sm:p-4 rounded-lg bg-orange-50 border border-orange-200 text-center">
                        <p className="text-[10px] sm:text-xs text-slate-600 mb-1">Discrepancy</p>
                        <p className="text-xl sm:text-3xl font-bold text-orange-600">
                          {Math.abs(Object.values(sizeProgress).reduce((sum, p) => sum + p.discrepancy, 0))}
                        </p>
                      </div>
                    </div>

                    {/* Detailed Report Table - Mobile Responsive */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs sm:text-sm">
                          <thead className="bg-slate-100">
                            <tr>
                              <th className="text-left p-2 sm:p-3 font-semibold text-slate-700">Size</th>
                              <th className="text-center p-2 sm:p-3 font-semibold text-slate-700">Expected</th>
                              <th className="text-center p-2 sm:p-3 font-semibold text-slate-700">Received</th>
                              <th className="text-center p-2 sm:p-3 font-semibold text-slate-700">Diff</th>
                              <th className="text-center p-2 sm:p-3 font-semibold text-slate-700">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {availableSizes.map((size) => {
                              const progress = sizeProgress[size];
                              return (
                                <tr key={size} className="border-t border-slate-200">
                                  <td className="p-2 sm:p-3 font-medium text-slate-900 max-w-[100px] sm:max-w-none truncate">{size}</td>
                                  <td className="p-2 sm:p-3 text-center text-slate-700">{progress.expected}</td>
                                  <td className="p-2 sm:p-3 text-center text-slate-700">{progress.scanned}</td>
                                  <td className="p-2 sm:p-3 text-center">
                                    <span className={`font-bold text-xs sm:text-sm ${
                                      progress.discrepancy === 0 
                                        ? 'text-green-600' 
                                        : progress.discrepancy > 0 
                                          ? 'text-orange-600' 
                                          : 'text-red-600'
                                    }`}>
                                      {progress.discrepancy === 0 
                                        ? '✓' 
                                        : progress.discrepancy > 0 
                                          ? `-${progress.discrepancy}` 
                                          : `+${Math.abs(progress.discrepancy)}`}
                                    </span>
                                  </td>
                                  <td className="p-2 sm:p-3 text-center">
                                    {progress.discrepancy === 0 ? (
                                      <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-green-100 text-green-700 text-[10px] sm:text-xs font-medium">
                                        <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                                        OK
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-orange-100 text-orange-700 text-[10px] sm:text-xs font-medium">
                                        <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                                        Var
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Notes Section - Mobile Responsive */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
                        Manager Notes (Optional)
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        placeholder="Add any notes about discrepancies or issues..."
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Action Buttons - Mobile Responsive */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <button
                        onClick={() => setReceivingStep('selectSize')}
                        className="w-full sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold transition-colors text-sm sm:text-base"
                      >
                        ← Back to Scanning
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            // Prepare report data
                            const reportData = {
                              shipment_id: selectedShipment.id,
                              size_breakdown: availableSizes.map(size => ({
                                size: size,
                                expected: sizeProgress[size].expected,
                                scanned: sizeProgress[size].scanned,
                                discrepancy: sizeProgress[size].discrepancy
                              })),
                              total_expected: Object.values(sizeProgress).reduce((sum, p) => sum + p.expected, 0),
                              total_scanned: Object.values(sizeProgress).reduce((sum, p) => sum + p.scanned, 0),
                              total_discrepancy: Object.values(sizeProgress).reduce((sum, p) => sum + p.discrepancy, 0),
                              notes: notes || null,
                              scan_details: sizeProgress // Store full scan history
                            };

                            console.log('📤 Submitting receiving report:', reportData);

                            // Submit to API
                            const { data } = await api.post('/receiving/submit-report', reportData);

                            if (data.success) {
                              toast.success(`Report ${data.data.report_number} submitted to manager for approval!`);
                              toast.info(`${data.notifications?.notified || 0} managers notified`);
                              
                              // Close modal and reload shipments
                              handleCloseModal();
                              loadShipments();
                            } else {
                              toast.error('Failed to submit report');
                            }
                          } catch (error) {
                            console.error('❌ Error submitting report:', error);
                            toast.error(error.response?.data?.error || 'Failed to submit receiving report');
                          }
                        }}
                        className="w-full sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold transition-all shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base"
                      >
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                        Submit to Manager
                      </button>
                    </div>
                  </div>
                )}

                {/* OLD VERIFICATION STEP - Hidden for now */}
                {receivingStep === 'verify' && false && (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600 mb-4">
                      Verify the condition of each item. Mark any damaged or defective items.
                    </p>

                    {receivingItems.map((item, index) => (
                      <div key={index} className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            {item.expected ? (
                              <>
                                <p className="font-semibold text-slate-900">Size: {item.size}</p>
                                <p className="text-xs text-slate-500">Quantity: {item.quantity} items | Barcode: {item.barcode || 'Not scanned'}</p>
                              </>
                            ) : (
                              <>
                                <p className="font-semibold text-slate-900">{item.products?.brand} {item.products?.model}</p>
                                <p className="text-xs text-slate-500">Barcode: {item.barcode_value}</p>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateCondition(index, 'GOOD')}
                            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                              item.condition === 'GOOD'
                                ? 'bg-green-600 text-white'
                                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <CheckCircle className="w-4 h-4 inline mr-2" />
                            Good
                          </button>
                          <button
                            onClick={() => handleUpdateCondition(index, 'DAMAGED')}
                            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                              item.condition === 'DAMAGED'
                                ? 'bg-red-600 text-white'
                                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <XCircle className="w-4 h-4 inline mr-2" />
                            Damaged
                          </button>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={() => setReceivingStep('assign')}
                      className="w-full px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
                    >
                      Continue to Location Assignment
                    </button>
                  </div>
                )}

                {/* Location Assignment Step */}
                {receivingStep === 'assign' && (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600 mb-4">
                      Assign storage locations for each item.
                    </p>

                    {receivingItems.map((item, index) => (
                      <div key={index} className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                        <div className="mb-3">
                          <p className="font-semibold text-slate-900">{item.products?.name}</p>
                          <p className="text-xs text-slate-500">Barcode: {item.barcode}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Rack Code
                            </label>
                            <input
                              type="text"
                              value={item.rackCode}
                              onChange={(e) => handleAssignLocation(index, e.target.value, item.positionCode)}
                              placeholder="e.g., A-01"
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Position Code
                            </label>
                            <input
                              type="text"
                              value={item.positionCode}
                              onChange={(e) => handleAssignLocation(index, item.rackCode, e.target.value)}
                              placeholder="e.g., 01"
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={() => setReceivingStep('complete')}
                      className="w-full px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
                    >
                      Review and Complete
                    </button>
                  </div>
                )}

                {/* Complete Step */}
                {receivingStep === 'complete' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                      <p className="font-semibold text-green-900 mb-2">Ready to Complete</p>
                      <p className="text-sm text-green-700">
                        All items have been scanned, verified, and assigned locations.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Additional Notes (Optional)
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        placeholder="Any notes about this receiving..."
                        className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <button
                      onClick={handleCompleteReceiving}
                      className="w-full px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCheck className="w-5 h-5" />
                      Complete Receiving
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
