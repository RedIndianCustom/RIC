/**
 * ============================================================================
 * SCAN-DRIVEN RECEIVING WORKFLOW
 * ============================================================================
 * Eliminates manual size selection - system automatically identifies products
 * Prevents tires from being assigned to wrong size/type
 * Scan-first approach with automatic product matching
 * ============================================================================
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck,
  Package,
  ScanBarcode,
  CheckCircle,
  XCircle,
  AlertTriangle,
  PlayCircle,
  StopCircle,
  FileText,
  History,
  Clock,
  RefreshCw,
  Barcode,
  ShieldAlert,
  CheckCheck,
  ClipboardCheck,
  UserCheck,
  PackageCheck,
  Ban,
  Camera,
  X,
  Hash,
  User,
  ArrowLeft,
  Eye,
  Box
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import api from '../../../services/api.js';

// Custom scrollbar styles
const customScrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(to bottom, #3b82f6, #6366f1);
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(to bottom, #2563eb, #4f46e5);
  }
`;

export default function ReceivingScanDriven() {
  // Inject custom scrollbar styles
  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.innerHTML = customScrollbarStyles;
    document.head.appendChild(styleTag);
    return () => document.head.removeChild(styleTag);
  }, []);

  // Shipment list state
  const [shipments, setShipments] = useState([]);
  const [receivingReports, setReceivingReports] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductsModal, setShowProductsModal] = useState(null); // Store shipment for modal

  // Receiving session state
  const [activeSession, setActiveSession] = useState(null);
  const [sessionShipment, setSessionShipment] = useState(null);
  const [expectedItems, setExpectedItems] = useState([]);
  const [scanHistory, setScanHistory] = useState([]);
  const [productCounts, setProductCounts] = useState({});
  const [alert, setAlert] = useState(null);

  // Scanning state
  const [scanInput, setScanInput] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  
  // Scanner refs
  const scanInputRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const scannerRegionId = 'scan-driven-qr-scanner';

  useEffect(() => {
    loadShipments();
  }, []);

  useEffect(() => {
    if (activeSession && !showCamera && scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [activeSession, showCamera]);

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const loadShipments = async () => {
    try {
      setLoading(true);
      const [{ data }, reportsResponse] = await Promise.all([
        api.get('/shipments', {
          params: { status: 'IN_TRANSIT,ARRIVED,INSPECTING,AWAITING_APPROVAL,READY_FOR_QC,QC_READY,READY_FOR_INSPECTION,RECEIVED' }
        }),
        api.get('/receiving/reports', { params: { limit: 200 } }).catch(() => ({ data: { data: [] } }))
      ]);
      
      // Ensure suppliers data is included
      const shipmentsWithSuppliers = (data.shipments || []).map(shipment => ({
        ...shipment,
        supplier: shipment.suppliers || shipment.supplier || { name: 'N/A' }
      }));
      
      setShipments(shipmentsWithSuppliers);

      const latestReports = {};
      (reportsResponse.data.data || []).forEach(report => {
        if (!latestReports[report.shipment_id]) {
          latestReports[report.shipment_id] = report;
        }
      });
      setReceivingReports(latestReports);
    } catch (error) {
      console.error('Error loading shipments:', error);
      showAlert('error', 'Failed to load shipments');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ type, message });
  };

  const getManagerStatus = (shipment) => {
    const report = receivingReports[shipment.id];
    if (report?.status === 'APPROVED' || shipment.status === 'QC_READY' || shipment.status === 'READY_FOR_QC') {
      return { label: 'Approved - ready for QC', className: 'bg-green-100 text-green-700', icon: CheckCircle };
    }
    if (report?.status === 'REJECTED') {
      return { label: 'Rejected - review required', className: 'bg-red-100 text-red-700', icon: Ban };
    }
    if (report?.status === 'PENDING' || report?.status === 'PENDING_APPROVAL' || shipment.status === 'AWAITING_APPROVAL') {
      return { label: 'Pending manager approval', className: 'bg-amber-100 text-amber-700', icon: UserCheck };
    }
    return { label: 'No report submitted', className: 'bg-slate-100 text-slate-600', icon: Clock };
  };

  const startReceiving = async (shipment) => {
    try {
      setLoading(true);

      const { data: expectedData } = await api.get(`/receiving-qc/expected-items/${shipment.id}`);
      const items = expectedData.data || [];

      if (items.length === 0) {
        showAlert('error', 'No expected items found. Please register expected items first.');
        return;
      }

      const productCatalog = items.map(item => ({
        id: item.id,
        productId: item.product?.id,
        productName: item.product ? `${item.product.brand || ''} ${item.product.model || ''}`.trim() : 'Unknown',
        brand: item.product?.brand,
        model: item.product?.model,
        size: item.product_size || item.product?.dimensions,
        sku: item.product?.sku,
        expectedQuantity: item.expected_quantity || 0,
        receivedQuantity: 0,
        scannedBarcodes: []
      }));

      const counts = {};
      productCatalog.forEach(product => {
        const key = `${product.productId}-${product.size}`;
        counts[key] = {
          expected: product.expectedQuantity,
          received: 0,
          discrepancy: 0,
          productInfo: product
        };
      });

      setSessionShipment(shipment);
      setExpectedItems(productCatalog);
      setProductCounts(counts);
      setScanHistory([]);
      setActiveSession({
        id: crypto.randomUUID(),
        shipmentId: shipment.id,
        startTime: new Date(),
        status: 'SCANNING'
      });

      showAlert('success', `Receiving started for ${shipment.shipment_number}`);
    } catch (error) {
      console.error('Error starting receiving:', error);
      showAlert('error', error.response?.data?.error || 'Failed to start receiving');
    } finally {
      setLoading(false);
    }
  };

  const validateAndIdentifyProduct = async (barcode) => {
    try {
      const { data } = await api.post('/warehouse/receiving/identify-barcode', {
        barcode: barcode,
        shipment_id: sessionShipment.id,
        expected_items: expectedItems.map(item => ({
          product_id: item.productId,
          size: item.size,
          sku: item.sku
        }))
      });

      if (!data.success) {
        return {
          valid: false,
          reason: data.reason || 'UNKNOWN',
          message: data.message || 'Product not recognized'
        };
      }

      return {
        valid: true,
        productId: data.product.product_id,
        size: data.product.size,
        productName: data.product.product_name,
        brand: data.product.brand,
        model: data.product.model,
        sku: data.product.sku,
        source: data.source || 'barcode_match'
      };
    } catch (error) {
      console.error('Error validating barcode:', error);
      return {
        valid: false,
        reason: 'API_ERROR',
        message: error.response?.data?.error || 'Validation failed'
      };
    }
  };

  const isDuplicateBarcode = (barcode) => {
    // Check if this SPECIFIC barcode ID was already scanned
    // This handles unique RIC serial numbers (RIC000000006072, RIC000000006073, etc.)
    const duplicate = scanHistory.some(scan => scan.barcodeId === barcode && scan.status === 'SUCCESS');
    
    if (duplicate) {
      const existingBarcodes = scanHistory
        .filter(s => s.status === 'SUCCESS')
        .map(s => ({ barcodeId: s.barcodeId, sku: s.sku, timestamp: s.timestamp }));
        
      console.log('🔴 DUPLICATE DETECTED:', {
        scannedBarcode: barcode,
        existingBarcodes: existingBarcodes,
        totalSuccessfulScans: existingBarcodes.length
      });
    } else {
      console.log('✅ NOT A DUPLICATE:', {
        scannedBarcode: barcode,
        existingBarcodes: scanHistory
          .filter(s => s.status === 'SUCCESS')
          .map(s => s.barcodeId)
      });
    }
    
    return duplicate;
  };

  // Helper function to group duplicate scans
  const groupedScanHistory = () => {
    const grouped = [];
    const duplicateMap = new Map();

    scanHistory.forEach(scan => {
      if (scan.status === 'DUPLICATE') {
        const key = scan.barcodeId || scan.barcode;
        if (duplicateMap.has(key)) {
          // Increment count
          duplicateMap.get(key).count++;
          duplicateMap.get(key).timestamps.push(scan.timestamp);
        } else {
          // First duplicate for this barcode
          duplicateMap.set(key, {
            ...scan,
            count: 1,
            timestamps: [scan.timestamp]
          });
        }
      } else {
        // Non-duplicate scans - add as is
        grouped.push(scan);
      }
    });

    // Add grouped duplicates at the beginning
    duplicateMap.forEach(duplicateScan => {
      grouped.unshift(duplicateScan);
    });

    return grouped;
  };

  // Show product selection modal when barcode doesn't have mapping
  const showProductSelectionModal = (availableProducts, barcode) => {
    return new Promise((resolve) => {
      // Check if availableProducts exists and is an array
      if (!availableProducts || !Array.isArray(availableProducts) || availableProducts.length === 0) {
        console.error('No available products provided to modal');
        const errorMsg = `❌ ERROR: Cannot identify barcode ${barcode}\n\n` +
                        `Backend did not return product options.\n\n` +
                        `SOLUTION:\n` +
                        `1. Make sure products are registered in the shipment\n` +
                        `2. Verify the barcode belongs to this shipment\n` +
                        `3. Check that expected items are configured\n\n` +
                        `This barcode cannot be processed automatically.`;
        
        // Use showAlert instead of alert
        showAlert('error', errorMsg);
        resolve(null);
        return;
      }
      
      // Create a simple selection message
      let message = `⚠️ Cannot identify QR code automatically.\n\n`;
      message += `QR Code: ${barcode}\n\n`;
      message += `This QR code doesn't have product information.\n`;
      message += `Please select the correct product:\n\n`;
      
      availableProducts.forEach((product, index) => {
        message += `${index + 1}. ${product.sku} - ${product.size}\n`;
      });
      
      message += `\n💡 TIP: Generate QR codes with product SKUs for automatic identification!\n\n`;
      message += `Enter product number (1-${availableProducts.length}) or Cancel:`;
      
      const input = window.prompt(message);
      
      if (!input) {
        resolve(null); // User cancelled
        return;
      }
      
      const selection = parseInt(input);
      if (isNaN(selection) || selection < 1 || selection > availableProducts.length) {
        showAlert('error', 'Invalid selection');
        resolve(null);
        return;
      }
      
      resolve(availableProducts[selection - 1]);
    });
  };

  const handleScan = async (scannedValue) => {
    let barcode = (scannedValue || scanInput).trim();
    
    // Extract barcode ID from URL if it's a URL format
    // Format: http://localhost:5173/trace/RIC000000006072
    if (barcode.startsWith('http://') || barcode.startsWith('https://')) {
      try {
        const url = new URL(barcode);
        const pathParts = url.pathname.split('/').filter(Boolean);
        const extractedBarcode = pathParts[pathParts.length - 1];
        console.log(`📍 Extracted barcode from URL: ${barcode} → ${extractedBarcode}`);
        barcode = extractedBarcode;
      } catch (urlError) {
        // Fallback: extract everything after last /
        const lastSlash = barcode.lastIndexOf('/');
        if (lastSlash !== -1) {
          barcode = barcode.substring(lastSlash + 1);
        }
      }
    }
    
    console.log('\n========================================');
    console.log('📱 FRONTEND SCAN DEBUG');
    console.log('========================================');
    console.log('Raw scanned value:', scannedValue);
    console.log('Scan input:', scanInput);
    console.log('Final barcode:', barcode);
    console.log('Barcode length:', barcode.length);
    console.log('========================================\n');
    
    if (!barcode) {
      showAlert('error', 'Please enter a barcode');
      return;
    }

    if (!activeSession) {
      showAlert('error', 'No active receiving session');
      return;
    }

    // Don't process if already scanning
    if (isScanning) return;

    setIsScanning(true);
    setScanInput('');

    try {
      // Check for duplicate BARCODE ID (not product!)
      // Each tire has unique barcode ID: RIC000000006072, RIC000000006073, etc.
      // If same barcode ID scanned twice → DUPLICATE
      // If different barcode ID but same product → OK (count it)
      if (isDuplicateBarcode(barcode)) {
        const scanRecord = {
          barcodeId: barcode, // Store the unique barcode ID
          barcode,
          timestamp: new Date(),
          status: 'DUPLICATE',
          message: `Barcode ${barcode} was already scanned`
        };
        
        setScanHistory(prev => [scanRecord, ...prev]);
        showAlert('warning', `⚠️ Duplicate! Barcode ${barcode} was already scanned.`);
        playErrorSound();
        setIsScanning(false);
        return;
      }

      // Validate and identify product
      console.log('[Frontend] Attempting to identify barcode:', barcode);
      const validation = await validateAndIdentifyProduct(barcode);
      console.log('[Frontend] Validation result:', validation);

      if (!validation.valid) {
        let scanStatus = 'INVALID';
        let alertType = 'error';
        let alertMessage = validation.message;

        // Log debug info if available
        if (validation.debug) {
          console.log('[Frontend] Backend debug info:', validation.debug);
        }

        // Handle multiple products with no mapping - show selection modal
        if (validation.reason === 'MULTIPLE_PRODUCTS_NO_MAPPING') {
          console.log('[Frontend] Multiple products detected, showing selection');
          console.log('[Frontend] Available products:', validation.available_products);
          
          // Check if backend provided available products
          if (!validation.available_products || validation.available_products.length === 0) {
            // No products provided by backend - this means the expected items weren't loaded properly
            scanStatus = 'CONFIG_ERROR';
            alertType = 'error';
            alertMessage = `⚠️ Configuration Error\n\n` +
                          `Cannot identify barcode: ${barcode}\n\n` +
                          `Expected products are not configured for this shipment.\n\n` +
                          `SOLUTION:\n` +
                          `1. Make sure products are added to the shipment\n` +
                          `2. Register expected items in the system\n` +
                          `3. Restart the receiving session\n\n` +
                          `Contact your supervisor if this persists.`;
            
            const scanRecord = {
              barcodeId: barcode,
              barcode,
              timestamp: new Date(),
              status: scanStatus,
              message: 'Expected products not configured - cannot identify barcode'
            };

            setScanHistory(prev => [scanRecord, ...prev]);
            showAlert(alertType, alertMessage);
            setIsScanning(false);
            return;
          }
          
          // Show modal to let user select correct product
          const selectedProduct = await showProductSelectionModal(validation.available_products, barcode);
          
          if (selectedProduct) {
            // User selected a product - continue with that
            validation.valid = true;
            validation.productId = selectedProduct.product_id;
            validation.sku = selectedProduct.sku;
            validation.size = selectedProduct.size;
            validation.productName = selectedProduct.product_name;
            validation.source = 'manual_selection';
            
            // Continue to success handling below
          } else {
            // User cancelled - treat as error
            scanStatus = 'CANCELLED';
            alertType = 'info';
            alertMessage = '⚠️ Scan cancelled - product not selected';
            
            const scanRecord = {
              barcodeId: barcode,
              barcode,
              timestamp: new Date(),
              status: scanStatus,
              message: alertMessage
            };

            setScanHistory(prev => [scanRecord, ...prev]);
            showAlert(alertType, alertMessage);
            setIsScanning(false);
            return;
          }
        }

        // Only show error if we didn't handle it above
        if (!validation.valid) {
          if (validation.reason === 'NOT_IN_SHIPMENT') {
            scanStatus = 'NOT_IN_SHIPMENT';
            alertType = 'error';
            alertMessage = `🚫 NOT IN SHIPMENT!\n\nBarcode: ${barcode}\n\nThis product is NOT part of this shipment.\n\nPlease verify:\n1. Correct shipment selected\n2. Barcode belongs to this shipment\n3. Shipment registration is correct`;
            
            // Show which product was identified
            if (validation.debug && validation.debug.identified_product) {
              alertMessage += `\n\nIdentified as: ${validation.debug.identified_product}`;
              alertMessage += `\n\nExpected products in this shipment:`;
              expectedItems.forEach((item, idx) => {
                alertMessage += `\n${idx + 1}. ${item.sku} - ${item.size}`;
              });
            }
            
            console.error('🚫 NOT IN SHIPMENT:', {
              barcode,
              expectedItems: expectedItems.map(i => ({ sku: i.sku, size: i.size })),
              validation
            });
          } else if (validation.reason === 'BARCODE_NOT_FOUND') {
            scanStatus = 'INVALID_BARCODE';
            alertMessage = `❌ CANNOT IDENTIFY BARCODE\n\nBarcode: ${barcode}\n\n${validation.message}`;
            
            // Show helpful hint if we have expected items
            if (expectedItems && expectedItems.length > 0) {
              alertMessage += `\n\nExpected products:`;
              expectedItems.forEach((item, idx) => {
                alertMessage += `\n${idx + 1}. ${item.sku} - ${item.size}`;
              });
              
              console.log('💡 Expected products:', expectedItems.map(item => ({
                sku: item.sku,
                size: item.size,
                name: item.productName
              })));
            }
          }

          const scanRecord = {
            barcodeId: barcode,
            barcode,
            timestamp: new Date(),
            status: scanStatus,
            message: validation.message
          };

          setScanHistory(prev => [scanRecord, ...prev]);
          showAlert(alertType, alertMessage);
          playErrorSound();
          setIsScanning(false);
          return;
        }
      }

      // Success - update counts
      const productKey = `${validation.productId}-${validation.size}`;
      
      // Check if we're about to exceed expected quantity
      const currentReceived = productCounts[productKey]?.received || 0;
      const expectedQuantity = productCounts[productKey]?.expected || 0;
      
      if (currentReceived >= expectedQuantity && expectedQuantity > 0) {
        // Already received all expected items for this product
        const scanRecord = {
          barcode,
          timestamp: new Date(),
          status: 'EXCESS',
          productId: validation.productId,
          productName: validation.productName,
          size: validation.size,
          sku: validation.sku,
          message: `Excess item - already received ${currentReceived}/${expectedQuantity} expected`
        };
        
        setScanHistory(prev => [scanRecord, ...prev]);
        showAlert('warning', `⚠️ Excess: ${validation.productName} - Already scanned ${currentReceived}/${expectedQuantity} expected!`);
        playErrorSound();
        setIsScanning(false);
        return;
      }

      // Check if this scan will COMPLETE the product
      const willComplete = (currentReceived + 1) === expectedQuantity && expectedQuantity > 0;
      
      setProductCounts(prev => {
        const updated = { ...prev };
        if (updated[productKey]) {
          updated[productKey] = {
            ...updated[productKey],
            received: updated[productKey].received + 1,
            discrepancy: updated[productKey].expected - (updated[productKey].received + 1)
          };
        }
        return updated;
      });

      const scanRecord = {
        barcodeId: barcode, // Unique barcode ID (e.g., RIC000000006072)
        barcode,
        timestamp: new Date(),
        status: 'SUCCESS',
        productId: validation.productId,
        productName: validation.productName,
        brand: validation.brand,
        model: validation.model,
        size: validation.size,
        sku: validation.sku,
        source: validation.source
      };

      console.log('✅ SUCCESS SCAN RECORD:', {
        barcodeId: scanRecord.barcodeId,
        sku: scanRecord.sku,
        productName: scanRecord.productName
      });

      setScanHistory(prev => [scanRecord, ...prev]);
      
      setExpectedItems(prev => prev.map(item => {
        if (item.productId === validation.productId && item.size === validation.size) {
          return {
            ...item,
            receivedQuantity: item.receivedQuantity + 1,
            scannedBarcodes: [...(item.scannedBarcodes || []), barcode] // Track unique barcode IDs
          };
        }
        return item;
      }));

      const currentCount = (productCounts[productKey]?.received || 0) + 1;
      
      // Show COMPLETION alert if product is now complete
      if (willComplete) {
        const completionAlert = `✅ ${validation.productName} - ${validation.size} COMPLETED! (${currentCount}/${expectedQuantity}) 🎉`;
        showAlert('success', completionAlert);
        playCompletionSound(); // Play special completion sound
      } else {
        // Regular success message
        const isMultiProductFallback = validation.source === 'ric_serial_multi_product_fallback';
        const alertMessage = isMultiProductFallback
          ? `⚠️ ${validation.productName} - ${validation.size} (${currentCount}/${expectedQuantity}) - Verify product!`
          : `✅ ${validation.productName} - ${validation.size} (${currentCount}/${expectedQuantity})`;
        
        const alertType = isMultiProductFallback ? 'warning' : 'success';
        showAlert(alertType, alertMessage);
        
        if (isMultiProductFallback) {
          console.warn('⚠️ WARNING: Auto-assigned to first product. For accuracy, use product-specific QR codes.');
        }
        
        playSuccessSound();
      }

    } catch (error) {
      console.error('Error processing scan:', error);
      const scanRecord = {
        barcode,
        timestamp: new Date(),
        status: 'ERROR',
        message: error.message || 'Scan processing failed'
      };
      setScanHistory(prev => [scanRecord, ...prev]);
      showAlert('error', 'Failed to process scan');
      playErrorSound();
    } finally {
      setIsScanning(false);
      
      // Re-focus input for continuous scanning
      setTimeout(() => {
        if (scanInputRef.current && !showCamera) {
          scanInputRef.current.focus();
        }
      }, 100);
    }
  };

  const handleScanRef = useRef(null);
  useEffect(() => {
    handleScanRef.current = handleScan;
  });

  const startCamera = async () => {
    try {
      setShowCamera(true);
      await new Promise(resolve => setTimeout(resolve, 100));

      html5QrCodeRef.current = new Html5Qrcode(scannerRegionId);

      const config = {
        fps: 10,
        qrbox: function(viewfinderWidth, viewfinderHeight) {
          // Mobile: smaller box, Desktop: larger box
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdge * 0.7);
          return {
            width: qrboxSize,
            height: qrboxSize
          };
        },
        aspectRatio: 1.0,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.EAN_8
        ]
      };

      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          // DON'T stop camera - continuous scanning
          console.log('Scanned:', decodedText);
          
          // Process the scan without stopping camera
          if (handleScanRef.current && !isScanning) {
            handleScanRef.current(decodedText);
          }
        },
        (errorMessage) => {
          // Scan error - ignore for continuous scanning
        }
      );

      showAlert('success', '📸 Camera active - continuous scanning mode');
    } catch (error) {
      console.error('Camera error:', error);
      setShowCamera(false);
      showAlert('error', 'Camera access denied or not available');
    }
  };

  const stopCamera = async () => {
    if (!html5QrCodeRef.current) return;
    try {
      await html5QrCodeRef.current.stop();
      html5QrCodeRef.current.clear();
      html5QrCodeRef.current = null;
    } catch (error) {
      // Ignore
    } finally {
      setShowCamera(false);
    }
  };

  const playSuccessSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.3;
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {}
  };

  const playErrorSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 400;
      gain.gain.value = 0.3;
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {}
  };

  const playCompletionSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Play a celebratory three-tone sequence
      const times = [0, 0.15, 0.3];
      const frequencies = [800, 1000, 1200];
      
      times.forEach((time, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = frequencies[index];
        gain.gain.value = 0.3;
        osc.start(ctx.currentTime + time);
        osc.stop(ctx.currentTime + time + 0.15);
      });
    } catch (e) {}
  };

  const doneScanning = () => {
    setActiveSession(prev => ({ ...prev, status: 'REVIEW' }));
    showAlert('success', 'Scanning complete! Review the summary below.');
  };

  const submitReport = async (notes) => {
    try {
      setLoading(true);

      const reportData = {
        shipment_id: sessionShipment.id,
        session_id: activeSession.id,
        size_breakdown: Object.entries(productCounts).map(([key, data]) => ({
          product_id: data.productInfo.productId,
          product_name: data.productInfo.productName,
          size: data.productInfo.size,
          sku: data.productInfo.sku,
          expected: data.expected,
          scanned: data.received, // Backend expects 'scanned' field
          discrepancy: data.discrepancy
        })),
        total_expected: Object.values(productCounts).reduce((sum, p) => sum + p.expected, 0),
        total_scanned: Object.values(productCounts).reduce((sum, p) => sum + p.received, 0),
        total_discrepancy: Object.values(productCounts).reduce((sum, p) => sum + p.discrepancy, 0),
        notes: notes || null,
        scan_history: scanHistory
      };

      const { data } = await api.post('/receiving/submit-report', reportData);

      if (data.success) {
        showAlert('success', `✅ Report submitted! ${data.has_discrepancies ? 'Manager approval required.' : 'Ready for QC.'}`);
        
        setActiveSession(null);
        setSessionShipment(null);
        setExpectedItems([]);
        setScanHistory([]);
        setProductCounts({});
        
        loadShipments();
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      showAlert('error', error.response?.data?.error || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  if (activeSession) {
    const totalExpected = Object.values(productCounts).reduce((sum, p) => sum + p.expected, 0);
    const totalReceived = Object.values(productCounts).reduce((sum, p) => sum + p.received, 0);
    const progress = totalExpected > 0 ? (totalReceived / totalExpected) * 100 : 0;

    return (
      <div className="space-y-4 sm:space-y-6 p-2 sm:p-1">
        {/* Header with Gradient - Mobile Optimized */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Back Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setActiveSession(null);
                  setSessionShipment(null);
                  setExpectedItems([]);
                  setScanHistory([]);
                  setProductCounts({});
                }}
                className="p-2 sm:p-2.5 bg-white hover:bg-slate-100 border-2 border-slate-200 rounded-lg sm:rounded-xl shadow-md transition-colors"
                title="Back to shipment list"
              >
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700" />
              </motion.button>

              <div className="flex-1">
                <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg sm:rounded-xl shadow-lg">
                    <ScanBarcode className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <span className="text-xl sm:text-3xl truncate">Receiving: {sessionShipment.shipment_number}</span>
                </h2>
                <div className="text-xs sm:text-sm text-slate-600 mt-1 sm:mt-2 flex items-center gap-2">
                  {activeSession.status === 'SCANNING' ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="hidden sm:inline">Scan each tire - system identifies product automatically</span>
                      <span className="sm:hidden">Scan to identify products</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                      Review summary
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {activeSession.status === 'SCANNING' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={doneScanning}
              className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg sm:rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <StopCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              Done Scanning
            </motion.button>
          )}
        </motion.div>

        <AnimatePresence>
          {alert && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`p-4 rounded-xl shadow-lg ${
                alert.type === 'success' ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border-2 border-green-200' :
                alert.type === 'warning' ? 'bg-gradient-to-r from-yellow-50 to-orange-50 text-yellow-800 border-2 border-yellow-200' :
                'bg-gradient-to-r from-red-50 to-pink-50 text-red-800 border-2 border-red-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {alert.type === 'success' && <CheckCircle className="w-6 h-6 flex-shrink-0" />}
                {alert.type === 'warning' && <AlertTriangle className="w-6 h-6 flex-shrink-0" />}
                {alert.type === 'error' && <XCircle className="w-6 h-6 flex-shrink-0" />}
                <span className="font-medium text-base">{alert.message}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modern Progress Card - Mobile Responsive */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-white to-blue-50 rounded-xl sm:rounded-2xl shadow-xl border border-blue-100 p-4 sm:p-8"
        >
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex-1">
              <h3 className="text-base sm:text-xl font-bold text-slate-900">Receiving Progress</h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 flex items-center gap-2">
                <Package className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{totalReceived} of {totalExpected} tires scanned</span>
                <span className="sm:hidden">{totalReceived}/{totalExpected} scanned</span>
              </p>
            </div>
            <div className="text-3xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {Math.round(progress)}%
            </div>
          </div>
          
          <div className="relative w-full bg-slate-200 rounded-full h-4 sm:h-6 overflow-hidden shadow-inner">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-4 sm:h-6 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 shadow-lg relative overflow-hidden"
            >
              {/* Shimmer Effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{
                  x: ['-100%', '200%'],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
            </motion.div>
          </div>
        </motion.div>

        {/* Product Completion Status - NEW */}
        {Object.keys(productCounts).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-slate-200 p-4 sm:p-6"
          >
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCheck className="w-5 h-5 text-blue-600" />
              Product Status by Type
            </h3>
            
            <div className="space-y-3">
              {Object.entries(productCounts).map(([key, data]) => {
                const isComplete = data.received === data.expected && data.expected > 0;
                const progressPercent = data.expected > 0 ? (data.received / data.expected) * 100 : 0;
                
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      isComplete
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 shadow-lg'
                        : 'bg-gradient-to-r from-slate-50 to-blue-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {isComplete && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 200 }}
                            >
                              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                            </motion.div>
                          )}
                          <h4 className="font-bold text-slate-900 text-sm truncate">
                            {data.productInfo.productName}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-600">
                          Size: {data.productInfo.size} • SKU: {data.productInfo.sku}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {isComplete ? (
                          <motion.span
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="px-3 py-1 bg-green-600 text-white rounded-full text-xs font-bold flex items-center gap-1 shadow-md"
                          >
                            <CheckCircle className="w-3 h-3" />
                            COMPLETE
                          </motion.span>
                        ) : (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                            {data.received}/{data.expected}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="relative w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.5 }}
                        className={`h-2 rounded-full ${
                          isComplete
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                            : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                        }`}
                      />
                    </div>
                    
                    {isComplete && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-green-700 font-medium mt-2 flex items-center gap-1"
                      >
                        🎉 All {data.expected} items received for this product!
                      </motion.p>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Overall Completion Summary */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 font-medium">Products Completed:</span>
                <span className="font-bold text-blue-600">
                  {Object.values(productCounts).filter(p => p.received === p.expected && p.expected > 0).length} / {Object.keys(productCounts).length}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {activeSession.status === 'SCANNING' && (
          <>
            {/* Modern Scan Input Card - Mobile Optimized */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-white to-indigo-50 rounded-xl sm:rounded-2xl shadow-xl border border-indigo-100 p-4 sm:p-8 space-y-4 sm:space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                    <Barcode className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  Scan Barcode
                </h3>
                <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-100 rounded-full w-fit">
                  <Hash className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                  <span className="text-xs sm:text-sm font-bold text-blue-600">
                    {scanHistory.filter(s => s.status === 'SUCCESS').length} Scanned
                  </span>
                </div>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleScan(); }} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 relative">
                  <motion.input
                    ref={scanInputRef}
                    type="text"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    placeholder="Scan or enter barcode..."
                    disabled={showCamera || isScanning}
                    whileFocus={{ scale: 1.01 }}
                    className="w-full px-4 sm:px-6 py-3 sm:py-4 text-base sm:text-lg font-mono border-2 border-indigo-200 rounded-lg sm:rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100 shadow-lg transition-all"
                    autoFocus
                  />
                  {isScanning && (
                    <div className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={showCamera ? stopCamera : startCamera}
                  className={`px-6 sm:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl font-semibold shadow-lg transition-all flex items-center justify-center gap-2 text-sm sm:text-base ${
                    showCamera 
                      ? 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white' 
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                  }`}
                >
                  <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="hidden sm:inline">{showCamera ? 'Stop' : 'Camera'}</span>
                </motion.button>
              </form>

              {/* Simple Camera Scanner View - Mobile Optimized */}
              <AnimatePresence>
                {showCamera && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative mt-4"
                  >
                    {/* Clean Camera Frame */}
                    <div className="relative rounded-2xl overflow-hidden bg-gray-900 border-4 border-green-500 shadow-2xl">
                      {/* Scanner Region */}
                      <div id={scannerRegionId} className="relative w-full" style={{ minHeight: '300px' }} />
                      
                      {/* Simple Corner Guides */}
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="relative w-48 h-48 sm:w-64 sm:h-64">
                          {/* Corner Brackets - Cleaner Design */}
                          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400"></div>
                          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400"></div>
                          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400"></div>
                          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400"></div>
                        </div>
                      </div>
                      
                      {/* Continuous Scanning Indicator */}
                      <div className="absolute top-4 left-0 right-0 text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600/90 backdrop-blur-sm rounded-full text-white text-xs sm:text-sm font-medium shadow-lg">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                          <span className="hidden sm:inline">Continuous Scanning Active</span>
                          <span className="sm:hidden">Scanning...</span>
                        </div>
                      </div>
                      
                      {/* Simple Instruction */}
                      <div className="absolute bottom-4 left-0 right-0 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-black/70 backdrop-blur-sm rounded-full text-white text-xs sm:text-sm">
                          Position barcode within the frame
                        </div>
                      </div>
                    </div>

                    {/* Close Button */}
                    <button
                      onClick={stopCamera}
                      className="absolute top-2 right-2 z-20 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Enhanced Scan History - Mobile Responsive */}
            {scanHistory.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-slate-200 p-4 sm:p-8"
              >
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-xl font-bold text-slate-900 flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
                      <History className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <span className="hidden sm:inline">Recent Scans</span>
                    <span className="sm:hidden">Scans</span>
                  </h3>
                  <span className="px-3 sm:px-4 py-1 sm:py-2 bg-slate-100 rounded-full text-xs sm:text-sm font-bold text-slate-700">
                    {scanHistory.length} Total
                  </span>
                </div>
                
                <div className="space-y-2 sm:space-y-3 max-h-80 sm:max-h-96 overflow-y-auto custom-scrollbar">
                  {groupedScanHistory().slice(0, 10).map((scan, idx) => (
                    <motion.div
                      key={`${scan.barcodeId || scan.barcode}-${idx}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 shadow-md ${
                        scan.status === 'SUCCESS' ? 'border-green-200 bg-gradient-to-r from-green-50 to-emerald-50' :
                        scan.status === 'DUPLICATE' ? 'border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50' :
                        scan.status === 'UNEXPECTED_PRODUCT' ? 'border-orange-200 bg-gradient-to-r from-orange-50 to-red-50' :
                        'border-red-200 bg-gradient-to-r from-red-50 to-pink-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 sm:mb-2">
                            {scan.status === 'SUCCESS' && <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />}
                            {scan.status === 'DUPLICATE' && (
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 flex-shrink-0" />
                                {scan.count > 1 && (
                                  <span className="px-2 py-0.5 bg-yellow-600 text-white rounded-full text-xs font-bold">
                                    ×{scan.count}
                                  </span>
                                )}
                              </div>
                            )}
                            {scan.status === 'UNEXPECTED_PRODUCT' && <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 flex-shrink-0" />}
                            {(scan.status === 'INVALID_BARCODE' || scan.status === 'ERROR') && <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />}
                            {/* Display barcode ID prominently */}
                            <span className="font-mono text-xs sm:text-sm font-bold truncate">
                              {scan.barcodeId || scan.barcode}
                            </span>
                          </div>
                          {scan.status === 'SUCCESS' && (
                            <>
                              <p className="text-xs sm:text-sm font-medium text-slate-700 truncate">
                                {scan.productName} - {scan.size}
                              </p>
                              {/* Show SKU below product name */}
                              {scan.sku && (
                                <p className="text-xs text-slate-500 font-mono">
                                  SKU: {scan.sku}
                                </p>
                              )}
                            </>
                          )}
                          {scan.status === 'DUPLICATE' && (
                            <p className="text-xs text-slate-600 mt-1">
                              {scan.count > 1 
                                ? `Scanned ${scan.count} times (duplicate attempts)`
                                : scan.message}
                            </p>
                          )}
                          {scan.message && scan.status !== 'DUPLICATE' && (
                            <p className="text-xs text-slate-600 mt-1 line-clamp-2">{scan.message}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0">
                          <Clock className="w-3 h-3" />
                          <span className="hidden sm:inline">
                            {scan.count > 1 
                              ? new Date(scan.timestamps[scan.timestamps.length - 1]).toLocaleTimeString()
                              : new Date(scan.timestamp).toLocaleTimeString()
                            }
                          </span>
                          <span className="sm:hidden">
                            {scan.count > 1
                              ? new Date(scan.timestamps[scan.timestamps.length - 1]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : new Date(scan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            }
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}

        {activeSession.status === 'REVIEW' && (
          <ReceivingReportView
            productCounts={productCounts}
            onSubmit={submitReport}
            onBackToScanning={() => setActiveSession(prev => ({ ...prev, status: 'SCANNING' }))}
          />
        )}
      </div>
    );
  }

  const filteredShipments = shipments.filter(s =>
    s.shipment_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.container_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-1">
      {/* Modern Header - Mobile Optimized */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex-1">
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg sm:rounded-xl shadow-lg">
              <Truck className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
            </div>
            <span className="hidden sm:inline">Scan-Driven Receiving</span>
            <span className="sm:hidden">Receiving</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 sm:mt-2">
            <span className="hidden sm:inline">Select a shipment to start the scan-driven receiving workflow</span>
            <span className="sm:hidden">Select shipment to begin</span>
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={loadShipments}
          className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl border-2 border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50 flex items-center justify-center gap-2 transition-all shadow-md"
        >
          <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 ${loading ? 'animate-spin' : ''}`} />
          <span className="font-semibold text-indigo-600 text-sm sm:text-base">Refresh</span>
        </motion.button>
      </motion.div>

      {loading ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12 sm:py-20"
        >
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3 sm:mb-4"></div>
          <p className="text-slate-600 font-medium text-sm sm:text-base">Loading shipments...</p>
        </motion.div>
      ) : filteredShipments.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12 sm:py-20 bg-gradient-to-br from-white to-slate-50 rounded-xl sm:rounded-2xl border-2 border-dashed border-slate-300"
        >
          <Package className="w-16 h-16 sm:w-20 sm:h-20 text-slate-300 mx-auto mb-3 sm:mb-4" />
          <p className="text-slate-600 font-medium text-base sm:text-lg">No shipments available</p>
          <p className="text-slate-400 text-xs sm:text-sm mt-2 px-4">Shipments will appear here when they're ready for receiving</p>
        </motion.div>
      ) : (
        <>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {[
            { label: 'Ready to Receive', count: shipments.filter(s => ['IN_TRANSIT', 'ARRIVED'].includes(s.status)).length, icon: Truck, color: 'blue' },
            { label: 'Inspecting', count: shipments.filter(s => s.status === 'INSPECTING').length, icon: ScanBarcode, color: 'indigo' },
            { label: 'Waiting Manager', count: shipments.filter(s => s.status === 'AWAITING_APPROVAL' || ['PENDING', 'PENDING_APPROVAL'].includes(receivingReports[s.id]?.status)).length, icon: UserCheck, color: 'amber' },
            { label: 'Ready for QC', count: shipments.filter(s => ['READY_FOR_QC', 'QC_READY'].includes(s.status) || receivingReports[s.id]?.status === 'APPROVED').length, icon: ClipboardCheck, color: 'emerald' },
            { label: 'Completed', count: shipments.filter(s => s.status === 'RECEIVED').length, icon: PackageCheck, color: 'green' }
          ].map(({ label, count, icon: Icon, color }) => {
            const cardStyles = {
              blue: 'border-blue-200 text-blue-600 text-blue-400',
              indigo: 'border-indigo-200 text-indigo-600 text-indigo-400',
              amber: 'border-amber-200 text-amber-600 text-amber-400',
              emerald: 'border-emerald-200 text-emerald-600 text-emerald-400',
              green: 'border-green-200 text-green-600 text-green-400'
            }[color];
            const [borderColor, numberColor, iconColor] = cardStyles.split(' ');

            return (
            <div key={label} className={`bg-white rounded-xl shadow-md border ${borderColor} p-4`}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs sm:text-sm text-slate-600">{label}</p>
                  <p className={`text-2xl font-bold ${numberColor}`}>{count}</p>
                </div>
                <Icon className={`w-7 h-7 ${iconColor} flex-shrink-0`} />
              </div>
            </div>
            );
          })}
        </div>

        <div className="grid gap-3 sm:gap-4">
          {filteredShipments.map((shipment, idx) => (
            <motion.div
              key={shipment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-gradient-to-br from-white to-blue-50 rounded-xl sm:rounded-2xl shadow-lg border-2 border-blue-100 hover:border-blue-300 p-4 sm:p-6 transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <h3 className="text-base sm:text-xl font-bold text-slate-900 truncate">{shipment.shipment_number}</h3>
                    <span className="px-2 sm:px-4 py-0.5 sm:py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md whitespace-nowrap">
                      {shipment.status}
                    </span>
                    {(() => {
                      const managerStatus = getManagerStatus(shipment);
                      const ManagerIcon = managerStatus.icon;
                      return (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ${managerStatus.className}`}>
                          <ManagerIcon className="w-3 h-3" />
                          {managerStatus.label}
                        </span>
                      );
                    })()}
                  </div>
                  
                  {/* Mobile: Stacked Layout */}
                  <div className="space-y-2 sm:hidden text-sm">
                    <div className="flex items-center gap-2">
                      <Package className="w-3 h-3 text-slate-500 flex-shrink-0" />
                      <span className="text-slate-600 text-xs">Container:</span>
                      <span className="font-bold text-slate-900 truncate">{shipment.container_number || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Hash className="w-3 h-3 text-slate-500 flex-shrink-0" />
                      <span className="text-slate-600 text-xs">Expected:</span>
                      <span className="font-bold text-slate-900">{shipment.expected_quantity} units</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3 text-slate-500 flex-shrink-0" />
                      <span className="text-slate-600 text-xs">Supplier:</span>
                      <span className="font-bold text-slate-900 truncate">{shipment.supplier?.name || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Desktop: Grid Layout */}
                  <div className="hidden sm:grid grid-cols-3 gap-4 text-sm mb-4">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="text-slate-600">Container:</span>
                        <span className="ml-2 font-bold text-slate-900">{shipment.container_number || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <div>
                        <span className="text-slate-600">Expected:</span>
                        <span className="ml-2 font-bold text-slate-900">{shipment.expected_quantity} units</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="text-slate-600">Supplier:</span>
                        <span className="ml-2 font-bold text-slate-900 truncate">{shipment.supplier?.name || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowProductsModal(shipment);
                      }}
                      className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-blue-300 rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
                    >
                      <Eye className="w-4 h-4 text-blue-600" />
                      <span className="text-slate-700 font-medium">Show Products</span>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => startReceiving(shipment)}
                      disabled={['AWAITING_APPROVAL', 'READY_FOR_QC', 'QC_READY', 'READY_FOR_QC', 'RECEIVED'].includes(shipment.status)}
                      className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed text-white rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-semibold shadow-md"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span className="hidden sm:inline">Start Receiving</span>
                      <span className="sm:hidden">Start</span>
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        </>
      )}

      {/* Products Modal */}
      {showProductsModal && (
        <ProductsModal
          shipment={showProductsModal}
          onClose={() => setShowProductsModal(null)}
        />
      )}
    </div>
  );
}

