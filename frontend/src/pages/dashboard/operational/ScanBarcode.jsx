import React, { useState, useEffect, useRef } from 'react';
import { Camera, Search, MapPin, Package, AlertCircle, CheckCircle, XCircle, RotateCcw, Truck, Info, Video, VideoOff, Flashlight, FlashlightOff, Download, Volume2, VolumeX, Layers, SwitchCamera, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode, Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import api from '../../../services/api';

/**
 * ============================================================================
 * BARCODE SCANNING & RETURNS PAGE
 * ============================================================================
 * Allows operational staff to:
 * - Scan barcodes using camera or manual input
 * - View complete product and location information
 * - Process returns (mark as returned, inspect, reassign)
 * - Quick access to traceability data
 * ============================================================================
 */

export default function ScanBarcode() {
  // Scanning states
  const [scanMode, setScanMode] = useState('manual'); // 'manual' or 'camera'
  const [manualInput, setManualInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  
  // NEW: Advanced camera features
  const [continuousScanMode, setContinuousScanMode] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [selectedCamera, setSelectedCamera] = useState('environment'); // 'environment' or 'user'
  const [availableCameras, setAvailableCameras] = useState([]);
  const [currentCameraId, setCurrentCameraId] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1.0); // NEW: Zoom control
  
  // NEW: Scanning status indicators
  const [scanningStatus, setScanningStatus] = useState('idle'); // 'idle', 'scanning', 'detected', 'processing'
  const [lastScanAttempt, setLastScanAttempt] = useState(null);
  const [scanAttempts, setScanAttempts] = useState(0);
  const [scannerDiagnostics, setScannerDiagnostics] = useState({
    cameraSupported: false,
    permissionGranted: false,
    formatsSupported: [],
    nativeDetectorAvailable: false
  });
  
  // NEW: Bulk scanning
  const [bulkScanMode, setBulkScanMode] = useState(false);
  const [bulkScannedItems, setBulkScannedItems] = useState([]);
  
  // Data states
  const [scannedData, setScannedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Return workflow states
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [processingReturn, setProcessingReturn] = useState(false);
  
  // NEW: Success scan modal
  const [showScanSuccessModal, setShowScanSuccessModal] = useState(false);
  const [scannedCode, setScannedCode] = useState(null);
  
  // Recent scans history
  const [scanHistory, setScanHistory] = useState([]);
  
  const inputRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const scannerRegionId = 'html5qr-code-full-region';
  const scanSoundRef = useRef(null);
  const videoTrackRef = useRef(null);

  // Load scan history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('scanHistory');
    if (saved) {
      try {
        setScanHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load scan history:', e);
      }
    }

    // Load preferences
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
      
      // Check for native barcode detector
      if ('BarcodeDetector' in window) {
        const formats = await window.BarcodeDetector.getSupportedFormats();
        setScannerDiagnostics(prev => ({
          ...prev,
          nativeDetectorAvailable: true,
          formatsSupported: formats,
          cameraSupported: true
        }));
        console.log('✅ Native BarcodeDetector available! Formats:', formats);
      } else {
        setScannerDiagnostics(prev => ({
          ...prev,
          cameraSupported: true
        }));
        console.log('⚠️ Native BarcodeDetector not available, using library decoder');
      }
    } catch (err) {
      console.error('Failed to get cameras:', err);
      setScannerDiagnostics(prev => ({
        ...prev,
        cameraSupported: false
      }));
    }
  };

  // Play scan sound
  const playScanSound = () => {
    if (!soundEnabled) return;
    try {
      // Create simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800; // 800Hz beep
      gainNode.gain.value = 0.3;
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1); // 100ms beep
      
      console.log('🔊 Scan sound played');
    } catch (err) {
      console.error('Failed to play sound:', err);
    }
  };

  // Trigger vibration
  const triggerVibration = () => {
    if (!vibrationEnabled) return;
    if ('vibrate' in navigator) {
      navigator.vibrate(200); // 200ms vibration
      console.log('📳 Vibration triggered');
    }
  };

  // Toggle flash/torch
  const toggleFlash = async () => {
    if (!videoTrackRef.current) {
      // Try to get video track again
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
      alert('Flash not available. Camera may not be started yet.');
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
        alert('Flash not supported on this device');
      }
    } catch (err) {
      console.error('Failed to toggle flash:', err);
      alert('Failed to toggle flash. This device may not support torch control.');
    }
  };

  // Toggle camera (front/back)
  const toggleCamera = async () => {
    const newFacing = selectedCamera === 'environment' ? 'user' : 'environment';
    setSelectedCamera(newFacing);
    
    // Restart camera with new facing mode
    if (cameraActive) {
      await stopCameraScanner();
      // Small delay to ensure cleanup
      setTimeout(() => startCameraScanner(newFacing), 100);
    }
  };

  // Handle zoom control
  const handleZoom = async (direction) => {
    if (!videoTrackRef.current) return;
    
    try {
      const capabilities = videoTrackRef.current.getCapabilities();
      if (capabilities.zoom) {
        const currentZoom = videoTrackRef.current.getSettings().zoom || 1.0;
        let newZoom = currentZoom;
        
        if (direction === 'in') {
          newZoom = Math.min(currentZoom + 0.5, capabilities.zoom.max);
        } else if (direction === 'out') {
          newZoom = Math.max(currentZoom - 0.5, capabilities.zoom.min);
        } else {
          newZoom = 1.0; // Reset
        }
        
        await videoTrackRef.current.applyConstraints({
          advanced: [{ zoom: newZoom }]
        });
        
        setZoomLevel(newZoom);
        console.log('🔍 Zoom changed:', newZoom);
      }
    } catch (err) {
      console.warn('Zoom not supported:', err);
    }
  };

  // Export scan history as CSV
  const exportScanHistory = () => {
    if (scanHistory.length === 0) {
      alert('No scan history to export');
      return;
    }

    // Prepare CSV data
    const headers = ['Barcode', 'Product', 'Warehouse', 'Rack', 'Scanned At'];
    const rows = scanHistory.map(item => [
      item.barcode,
      item.product || 'N/A',
      item.warehouse || 'N/A',
      item.rack || 'N/A',
      new Date(item.scannedAt).toLocaleString()
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `scan-history-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('📥 Scan history exported:', scanHistory.length, 'items');
  };

  // Export bulk scan results
  const exportBulkScans = () => {
    if (bulkScannedItems.length === 0) {
      alert('No bulk scans to export');
      return;
    }

    const headers = ['Barcode', 'Status', 'Product', 'Warehouse', 'Rack', 'Scanned At'];
    const rows = bulkScannedItems.map(item => [
      item.barcode,
      item.success ? 'SUCCESS' : 'FAILED',
      item.data?.products?.model || 'N/A',
      item.data?.inventory_units?.warehouses?.name || 'N/A',
      item.data?.inventory_units?.rack_configurations?.rack_code || 'N/A',
      new Date(item.timestamp).toLocaleString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `bulk-scan-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('📥 Bulk scans exported:', bulkScannedItems.length, 'items');
  };

  // Initialize camera scanner when switching to camera mode
  useEffect(() => {
    if (scanMode === 'camera') {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        startCameraScanner();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      stopCameraScanner();
    }
  }, [scanMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCameraScanner();
    };
  }, []);

  // Fix video element styling to ensure it fills container properly - RESPONSIVE
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
      
      /* Camera container styling - 4:3 aspect ratio - EXPANDED WIDTH */
      .camera-container {
        width: 100%;
        max-width: 1100px;
        aspect-ratio: 4 / 3;
        overflow: hidden;
        border-radius: 14px;
        margin: 0 auto;
      }
      
      /* Responsive adjustments for larger tablets/laptops */
      @media (max-width: 1280px) {
        .camera-container {
          max-width: 900px;
        }
      }
      
      /* Responsive adjustments for tablets */
      @media (max-width: 1024px) {
        .camera-container {
          max-width: 700px;
        }
      }
      
      /* Responsive adjustments for mobile */
      @media (max-width: 768px) {
        .camera-container {
          max-width: 540px;
        }
      }
      
      @media (max-width: 640px) {
        .camera-container {
          max-width: 100%;
        }
      }
      
      /* Smooth scan animation */
      @keyframes scan {
        0%, 100% { top: 10%; opacity: 0; }
        50% { top: 50%; opacity: 1; }
      }
      
      @keyframes pulse-glow {
        0%, 100% { box-shadow: 0 0 20px rgba(234, 179, 8, 0.4); }
        50% { box-shadow: 0 0 40px rgba(234, 179, 8, 0.8); }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Start camera scanner
  const startCameraScanner = async (facingMode = selectedCamera) => {
    try {
      setCameraError(null);
      
      // Create scanner instance
      html5QrCodeRef.current = new Html5Qrcode(scannerRegionId);
      
      // Simplified, more reliable scanner configuration
      const config = {
        fps: 10, // Optimal for most devices
        qrbox: 250, // Simple square box
        aspectRatio: 1.0, // Square aspect ratio for better detection
        disableFlip: false,
        // Explicitly request all common formats
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E
        ]
      };

      // Success callback
      const onScanSuccess = async (decodedText, decodedResult) => {
        console.log('📷 Barcode detected!:', decodedText);
        
        // Extract barcode from URL if it's a full URL
        let barcode = decodedText;
        if (decodedText.includes('http://') || decodedText.includes('https://')) {
          // Extract the last part of the URL (the actual barcode)
          const urlParts = decodedText.split('/');
          barcode = urlParts[urlParts.length - 1];
          console.log('📦 Extracted barcode from URL:', barcode);
        }
        
        setScanningStatus('detected');
        setLastScanAttempt(barcode);
        setScannedCode(barcode);
        
        // Show success modal immediately
        setShowScanSuccessModal(true);
        
        // Visual feedback: change status to processing
        setTimeout(() => setScanningStatus('processing'), 500);
        
        // Play sound and vibrate
        playScanSound();
        triggerVibration();

        // Bulk scan mode
        if (bulkScanMode) {
          // Add to bulk list
          const result = await fetchBarcodeDataForBulk(barcode);
          setBulkScannedItems(prev => [...prev, {
            barcode: barcode,
            timestamp: new Date().toISOString(),
            success: result.success,
            data: result.data,
            error: result.error
          }]);
          
          // Close success modal after 1.5 seconds in bulk mode
          setTimeout(() => setShowScanSuccessModal(false), 1500);
          
          setScanningStatus('scanning'); // Back to scanning for next item
          
          // In continuous mode, keep scanning
          if (!continuousScanMode) {
            stopCameraScanner();
            setScanMode('manual');
            setScanningStatus('idle');
          }
        } else {
          // Single scan mode - fetch data then close modal
          await fetchBarcodeData(barcode);
          
          // Close success modal after data is loaded
          setTimeout(() => setShowScanSuccessModal(false), 2000);
          
          // Stop camera unless in continuous mode
          if (!continuousScanMode) {
            stopCameraScanner();
            setScanMode('manual');
            setScanningStatus('idle');
          } else {
            setScanningStatus('scanning');
          }
        }
      };

      // Error callback - now with feedback
      const onScanError = (errorMessage) => {
        // Count scan attempts to show activity
        setScanAttempts(prev => prev + 1);
        
        // Update status to show scanner is actively looking
        if (scanningStatus !== 'scanning' && scanningStatus !== 'detected' && scanningStatus !== 'processing') {
          setScanningStatus('scanning');
        }
        
        // Only log errors occasionally to avoid spam
        if (scanAttempts % 100 === 0) {
          console.log('🔍 Scanner active, attempts:', scanAttempts);
        }
      };

      // Simplified camera constraints for better compatibility
      const cameraConstraints = { facingMode: facingMode };

      await html5QrCodeRef.current.start(
        cameraConstraints,
        config,
        onScanSuccess,
        onScanError
      );

      // Get video track for flash control
      setTimeout(() => {
        try {
          // Access the video element to get the media stream
          const videoElement = document.querySelector(`#${scannerRegionId} video`);
          if (videoElement && videoElement.srcObject) {
            const tracks = videoElement.srcObject.getVideoTracks();
            if (tracks.length > 0) {
              videoTrackRef.current = tracks[0];
              console.log('📷 Video track obtained for flash control');
            }
          }
        } catch (err) {
          console.warn('Could not get video track for flash:', err);
        }
      }, 500);

      setCameraActive(true);
      setScanningStatus('scanning');
      setScanAttempts(0);
      console.log('📷 Camera scanner started (facing:', facingMode, ')');

    } catch (err) {
      console.error('Failed to start camera:', err);
      setCameraError(err.message || 'Failed to access camera. Please check permissions.');
      setCameraActive(false);
    }
  };

  // Stop camera scanner
  const stopCameraScanner = async () => {
    if (html5QrCodeRef.current && cameraActive) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
        videoTrackRef.current = null;
        setCameraActive(false);
        setFlashEnabled(false);
        console.log('📷 Camera scanner stopped');
      } catch (err) {
        console.error('Failed to stop camera:', err);
      }
    }
  };

  // Fetch barcode data for bulk scanning
  const fetchBarcodeDataForBulk = async (barcodeValue) => {
    try {
      const response = await api.get(`/barcodes/trace/${barcodeValue}`);
      if (response.data.success && response.data.traceability) {
        return { success: true, data: response.data.traceability };
      } else {
        return { success: false, error: 'Barcode not found' };
      }
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed to fetch' };
    }
  };

  // Save scan history to localStorage
  const saveScanHistory = (data) => {
    const history = [
      {
        barcode: data.barcode_value,
        scannedAt: new Date().toISOString(),
        product: data.products?.model,
        warehouse: data.inventory_units?.warehouses?.name,
        rack: data.inventory_units?.rack_configurations?.rack_code
      },
      ...scanHistory.slice(0, 9) // Keep last 10 scans
    ];
    setScanHistory(history);
    localStorage.setItem('scanHistory', JSON.stringify(history));
  };

  // Handle manual barcode input
  const handleManualScan = async (e) => {
    e.preventDefault();
    if (!manualInput.trim()) {
      setError('Please enter a barcode value');
      return;
    }
    await fetchBarcodeData(manualInput.trim());
  };

  // Fetch barcode data from API
  const fetchBarcodeData = async (barcodeValue) => {
    setLoading(true);
    setError(null);
    setScannedData(null);

    try {
      console.log('🔍 Fetching barcode:', barcodeValue);
      const response = await api.get(`/barcodes/trace/${barcodeValue}`);
      
      if (response.data.success && response.data.traceability) {
        const data = response.data.traceability;
        setScannedData(data);
        saveScanHistory(data);
        console.log('✅ Barcode data loaded:', data);
      } else {
        setError('Barcode not found or inactive');
      }
    } catch (err) {
      console.error('❌ Scan error:', err);
      setError(err.response?.data?.error || 'Failed to scan barcode. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle return processing
  const handleProcessReturn = async () => {
    if (!returnReason) {
      alert('Please select a return reason');
      return;
    }

    setProcessingReturn(true);
    try {
      // Update inventory unit status to RETURNED
      const response = await api.patch(`/inventory-units/${scannedData.inventory_units.id}/status`, {
        status: 'RETURNED',
        reason: returnReason,
        notes: returnNotes
      });

      if (response.data.success) {
        // Update local data
        setScannedData({
          ...scannedData,
          inventory_units: {
            ...scannedData.inventory_units,
            status: 'RETURNED'
          }
        });
        
        setShowReturnModal(false);
        setReturnReason('');
        setReturnNotes('');
        
        alert('✅ Return processed successfully!');
      }
    } catch (err) {
      console.error('Failed to process return:', err);
      alert('❌ Failed to process return: ' + (err.response?.data?.error || err.message));
    } finally {
      setProcessingReturn(false);
    }
  };

  // Clear scan and start new
  const handleNewScan = () => {
    setScannedData(null);
    setError(null);
    setManualInput('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">📱 Scan Barcode</h1>
              <p className="text-slate-600">Scan or enter a barcode to view product details and process returns</p>
            </div>
            <div className="hidden lg:block">
              <div className="bg-indigo-50 rounded-xl px-4 py-2 border border-indigo-200">
                <p className="text-xs text-indigo-600 font-semibold">✅ Available for</p>
                <p className="text-sm font-bold text-indigo-900">Operational & Warehouse Staff</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Left Column - Scanner (Wider on desktop) */}
          <div className="xl:col-span-3">
            <div className="bg-white rounded-2xl shadow-lg p-6 lg:p-8 border border-slate-200">
              {/* Scan Mode Toggle */}
              <div className="flex gap-3 mb-6">
                <button
                  onClick={() => {
                    setScanMode('manual');
                    setBulkScanMode(false);
                  }}
                  className={`flex-1 py-3.5 px-6 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                    scanMode === 'manual'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Search className="w-5 h-5" />
                  <span className="hidden sm:inline">Manual</span>
                </button>
                <button
                  onClick={() => {
                    setScanMode('camera');
                    setBulkScanMode(false);
                  }}
                  className={`flex-1 py-3.5 px-6 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                    scanMode === 'camera'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Camera className="w-5 h-5" />
                  <span className="hidden sm:inline">Camera</span>
                </button>
                <button
                  onClick={() => {
                    setScanMode('camera');
                    setBulkScanMode(true);
                    setBulkScannedItems([]);
                  }}
                  className={`flex-1 py-3.5 px-6 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                    bulkScanMode
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Layers className="w-5 h-5" />
                  <span className="hidden sm:inline">Bulk</span>
                </button>
              </div>

              {/* Camera Controls - NEW */}
              {scanMode === 'camera' && (
                <div className="mb-4 space-y-2">
                  {/* Row 1: Mode and Flash */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Continuous Scan Toggle */}
                    <button
                      onClick={() => setContinuousScanMode(!continuousScanMode)}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                        continuousScanMode
                          ? 'bg-green-100 text-green-700 border-2 border-green-300'
                          : 'bg-slate-100 text-slate-600 border border-slate-300'
                      }`}
                      title="Keep camera running after scan"
                    >
                      <Video className="w-4 h-4" />
                      {continuousScanMode ? 'Continuous ON' : 'Single Scan'}
                    </button>

                    {/* Flash Toggle */}
                    <button
                      onClick={toggleFlash}
                      disabled={!cameraActive}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                        flashEnabled
                          ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-300'
                          : 'bg-slate-100 text-slate-600 border border-slate-300'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      title="Toggle camera flash"
                    >
                      {flashEnabled ? <Flashlight className="w-4 h-4" /> : <FlashlightOff className="w-4 h-4" />}
                      Flash
                    </button>
                  </div>

                  {/* Row 2: Sound and Camera Switch */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Sound Toggle */}
                    <button
                      onClick={() => {
                        setSoundEnabled(!soundEnabled);
                        localStorage.setItem('scanSoundEnabled', (!soundEnabled).toString());
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                        soundEnabled
                          ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                          : 'bg-slate-100 text-slate-600 border border-slate-300'
                      }`}
                      title="Toggle scan sound"
                    >
                      {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                      Sound
                    </button>

                    {/* Camera Switch */}
                    <button
                      onClick={toggleCamera}
                      disabled={!cameraActive}
                      className="py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Switch front/back camera"
                    >
                      <SwitchCamera className="w-4 h-4" />
                      {selectedCamera === 'environment' ? 'Back' : 'Front'}
                    </button>
                  </div>

                  {/* Row 3: Zoom Controls */}
                  {cameraActive && (
                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2 border border-slate-200">
                      <button
                        onClick={() => handleZoom('out')}
                        className="p-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 transition-all"
                        title="Zoom out"
                      >
                        <ZoomOut className="w-4 h-4 text-slate-600" />
                      </button>
                      <div className="flex-1 flex items-center gap-2">
                        <Maximize2 className="w-4 h-4 text-slate-500" />
                        <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-indigo-500 h-full transition-all duration-300"
                            style={{ width: `${Math.min((zoomLevel - 1) * 50, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-slate-600 min-w-[3ch]">
                          {zoomLevel.toFixed(1)}x
                        </span>
                      </div>
                      <button
                        onClick={() => handleZoom('in')}
                        className="p-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 transition-all"
                        title="Zoom in"
                      >
                        <ZoomIn className="w-4 h-4 text-slate-600" />
                      </button>
                      <button
                        onClick={() => handleZoom('reset')}
                        className="px-3 py-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 transition-all text-xs font-semibold text-slate-600"
                        title="Reset zoom"
                      >
                        Reset
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Manual Input - WIDER FORM */}
              {scanMode === 'manual' && (
                <form onSubmit={handleManualScan} className="max-w-4xl mx-auto">
                  <div className="mb-6">
                    <label className="block text-base font-semibold text-slate-700 mb-3">
                      Enter Barcode Number
                    </label>
                    <input
                      ref={inputRef}
                      type="text"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      placeholder="RIC000000000001"
                      className="w-full px-6 py-4 text-lg rounded-xl border-2 border-slate-300 focus:border-indigo-500 focus:ring focus:ring-indigo-200 transition-all font-mono"
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !manualInput.trim()}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-3"
                  >
                    {loading ? (
                      <>
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Search className="w-6 h-6" />
                        Scan Barcode
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Camera View - PREMIUM RESPONSIVE DESIGN */}
              {scanMode === 'camera' && (
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full"
                  >
                    {/* Premium Camera Card with Glassmorphism */}
                    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-700/50 backdrop-blur-xl">
                      {/* Camera Container - 4:3 Aspect Ratio - EXPANDED (1100px × 825px max on desktop) */}
                      <div className="camera-container relative bg-black">
                        {cameraError ? (
                          <div className="flex items-center justify-center h-full bg-gradient-to-br from-red-900/20 to-slate-900">
                            <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 backdrop-blur-xl rounded-2xl p-8 text-center border-2 border-red-500/30 max-w-md mx-4">
                              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                                <VideoOff className="w-10 h-10 text-red-400" />
                              </div>
                              <h3 className="text-xl font-bold text-white mb-2">Camera Unavailable</h3>
                              <p className="text-sm text-red-200 mb-6">{cameraError}</p>
                              <div className="flex gap-3">
                                <button
                                  onClick={() => startCameraScanner()}
                                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-red-500/30"
                                >
                                  <RotateCcw className="w-4 h-4 inline mr-2" />
                                  Retry
                                </button>
                                <button
                                  onClick={() => {
                                    stopCameraScanner();
                                    setScanMode('manual');
                                  }}
                                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-all"
                                >
                                  Close
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Scanner Container */}
                            <div 
                              id={scannerRegionId}
                              className="w-full h-full"
                              style={{ backgroundColor: '#000' }}
                            />
                            
                            {/* Premium Overlay with Scan Animation */}
                            {cameraActive && (
                              <div 
                                className="absolute inset-0"
                                style={{
                                  pointerEvents: 'none',
                                  zIndex: 1000
                                }}
                              >
                                {/* Professional QR/Barcode Scanner Overlay - Premium Realistic Design */}
                                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60" />
                                <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />
                                
                                {/* Central Scanning Frame - Professional Style */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="relative" style={{ width: '65%', aspectRatio: '1.2' }}>
                                    
                                    {/* Corner Indicators - Sleek L-shaped brackets */}
                                    {/* Top Left */}
                                    <motion.div
                                      animate={{
                                        opacity: scanningStatus === 'scanning' ? [0.6, 1, 0.6] : 1,
                                      }}
                                      transition={{ duration: 2, repeat: Infinity }}
                                      className="absolute top-0 left-0"
                                      style={{ width: '22%', height: '22%' }}
                                    >
                                      <div className={`absolute top-0 left-0 w-full h-1 rounded-r-full transition-all duration-300 ${
                                        scanningStatus === 'detected' ? 'bg-green-400 shadow-[0_0_25px_rgba(74,222,128,1)]' :
                                        'bg-yellow-400 shadow-[0_0_20px_rgba(234,179,8,1)]'
                                      }`} />
                                      <div className={`absolute top-0 left-0 w-1 h-full rounded-b-full transition-all duration-300 ${
                                        scanningStatus === 'detected' ? 'bg-green-400 shadow-[0_0_25px_rgba(74,222,128,1)]' :
                                        'bg-yellow-400 shadow-[0_0_20px_rgba(234,179,8,1)]'
                                      }`} />
                                    </motion.div>
                                    
                                    {/* Top Right */}
                                    <motion.div
                                      animate={{
                                        opacity: scanningStatus === 'scanning' ? [0.6, 1, 0.6] : 1,
                                      }}
                                      transition={{ duration: 2, repeat: Infinity, delay: 0.25 }}
                                      className="absolute top-0 right-0"
                                      style={{ width: '22%', height: '22%' }}
                                    >
                                      <div className={`absolute top-0 right-0 w-full h-1 rounded-l-full transition-all duration-300 ${
                                        scanningStatus === 'detected' ? 'bg-green-400 shadow-[0_0_25px_rgba(74,222,128,1)]' :
                                        'bg-yellow-400 shadow-[0_0_20px_rgba(234,179,8,1)]'
                                      }`} />
                                      <div className={`absolute top-0 right-0 w-1 h-full rounded-b-full transition-all duration-300 ${
                                        scanningStatus === 'detected' ? 'bg-green-400 shadow-[0_0_25px_rgba(74,222,128,1)]' :
                                        'bg-yellow-400 shadow-[0_0_20px_rgba(234,179,8,1)]'
                                      }`} />
                                    </motion.div>
                                    
                                    {/* Bottom Left */}
                                    <motion.div
                                      animate={{
                                        opacity: scanningStatus === 'scanning' ? [0.6, 1, 0.6] : 1,
                                      }}
                                      transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                                      className="absolute bottom-0 left-0"
                                      style={{ width: '22%', height: '22%' }}
                                    >
                                      <div className={`absolute bottom-0 left-0 w-full h-1 rounded-r-full transition-all duration-300 ${
                                        scanningStatus === 'detected' ? 'bg-green-400 shadow-[0_0_25px_rgba(74,222,128,1)]' :
                                        'bg-yellow-400 shadow-[0_0_20px_rgba(234,179,8,1)]'
                                      }`} />
                                      <div className={`absolute bottom-0 left-0 w-1 h-full rounded-t-full transition-all duration-300 ${
                                        scanningStatus === 'detected' ? 'bg-green-400 shadow-[0_0_25px_rgba(74,222,128,1)]' :
                                        'bg-yellow-400 shadow-[0_0_20px_rgba(234,179,8,1)]'
                                      }`} />
                                    </motion.div>
                                    
                                    {/* Bottom Right */}
                                    <motion.div
                                      animate={{
                                        opacity: scanningStatus === 'scanning' ? [0.6, 1, 0.6] : 1,
                                      }}
                                      transition={{ duration: 2, repeat: Infinity, delay: 0.75 }}
                                      className="absolute bottom-0 right-0"
                                      style={{ width: '22%', height: '22%' }}
                                    >
                                      <div className={`absolute bottom-0 right-0 w-full h-1 rounded-l-full transition-all duration-300 ${
                                        scanningStatus === 'detected' ? 'bg-green-400 shadow-[0_0_25px_rgba(74,222,128,1)]' :
                                        'bg-yellow-400 shadow-[0_0_20px_rgba(234,179,8,1)]'
                                      }`} />
                                      <div className={`absolute bottom-0 right-0 w-1 h-full rounded-t-full transition-all duration-300 ${
                                        scanningStatus === 'detected' ? 'bg-green-400 shadow-[0_0_25px_rgba(74,222,128,1)]' :
                                        'bg-yellow-400 shadow-[0_0_20px_rgba(234,179,8,1)]'
                                      }`} />
                                    </motion.div>
                                    
                                    {/* Animated Scanning Line - Professional Red Laser Effect */}
                                    {scanningStatus === 'scanning' && (
                                      <motion.div
                                        animate={{
                                          y: ['-110%', '210%'],
                                        }}
                                        transition={{
                                          duration: 2.5,
                                          repeat: Infinity,
                                          ease: "linear"
                                        }}
                                        className="absolute inset-x-0"
                                        style={{ height: '3px' }}
                                      >
                                        <div className="w-full h-full bg-gradient-to-r from-transparent via-yellow-400 to-transparent shadow-[0_0_25px_rgba(234,179,8,1),0_0_50px_rgba(234,179,8,0.6)]" />
                                        <div className="absolute inset-x-0 -top-12 h-12 bg-gradient-to-b from-transparent to-yellow-400/30 blur-md" />
                                        <div className="absolute inset-x-0 -bottom-12 h-12 bg-gradient-to-t from-transparent to-yellow-400/30 blur-md" />
                                      </motion.div>
                                    )}
                                    
                                    {/* Center Crosshair Guide */}
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                      <motion.div
                                        animate={{
                                          scale: scanningStatus === 'scanning' ? [0.9, 1.1, 0.9] : 1,
                                          opacity: scanningStatus === 'scanning' ? [0.3, 0.7, 0.3] : 0.5
                                        }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="w-16 h-px bg-yellow-400/70"
                                      />
                                      <motion.div
                                        animate={{
                                          scale: scanningStatus === 'scanning' ? [0.9, 1.1, 0.9] : 1,
                                          opacity: scanningStatus === 'scanning' ? [0.3, 0.7, 0.3] : 0.5
                                        }}
                                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-16 w-px bg-yellow-400/70"
                                      />
                                    </div>
                                    
                                    {/* Success Flash */}
                                    {scanningStatus === 'detected' && (
                                      <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: [0, 0.8, 0] }}
                                        transition={{ duration: 0.6 }}
                                        className="absolute inset-0 bg-green-400/20 rounded-xl border-2 border-green-400/50"
                                      />
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      
                      {/* Premium Control Panel */}
                      <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 border-t border-slate-700/50">
                        <div className="p-4 flex items-center gap-3">
                          {/* Stop Camera Button */}
                          <button
                            onClick={() => {
                              stopCameraScanner();
                              setScanMode('manual');
                            }}
                            className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:scale-[1.02] active:scale-95"
                          >
                            <XCircle className="w-5 h-5" />
                            <span className="hidden sm:inline">Stop Camera</span>
                            <span className="sm:hidden">Stop</span>
                          </button>
                          
                          {/* Flash Toggle */}
                          <button
                            onClick={toggleFlash}
                            disabled={!cameraActive}
                            className={`p-3.5 rounded-xl border-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                              flashEnabled 
                                ? 'bg-yellow-500/20 border-yellow-400 text-yellow-300 shadow-lg shadow-yellow-500/30' 
                                : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500'
                            }`}
                            title="Toggle Flash"
                          >
                            <Flashlight className="w-6 h-6" />
                          </button>
                          
                          {/* Camera Switch */}
                          <button
                            onClick={toggleCamera}
                            disabled={!cameraActive}
                            className="p-3.5 rounded-xl border-2 border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500 hover:bg-slate-700 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Switch Camera"
                          >
                            <SwitchCamera className="w-6 h-6" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}

            {/* Enhanced Instructions - Outside camera modal, shown when camera mode active */}
            {scanMode === 'camera' && (
              <div className="mt-6 space-y-4 max-w-5xl mx-auto">
                {/* Camera Active Instruction - Blue Box */}
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-2xl p-6 shadow-md">
                  <div className="flex items-start gap-5">
                    <div className="w-14 h-14 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <Video className="w-7 h-7 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <h3 className="text-lg font-bold text-indigo-900">
                          Camera Active
                        </h3>
                      </div>
                      <p className="text-sm text-indigo-700 leading-relaxed">
                        {bulkScanMode 
                          ? 'Point at barcode and hold steady. Auto-scans and stops camera when detected. Scan multiple items in sequence.'
                          : continuousScanMode
                          ? 'Camera stays on. Point at barcode and hold steady for 1-2 seconds. Scan multiple barcodes in sequence.'
                          : 'Point at barcode and hold steady. Auto-scans and stops camera when detected.'
                        }
                      </p>
                      {bulkScanMode && bulkScannedItems.length > 0 && (
                        <div className="mt-3 flex items-center gap-2">
                          <div className="bg-green-100 border border-green-300 rounded-full px-3 py-1">
                            <p className="text-xs font-bold text-green-700">
                              ✅ Scanned: {bulkScannedItems.filter(i => i.success).length} / {bulkScannedItems.length}
                            </p>
                          </div>
                          {bulkScannedItems.some(i => !i.success) && (
                            <div className="bg-red-100 border border-red-300 rounded-full px-3 py-1">
                              <p className="text-xs font-bold text-red-700">
                                ❌ Failed: {bulkScannedItems.filter(i => !i.success).length}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Camera Quality Indicator - EXPANDED WIDTH */}
                {cameraActive && (
                  <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-md max-w-5xl mx-auto">
                    {/* Status Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-5 border-b border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-sm font-bold text-slate-900">Camera Active</span>
                        </div>
                        <span className="text-slate-400 hidden sm:inline">•</span>
                        <span className="text-sm text-slate-600 hidden sm:inline">Auto-detection enabled</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {flashEnabled && (
                          <div className="flex items-center gap-2 bg-yellow-100 border border-yellow-300 px-3 py-1.5 rounded-full">
                            <Flashlight className="w-4 h-4 text-yellow-600" />
                            <span className="text-xs font-bold text-yellow-700">Flash ON</span>
                          </div>
                        )}
                        {zoomLevel > 1.0 && (
                          <div className="flex items-center gap-2 bg-indigo-100 border border-indigo-300 px-3 py-1.5 rounded-full">
                            <Maximize2 className="w-4 h-4 text-indigo-600" />
                            <span className="text-xs font-bold text-indigo-700">{zoomLevel.toFixed(1)}x</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Quick Tips Section - SINGLE ROW, EXPANDED */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Distance */}
                      <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors">
                        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <span className="text-2xl">📏</span>
                        </div>
                        <p className="text-sm font-bold text-slate-700 mb-1.5">Distance</p>
                        <p className="text-xs text-slate-500 font-medium whitespace-nowrap">6-12 inches</p>
                      </div>
                      
                      {/* Lighting */}
                      <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-yellow-300 transition-colors">
                        <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <span className="text-2xl">💡</span>
                        </div>
                        <p className="text-sm font-bold text-slate-700 mb-1.5">Lighting</p>
                        <p className="text-xs text-slate-500 font-medium whitespace-nowrap">Bright & even</p>
                      </div>
                      
                      {/* Position */}
                      <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-green-300 transition-colors">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <span className="text-2xl">🎯</span>
                        </div>
                        <p className="text-sm font-bold text-slate-700 mb-1.5">Position</p>
                        <p className="text-xs text-slate-500 font-medium whitespace-nowrap">Center & steady</p>
                      </div>
                      
                      {/* Hold */}
                      <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-purple-300 transition-colors">
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <span className="text-2xl">⏱️</span>
                        </div>
                        <p className="text-sm font-bold text-slate-700 mb-1.5">Hold</p>
                        <p className="text-xs text-slate-500 font-medium whitespace-nowrap">2-3 seconds</p>
                      </div>
                    </div>
                    
                    {/* Debug Info */}
                    {scanAttempts > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <div className="flex items-center justify-center gap-4 text-xs text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-700">Attempts:</span>
                            <span className="font-mono bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">{scanAttempts}</span>
                          </span>
                          {lastScanAttempt && (
                            <>
                              <span className="text-slate-400">•</span>
                              <span className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-700">Last:</span>
                                <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded truncate max-w-[120px]">{lastScanAttempt}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Scan Success Modal - NEW */}
            <AnimatePresence>
              {showScanSuccessModal && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none"
                >
                  <div className="bg-green-500 rounded-3xl p-8 shadow-2xl text-center pointer-events-auto">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.2, 1] }}
                      transition={{ duration: 0.5 }}
                    >
                      <CheckCircle className="w-24 h-24 text-white mx-auto mb-4" />
                    </motion.div>
                    <h3 className="text-3xl font-black text-white mb-3">
                      {scannedCode?.startsWith('RIC') ? 'Barcode Scanned!' : 'QR Code Scanned!'}
                    </h3>
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-4">
                      <p className="text-white font-mono text-2xl font-bold break-all">
                        {scannedCode}
                      </p>
                    </div>
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="text-white text-lg font-semibold"
                    >
                      ✓ Success!
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

              {/* Quick Actions */}
              {scannedData && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <button
                    onClick={handleNewScan}
                    className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Scan Another
                  </button>
                </div>
              )}
            </div>

            {/* Recent Scans */}
            {scanHistory.length > 0 && !bulkScanMode && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Info className="w-5 h-5 text-indigo-600" />
                    Recent Scans
                  </h3>
                  <button
                    onClick={exportScanHistory}
                    className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-all flex items-center gap-2"
                    title="Export scan history as CSV"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                </div>
                <div className="space-y-2">
                  {scanHistory.slice(0, 5).map((item, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setManualInput(item.barcode);
                        fetchBarcodeData(item.barcode);
                      }}
                      className="w-full text-left p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-all border border-slate-200"
                    >
                      <p className="font-mono text-xs text-indigo-600 font-semibold">{item.barcode}</p>
                      <p className="text-xs text-slate-600 mt-1">{item.product} • {item.rack || 'No location'}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Bulk Scan Results - NEW */}
            {bulkScanMode && bulkScannedItems.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-200 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-purple-600" />
                    Bulk Scanned Items ({bulkScannedItems.length})
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={exportBulkScans}
                      className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-all flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Clear all bulk scan results?')) {
                          setBulkScannedItems([]);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-all"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {bulkScannedItems.map((item, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border-2 ${
                        item.success
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {item.success ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            <p className="font-mono text-xs font-semibold text-slate-900">
                              {item.barcode}
                            </p>
                          </div>
                          {item.success ? (
                            <div className="mt-1 text-xs text-slate-600">
                              <span className="font-semibold">{item.data.products?.model}</span>
                              {item.data.inventory_units?.rack_configurations?.rack_code && (
                                <span className="ml-2">
                                  📍 {item.data.inventory_units.rack_configurations.rack_code}
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className="mt-1 text-xs text-red-600">{item.error}</p>
                          )}
                        </div>
                        <span className="text-xs text-slate-500">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Results (Narrower to accommodate wider scanner) */}
          <div className="xl:col-span-2">
            <AnimatePresence mode="wait">
              {/* Error State */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white rounded-2xl shadow-lg p-8 border-2 border-red-200"
                >
                  <div className="text-center">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <XCircle className="w-10 h-10 text-red-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Barcode Not Found</h3>
                    <p className="text-slate-600 mb-6">{error}</p>
                    <button
                      onClick={handleNewScan}
                      className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all"
                    >
                      Try Again
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Loading State */}
              {loading && !scannedData && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white rounded-2xl shadow-lg p-12 border border-slate-200"
                >
                  <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-600 font-semibold">Scanning barcode...</p>
                  </div>
                </motion.div>
              )}

              {/* Success - Show Product Data */}
              {scannedData && !error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-6"
                >
                  {/* Success Banner */}
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                        <CheckCircle className="w-8 h-8" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black">Barcode Found!</h2>
                        <p className="text-emerald-100 font-mono text-sm mt-1">{scannedData.barcode_value}</p>
                      </div>
                    </div>
                  </div>

                  {/* WAREHOUSE LOCATION - HIERARCHICAL DISPLAY - MATCHES BarcodeGeneration.jsx */}
                  {scannedData.inventory_units && (
                    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 rounded-2xl p-6 border-2 border-emerald-300 shadow-xl">
                      <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                      
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <MapPin className="w-7 h-7 text-white" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-black text-white">📍 Exact Storage Location</h3>
                            <p className="text-emerald-50 text-sm font-medium">Precise hierarchical position</p>
                          </div>
                        </div>

                        <div className="bg-white/95 backdrop-blur-sm rounded-xl p-5 shadow-lg space-y-4">
                          {/* Warehouse */}
                          <div className="text-center pb-4 border-b-2 border-emerald-200">
                            <p className="text-xs font-semibold text-emerald-700 mb-2 uppercase">🏢 Warehouse</p>
                            <p className="text-3xl font-black text-emerald-900">
                              {scannedData.inventory_units.warehouses?.name || 'Not Assigned'}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {scannedData.inventory_units.warehouses?.code || 'N/A'}
                            </p>
                          </div>
                            
                          {/* Hierarchical Location Breakdown - UPDATED TO USE POSITION_CODE */}
                          {scannedData.inventory_units.position_code ? (
                            <div className="space-y-2.5">
                              {/* Full Position Code - PRIMARY DISPLAY */}
                              <div className="p-4 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl border-2 border-emerald-400 shadow-lg">
                                <p className="text-[10px] font-bold text-emerald-100 mb-2 text-center uppercase tracking-wide">📍 Storage Position</p>
                                <p className="text-center font-mono text-xl font-black text-white break-all tracking-wider">
                                  {scannedData.inventory_units.position_code}
                                </p>
                              </div>

                              {/* Rack Info (if available) */}
                              {(scannedData.inventory_units.rack || scannedData.inventory_units.position_code) && (
                                <div className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                                  <div className="flex items-center gap-1.5">
                                    <Package className="w-4 h-4 text-emerald-600" />
                                    <span className="text-xs font-bold text-emerald-900">Rack</span>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-base font-black text-emerald-800">
                                      {scannedData.inventory_units.rack || scannedData.inventory_units.position_code.split('-').slice(0, 3).join('-')}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Position Details - Shelf, Section, Subsection */}
                              {(scannedData.inventory_units.shelf_number || 
                                scannedData.inventory_units.section_number || 
                                scannedData.inventory_units.subsection_number) && (
                                <div className="grid grid-cols-3 gap-1.5">
                                  {/* Shelf */}
                                  {scannedData.inventory_units.shelf_number && (
                                    <div className="text-center p-2 bg-blue-50 rounded-lg border border-blue-200">
                                      <div className="text-[9px] font-semibold text-blue-700 mb-0.5">🗄️ Shelf</div>
                                      <p className="text-lg font-black text-blue-900">
                                        {scannedData.inventory_units.shelf_number}
                                      </p>
                                    </div>
                                  )}

                                  {/* Section */}
                                  {scannedData.inventory_units.section_number && (
                                    <div className="text-center p-2 bg-purple-50 rounded-lg border border-purple-200">
                                      <div className="text-[9px] font-semibold text-purple-700 mb-0.5">📦 Section</div>
                                      <p className="text-lg font-black text-purple-900">
                                        {scannedData.inventory_units.section_number}
                                      </p>
                                    </div>
                                  )}

                                  {/* Subsection */}
                                  {scannedData.inventory_units.subsection_number && (
                                    <div className="text-center p-2 bg-amber-50 rounded-lg border border-amber-200">
                                      <div className="text-[9px] font-semibold text-amber-700 mb-0.5">🔖 Subsection</div>
                                      <p className="text-lg font-black text-amber-900">
                                        {scannedData.inventory_units.subsection_number}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : scannedData.inventory_units.rack ? (
                            <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                              <Package className="w-5 h-5 text-emerald-600 mx-auto mb-1.5" />
                              <p className="text-sm font-bold text-emerald-900">
                                {scannedData.inventory_units.rack}
                              </p>
                              <p className="text-[10px] text-slate-600 mt-0.5">Rack assigned (no detailed position)</p>
                            </div>
                          ) : (
                            <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-200">
                              <AlertCircle className="w-6 h-6 text-amber-500 mx-auto mb-1.5" />
                              <p className="text-xs font-semibold text-amber-800">No Rack Location Assigned</p>
                              <p className="text-[10px] text-amber-600 mt-0.5">This tire needs to be assigned to a storage location</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Product Information */}
                  {scannedData.products && (
                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-lg">
                      <div className="flex items-center gap-3 mb-4">
                        <Package className="w-6 h-6 text-blue-600" />
                        <h3 className="text-xl font-bold text-slate-900">Product Details</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Brand</p>
                          <p className="font-semibold text-slate-900">{scannedData.products.brand}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Model</p>
                          <p className="font-semibold text-slate-900">{scannedData.products.model}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">SKU</p>
                          <p className="font-mono text-sm font-semibold text-slate-900">{scannedData.products.sku}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Dimensions</p>
                          <p className="font-semibold text-slate-900">{scannedData.products.dimensions}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Status & Actions */}
                  <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-slate-900">Status & Actions</h3>
                      <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                        scannedData.inventory_units?.status === 'NEW'
                          ? 'bg-green-100 text-green-700'
                          : scannedData.inventory_units?.status === 'RETURNED'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {scannedData.inventory_units?.status || 'UNKNOWN'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setShowReturnModal(true)}
                        disabled={scannedData.inventory_units?.status === 'RETURNED'}
                        className="py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2"
                      >
                        <RotateCcw className="w-5 h-5" />
                        Process Return
                      </button>
                      <button
                        onClick={() => window.open(scannedData.traceability_url, '_blank')}
                        className="py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md flex items-center justify-center gap-2"
                      >
                        <Truck className="w-5 h-5" />
                        Full Traceability
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Empty State - Only show in Manual mode */}
              {!scannedData && !loading && !error && scanMode === 'manual' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white rounded-2xl shadow-lg p-12 border-2 border-dashed border-slate-300 text-center"
                >
                  <Search className="w-20 h-20 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Ready to Scan</h3>
                  <p className="text-slate-600">Enter a barcode number to get started</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Return Processing Modal */}
      <AnimatePresence>
        {showReturnModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowReturnModal(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Process Return</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Return Reason *
                  </label>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-indigo-500 focus:ring focus:ring-indigo-200"
                  >
                    <option value="">Select reason...</option>
                    <option value="DEFECTIVE">Defective Product</option>
                    <option value="WRONG_SIZE">Wrong Size/Model</option>
                    <option value="CUSTOMER_CHANGED_MIND">Customer Changed Mind</option>
                    <option value="DAMAGED">Damaged in Transit</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    rows={3}
                    placeholder="Add any additional notes..."
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-indigo-500 focus:ring focus:ring-indigo-200"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowReturnModal(false)}
                    className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleProcessReturn}
                    disabled={processingReturn || !returnReason}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingReturn ? 'Processing...' : 'Confirm Return'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
