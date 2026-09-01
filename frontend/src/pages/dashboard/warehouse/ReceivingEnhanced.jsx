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
  CheckCheck
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../../../services/api.js';
import { toast } from '../../../utils/toast';

export default function ReceivingEnhanced() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Receiving modal state
  const [showReceivingModal, setShowReceivingModal] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [receivingItems, setReceivingItems] = useState([]);
  const [receivingStep, setReceivingStep] = useState('scan'); // scan, verify, assign, complete
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [scanValue, setScanValue] = useState('');
  const [notes, setNotes] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  
  const scanInputRef = useRef(null);
  const html5QrCodeRef = useRef(null);
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

  // Camera functions using html5-qrcode for real barcode detection
  const startCamera = async () => {
    try {
      setCameraError('');
      // Show the div first so it exists in the DOM before html5-qrcode looks for it
      setShowCamera(true);

      // Wait one render tick for the div to appear
      await new Promise(resolve => setTimeout(resolve, 50));

      html5QrCodeRef.current = new Html5Qrcode(scannerRegionId);

      const config = {
        fps: 10,
        qrbox: 250,
        disableFlip: false,
      };

      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          // Barcode detected — auto-verify
          stopCamera();
          setTimeout(() => {
            handleScanRef.current?.(decodedText);
          }, 100);
        },
        () => { /* scan errors are normal, just keep scanning */ }
      );
    } catch (error) {
      console.error('Camera error:', error);
      setShowCamera(false);
      setCameraError('Unable to access camera. Please check permissions or enter barcode manually.');
    }
  };

  const isStopping = useRef(false);

  const stopCamera = async () => {
    if (!html5QrCodeRef.current || isStopping.current) return;
    isStopping.current = true;
    try {
      const scanner = html5QrCodeRef.current;
      html5QrCodeRef.current = null; // Null out first to prevent re-entry
      await scanner.stop();         // Must fully resolve before clear()
      scanner.clear();
    } catch {
      // Ignore — scanner may already be stopped
    } finally {
      isStopping.current = false;
      setShowCamera(false);
      setCameraError('');
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Start receiving a shipment — loads expected items with full product info
  const handleStartReceiving = async (shipment) => {
    try {
      setSelectedShipment(shipment);

      // Load expected items from the receiving-qc endpoint (has product + SKU info)
      const { data: expectedData } = await api.get(`/receiving-qc/expected-items/${shipment.id}`);
      const expectedItems = expectedData.data || [];

      const transformedItems = expectedItems.map((item, index) => ({
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
      }));

      setReceivingItems(transformedItems);
      setReceivingStep('scan');
      setCurrentItemIndex(0);
      setShowReceivingModal(true);

      // Focus scan input
      setTimeout(() => scanInputRef.current?.focus(), 100);
    } catch (error) {
      console.error('Error starting receiving:', error);
      toast.error('Failed to start receiving process');
    }
  };

  // Stable ref so the camera callback can always call the latest handleScan
  const handleScanRef = useRef(null);

  // Handle barcode scan — accepts a value directly (from camera) or reads from state
  const handleScan = async (scannedValue) => {
    const value = (scannedValue || scanValue).trim();
    if (!value) {
      toast.error('Please enter a barcode');
      return;
    }

    const updated = [...receivingItems];
    updated[currentItemIndex].scanned = true;
    updated[currentItemIndex].barcode = value;
    setReceivingItems(updated);
    setScanValue('');
    toast.success('Item scanned successfully!');

    // Stop camera if active
    if (showCamera) {
      stopCamera();
    }

    // Move to next item or go to verification step
    if (currentItemIndex < receivingItems.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
      setTimeout(() => scanInputRef.current?.focus(), 50);
    } else {
      setReceivingStep('verify');
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-6 h-6 text-blue-600" />
            Receiving
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Receive incoming shipments and assign storage locations
          </p>
        </div>

        <button
          onClick={loadShipments}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
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
              className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-bold text-slate-900">
                      {shipment.shipment_number}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      shipment.status === 'RECEIVED' ? 'bg-green-100 text-green-700' :
                      shipment.status === 'INSPECTING' ? 'bg-blue-100 text-blue-700' :
                      shipment.status === 'ARRIVED' ? 'bg-orange-100 text-orange-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {shipment.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500 text-xs mb-1">Supplier</p>
                      <p className="text-slate-900 font-medium">{shipment.supplier?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs mb-1">Expected Date</p>
                      <p className="text-slate-900 font-medium flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {shipment.expected_arrival_date
                          ? new Date(shipment.expected_arrival_date).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs mb-1">Expected Quantity</p>
                      <p className="text-slate-900 font-medium flex items-center gap-1">
                        <BoxIcon className="w-3.5 h-3.5" />
                        {shipment.expected_quantity || 0} items
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs mb-1">Container</p>
                      <p className="text-slate-900 font-medium">{shipment.container_number || 'N/A'}</p>
                    </div>
                  </div>

                  {shipment.notes && (
                    <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <p className="text-xs text-slate-600">{shipment.notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  {shipment.status === 'ARRIVED' && (
                    <button
                      onClick={() => handleStartReceiving(shipment)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                    >
                      <PlayCircle className="w-4 h-4" />
                      Start Receiving
                    </button>
                  )}
                  
                  {shipment.status === 'INSPECTING' && (
                    <button
                      onClick={() => handleStartReceiving(shipment)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-medium transition-colors"
                    >
                      <ScanBarcode className="w-4 h-4" />
                      Continue
                    </button>
                  )}

                  <button
                    onClick={() => handleStartReceiving(shipment)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Receiving Modal */}
      <AnimatePresence>
        {showReceivingModal && selectedShipment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowReceivingModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Receiving: {selectedShipment.shipment_number}
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                      {receivingStep === 'scan' && 'Scan each item to verify'}
                      {receivingStep === 'verify' && 'Verify item conditions'}
                      {receivingStep === 'assign' && 'Assign storage locations'}
                      {receivingStep === 'complete' && 'Review and complete'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowReceivingModal(false)}
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <XCircle className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center gap-2 mt-4">
                  <div className={`flex-1 h-2 rounded-full ${receivingStep === 'scan' ? 'bg-blue-600' : 'bg-green-600'}`} />
                  <div className={`flex-1 h-2 rounded-full ${receivingStep === 'verify' || receivingStep === 'assign' || receivingStep === 'complete' ? 'bg-green-600' : 'bg-slate-200'}`} />
                  <div className={`flex-1 h-2 rounded-full ${receivingStep === 'assign' || receivingStep === 'complete' ? 'bg-green-600' : 'bg-slate-200'}`} />
                  <div className={`flex-1 h-2 rounded-full ${receivingStep === 'complete' ? 'bg-green-600' : 'bg-slate-200'}`} />
                </div>
              </div>

              <div className="p-6">
                {/* Scanning Step */}
                {receivingStep === 'scan' && (
                  <div className="space-y-4">
                    <div className="text-center mb-6">
                      <p className="text-lg font-semibold text-slate-900">
                        Item {currentItemIndex + 1} of {receivingItems.length}
                      </p>
                      {receivingItems[currentItemIndex] && (
                        <div className="mt-2 p-4 rounded-lg bg-blue-50 border border-blue-200 text-left">
                          <p className="text-sm font-medium text-slate-500 mb-2">Expected Product:</p>
                          <p className="font-bold text-slate-900 text-base">
                            {receivingItems[currentItemIndex].productName || 'Unknown Product'}
                          </p>
                          <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                            <div>
                              <span className="text-slate-500 text-xs">SKU</span>
                              <p className="font-semibold text-slate-800">
                                {receivingItems[currentItemIndex].sku || '—'}
                              </p>
                            </div>
                            <div>
                              <span className="text-slate-500 text-xs">Size</span>
                              <p className="font-semibold text-slate-800">
                                {receivingItems[currentItemIndex].size || '—'}
                              </p>
                            </div>
                            <div>
                              <span className="text-slate-500 text-xs">Qty Expected</span>
                              <p className="font-semibold text-blue-700">
                                {receivingItems[currentItemIndex].quantity} units
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Scan Barcode
                      </label>
                      <div className="flex gap-2">
                        <input
                          ref={scanInputRef}
                          type="text"
                          value={scanValue}
                          onChange={(e) => setScanValue(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleScan()}
                          placeholder="Scan or enter barcode..."
                          className="flex-1 px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                        />
                        <button
                          onClick={showCamera ? stopCamera : startCamera}
                          className={`px-4 py-3 rounded-lg text-white transition-colors ${
                            showCamera ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-600 hover:bg-slate-700'
                          }`}
                          title={showCamera ? "Close Camera" : "Open Camera to Scan Barcode"}
                        >
                          <ScanBarcode className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleScan()}
                          className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
                        >
                          Verify
                        </button>
                      </div>
                    </div>

                    {/* Camera Preview — always in the DOM so html5-qrcode can find it */}
                    <div className={`mt-4 ${showCamera ? 'block' : 'hidden'}`}>
                      <div
                        id={scannerRegionId}
                        className="rounded-lg overflow-hidden bg-black w-full"
                        style={{ minHeight: '256px' }}
                      />
                      <p className="text-xs text-slate-600 mt-2 text-center">
                        Point the camera at a barcode. It will be detected automatically.
                      </p>
                    </div>

                    {cameraError && (
                      <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                        <p className="text-sm text-orange-800">{cameraError}</p>
                      </div>
                    )}

                    {/* Scanned Items List */}
                    <div className="mt-6 space-y-2">
                      {receivingItems.map((item, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border flex items-center gap-3 ${
                          index === currentItemIndex
                            ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-300'
                            : item.scanned
                            ? 'bg-green-50 border-green-200'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        {item.scanned ? (
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{item.productName}</p>
                          <p className="text-xs text-slate-500">
                            SKU: {item.sku || '—'} | Size: {item.size || '—'} | Qty: {item.quantity}
                          </p>
                        </div>
                        {index === currentItemIndex && !item.scanned && (
                          <span className="text-xs font-bold text-blue-600 flex-shrink-0">← Current</span>
                        )}
                      </div>
                    ))}
                    </div>
                  </div>
                )}

                {/* Verification Step */}
                {receivingStep === 'verify' && (
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
