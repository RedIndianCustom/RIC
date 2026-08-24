import { useState, useEffect } from 'react';
import { Package, CheckCircle, AlertCircle } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Loading from '../common/Loading';
import { showToast } from '../../utils/toast';
import api from '../../services/api';

export default function ReceivePOModal({ isOpen, onClose, purchaseOrder, onSuccess }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [receivingDate, setReceivingDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (purchaseOrder) {
      loadItems();
    }
  }, [purchaseOrder]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/purchase-orders/${purchaseOrder.id}/items`);
      const itemsData = response.data.items || [];
      
      // Initialize received quantities
      setItems(itemsData.map(item => ({
        ...item,
        receivingQuantity: item.quantity - (item.receivedQuantity || 0)
      })));
    } catch (error) {
      console.error('Error loading items:', error);
      showToast('Failed to load items', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateReceivingQuantity = (index, value) => {
    const newItems = [...items];
    const maxQuantity = newItems[index].quantity - newItems[index].receivedQuantity;
    newItems[index].receivingQuantity = Math.min(Math.max(0, parseInt(value) || 0), maxQuantity);
    setItems(newItems);
  };

  const markAllAsReceived = () => {
    setItems(items.map(item => ({
      ...item,
      receivingQuantity: item.quantity - item.receivedQuantity
    })));
  };

  const isFullyReceived = () => {
    return items.every(item => 
      item.receivedQuantity + item.receivingQuantity >= item.quantity
    );
  };

  const hasChanges = () => {
    return items.some(item => item.receivingQuantity > 0);
  };

  const handleSubmit = async () => {
    if (!hasChanges()) {
      showToast('Please enter received quantities', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      // Update items with new received quantities
      const updatedItems = items.map(item => ({
        ...item,
        receivedQuantity: item.receivedQuantity + item.receivingQuantity
      }));

      // Update purchase order
      const payload = {
        status: isFullyReceived() ? 'received' : purchaseOrder.status,
        actualDelivery: isFullyReceived() ? receivingDate : purchaseOrder.actualDelivery,
        items: updatedItems,
        notes: notes ? `${purchaseOrder.notes || ''}\n[Receiving ${receivingDate}]: ${notes}`.trim() : purchaseOrder.notes
      };

      await api.put(`/purchase-orders/${purchaseOrder.id}`, payload);
      
      showToast(
        isFullyReceived() 
          ? 'All items received successfully! PO marked as received.' 
          : 'Items partially received successfully',
        'success'
      );
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error receiving items:', error);
      showToast(error.response?.data?.error || 'Failed to receive items', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Receive Items" size="lg">
        <Loading />
      </Modal>
    );
  }

  const totalReceiving = items.reduce((sum, item) => sum + item.receivingQuantity, 0);
  const allFullyReceived = isFullyReceived();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Receive Purchase Order Items" size="lg">
      <div className="space-y-6">
        {/* PO Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Purchase Order</p>
              <p className="text-lg font-bold font-mono text-slate-900">{purchaseOrder.poNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600">Supplier</p>
              <p className="text-lg font-semibold text-slate-900">{purchaseOrder.supplierName}</p>
            </div>
          </div>
        </div>

        {/* Receiving Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Receiving Date *
            </label>
            <input
              type="date"
              value={receivingDate}
              onChange={(e) => setReceivingDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              onClick={markAllAsReceived}
              variant="ghost"
              className="w-full"
            >
              <CheckCircle size={18} />
              Mark All as Received
            </Button>
          </div>
        </div>

        {/* Items List */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Items to Receive</h3>
          </div>
          
          <div className="max-h-[40vh] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                    Product
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                    Ordered
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                    Already Received
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                    Receiving Now
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((item, index) => {
                  const remaining = item.quantity - item.receivedQuantity;
                  const willBeComplete = item.receivedQuantity + item.receivingQuantity >= item.quantity;
                  
                  return (
                    <tr key={item.id || index} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.productName}</p>
                          {item.productSku && (
                            <p className="text-xs text-slate-500 font-mono">{item.productSku}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-semibold text-slate-900">{item.quantity}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-slate-600">{item.receivedQuantity || 0}</span>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={item.receivingQuantity}
                          onChange={(e) => updateReceivingQuantity(index, e.target.value)}
                          min="0"
                          max={remaining}
                          className="w-20 px-2 py-1 text-center border border-slate-300 rounded text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {willBeComplete ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <CheckCircle size={12} />
                            Complete
                          </span>
                        ) : item.receivingQuantity > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                            <AlertCircle size={12} />
                            Partial
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            Pending
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

        {/* Summary */}
        <div className={`rounded-lg p-4 ${allFullyReceived ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Items Receiving</p>
              <p className="text-2xl font-bold text-slate-900">{totalReceiving}</p>
            </div>
            {allFullyReceived && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle size={24} />
                <span className="font-semibold">All items will be fully received</span>
              </div>
            )}
          </div>
        </div>

        {/* Receiving Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Receiving Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this delivery (optional)..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="3"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-slate-200">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="flex-1"
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            className="flex-1"
            disabled={submitting || !hasChanges()}
            loading={submitting}
          >
            {submitting ? 'Processing...' : (allFullyReceived ? 'Complete Receipt' : 'Partial Receipt')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
