import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClipboardCheck, Search, Camera, CheckCircle, XCircle, AlertTriangle, 
  X, ChevronRight, Clock, Upload, Image as ImageIcon, Trash2, 
  FileText, TrendingUp, Calendar, AlertCircle
} from 'lucide-react';
import api from '../../../services/api';

export default function QCInspectionEnhanced() {
  const [inspections, setInspections] = useState([]);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [currentItem, setCurrentItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
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
  
  const scanInputRef = useRef(null);
  const fileInputRef = useRef(null);

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

  const loadPendingInspections = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/receiving-qc/qc-inspection/pending/all');
      setInspections(data.data || []);
    } catch (error) {
      console.error('Error loading inspections:', error);
      setAlert({ type: 'error', message: 'Failed to load inspections' });
    } finally {
      setLoading(false);
    }
  };

  const startInspection = async (inspection) => {
    try {
      setLoading(true);
      const { data } = await api.get(`/receiving-qc/qc-inspection/${inspection.id}`);
      setSelectedInspection(data.data);
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
  };

  const handleScan = (e) => {
    e.preventDefault();
    
    if (!scanInput.trim()) return;

    // Set current item for inspection
    setCurrentItem({
      barcode: scanInput.trim(),
      product_id: null, // Will be determined from shipment
      product_size: ''
    });

    setScanInput('');
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

    try {
      setLoading(true);

      // Upload photos first (in production)
      const photoUrls = photos.map(p => p.preview); // Replace with actual upload URLs

      const { data } = await api.post('/receiving-qc/qc-inspection/record-item', {
        qc_inspection_id: selectedInspection.id,
        barcode: currentItem.barcode,
        product_id: selectedInspection.shipment?.product_breakdown?.[0]?.product_id, // Simplified
        product_size: currentItem.product_size,
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
      });

      setAlert({ type: 'success', message: `Item ${currentItem.barcode} inspected and recorded` });
      
      // Update local inspection state
      setSelectedInspection(prev => ({
        ...prev,
        items_inspected: (prev.items_inspected || 0) + 1
      }));

      resetItemForm();
    } catch (error) {
      console.error('Error recording inspection:', error);
      setAlert({ type: 'error', message: error.response?.data?.error || 'Failed to record inspection' });
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

  // Inspection Form View
  if (selectedInspection) {
    const progress = selectedInspection.total_items > 0 
      ? (selectedInspection.items_inspected / selectedInspection.total_items) * 100 
      : 0;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              QC Inspection: {selectedInspection.inspection_number}
            </h2>
            <p className="text-gray-600 mt-1">
              Shipment: {selectedInspection.shipment?.shipment_number}
            </p>
          </div>
          
          <button
            onClick={() => setSelectedInspection(null)}
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
                alert.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}
            >
              {alert.message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress & Deadline */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Progress</h3>
              <span className="text-2xl font-bold text-blue-600">{Math.round(progress)}%</span>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              {selectedInspection.items_inspected} of {selectedInspection.total_items} items inspected
            </p>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Deadline</h3>
              {(() => {
                const status = getDeadlineStatus(selectedInspection.due_date, selectedInspection.is_overdue);
                const StatusIcon = status.icon;
                return (
                  <div className={`flex items-center gap-2 text-${status.color}-600`}>
                    <StatusIcon className="w-5 h-5" />
                    <span className="font-bold">{status.text}</span>
                  </div>
                );
              })()}
            </div>
            <p className="text-sm text-gray-600">
              Due: {selectedInspection.due_date 
                ? new Date(selectedInspection.due_date).toLocaleDateString() 
                : 'No deadline set'}
            </p>
          </div>
        </div>

        {/* Scan Input */}
        {!currentItem && (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Scan Product Barcode</h3>
            <form onSubmit={handleScan} className="flex gap-3">
              <div className="flex-1 relative">
                <Camera className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  ref={scanInputRef}
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder="Scan barcode..."
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                />
              </div>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold"
              >
                Scan
              </motion.button>
            </form>
          </div>
        )}

        {/* Inspection Form */}
        {currentItem && (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-900">
                Inspecting: {currentItem.barcode}
              </h3>
              <button
                onClick={resetItemForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Classification */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Classification *
                </label>
                <div className="grid grid-cols-3 gap-3">
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
                      className={`p-4 rounded-lg border-2 transition-all ${
                        classification === cls
                          ? cls === 'GOOD'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : cls === 'MINOR_DEFECT'
                            ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                            : 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-300 bg-white text-gray-700'
                      }`}
                    >
                      {cls === 'GOOD' && <CheckCircle className="w-6 h-6 mx-auto mb-2" />}
                      {cls === 'MINOR_DEFECT' && <AlertTriangle className="w-6 h-6 mx-auto mb-2" />}
                      {cls === 'MAJOR_DEFECT' && <XCircle className="w-6 h-6 mx-auto mb-2" />}
                      <div className="font-semibold">
                        {cls === 'GOOD' ? 'Good Quality' : cls === 'MINOR_DEFECT' ? 'Minor Defect' : 'Major Defect'}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Defect Details (shown if not GOOD) */}
              {classification !== 'GOOD' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Defect Type
                      </label>
                      <select
                        value={defectType}
                        onChange={(e) => setDefectType(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Location
                      </label>
                      <select
                        value={defectLocation}
                        onChange={(e) => setDefectLocation(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Severity
                      </label>
                      <select
                        value={defectSeverity}
                        onChange={(e) => setDefectSeverity(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select Severity</option>
                        <option value="COSMETIC">Cosmetic (Minor)</option>
                        <option value="FUNCTIONAL">Functional</option>
                        <option value="CRITICAL">Critical (Severe)</option>
                      </select>
                    </div>

                    {classification === 'MINOR_DEFECT' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Discount %
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="5"
                          value={discountPercentage}
                          onChange={(e) => setDiscountPercentage(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="10"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Defect Description
                    </label>
                    <textarea
                      value={defectDescription}
                      onChange={(e) => setDefectDescription(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Describe the defect in detail..."
                    />
                  </div>

                  {/* Photo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Defect Photos
                    </label>
                    <div className="flex items-center gap-4">
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
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Upload Photos
                      </motion.button>
                      <span className="text-sm text-gray-600">
                        {photos.length} photo(s) uploaded
                      </span>
                    </div>

                    {photos.length > 0 && (
                      <div className="mt-4 grid grid-cols-4 gap-3">
                        {photos.map((photo, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={photo.preview}
                              alt={`Defect ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border border-gray-300"
                            />
                            <button
                              type="button"
                              onClick={() => removePhoto(index)}
                              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
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

              {/* Quality Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quality Notes
                </label>
                <textarea
                  value={qualityNotes}
                  onChange={(e) => setQualityNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Additional notes..."
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={resetItemForm}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={recordInspectionItem}
                  disabled={loading}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Record Inspection
                </motion.button>
              </div>
            </div>
          </div>
        )}

        {/* Complete Button */}
        {selectedInspection.items_inspected >= selectedInspection.total_items && (
          <div className="flex justify-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={completeInspection}
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 font-semibold disabled:opacity-50 flex items-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              Complete QC Inspection
            </motion.button>
          </div>
        )}
      </div>
    );
  }

  // Inspections List View
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-blue-600" />
            QC Inspection (15-Day Deadline)
          </h2>
          <p className="text-gray-600 mt-1">Select an inspection to start quality control process</p>
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
            placeholder="Search inspections..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Inspections List */}
      <div className="grid gap-4">
        {loading && filteredInspections.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4">Loading inspections...</p>
          </div>
        ) : filteredInspections.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <ClipboardCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p>No pending QC inspections</p>
          </div>
        ) : (
          filteredInspections.map((inspection) => {
            const deadlineStatus = getDeadlineStatus(inspection.due_date, inspection.is_overdue);
            const DeadlineIcon = deadlineStatus.icon;

            return (
              <motion.div
                key={inspection.id}
                whileHover={{ scale: 1.01 }}
                className={`bg-white rounded-xl shadow-md border-2 p-6 cursor-pointer ${
                  inspection.is_overdue ? 'border-red-300' : 'border-gray-200'
                }`}
                onClick={() => startInspection(inspection)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {inspection.inspection_number}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium bg-${deadlineStatus.color}-100 text-${deadlineStatus.color}-700 flex items-center gap-1`}>
                        <DeadlineIcon className="w-3 h-3" />
                        {deadlineStatus.text}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-600">Shipment:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {inspection.shipment_number}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Progress:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {inspection.items_inspected} / {inspection.total_items}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Due Date:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {inspection.due_date 
                            ? new Date(inspection.due_date).toLocaleDateString() 
                            : 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        style={{ width: `${inspection.inspection_progress || 0}%` }}
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full"
                      />
                    </div>
                  </div>

                  <ChevronRight className="w-6 h-6 text-gray-400 ml-4" />
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