// Products Modal Component
function ProductsModal({ shipment, onClose }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (shipment) {
      loadProducts();
    }
  }, [shipment]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/receiving-qc/expected-items/${shipment.id}`);
      setProducts(data.data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!shipment) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <Box className="w-5 h-5 sm:w-6 sm:h-6" />
                  Expected Products
                </h3>
                <p className="text-xs sm:text-sm text-blue-100 mt-1">
                  {shipment.shipment_number}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
            {loading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-slate-600">Loading products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">No expected products found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {products.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-gradient-to-br from-slate-50 to-blue-50 border-2 border-slate-200 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 text-sm sm:text-base mb-2">
                          {item.product ? `${item.product.brand || ''} ${item.product.model || ''}`.trim() : 'Unknown Product'}
                        </h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs sm:text-sm">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md font-mono font-bold">
                              SKU: {item.product?.sku || 'N/A'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-slate-600">Size:</span>
                            <span className="font-bold text-slate-900">
                              {item.product_size || item.product?.dimensions || 'N/A'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-slate-600">Qty:</span>
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-bold">
                              {item.expected_quantity} units
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 p-4 bg-slate-50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Total Products:</span>
              <span className="font-bold text-slate-900">{products.length} items</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-slate-600">Total Quantity:</span>
              <span className="font-bold text-blue-600">
                {products.reduce((sum, p) => sum + (p.expected_quantity || 0), 0)} units
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ReceivingReportView({ productCounts, onSubmit, onBackToScanning }) {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const totalExpected = Object.values(productCounts).reduce((sum, p) => sum + p.expected, 0);
  const totalReceived = Object.values(productCounts).reduce((sum, p) => sum + p.received, 0);
  const totalDiscrepancy = totalExpected - totalReceived;

  const handleSubmit = async () => {
    setSubmitting(true);
    await onSubmit(notes);
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 text-center">
          <p className="text-sm text-blue-600 mb-1">Total Expected</p>
          <p className="text-4xl font-bold text-blue-700">{totalExpected}</p>
        </div>
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 text-center">
          <p className="text-sm text-green-600 mb-1">Total Received</p>
          <p className="text-4xl font-bold text-green-700">{totalReceived}</p>
        </div>
        <div className={`border-2 rounded-xl p-6 text-center ${
          totalDiscrepancy === 0 ? 'bg-green-50 border-green-200' :
          'bg-orange-50 border-orange-200'
        }`}>
          <p className="text-sm text-slate-600 mb-1">Discrepancy</p>
          <p className={`text-4xl font-bold ${
            totalDiscrepancy === 0 ? 'text-green-700' : 'text-orange-700'
          }`}>
            {totalDiscrepancy > 0 ? `-${totalDiscrepancy}` : totalDiscrepancy < 0 ? `+${Math.abs(totalDiscrepancy)}` : '0'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900 text-base sm:text-lg">Receiving Summary by Product & Size</h3>
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-4 text-sm font-semibold text-slate-700">Product Name</th>
                <th className="text-left p-4 text-sm font-semibold text-slate-700">Size</th>
                <th className="text-center p-4 text-sm font-semibold text-slate-700">Expected</th>
                <th className="text-center p-4 text-sm font-semibold text-slate-700">Received</th>
                <th className="text-center p-4 text-sm font-semibold text-slate-700">Discrepancy</th>
                <th className="text-center p-4 text-sm font-semibold text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(productCounts).map(([key, data]) => (
                <tr key={key} className="border-b border-slate-100">
                  <td className="p-4">
                    <p className="font-medium">{data.productInfo.productName}</p>
                    <p className="text-xs text-slate-500">SKU: {data.productInfo.sku}</p>
                  </td>
                  <td className="p-4">
                    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm">
                      {data.productInfo.size}
                    </span>
                  </td>
                  <td className="p-4 text-center font-medium">{data.expected}</td>
                  <td className="p-4 text-center font-medium">{data.received}</td>
                  <td className="p-4 text-center">
                    <span className={`font-bold ${
                      data.discrepancy === 0 ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {data.discrepancy === 0 ? '✓' : data.discrepancy > 0 ? `-${data.discrepancy}` : `+${Math.abs(data.discrepancy)}`}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    {data.discrepancy === 0 ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-orange-600 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-200">
          {Object.entries(productCounts).map(([key, data]) => (
            <div key={key} className="p-4">
              {/* Product Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900 text-sm leading-tight mb-1">
                    {data.productInfo.productName}
                  </h4>
                  <p className="text-xs text-slate-500">SKU: {data.productInfo.sku}</p>
                </div>
                <div className="ml-2">
                  {data.discrepancy === 0 ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-orange-600" />
                  )}
                </div>
              </div>

              {/* Size Badge */}
              <div className="mb-3">
                <span className="inline-flex px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                  {data.productInfo.size}
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-600 mb-1">Expected</p>
                  <p className="text-lg font-bold text-slate-900">{data.expected}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-green-700 mb-1">Received</p>
                  <p className="text-lg font-bold text-green-700">{data.received}</p>
                </div>
                <div className={`rounded-lg p-3 text-center ${
                  data.discrepancy === 0 ? 'bg-green-50' : 'bg-orange-50'
                }`}>
                  <p className="text-xs text-slate-600 mb-1">Discrepancy</p>
                  <p className={`text-lg font-bold ${
                    data.discrepancy === 0 ? 'text-green-700' : 'text-orange-700'
                  }`}>
                    {data.discrepancy === 0 ? '✓' : data.discrepancy > 0 ? `-${data.discrepancy}` : `+${Math.abs(data.discrepancy)}`}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Notes (Optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Add any notes about discrepancies..."
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onBackToScanning}
          className="w-full sm:flex-1 px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold transition-colors"
        >
          ← Back to Scanning
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full sm:flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:shadow-xl"
        >
          {submitting ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <CheckCheck className="w-5 h-5" />
              Submit to Manager
            </>
          )}
        </button>
      </div>
    </div>
  );
}
