import { useState, useEffect } from 'react';
import { FileText, Calendar, Package, DollarSign, User, MapPin, Phone, Mail, Truck } from 'lucide-react';
import Modal from '../common/Modal';
import Loading from '../common/Loading';
import api from '../../services/api';

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700' },
  pending: { label: 'Pending Approval', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-700' },
  ordered: { label: 'Ordered', color: 'bg-purple-100 text-purple-700' },
  received: { label: 'Received', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' }
};

export default function ViewPOModal({ isOpen, onClose, purchaseOrder }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [supplier, setSupplier] = useState(null);

  useEffect(() => {
    if (purchaseOrder) {
      loadDetails();
    }
  }, [purchaseOrder]);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const [itemsRes, supplierRes] = await Promise.all([
        api.get(`/purchase-orders/${purchaseOrder.id}/items`),
        api.get(`/suppliers/${purchaseOrder.supplierId}`)
      ]);
      
      setItems(itemsRes.data.items || []);
      setSupplier(supplierRes.data.supplier);
    } catch (error) {
      console.error('Error loading PO details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Purchase Order Details" size="xl">
        <Loading />
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Purchase Order Details" size="xl">
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
        {/* Header Info */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="text-blue-600" size={24} />
                <h2 className="text-2xl font-bold text-slate-900 font-mono">
                  {purchaseOrder.poNumber}
                </h2>
              </div>
              <p className="text-sm text-slate-600">Purchase Order</p>
            </div>
            <div className="text-right">
              <span className={`inline-flex px-4 py-2 rounded-full text-sm font-semibold ${statusConfig[purchaseOrder.status]?.color || 'bg-slate-100 text-slate-700'}`}>
                {statusConfig[purchaseOrder.status]?.label || purchaseOrder.status}
              </span>
              <p className="text-xs text-slate-500 mt-2">
                Created {new Date(purchaseOrder.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-slate-600 mb-1">
              <Calendar size={16} />
              <span className="text-xs font-medium">Order Date</span>
            </div>
            <p className="text-sm font-semibold text-slate-900">
              {new Date(purchaseOrder.orderDate).toLocaleDateString()}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-slate-600 mb-1">
              <Truck size={16} />
              <span className="text-xs font-medium">Expected Delivery</span>
            </div>
            <p className="text-sm font-semibold text-slate-900">
              {purchaseOrder.expectedDelivery 
                ? new Date(purchaseOrder.expectedDelivery).toLocaleDateString()
                : 'Not set'}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-slate-600 mb-1">
              <Package size={16} />
              <span className="text-xs font-medium">Actual Delivery</span>
            </div>
            <p className="text-sm font-semibold text-slate-900">
              {purchaseOrder.actualDelivery 
                ? new Date(purchaseOrder.actualDelivery).toLocaleDateString()
                : 'Not delivered'}
            </p>
          </div>
        </div>

        {/* Supplier Info */}
        {supplier && (
          <div className="border border-slate-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Supplier Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 text-slate-600 mb-1">
                  <User size={16} />
                  <span className="text-xs font-medium">Company Name</span>
                </div>
                <p className="text-sm font-semibold text-slate-900">{supplier.name}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-slate-600 mb-1">
                  <User size={16} />
                  <span className="text-xs font-medium">Contact Person</span>
                </div>
                <p className="text-sm font-semibold text-slate-900">{supplier.contactPerson}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-slate-600 mb-1">
                  <Mail size={16} />
                  <span className="text-xs font-medium">Email</span>
                </div>
                <a href={`mailto:${supplier.email}`} className="text-sm text-blue-600 hover:underline">
                  {supplier.email}
                </a>
              </div>
              <div>
                <div className="flex items-center gap-2 text-slate-600 mb-1">
                  <Phone size={16} />
                  <span className="text-xs font-medium">Phone</span>
                </div>
                <a href={`tel:${supplier.phone}`} className="text-sm text-blue-600 hover:underline">
                  {supplier.phone}
                </a>
              </div>
              <div className="col-span-2">
                <div className="flex items-center gap-2 text-slate-600 mb-1">
                  <MapPin size={16} />
                  <span className="text-xs font-medium">Address</span>
                </div>
                <p className="text-sm text-slate-700">
                  {supplier.address}, {supplier.city}, {supplier.state} {supplier.zipCode}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Items Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Items</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">#</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">SKU</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Qty</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Unit Price</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((item, index) => (
                  <tr key={item.id || index} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm text-slate-500">{index + 1}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.productName}</p>
                        {item.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-slate-600">
                      {item.productSku || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-right text-slate-900">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-slate-900">
                      ₱{item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-right text-slate-900">
                      ₱{item.lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Financial Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Subtotal:</span>
              <span className="text-sm font-semibold text-slate-900">
                ₱{purchaseOrder.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Tax Amount:</span>
              <span className="text-sm font-semibold text-slate-900">
                ₱{purchaseOrder.taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Shipping Cost:</span>
              <span className="text-sm font-semibold text-slate-900">
                ₱{purchaseOrder.shippingCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="border-t border-blue-300 pt-3 flex justify-between">
              <span className="text-base font-semibold text-slate-900">Total Amount:</span>
              <span className="text-2xl font-bold text-blue-600">
                ₱{purchaseOrder.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        {(purchaseOrder.paymentTerms || purchaseOrder.shippingAddress || purchaseOrder.notes) && (
          <div className="grid grid-cols-2 gap-4">
            {purchaseOrder.paymentTerms && (
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <p className="text-xs font-medium text-slate-600 mb-1">Payment Terms</p>
                <p className="text-sm font-semibold text-slate-900">{purchaseOrder.paymentTerms}</p>
              </div>
            )}
            {purchaseOrder.shippingAddress && (
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <p className="text-xs font-medium text-slate-600 mb-1">Shipping Address</p>
                <p className="text-sm font-semibold text-slate-900">{purchaseOrder.shippingAddress}</p>
              </div>
            )}
            {purchaseOrder.notes && (
              <div className="col-span-2 bg-white border border-slate-200 rounded-lg p-4">
                <p className="text-xs font-medium text-slate-600 mb-2">Notes</p>
                <p className="text-sm text-slate-700">{purchaseOrder.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
