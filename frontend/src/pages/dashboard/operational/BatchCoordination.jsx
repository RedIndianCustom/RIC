import { useState, useEffect } from 'react';
import { Package, MapPin, Bell, CheckCircle, AlertCircle, Clock, Layers } from 'lucide-react';
import { 
  fetchBatches,
  fetchAvailableLocations,
  assignBatchToLocation,
  fetchBatchActivities
} from '../../../services/api';

export default function BatchCoordination() {
  const [batches, setBatches] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [notifyStaff, setNotifyStaff] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [filter, setFilter] = useState('unassigned'); // 'all', 'unassigned', 'assigned'

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [batchesData, locationsData] = await Promise.all([
        fetchBatches({ status: 'ACTIVE', limit: 100 }),
        fetchAvailableLocations(0)
      ]);

      setBatches(batchesData.batches || []);
      setLocations(locationsData.locations || []);
    } catch (err) {
      console.error('Error loading data:', err);
      if (err.status === 401) {
        setError('Authentication required. Please log in again.');
      } else {
        setError(err.message || 'Failed to load data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const openLocationModal = (batch) => {
    setSelectedBatch(batch);
    setSelectedLocation(batch.warehouse_location_id || '');
    setShowLocationModal(true);
    setSuccessMessage('');
  };

  const handleAssignLocation = async () => {
    if (!selectedLocation) {
      setError('Please select a warehouse location');
      return;
    }

    try {
      setAssigning(true);
      setError(null);

      const result = await assignBatchToLocation(
        selectedBatch.id,
        selectedLocation,
        notifyStaff
      );

      setSuccessMessage(result.message || 'Location assigned successfully!');
      
      // Reload data to reflect changes
      await loadData();

      // Close modal after 2 seconds
      setTimeout(() => {
        setShowLocationModal(false);
        setSuccessMessage('');
      }, 2000);

    } catch (err) {
      console.error('Error assigning location:', err);
      setError(err.message || 'Failed to assign location');
    } finally {
      setAssigning(false);
    }
  };

  const filteredBatches = batches.filter(batch => {
    if (filter === 'unassigned') return !batch.warehouse_location_id;
    if (filter === 'assigned') return !!batch.warehouse_location_id;
    return true;
  });

  const unassignedCount = batches.filter(b => !b.warehouse_location_id).length;
  const assignedCount = batches.filter(b => !!b.warehouse_location_id).length;

  if (loading && batches.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading batches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Layers className="text-red-600" size={32} />
          Batch Coordination & Storage
        </h1>
        <p className="text-slate-600 mt-2">
          Organize products into batches, assign warehouse locations, and notify floor staff
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Batches</p>
              <p className="text-2xl font-bold text-slate-900">{batches.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-lg">
              <AlertCircle className="text-orange-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-600">Needs Location</p>
              <p className="text-2xl font-bold text-orange-600">{unassignedCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-600">Assigned</p>
              <p className="text-2xl font-bold text-green-600">{assignedCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <MapPin className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-600">Available Locations</p>
              <p className="text-2xl font-bold text-purple-600">{locations.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              filter === 'all'
                ? 'bg-red-50 text-red-600 border-b-2 border-red-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Batches ({batches.length})
          </button>
          <button
            onClick={() => setFilter('unassigned')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              filter === 'unassigned'
                ? 'bg-orange-50 text-orange-600 border-b-2 border-orange-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Needs Location ({unassignedCount})
          </button>
          <button
            onClick={() => setFilter('assigned')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              filter === 'assigned'
                ? 'bg-green-50 text-green-600 border-b-2 border-green-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Assigned ({assignedCount})
          </button>
        </div>
      </div>

      {/* Batches List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Batch Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Shipment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Warehouse Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                    {filter === 'unassigned' ? 'No batches need location assignment' : 'No batches found'}
                  </td>
                </tr>
              ) : (
                filteredBatches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">{batch.batch_number}</p>
                        <p className="text-sm text-slate-500">
                          {batch.batch_month}/{batch.batch_year}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        {batch.shipments?.product_breakdown && batch.shipments.product_breakdown.length > 0 ? (
                          <>
                            {batch.shipments.product_breakdown.slice(0, 2).map((product, idx) => {
                              // Support both legacy (category/size) and new format (brand/model/dimensions)
                              const displayName = product.product_name || `${product.brand || ''} ${product.model || ''}`.trim() || product.category || 'Unknown Product';
                              const displaySize = product.dimensions || product.size || 'N/A';
                              const hasPositions = product.assigned_positions && product.assigned_positions.length > 0;
                              
                              return (
                                <div key={idx} className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-2.5 border border-orange-200">
                                  <p className="font-semibold text-slate-900 text-sm mb-1">
                                    {displayName}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
                                    <Package size={12} className="text-orange-500" />
                                    <span>{displaySize}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-orange-600">
                                      Qty: {product.quantity}
                                    </span>
                                    {hasPositions && (
                                      <div className="flex items-center gap-1">
                                        <MapPin size={12} className="text-blue-600" />
                                        <span className="text-xs font-bold text-blue-700">
                                          {product.assigned_positions.length} positions
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  {/* Show first 2 positions */}
                                  {hasPositions && product.assigned_positions.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {product.assigned_positions.slice(0, 2).map((pos, posIdx) => (
                                        <span 
                                          key={posIdx}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-bold"
                                        >
                                          <MapPin size={10} />
                                          {pos.position_code} ×{pos.quantity}
                                        </span>
                                      ))}
                                      {product.assigned_positions.length > 2 && (
                                        <span className="text-xs text-blue-600 font-medium">
                                          +{product.assigned_positions.length - 2} more
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {batch.shipments.product_breakdown.length > 2 && (
                              <div className="text-xs text-slate-500 italic pl-2">
                                +{batch.shipments.product_breakdown.length - 2} more products
                              </div>
                            )}
                          </>
                        ) : (
                          <div>
                            <p className="font-medium text-slate-900">
                              {batch.products?.brand || 'N/A'}
                            </p>
                            <p className="text-sm text-slate-500">
                              {batch.products?.sku || 'No SKU'}
                            </p>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-900">
                        {batch.shipments?.shipment_number || 'N/A'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {batch.warehouse_location_id ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                            <MapPin size={14} />
                            Assigned
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded-full">
                          <AlertCircle size={14} />
                          Not Assigned
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openLocationModal(batch)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                      >
                        <MapPin size={16} />
                        {batch.warehouse_location_id ? 'Change Location' : 'Assign Location'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Location Assignment Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">Assign Warehouse Location</h2>
              <p className="text-slate-600 mt-1">
                Batch: <span className="font-semibold">{selectedBatch?.batch_number}</span>
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Success Message */}
              {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
                  <CheckCircle size={20} />
                  {successMessage}
                </div>
              )}

              {/* Location Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Warehouse Location *
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  disabled={assigning}
                >
                  <option value="">Choose a location...</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.code} - {loc.name} (Available: {loc.available_capacity}/{loc.capacity})
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-sm text-slate-500">
                  {locations.length} available locations with capacity
                </p>
              </div>

              {/* Notify Staff Checkbox */}
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <input
                  type="checkbox"
                  id="notify-staff"
                  checked={notifyStaff}
                  onChange={(e) => setNotifyStaff(e.target.checked)}
                  className="w-5 h-5 text-red-600 rounded focus:ring-2 focus:ring-red-600"
                  disabled={assigning}
                />
                <label htmlFor="notify-staff" className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <Bell size={16} className="text-blue-600" />
                  <span>Notify warehouse staff about this batch assignment</span>
                </label>
              </div>

              {/* Batch Details */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Package size={18} className="text-slate-600" />
                  Batch Details
                </h3>
                
                {/* Batch Info */}
                <div className="grid grid-cols-2 gap-4 text-sm pb-3 border-b border-slate-200">
                  <div>
                    <p className="text-slate-600 text-xs uppercase font-bold mb-1">Shipment:</p>
                    <p className="font-medium text-slate-900">{selectedBatch?.shipments?.shipment_number}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-xs uppercase font-bold mb-1">Period:</p>
                    <p className="font-medium text-slate-900">
                      {selectedBatch?.batch_month}/{selectedBatch?.batch_year}
                    </p>
                  </div>
                </div>
                
                {/* Product Breakdown */}
                {selectedBatch?.shipments?.product_breakdown && selectedBatch.shipments.product_breakdown.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-600 uppercase mb-2">Products in this batch:</p>
                    {selectedBatch.shipments.product_breakdown.map((product, idx) => {
                      const displayName = product.product_name || `${product.brand || ''} ${product.model || ''}`.trim() || product.category || 'Unknown Product';
                      const displaySize = product.dimensions || product.size || 'N/A';
                      const hasPositions = product.assigned_positions && product.assigned_positions.length > 0;
                      
                      return (
                        <div key={idx} className="bg-white rounded-lg p-3 border border-orange-200">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-semibold text-slate-900 text-sm mb-1">{displayName}</p>
                              <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
                                <Package size={12} className="text-orange-500" />
                                <span>{displaySize}</span>
                              </div>
                              {product.sku && (
                                <p className="text-xs text-slate-500">SKU: {product.sku}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-100 text-orange-700 text-xs font-bold">
                                {product.quantity} pcs
                              </span>
                            </div>
                          </div>
                          
                          {/* Assigned Positions */}
                          {hasPositions && (
                            <div className="mt-2 pt-2 border-t border-slate-100">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <MapPin size={12} className="text-blue-600" />
                                <span className="text-xs font-bold text-blue-900">
                                  {product.assigned_positions.length} Assigned Position{product.assigned_positions.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {product.assigned_positions.map((pos, posIdx) => (
                                  <span 
                                    key={posIdx}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-bold"
                                  >
                                    <MapPin size={10} />
                                    {pos.position_code} ×{pos.quantity}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-600 text-xs uppercase font-bold mb-1">Product:</p>
                      <p className="font-medium text-slate-900">
                        {selectedBatch?.products?.brand} {selectedBatch?.products?.model}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-600 text-xs uppercase font-bold mb-1">SKU:</p>
                      <p className="font-medium text-slate-900">{selectedBatch?.products?.sku}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setShowLocationModal(false)}
                className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                disabled={assigning}
              >
                Cancel
              </button>
              <button
                onClick={handleAssignLocation}
                disabled={!selectedLocation || assigning}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2"
              >
                {assigning ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Assigning...
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} />
                    Assign Location
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
