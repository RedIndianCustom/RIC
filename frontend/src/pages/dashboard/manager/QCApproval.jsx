import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClipboardCheck, CheckCircle, XCircle, AlertTriangle, Clock, 
  ChevronDown, ChevronUp, Check, X, Eye, Image as ImageIcon,
  TrendingUp, Package, DollarSign, MessageSquare, Edit2
} from 'lucide-react';
import api from '../../../services/api';

export default function QCApproval() {
  const [inspections, setInspections] = useState([]);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [decision, setDecision] = useState('');
  const [managerNotes, setManagerNotes] = useState('');
  const [itemOverrides, setItemOverrides] = useState([]);
  const [viewingPhotos, setViewingPhotos] = useState(null);

  useEffect(() => {
    loadCompletedInspections();
  }, []);

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  const loadCompletedInspections = async () => {
    try {
      setLoading(true);
      console.log('📋 Fetching completed QC inspections for manager approval...');
      
      // Use the new endpoint specifically for completed inspections
      const { data } = await api.get('/receiving-qc/qc-inspection/completed/all');
      
      console.log('✅ Received response:', data);
      console.log('✅ Inspections count:', data.data?.length || 0);
      
      setInspections(data.data || []);
      
      if (data.data?.length === 0) {
        console.log('ℹ️  No completed inspections awaiting approval');
      }
    } catch (error) {
      console.error('❌ Error loading inspections:', error);
      console.error('Error details:', error.response?.data);
      setAlert({ type: 'error', message: 'Failed to load inspections' });
    } finally {
      setLoading(false);
    }
  };

  const loadInspectionDetails = async (inspectionId) => {
    try {
      setLoading(true);
      const { data } = await api.get(`/receiving-qc/qc-inspection/${inspectionId}`);
      setSelectedInspection(data.data);
      setExpandedId(inspectionId);
    } catch (error) {
      console.error('Error loading inspection details:', error);
      setAlert({ type: 'error', message: 'Failed to load inspection details' });
    } finally {
      setLoading(false);
    }
  };

  const handleOverrideClassification = (itemId, newClassification, notes) => {
    setItemOverrides(prev => {
      const existing = prev.find(o => o.item_id === itemId);
      if (existing) {
        return prev.map(o => 
          o.item_id === itemId 
            ? { ...o, new_classification: newClassification, notes } 
            : o
        );
      }
      return [...prev, { item_id: itemId, new_classification: newClassification, notes }];
    });
  };

  const handleApproveInspection = async (inspectionId) => {
    if (!decision) {
      setAlert({ type: 'error', message: 'Please select a decision' });
      return;
    }

    try {
      setLoading(true);
      await api.put(`/receiving-qc/qc-inspection/${inspectionId}/approve`, {
        decision,
        manager_notes: managerNotes,
        item_overrides: itemOverrides
      });

      setAlert({ 
        type: 'success', 
        message: decision === 'APPROVED' 
          ? 'QC inspection approved! Stock will be allocated automatically.' 
          : 'QC inspection decision recorded.' 
      });

      // Reset
      setSelectedInspection(null);
      setExpandedId(null);
      setDecision('');
      setManagerNotes('');
      setItemOverrides([]);

      // Reload
      await loadCompletedInspections();
    } catch (error) {
      console.error('Error approving inspection:', error);
      setAlert({ type: 'error', message: error.response?.data?.error || 'Failed to process decision' });
    } finally {
      setLoading(false);
    }
  };

  const getClassificationColor = (classification) => {
    switch (classification) {
      case 'GOOD':
        return 'green';
      case 'MINOR_DEFECT':
        return 'yellow';
      case 'MAJOR_DEFECT':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getClassificationIcon = (classification) => {
    switch (classification) {
      case 'GOOD':
        return <CheckCircle className="w-5 h-5" />;
      case 'MINOR_DEFECT':
        return <AlertTriangle className="w-5 h-5" />;
      case 'MAJOR_DEFECT':
        return <XCircle className="w-5 h-5" />;
      default:
        return <Package className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-blue-600" />
            QC Inspection Approval
          </h2>
          <p className="text-gray-600 mt-1">Review and approve completed QC inspections</p>
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

      {/* Summary Cards - Always visible */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Approval</p>
              <p className="text-2xl font-bold text-gray-900">{inspections.length}</p>
            </div>
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-green-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Good Quality</p>
              <p className="text-2xl font-bold text-green-600">
                {inspections.reduce((sum, i) => sum + (i.good_quality_count || 0), 0)}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-yellow-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Minor Defects</p>
              <p className="text-2xl font-bold text-yellow-600">
                {inspections.reduce((sum, i) => sum + (i.minor_defect_count || 0), 0)}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-red-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Major Defects</p>
              <p className="text-2xl font-bold text-red-600">
                {inspections.reduce((sum, i) => sum + (i.major_defect_count || 0), 0)}
              </p>
            </div>
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* Inspections List */}
      <div className="space-y-4">
        {loading && inspections.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4">Loading inspections...</p>
          </div>
        ) : inspections.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-md border border-gray-200">
            <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p>No completed QC inspections awaiting approval</p>
          </div>
        ) : (
          inspections.map((inspection) => {
            const isExpanded = expandedId === inspection.id;
            const qualityRate = inspection.good_quality_percentage || 0;
            const qualityColor = qualityRate >= 95 ? 'green' : qualityRate >= 85 ? 'yellow' : 'red';

            return (
              <motion.div
                key={inspection.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-md border-2 border-gray-200 overflow-hidden"
              >
                {/* Header */}
                <div
                  className="bg-gray-50 p-6 cursor-pointer"
                  onClick={() => {
                    if (isExpanded) {
                      setExpandedId(null);
                      setSelectedInspection(null);
                    } else {
                      loadInspectionDetails(inspection.id);
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {inspection.inspection_number}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium bg-${qualityColor}-100 text-${qualityColor}-700`}>
                          {qualityRate.toFixed(1)}% Quality Rate
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-gray-600">Shipment:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {inspection.shipment_number}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Items:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {inspection.total_items}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Inspector:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {inspection.inspector_name || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Completed:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {inspection.inspection_end_date 
                              ? new Date(inspection.inspection_end_date).toLocaleDateString()
                              : 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Quality Summary */}
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-gray-600">Good:</span>
                          <span className="font-bold text-green-700">{inspection.good_quality_count || 0}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-600" />
                          <span className="text-gray-600">Minor:</span>
                          <span className="font-bold text-yellow-700">{inspection.minor_defect_count || 0}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-red-600" />
                          <span className="text-gray-600">Major:</span>
                          <span className="font-bold text-red-700">{inspection.major_defect_count || 0}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          loadInspectionDetails(inspection.id);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Review
                      </motion.button>
                      {isExpanded ? (
                        <ChevronUp className="w-6 h-6 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && selectedInspection && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-gray-200"
                    >
                      <div className="p-6 space-y-6">
                        {/* Inspector Notes */}
                        {selectedInspection.inspector_notes && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Inspector Notes</h4>
                            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                              {selectedInspection.inspector_notes}
                            </p>
                          </div>
                        )}

                        {/* Inspection Items */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-4">Inspected Items</h4>
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {selectedInspection.items?.map((item) => {
                              const color = getClassificationColor(item.classification);
                              const override = itemOverrides.find(o => o.item_id === item.id);

                              return (
                                <div
                                  key={item.id}
                                  className={`p-4 rounded-lg border-2 border-${color}-200 bg-${color}-50`}
                                >
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3 flex-1">
                                      <div className={`p-2 bg-${color}-100 rounded-lg text-${color}-600`}>
                                        {getClassificationIcon(item.classification)}
                                      </div>
                                      <div className="flex-1">
                                        {/* Product Name - Constructed from brand + model */}
                                        {(item.product?.brand || item.product?.model || item.product_name) && (
                                          <div className="font-semibold text-gray-900 mb-1">
                                            {item.product_name || 
                                             `${item.product?.brand || ''} ${item.product?.model || ''}`.trim() ||
                                             'Unknown Product'}
                                          </div>
                                        )}
                                        
                                        {/* Brand, Model, and Size */}
                                        <div className="flex items-center gap-2 text-sm text-gray-700 mb-1 flex-wrap">
                                          {item.product?.brand && !item.product_name && (
                                            <span className="font-medium text-blue-700">
                                              {item.product.brand}
                                            </span>
                                          )}
                                          {item.product?.model && !item.product_name && (
                                            <span className="font-medium text-blue-700">
                                              {item.product.model}
                                            </span>
                                          )}
                                          {(item.product_size || item.product?.dimensions) && (
                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium text-xs">
                                              Size: {item.product_size || item.product?.dimensions}
                                            </span>
                                          )}
                                          {item.product?.sku && (
                                            <span className="text-xs text-gray-500">
                                              SKU: {item.product.sku}
                                            </span>
                                          )}
                                        </div>
                                        
                                        {/* Barcode */}
                                        <div className="text-xs text-gray-500 font-mono">
                                          Barcode: {item.barcode}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium bg-${color}-200 text-${color}-800 whitespace-nowrap`}>
                                      {item.classification.replace('_', ' ')}
                                    </span>
                                  </div>

                                  {item.classification !== 'GOOD' && (
                                    <div className="space-y-2 text-sm">
                                      {item.defect_type && (
                                        <div className="flex gap-2">
                                          <span className="text-gray-600 min-w-24">Type:</span>
                                          <span className="font-medium">{item.defect_type}</span>
                                        </div>
                                      )}
                                      {item.defect_location && (
                                        <div className="flex gap-2">
                                          <span className="text-gray-600 min-w-24">Location:</span>
                                          <span className="font-medium">{item.defect_location}</span>
                                        </div>
                                      )}
                                      {item.defect_severity && (
                                        <div className="flex gap-2">
                                          <span className="text-gray-600 min-w-24">Severity:</span>
                                          <span className="font-medium">{item.defect_severity}</span>
                                        </div>
                                      )}
                                      {item.defect_description && (
                                        <div className="flex gap-2">
                                          <span className="text-gray-600 min-w-24">Description:</span>
                                          <span className="text-gray-700">{item.defect_description}</span>
                                        </div>
                                      )}
                                      {item.suggested_discount_percentage && (
                                        <div className="flex gap-2">
                                          <span className="text-gray-600 min-w-24">Discount:</span>
                                          <span className="font-medium text-yellow-700">
                                            {item.suggested_discount_percentage}%
                                          </span>
                                        </div>
                                      )}
                                      {item.photos && item.photos.length > 0 && (
                                        <div className="flex gap-2">
                                          <span className="text-gray-600 min-w-24">Photos:</span>
                                          <button
                                            onClick={() => setViewingPhotos(item.photos)}
                                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                                          >
                                            <ImageIcon className="w-4 h-4" />
                                            View {item.photos.length} photo(s)
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {item.quality_notes && (
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                      <p className="text-sm text-gray-700">{item.quality_notes}</p>
                                    </div>
                                  )}

                                  {/* Manager Override */}
                                  {override && (
                                    <div className="mt-3 pt-3 border-t border-blue-200 bg-blue-50 -mx-4 -mb-4 p-4">
                                      <div className="flex items-center gap-2 text-blue-700 font-medium mb-2">
                                        <Edit2 className="w-4 h-4" />
                                        Manager Override
                                      </div>
                                      <div className="text-sm text-blue-900">
                                        New Classification: <span className="font-bold">{override.new_classification}</span>
                                      </div>
                                      {override.notes && (
                                        <div className="text-sm text-blue-800 mt-1">
                                          Notes: {override.notes}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Manager Decision Form */}
                        <div className="border-t pt-6 space-y-4">
                          <h4 className="font-semibold text-gray-900">Manager Decision</h4>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Decision *
                              </label>
                              <select
                                value={decision}
                                onChange={(e) => setDecision(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="">Select Decision</option>
                                <option value="APPROVED">Approve All</option>
                                <option value="PARTIAL_APPROVED">Partial Approval (with overrides)</option>
                                <option value="REJECTED">Reject - Requires Reinspection</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Manager Notes
                            </label>
                            <textarea
                              value={managerNotes}
                              onChange={(e) => setManagerNotes(e.target.value)}
                              rows={3}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Add your review notes..."
                            />
                          </div>

                          {decision === 'APPROVED' && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                              <h5 className="font-semibold text-green-900 mb-2">Stock Allocation Preview</h5>
                              <div className="space-y-1 text-sm text-green-800">
                                <div>• {selectedInspection.good_quality_count} items → Available Stock</div>
                                <div>• {selectedInspection.minor_defect_count} items → Defect Sellable (with discount)</div>
                                <div>• {selectedInspection.major_defect_count} items → Return to Supplier</div>
                              </div>
                            </div>
                          )}

                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => {
                                setExpandedId(null);
                                setSelectedInspection(null);
                                setDecision('');
                                setManagerNotes('');
                                setItemOverrides([]);
                              }}
                              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              Cancel
                            </button>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleApproveInspection(selectedInspection.id)}
                              disabled={loading || !decision}
                              className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              <Check className="w-4 h-4" />
                              Submit Decision
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Photo Viewer Modal */}
      <AnimatePresence>
        {viewingPhotos && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setViewingPhotos(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl max-w-4xl max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Defect Photos</h3>
                  <button
                    onClick={() => setViewingPhotos(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {viewingPhotos.map((photo, index) => (
                    <img
                      key={index}
                      src={photo}
                      alt={`Defect ${index + 1}`}
                      className="w-full rounded-lg border border-gray-300"
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
