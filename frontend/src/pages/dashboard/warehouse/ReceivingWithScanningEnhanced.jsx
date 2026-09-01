import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, Search, Camera, CheckCircle, AlertTriangle, X, 
  Scan, ChevronRight, Clock, User, FileText, TrendingUp, Hash
} from 'lucide-react';
import api from '../../../services/api';

export default function ReceivingWithScanningEnhanced() {
  const [shipments, setShipments] = useState([]);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [expectedItems, setExpectedItems] = useState([]);
  const [receivingSession, setReceivingSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [scanInput, setScanInput] = useState('');
  const scanInputRef = useRef(null);

  useEffect(() => {
    loadReadyShipments();
  }, []);

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  // Auto-focus scan input when receiving session is active
  useEffect(() => {
    if (receivingSession && scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [receivingSession]);

  const loadReadyShipments = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/shipments', {
        params: { status: 'IN_TRANSIT,PENDING' }
      });
      setShipments(data.shipments || []);
    } catch (error) {
      console.error('Error loading shipments:', error);
      setAlert({ type: 'error', message: 'Failed to load shipments' });
    } finally {
      setLoading(false);
    }
  };

  const startReceiving = async (shipment) => {
    try {
      setLoading(true);
      
      // Load expected items
      const { data: expectedData } = await api.get(`/receiving-qc/expected-items/${shipment.id}`);
      setExpectedItems(expectedData.data || []);

      // Start receiving session
      const { data: sessionData } = await api.post('/receiving-qc/receiving/start', {
        shipment_id: shipment.id
      });

      setSelectedShipment(shipment);
      setReceivingSession(sessionData.data);
      setAlert({ type: 'success', message: 'Receiving session started' });
    } catch (error) {
      console.error('Error starting receiving:', error);
      setAlert({ type: 'error', message: error.response?.data?.error || 'Failed to start receiving' });
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (e) => {
    e.preventDefault();
    
    if (!scanInput.trim()) return;

    try {
      // Find which received item this barcode belongs to
      const matchingItem = receivingSession.find(item => {
        const expectedItem = expectedItems.find(exp => exp.id === item.expected_item_id);
        return expectedItem && expectedItem.product_id; // Match by product
      });

      if (!matchingItem) {
        setAlert({ type: 'error', message: 'Unknown product barcode' });
        setScanInput('');
        return;
      }

      // Record scan
      const { data } = await api.post('/receiving-qc/receiving/scan', {
        received_item_id: matchingItem.id,
        barcode: scanInput.trim(),
        quantity: 1
      });

      // Update local state
      setReceivingSession(prev =>
        prev.map(item =>
          item.id === matchingItem.id ? data.data : item
        )
      );

      setAlert({ type: 'success', message: `✓ Scanned: ${scanInput}` });
      setScanInput('');
    } catch (error) {
      console.error('Error scanning product:', error);
      setAlert({ type: 'error', message: error.response?.data?.error || 'Scan failed' });
      setScanInput('');
    }
  };

  const completeReceiving = async () => {
    try {
      setLoading(true);
      
      const { data } = await api.post('/receiving-qc/receiving/complete', {
        shipment_id: selectedShipment.id
      });

      if (data.has_discrepancies) {
        setAlert({ 
          type: 'warning', 
          message: `Receiving complete. ${data.discrepancies.length} discrepancies found - Manager approval required.` 
        });
      } else {
        setAlert({ 
          type: 'success', 
          message: 'Receiving complete! Shipment ready for QC inspection.' 
        });
      }

      // Reset state
      setSelectedShipment(null);
      setReceivingSession(null);
      setExpectedItems([]);
      await loadReadyShipments();
    } catch (error) {
      console.error('Error completing receiving:', error);
      setAlert({ type: 'error', message: error.response?.data?.error || 'Failed to complete receiving' });
    } finally {
      setLoading(false);
    }
  };

  const getReceivedItemSummary = (receivedItem) => {
    const expectedItem = expectedItems.find(exp => exp.id === receivedItem.expected_item_id);
    if (!expectedItem) return { expected: 0, received: receivedItem.received_quantity, difference: 0 };

    const expected = expectedItem.expected_quantity;
    const received = receivedItem.received_quantity;
    const difference = received - expected;

    return { expected, received, difference };
  };

  const getProgressPercentage = () => {
    if (!receivingSession || receivingSession.length === 0) return 0;
    
    const totalExpected = expectedItems.reduce((sum, item) => sum + item.expected_quantity, 0);
    const totalReceived = receivingSession.reduce((sum, item) => sum + item.received_quantity, 0);
    
    return Math.min(100, (totalReceived / totalExpected) * 100);
  };

  const getTotalExpected = () => {
    return expectedItems.reduce((sum, item) => sum + item.expected_quantity, 0);
  };

  const getTotalReceived = () => {
    return receivingSession?.reduce((sum, item) => sum + item.received_quantity, 0) || 0;
  };

  const filteredShipments = shipments.filter(shipment =>
    shipment.shipment_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shipment.container_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (receivingSession) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Receiving: {selectedShipment.shipment_number}
            </h2>
            <p className="text-gray-600 mt-1">Scan products to record received quantities</p>
          </div>
          
          <button
            onClick={() => {
              setSelectedShipment(null);
              setReceivingSession(null);
              setExpectedItems([]);
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Alert */}
        <AnimatePresence>
          {alert && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-lg ${
                alert.type === 'success' ? 'bg-green-50 text-green-800' :
                alert.type === 'warning' ? 'bg-yellow-50 text-yellow-800' :
                'bg-red-50 text-red-800'
              }`}
            >
              {alert.message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress Bar */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">Receiving Progress</h3>
              <p className="text-sm text-gray-600">
                {getTotalReceived()} of {getTotalExpected()} units received
              </p>
            </div>
            <div className="text-3xl font-bold text-blue-600">
              {Math.round(getProgressPercentage())}%
            </div>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${getProgressPercentage()}%` }}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full"
            />
          </div>
        </div>

        {/* Scan Input */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <form onSubmit={handleScan} className="flex gap-3">
            <div className="flex-1 relative">
              <Scan className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                ref={scanInputRef}
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="Scan barcode or enter manually..."
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              />
            </div>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold"
            >
              Record
            </motion.button>
          </form>
        </div>

        {/* Items List */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Expected vs Received</h3>
          
          <div className="space-y-3">
            {receivingSession.map((item) => {
              const summary = getReceivedItemSummary(item);
              const expectedItem = expectedItems.find(exp => exp.id === item.expected_item_id);
              const isDifferent = summary.difference !== 0;
              
              return (
                <motion.div
                  key={item.id}
                  className={`p-4 rounded-lg border-2 ${
                    isDifferent 
                      ? summary.difference > 0 
                        ? 'border-yellow-300 bg-yellow-50' 
                        : 'border-red-300 bg-red-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">
                        {expectedItem?.product?.brand} {expectedItem?.product?.model}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Size: {item.product_size}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-xs text-gray-600">Expected</p>
                        <p className="text-lg font-bold text-gray-900">{summary.expected}</p>
                      </div>
                      
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                      
                      <div className="text-center">
                        <p className="text-xs text-gray-600">Received</p>
                        <p className={`text-lg font-bold ${
                          isDifferent 
                            ? summary.difference > 0 ? 'text-yellow-700' : 'text-red-700'
                            : 'text-green-700'
                        }`}>
                          {summary.received}
                        </p>
                      </div>
                      
                      {isDifferent && (
                        <div className="text-center">
                          <p className="text-xs text-gray-600">Difference</p>
                          <p className={`text-lg font-bold ${
                            summary.difference > 0 ? 'text-yellow-700' : 'text-red-700'
                          }`}>
                            {summary.difference > 0 ? '+' : ''}{summary.difference}
                          </p>
                        </div>
                      )}

                      {!isDifferent && summary.received === summary.expected && (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      )}
                    </div>
                  </div>
                  
                  {item.scanned_barcodes && item.scanned_barcodes.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-600 mb-1">
                        Scanned Barcodes ({item.scanned_barcodes.length}):
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {item.scanned_barcodes.slice(0, 5).map((barcode, idx) => (
                          <span key={idx} className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs">
                            {barcode}
                          </span>
                        ))}
                        {item.scanned_barcodes.length > 5 && (
                          <span className="px-2 py-1 text-gray-600 text-xs">
                            +{item.scanned_barcodes.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Complete Button */}
        <div className="flex justify-end">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={completeReceiving}
            disabled={loading || getTotalReceived() === 0}
            className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Complete Receiving
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            Receiving with Scanning
          </h2>
          <p className="text-gray-600 mt-1">Select a shipment to start receiving process</p>
        </div>
      </div>

      {/* Alert */}
      <AnimatePresence>
        {alert && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-lg ${
              alert.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {alert.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search shipments..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Shipments List */}
      <div className="grid gap-4">
        {loading && filteredShipments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4">Loading shipments...</p>
          </div>
        ) : filteredShipments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p>No shipments available for receiving</p>
          </div>
        ) : (
          filteredShipments.map((shipment) => (
            <motion.div
              key={shipment.id}
              whileHover={{ scale: 1.01 }}
              className="bg-white rounded-xl shadow-md border border-gray-200 p-6 cursor-pointer"
              onClick={() => startReceiving(shipment)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {shipment.shipment_number}
                    </h3>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {shipment.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Container:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {shipment.container_number || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Expected Qty:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {shipment.expected_quantity} units
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Arrival Date:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {shipment.expected_arrival_date 
                          ? new Date(shipment.expected_arrival_date).toLocaleDateString() 
                          : 'N/A'
                        }
                      </span>
                    </div>
                  </div>
                </div>

                <ChevronRight className="w-6 h-6 text-gray-400" />
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
