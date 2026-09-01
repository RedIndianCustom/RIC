import React, { useState, useEffect, useRef } from 'react';
import { Camera, Search, MapPin, Package, AlertCircle, CheckCircle, XCircle, RotateCcw, Truck, Info, Video, VideoOff, Flashlight, FlashlightOff, Download, Volume2, VolumeX, Layers, SwitchCamera, ZoomIn, ZoomOut, Maximize2, Clock, ArrowRight, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode, Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import api from '../../../services/api';

/**
 * ============================================================================
 * ENHANCED SCAN PRODUCTS - WAREHOUSE STAFF
 * ============================================================================
 * Advanced barcode scanning with all features from operational staff scanner:
 * - Camera & Manual scanning
 * - Continuous & Bulk scan modes
 * - Flash, zoom, camera switching
 * - Sound & vibration feedback
 * - Movement history
 * - Export functionality
 * - Real-time location display
 * ============================================================================
 */

export default function ScanProductsEnhanced() {
  // Scanning states
  const [scanMode, setScanMode] = useState('manual'); // 'manual' or 'camera'
  const [manualInput, setManualInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  
  // Advanced camera features
  const [continuousScanMode, setContinuousScanMode] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [selectedCamera, setSelectedCamera] = useState('environment');
  const [availableCameras, setAvailableCameras] = useState([]);
  const [currentCameraId, setCurrentCameraId] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  
  // Scanning status indicators
  const [scanningStatus, setScanningStatus] = useState('idle');
  const [lastScanAttempt, setLastScanAttempt] = useState(null);
  const [scanAttempts, setScanAttempts] = useState(0);
  const [scannerDiagnostics, setScannerDiagnostics] = useState({
    cameraSupported: false,
    permissionGranted: false,
    formatsSupported: [],
    nativeDetectorAvailable: false
  });
  
  // Bulk scanning
  const [bulkScanMode, setBulkScanMode] = useState(false);
  const [bulkScannedItems, setBulkScannedItems] = useState([]);
  
  // Data states
  const [scannedData, setScannedData] = useState(null);
  const [movementHistory, setMovementHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Success scan modal
  const [showScanSuccessModal, setShowScanSuccessModal] = useState(false);
  const [scannedCode, setScannedCode] = useState(null);
  
  // Recent scans history
  const [scanHistory, setScanHistory] = useState([]);
  
  const inputRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const scannerRegionId = 'warehouse-qr-scanner-region';
  const videoTrackRef = useRef(null);

  // Load scan history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('warehouse_scanHistory');
    if (saved) {
      try {
        setScanHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load scan history:', e);
      }
    }

    // Load preferences
    const savedSound = localStorage.getItem('warehouse_scanSoundEnabled');
    const savedVibration = localStorage.getItem('warehouse_scanVibrationEnabled');
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

  // Toggle flash
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

  // Toggle camera
  const toggleCamera = async () => {
    const newFacing = selectedCamera === 'environment' ? 'user' : 'environment';
    setSelectedCamera(newFacing);
    
    if (cameraActive) {
      await stopCameraScanner();
      setTimeout(() => startCameraScanner(newFacing), 100);
    }
  };

  // Handle zoom
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
          newZoom = 1.0;
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

  // Export scan history
  const exportScanHistory = () => {
    if (scanHistory.length === 0) {
      alert('No scan history to export');
      return;
    }

    const headers = ['Barcode', 'Product', 'Warehouse', 'Rack', 'Scanned At'];
    const rows = scanHistory.map(item => [
      item.barcode,
      item.product || 'N/A',
      item.warehouse || 'N/A',
      item.rack || 'N/A',
      new Date(item.scannedAt).toLocaleString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `warehouse-scan-history-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('📥 Scan history exported:', scanHistory.length, 'items');
  };

  // Export bulk scans
  const exportBulkScans = () => {
    if (bulkScannedItems.length === 0) {
      alert('No bulk scans to export');
      return;
    }

    const headers = ['Barcode', 'Status', 'Product', 'Warehouse', 'Rack', 'Scanned At'];
    const rows = bulkScannedItems.map(item => [
      item.barcode,
      item.success ? 'SUCCESS' : 'FAILED',
      item.data?.products?.name || 'N/A',
      item.data?.warehouses?.name || 'N/A',
      item.data?.rack_code || 'N/A',
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
    link.setAttribute('download', `warehouse-bulk-scan-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('📥 Bulk scans exported:', bulkScannedItems.length, 'items');
  };

  // Initialize camera scanner
  useEffect(() => {
    if (scanMode === 'camera') {
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

  // Camera styling
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
      
      .warehouse-camera-container {
        width: 100%;
        max-width: 1100px;
        aspect-ratio: 4 / 3;
        overflow: hidden;
        border-radius: 16px;
        margin: 0 auto;
      }
      
      @media (max-width: 1280px) {
        .warehouse-camera-container {
          max-width: 900px;
        }
      }
      
      @media (max-width: 1024px) {
        .warehouse-camera-container {
          max-width: 700px;
        }
      }
      
      @media (max-width: 768px) {
        .warehouse-camera-container {
          max-width: 540px;
        }
      }
      
      @media (max-width: 640px) {
        .warehouse-camera-container {
          max-width: 100%;
        }
      }
      
      @keyframes scanPulse {
        0%, 100% { opacity: 0.4; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.05); }
      }
      
      .scan-corner {
        animation: scanPulse 2s ease-in-out infinite;
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
      
      html5QrCodeRef.current = new Html5Qrcode(scannerRegionId);
      
      const config = {
        fps: 10,
        qrbox: 250,
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
        ]
      };

      const onScanSuccess = async (decodedText, decodedResult) => {
        console.log('📷 Barcode detected!:', decodedText);
        
        let barcode = decodedText;
        if (decodedText.includes('http://') || decodedText.includes('https://')) {
          const urlParts = decodedText.split('/');
          barcode = urlParts[urlParts.length - 1];
          console.log('📦 Extracted barcode from URL:', barcode);
        }
        
        setScanningStatus('detected');
        setLastScanAttempt(barcode);
        setScannedCode(barcode);
        
        setShowScanSuccessModal(true);
        
        setTimeout(() => setScanningStatus('processing'), 500);
        
        playScanSound();
        triggerVibration();

        if (bulkScanMode) {
          const result = await fetchBarcodeDataForBulk(barcode);
          setBulkScannedItems(prev => [...prev, {
            barcode: barcode,
            timestamp: new Date().toISOString(),
            success: result.success,
            data: result.data,
            error: result.error
          }]);
          
          setTimeout(() => setShowScanSuccessModal(false), 1500);
          
          setScanningStatus('scanning');
          
          if (!continuousScanMode) {
            stopCameraScanner();
            setScanMode('manual');
            setScanningStatus('idle');
          }
        } else {
          await fetchBarcodeData(barcode);
          
          setTimeout(() => setShowScanSuccessModal(false), 2000);
          
          if (!continuousScanMode) {
            stopCameraScanner();
            setScanMode('manual');
            setScanningStatus('idle');
          } else {
            setScanningStatus('scanning');
          }
        }
      };

      const onScanError = (errorMessage) => {
        setScanAttempts(prev => {
          const newCount = prev + 1;
          if (newCount % 50 === 0) {
            console.log('🔍 Scanner active, attempts:', newCount);
          }
          return newCount;
        });
        
        if (scanningStatus !== 'scanning' && scanningStatus !== 'detected' && scanningStatus !== 'processing') {
          setScanningStatus('scanning');
        }
      };

      const cameraConstraints = { facingMode: facingMode };

      await html5QrCodeRef.current.start(
        cameraConstraints,
        config,
        onScanSuccess,
        onScanError
      );

      setTimeout(() => {
        try {
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
      const response = await api.get(`/warehouse/scan/${barcodeValue}`);
      if (response.data.success && response.data.unit) {
        return { success: true, data: response.data.unit };
      } else {
        return { success: false, error: 'Barcode not found' };
      }
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed to fetch' };
    }
  };

  // Save scan history
  const saveScanHistory = (data) => {
    const history = [
      {
        barcode: data.barcode,
        scannedAt: new Date().toISOString(),
        product: data.products?.name,
        warehouse: data.warehouses?.name,
        rack: data.rack_code
      },
      ...scanHistory.slice(0, 9)
    ];
    setScanHistory(history);
    localStorage.setItem('warehouse_scanHistory', JSON.stringify(history));
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
    setMovementHistory([]);

    try {
      console.log('🔍 Fetching barcode:', barcodeValue);
      const response = await api.get(`/warehouse/scan/${barcodeValue}`);
      
      if (response.data.success && response.data.unit) {
        const data = response.data.unit;
        setScannedData(data);
        setMovementHistory(response.data.movements || []);
        saveScanHistory(data);
        console.log('✅ Barcode data loaded:', data);
      } else {
        setError('Barcode not found in system');
      }
    } catch (err) {
      console.error('❌ Scan error:', err);
      setError(err.response?.data?.error || 'Failed to scan barcode. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle new scan
  const handleNewScan = () => {
    setScannedData(null);
    setMovementHistory([]);
    setError(null);
    setManualInput('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="bg-gradient-to-br from-orange-50 via-amber-50/30 to-orange-50 -m-6 p-6 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-500/30 mb-2">
          <Package className="w-3 h-3" />
          WAREHOUSE STAFF
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-orange-900 to-slate-900 bg-clip-text text-transparent tracking-tight">
          Scan Products
        </h1>
        <p className="text-slate-600 text-sm">Advanced barcode scanning with full product tracking and location lookup</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Left Column - Scanner */}
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
                    ? 'bg-orange-600 text-white shadow-md'
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
                    ? 'bg-orange-600 text-white shadow-md'
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

            {/* Camera Controls */}
            {scanMode === 'camera' && (
              <div className="mb-4 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setContinuousScanMode(!continuousScanMode)}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                      continuousScanMode
                        ? 'bg-green-100 text-green-700 border-2 border-green-300'
                        : 'bg-slate-100 text-slate-600 border border-slate-300'
                    }`}
                  >
                    <Video className="w-4 h-4" />
                    {continuousScanMode ? 'Continuous ON' : 'Single Scan'}
                  </button>

                  <button
                    onClick={toggleFlash}
                    disabled={!cameraActive}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                      flashEnabled
                        ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-300'
                        : 'bg-slate-100 text-slate-600 border border-slate-300'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {flashEnabled ? <Flashlight className="w-4 h-4" /> : <FlashlightOff className="w-4 h-4" />}
                    Flash
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setSoundEnabled(!soundEnabled);
                      localStorage.setItem('warehouse_scanSoundEnabled', (!soundEnabled).toString());
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                      soundEnabled
                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                        : 'bg-slate-100 text-slate-600 border border-slate-300'
                    }`}
                  >
                    {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    Sound
                  </button>

                  <button
                    onClick={toggleCamera}
                    disabled={!cameraActive}
                    className="py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <SwitchCamera className="w-4 h-4" />
                    {selectedCamera === 'environment' ? 'Back' : 'Front'}
                  </button>
                </div>

                {cameraActive && (
                  <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2 border border-slate-200">
                    <button
                      onClick={() => handleZoom('out')}
                      className="p-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 transition-all"
                    >
                      <ZoomOut className="w-4 h-4 text-slate-600" />
                    </button>
                    <div className="flex-1 flex items-center gap-2">
                      <Maximize2 className="w-4 h-4 text-slate-500" />
                      <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-orange-500 h-full transition-all duration-300"
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
                    >
                      <ZoomIn className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                      onClick={() => handleZoom('reset')}
                      className="px-3 py-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 transition-all text-xs font-semibold text-slate-600"
                    >
                      Reset
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Manual Input */}
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
                    className="w-full px-6 py-4 text-lg rounded-xl border-2 border-slate-300 focus:border-orange-500 focus:ring focus:ring-orange-200 transition-all font-mono"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !manualInput.trim()}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-lg hover:from-orange-700 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <>
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Search className="w-6 h-6" />
                      Scan Product
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Camera View */}
            {scanMode === 'camera' && (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full"
                >
                  <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-700/50 backdrop-blur-xl">
                    <div className="warehouse-camera-container relative bg-black">
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
                          <div 
                            id={scannerRegionId}
                            className="w-full h-full"
                            style={{ backgroundColor: '#000' }}
                          />
                          
                          {cameraActive && (
                            <div 
                              className="absolute inset-0"
                              style={{
                                pointerEvents: 'none',
                                zIndex: 1000
                              }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60" />
                              <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />
                              
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="relative" style={{ width: '65%', aspectRatio: '1.2' }}>
                                  
                                  {/* Corner Indicators */}
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
                                  
                                  {/* Scanning Line */}
                                  {scanningStatus === 'scanning' && (
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
                                  )}
                                  
                                  {/* Center Crosshair */}
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
                    
                    {/* Control Panel */}
                    <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 border-t border-slate-700/50">
                      <div className="p-4 flex items-center gap-3">
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
                        
                        <button
                          onClick={toggleFlash}
                          disabled={!cameraActive}
                          className={`p-3.5 rounded-xl border-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                            flashEnabled 
                              ? 'bg-yellow-500/20 border-yellow-400 text-yellow-300 shadow-lg shadow-yellow-500/30' 
                              : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500'
                          }`}
                        >
                          <Flashlight className="w-6 h-6" />
                        </button>
                        
                        <button
                          onClick={toggleCamera}
                          disabled={!cameraActive}
                          className="p-3.5 rounded-xl border-2 border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500 hover:bg-slate-700 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <SwitchCamera className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}

            {/* Instructions when camera active */}
            {scanMode === 'camera' && cameraActive && (
              <div className="mt-6 bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-2xl p-6 shadow-md">
                <div className="flex items-start gap-5">
                  <div className="w-14 h-14 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <Video className="w-7 h-7 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <h3 className="text-lg font-bold text-orange-900">
                        Camera Active
                      </h3>
                    </div>
                    <p className="text-sm text-orange-700 leading-relaxed">
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
            )}

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
            <div className="bg-gradient-to-br from-white to-orange-50 rounded-2xl shadow-xl p-6 border-2 border-orange-200 mt-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center">
                    <Info className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">Recent Scans</h3>
                    <p className="text-xs text-slate-500">{scanHistory.length} items in history</p>
                  </div>
                </div>
                <button
                  onClick={exportScanHistory}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm font-bold transition-all flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>
              </div>
              
              <div className="space-y-2.5">
                {scanHistory.slice(0, 5).map((item, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setManualInput(item.barcode);
                      fetchBarcodeData(item.barcode);
                    }}
                    className="w-full text-left p-4 rounded-xl bg-white hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 transition-all border-2 border-slate-200 hover:border-orange-300 shadow-sm hover:shadow-md group"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 bg-gradient-to-br from-orange-100 to-amber-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Package className="w-4 h-4 text-orange-600" />
                          </div>
                          <p className="font-mono text-sm text-orange-700 font-bold truncate">{item.barcode}</p>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <span className="font-semibold truncate">{item.product || 'Unknown Product'}</span>
                          {item.rack && (
                            <>
                              <span className="text-slate-400">•</span>
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-emerald-600" />
                                <span className="font-medium text-emerald-700">{item.rack}</span>
                              </div>
                            </>
                          )}
                        </div>
                        
                        <p className="text-[10px] text-slate-400 mt-1.5">
                          {new Date(item.scannedAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-orange-100 flex items-center justify-center transition-colors">
                          <Search className="w-4 h-4 text-slate-400 group-hover:text-orange-600 transition-colors" />
                        </div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
              
              {scanHistory.length > 5 && (
                <div className="mt-4 text-center">
                  <p className="text-xs text-slate-500 font-medium">
                    Showing 5 of {scanHistory.length} scans • Export to view all
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Bulk Scan Results */}
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
                            <span className="font-semibold">{item.data.products?.name}</span>
                            {item.data.rack_code && (
                              <span className="ml-2">
                                📍 {item.data.rack_code}
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

        {/* Right Column - Results */}
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
                    className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold transition-all"
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
                  <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
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
                      <h2 className="text-2xl font-black">Product Found!</h2>
                      <p className="text-emerald-100 font-mono text-sm mt-1">{scannedData.barcode}</p>
                    </div>
                  </div>
                </div>

                {/* Location Display */}
                {scannedData.warehouses && (
                  <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 rounded-2xl p-6 border-2 border-emerald-300 shadow-xl">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                    
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <MapPin className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-white">📍 Storage Location</h3>
                          <p className="text-emerald-50 text-sm font-medium">Exact warehouse position</p>
                        </div>
                      </div>

                      <div className="bg-white/95 backdrop-blur-sm rounded-xl p-5 shadow-lg space-y-4">
                        {/* Warehouse */}
                        <div className="text-center pb-4 border-b-2 border-emerald-200">
                          <p className="text-xs font-semibold text-emerald-700 mb-2 uppercase">🏢 Warehouse</p>
                          <p className="text-3xl font-black text-emerald-900">
                            {scannedData.warehouses?.name || 'Not Assigned'}
                          </p>
                        </div>
                          
                        {/* Position Code */}
                        {scannedData.position_code ? (
                          <div className="space-y-2.5">
                            <div className="p-4 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl border-2 border-emerald-400 shadow-lg">
                              <p className="text-[10px] font-bold text-emerald-100 mb-2 text-center uppercase tracking-wide">📍 Storage Position</p>
                              <p className="text-center font-mono text-xl font-black text-white break-all tracking-wider">
                                {scannedData.position_code}
                              </p>
                            </div>

                            {scannedData.rack_code && (
                              <div className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                                <div className="flex items-center gap-1.5">
                                  <Package className="w-4 h-4 text-emerald-600" />
                                  <span className="text-xs font-bold text-emerald-900">Rack</span>
                                </div>
                                <div className="text-right">
                                  <p className="text-base font-black text-emerald-800">
                                    {scannedData.rack_code}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <AlertCircle className="w-6 h-6 text-amber-500 mx-auto mb-1.5" />
                            <p className="text-xs font-semibold text-amber-800">No Location Assigned</p>
                            <p className="text-[10px] text-amber-600 mt-0.5">This product needs to be assigned to a storage location</p>
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
                        <p className="text-xs text-slate-500 mb-1">Name</p>
                        <p className="font-semibold text-slate-900">{scannedData.products.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">SKU</p>
                        <p className="font-mono text-sm font-semibold text-slate-900">{scannedData.products.sku}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Type</p>
                        <p className="font-semibold text-slate-900">{scannedData.products.product_type}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Status</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                          scannedData.status === 'AVAILABLE'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {scannedData.status}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Movement History */}
                {movementHistory && movementHistory.length > 0 && (
                  <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <Clock className="w-6 h-6 text-purple-600" />
                      <h3 className="text-xl font-bold text-slate-900">Movement History</h3>
                    </div>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {movementHistory.map((movement, index) => (
                        <div key={index} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-slate-900">{movement.movement_type}</p>
                              <p className="text-xs text-slate-600 mt-1">
                                {movement.from_location && `From: ${movement.from_location} `}
                                {movement.to_location && `To: ${movement.to_location}`}
                              </p>
                              {movement.notes && (
                                <p className="text-xs text-slate-500 mt-1">{movement.notes}</p>
                              )}
                            </div>
                            <span className="text-xs text-slate-500 whitespace-nowrap">
                              {new Date(movement.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Empty State */}
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

      {/* Scan Success Modal */}
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
                Barcode Scanned!
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
    </div>
  );
}
