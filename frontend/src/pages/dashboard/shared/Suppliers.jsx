import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, Truck, Search, Phone, Mail, MapPin, Eye, Database, Package, TrendingUp, CheckCircle, Loader } from 'lucide-react';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';
import Input from '../../../components/common/Input';
import Select from '../../../components/common/Select';
import Table from '../../../components/common/Table';
import Loading from '../../../components/common/Loading';
import EmptyState from '../../../components/common/EmptyState';
import { showToast } from '../../../utils/toast';
import api from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function Suppliers() {
  const { hasRole } = useAuth();
  const [suppliers,     setSuppliers]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [showModal,     setShowModal]     = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingSupplier,  setEditingSupplier]  = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [searchQuery,  setSearchQuery]    = useState('');
  const [dbReady,      setDbReady]        = useState(true);  // false = table not set up yet
  const [selectedIds,  setSelectedIds]    = useState([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    paymentTerms: '',
    taxId: '',
    status: 'active',
    notes: '',
    totalOrders: 0,
    totalValue: 0
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/suppliers');
      setSuppliers(response.data.suppliers || []);
      setDbReady(true);
    } catch (error) {
      setSuppliers([]);
      // 503 = table not configured yet in Supabase
      const is503 =
        error.response?.status === 503 ||
        error.status === 503 ||
        error.message?.toLowerCase().includes('not configured');
      if (is503) {
        setDbReady(false);
      } else {
        console.error('Error loading suppliers:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier.id}`, formData);
        showToast('Supplier updated successfully', 'success');
      } else {
        await api.post('/suppliers', formData);
        showToast('Supplier created successfully', 'success');
      }
      setShowModal(false);
      setEditingSupplier(null);
      resetForm();
      loadSuppliers();
    } catch (error) {
      showToast(error.response?.data?.error || 'Operation failed', 'error');
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData(supplier);
    setShowModal(true);
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingSupplier, setDeletingSupplier] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const handleDelete = async (supplier) => {
    setDeletingSupplier(supplier);
    setShowDeleteModal(true);
    setDeleteSuccess(false);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/suppliers/${deletingSupplier.id}`);
      
      // Show success animation
      setDeleteSuccess(true);
      
      // Wait for animation to complete
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      showToast('Supplier deleted successfully', 'success');
      setShowDeleteModal(false);
      setDeletingSupplier(null);
      setDeleteSuccess(false);
      loadSuppliers();
    } catch (error) {
      showToast('Failed to delete supplier', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredSuppliers.map(s => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) {
      showToast('Please select suppliers to delete', 'warning');
      return;
    }
    setShowBulkDeleteModal(true);
    setDeleteSuccess(false);
  };

  const confirmBulkDelete = async () => {
    setIsDeleting(true);
    try {
      await Promise.all(selectedIds.map(id => api.delete(`/suppliers/${id}`)));
      
      // Show success animation
      setDeleteSuccess(true);
      
      // Wait for animation to complete
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      showToast(`${selectedIds.length} supplier(s) deleted successfully`, 'success');
      setShowBulkDeleteModal(false);
      setSelectedIds([]);
      setDeleteSuccess(false);
      loadSuppliers();
    } catch (error) {
      showToast('Failed to delete some suppliers', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewDetails = (supplier) => {
    setSelectedSupplier(supplier);
    setShowDetailModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      paymentTerms: '',
      taxId: '',
      status: 'active',
      notes: '',
      totalOrders: 0,
      totalValue: 0
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSupplier(null);
    resetForm();
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'inactive': return 'bg-slate-100 text-slate-700';
      case 'suspended': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const columns = [
    {
      key: 'select',
      label: (
        <input
          type="checkbox"
          checked={selectedIds.length === filteredSuppliers.length && filteredSuppliers.length > 0}
          onChange={handleSelectAll}
          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-2 focus:ring-blue-500"
        />
      ),
      render: (_, row) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.id)}
          onChange={() => handleSelectOne(row.id)}
          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-2 focus:ring-blue-500"
        />
      )
    },
    { key: 'name', label: 'Supplier Name', sortable: true },
    { key: 'contactPerson', label: 'Contact Person' },
    {
      key: 'email',
      label: 'Email',
      render: (value) => (
        <a href={`mailto:${value}`} className="text-blue-600 hover:underline">
          {value}
        </a>
      )
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (value) => (
        <a href={`tel:${value}`} className="text-blue-600 hover:underline">
          {value}
        </a>
      )
    },
    {
      key: 'location',
      label: 'Location',
      render: (_, row) => `${row.city}, ${row.state}`
    },
    {
      key: 'totalOrders',
      label: 'Orders',
      render: (value) => <span className="font-semibold">{value || 0}</span>
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(value)}`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex gap-1">
          <button
            onClick={() => handleViewDetails(row)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all hover:scale-105"
            title="View Details"
          >
            <Eye size={18} />
          </button>
          {hasRole('admin', 'manager', 'operational_staff') && (
            <button
              onClick={() => handleEdit(row)}
              className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-all hover:scale-105"
              title="Edit"
            >
              <Edit size={18} />
            </button>
          )}
          {hasRole('admin', 'manager', 'operational_staff') && (
            <button
              onClick={() => handleDelete(row)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all hover:scale-105"
              title="Delete"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      )
    }
  ];

  if (loading) return <Loading />;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Suppliers
          </h1>
          <p className="text-sm text-slate-600 mt-1.5 font-medium">Manage your supplier relationships</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && hasRole('admin', 'manager', 'operational_staff') && (
            <Button 
              onClick={handleBulkDelete} 
              variant="danger"
              icon={Trash2}
              className="shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 transition-all"
            >
              Delete ({selectedIds.length})
            </Button>
          )}
          {hasRole('admin', 'manager', 'operational_staff') && (
            <Button 
              onClick={() => setShowModal(true)} 
              icon={Plus} 
              className="shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all"
            >
              Add Supplier
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-5 text-white"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Database className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-blue-100 font-medium">Total Suppliers</p>
              <p className="text-3xl font-bold">{suppliers.length}</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg p-5 text-white"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Truck className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-emerald-100 font-medium">Active</p>
              <p className="text-3xl font-bold">
                {suppliers.filter(s => s.status === 'active').length}
              </p>
            </div>
          </div>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-5 text-white"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Package className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-purple-100 font-medium">Total Orders</p>
              <p className="text-3xl font-bold">
                {suppliers.reduce((sum, s) => sum + (s.totalOrders || 0), 0)}
              </p>
            </div>
          </div>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg p-5 text-white"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <TrendingUp className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-amber-100 font-medium">Total Value</p>
              <p className="text-3xl font-bold">
                ₱{(suppliers.reduce((sum, s) => sum + (s.totalValue || 0), 0) / 1000).toFixed(0)}K
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, contact, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200">
        {!dbReady ? (
          /* Suppliers table hasn't been created — prompt admin to run migration */
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-14 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center">
              <Database size={28} className="text-amber-600" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-800">Database table not set up yet</p>
              <p className="mt-1 text-sm text-slate-500 max-w-md">
                The <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">suppliers</code> table
                does not exist in Supabase. Run the SQL migration to start managing suppliers.
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-left text-xs font-mono text-amber-800 max-w-sm w-full">
              Supabase Dashboard → SQL Editor<br />
              → Run: <strong>suppliers migration SQL</strong>
            </div>
          </div>
        ) : filteredSuppliers.length > 0 ? (
          <Table columns={columns} data={filteredSuppliers} />
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-14 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Truck size={26} className="text-blue-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-800">No suppliers yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Add your first supplier to start managing your supply chain.
              </p>
            </div>
            {hasRole('admin', 'manager', 'operational_staff') && (
              <Button onClick={() => setShowModal(true)} icon={Plus}>
                Add Supplier
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Supplier Details"
      >
        {selectedSupplier && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{selectedSupplier.name}</h3>
              <span className={`inline-flex mt-2 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedSupplier.status)}`}>
                {selectedSupplier.status.charAt(0).toUpperCase() + selectedSupplier.status.slice(1)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-slate-500">Contact Person</p>
                <p className="font-semibold">{selectedSupplier.contactPerson}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Payment Terms</p>
                <p className="font-semibold">{selectedSupplier.paymentTerms}</p>
              </div>
            </div>
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="text-slate-400" size={16} />
                <a href={`mailto:${selectedSupplier.email}`} className="text-blue-600 hover:underline">
                  {selectedSupplier.email}
                </a>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="text-slate-400" size={16} />
                <a href={`tel:${selectedSupplier.phone}`} className="text-blue-600 hover:underline">
                  {selectedSupplier.phone}
                </a>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="text-slate-400 shrink-0 mt-0.5" size={16} />
                <div>
                  <p>{selectedSupplier.address}</p>
                  <p>{selectedSupplier.city}, {selectedSupplier.state} {selectedSupplier.zipCode}</p>
                  <p>{selectedSupplier.country}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-slate-500">Total Orders</p>
                <p className="text-2xl font-bold text-blue-600">{selectedSupplier.totalOrders || 0}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Value</p>
                <p className="text-2xl font-bold text-green-600">
                  ₱{((selectedSupplier.totalValue || 0) / 1000).toFixed(0)}K
                </p>
              </div>
            </div>
            {selectedSupplier.taxId && (
              <div className="pt-4 border-t">
                <p className="text-sm text-slate-500">Tax ID</p>
                <p className="font-mono text-sm">{selectedSupplier.taxId}</p>
              </div>
            )}
            {selectedSupplier.notes && (
              <div className="pt-4 border-t">
                <p className="text-sm text-slate-500 mb-1">Notes</p>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700">
                  {selectedSupplier.notes}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
            <Input
              label="Supplier Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Tech Solutions Inc"
              required
            />
            <Input
              label="Contact Person"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              placeholder="e.g., John Smith"
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@supplier.com"
                required
              />
              <Input
                label="Phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1-555-0100"
                required
              />
            </div>
            <Input
              label="Address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Main Street"
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="City"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="San Francisco"
                required
              />
              <Input
                label="State/Province"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="CA"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="ZIP/Postal Code"
                value={formData.zipCode}
                onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                placeholder="94105"
                required
              />
              <Input
                label="Country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="USA"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Payment Terms"
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                placeholder="Net 30"
                required
              />
              <Input
                label="Tax ID"
                value={formData.taxId}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                placeholder="12-3456789"
              />
            </div>
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'suspended', label: 'Suspended' }
              ]}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Total Orders"
                type="number"
                value={formData.totalOrders}
                onChange={(e) => setFormData({ ...formData, totalOrders: parseInt(e.target.value) || 0 })}
                placeholder="0"
                min="0"
              />
              <Input
                label="Total Value (₱)"
                type="number"
                value={formData.totalValue}
                onChange={(e) => setFormData({ ...formData, totalValue: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional information about this supplier..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
              />
            </div>
          </div>
          
          {/* Fixed buttons at bottom */}
          <div className="flex gap-3 pt-6 mt-6 border-t border-slate-200">
            <Button type="button" variant="ghost" onClick={handleCloseModal} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {editingSupplier ? 'Update' : 'Create'} Supplier
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => !isDeleting && setShowDeleteModal(false)}
        title="Delete Supplier"
      >
        {deletingSupplier && (
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {!deleteSuccess ? (
                <motion.div
                  key="delete-confirm"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Warning Icon */}
                  <div className="flex justify-center">
                    <motion.div
                      animate={isDeleting ? { rotate: [0, -10, 10, -10, 0] } : {}}
                      transition={{ duration: 0.5, repeat: isDeleting ? Infinity : 0 }}
                      className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center"
                    >
                      <Trash2 className="text-red-600" size={32} />
                    </motion.div>
                  </div>
                  
                  {/* Message */}
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold text-slate-900">
                      Are you sure you want to delete this supplier?
                    </h3>
                    <p className="text-slate-600">
                      You're about to delete <span className="font-semibold text-slate-900">{deletingSupplier.name}</span>.
                    </p>
                    <p className="text-sm text-red-600 font-medium">
                      This action cannot be undone and will permanently remove all associated data.
                    </p>
                  </div>

                  {/* Supplier Info Card */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Contact Person:</span>
                      <span className="text-sm font-semibold text-slate-900">{deletingSupplier.contactPerson}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Total Orders:</span>
                      <span className="text-sm font-semibold text-slate-900">{deletingSupplier.totalOrders || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Total Value:</span>
                      <span className="text-sm font-semibold text-green-600">
                        ₱{((deletingSupplier.totalValue || 0) / 1000).toFixed(1)}K
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => setShowDeleteModal(false)} 
                      className="flex-1"
                      disabled={isDeleting}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="button" 
                      variant="danger"
                      onClick={confirmDelete}
                      className="flex-1"
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <>
                          <Loader className="animate-spin" size={18} />
                          Deleting...
                        </>
                      ) : (
                        'Delete Supplier'
                      )}
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="delete-success"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, type: "spring" }}
                  className="py-8"
                >
                  {/* Success Animation */}
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.2, 1] }}
                      transition={{ duration: 0.5 }}
                      className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center"
                    >
                      <CheckCircle className="text-green-600" size={48} />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-center"
                    >
                      <h3 className="text-2xl font-bold text-slate-900">Deleted Successfully!</h3>
                      <p className="text-slate-600 mt-2">The supplier has been removed.</p>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        isOpen={showBulkDeleteModal}
        onClose={() => !isDeleting && setShowBulkDeleteModal(false)}
        title="Delete Multiple Suppliers"
      >
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {!deleteSuccess ? (
              <motion.div
                key="bulk-delete-confirm"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                {/* Warning Icon */}
                <div className="flex justify-center">
                  <motion.div
                    animate={isDeleting ? { rotate: [0, -10, 10, -10, 0] } : {}}
                    transition={{ duration: 0.5, repeat: isDeleting ? Infinity : 0 }}
                    className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center"
                  >
                    <Trash2 className="text-red-600" size={32} />
                  </motion.div>
                </div>
                
                {/* Message */}
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold text-slate-900">
                    Delete {selectedIds.length} supplier{selectedIds.length > 1 ? 's' : ''}?
                  </h3>
                  <p className="text-slate-600">
                    You're about to permanently delete {selectedIds.length} supplier{selectedIds.length > 1 ? 's' : ''}.
                  </p>
                  <p className="text-sm text-red-600 font-medium">
                    This action cannot be undone and will permanently remove all associated data.
                  </p>
                </div>

                {/* Selected Count Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Selected Suppliers:</span>
                    <span className="text-2xl font-bold text-red-600">{selectedIds.length}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => setShowBulkDeleteModal(false)} 
                    className="flex-1"
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="button" 
                    variant="danger"
                    onClick={confirmBulkDelete}
                    className="flex-1"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <Loader className="animate-spin" size={18} />
                        Deleting...
                      </>
                    ) : (
                      `Delete All (${selectedIds.length})`
                    )}
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="bulk-delete-success"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, type: "spring" }}
                className="py-8"
              >
                {/* Success Animation */}
                <div className="flex flex-col items-center justify-center space-y-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.2, 1] }}
                    transition={{ duration: 0.5 }}
                    className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center"
                  >
                    <CheckCircle className="text-green-600" size={48} />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-center"
                  >
                    <h3 className="text-2xl font-bold text-slate-900">
                      {selectedIds.length} Supplier{selectedIds.length > 1 ? 's' : ''} Deleted!
                    </h3>
                    <p className="text-slate-600 mt-2">All selected suppliers have been removed.</p>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Modal>
    </motion.div>
  );
}
