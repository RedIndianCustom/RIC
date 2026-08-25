import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Plus, Search, Filter, Layers, DollarSign,
  AlertTriangle, CheckCircle2, RefreshCw, Barcode,
  Tag, ArrowUpDown, ChevronRight, Edit3, Trash2
} from 'lucide-react';
import Loading from '../../../components/common/Loading.jsx';
import EmptyState from '../../../components/common/EmptyState.jsx';
import api from '../../../services/api.js';

const BRANDS = ['All Brands', 'Michelin', 'Pirelli', 'Bridgestone', 'Continental', 'Goodyear', 'Dunlop'];
const CATEGORIES = ['All Categories', 'Ultra High Performance', 'All-Terrain / SUV', 'All-Season Performance', 'Rugged Off-Road'];

export default function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('All Brands');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    brand: 'Michelin',
    model: '',
    dimensions: '225/50 R17 94V',
    category: 'Ultra High Performance',
    unitCost: 120,
    retailPrice: 190,
    currentStock: 50,
    reorderLevel: 15,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/products');
      if (data?.products && data.products.length > 0) {
        setProducts(data.products.map(p => ({
          id: p.id,
          sku: p.sku,
          brand: p.brand,
          model: p.model,
          dimensions: p.dimensions,
          category: p.category,
          unitCost: parseFloat(p.unit_cost || 0),
          retailPrice: parseFloat(p.retail_price || 0),
          currentStock: p.current_stock || 0,
          reorderLevel: p.reorder_level || 15,
          status: p.status || 'In Stock',
        })));
      }
    } catch (err) {
      console.warn('Products API notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const sku = `${formData.brand.slice(0, 4).toUpperCase()}-${formData.model.replace(/\s+/g, '').slice(0, 4).toUpperCase()}-${formData.dimensions.replace(/[^0-9]/g, '')}`;
    try {
      await api.post('/products', {
        sku,
        brand: formData.brand,
        model: formData.model,
        dimensions: formData.dimensions,
        category: formData.category,
        unitCost: parseFloat(formData.unitCost),
        retailPrice: parseFloat(formData.retailPrice),
        currentStock: parseInt(formData.currentStock, 10),
        reorderLevel: parseInt(formData.reorderLevel, 10),
      });

      setSuccess(`Master SKU ${sku} added to catalog database!`);
      setIsAddModalOpen(false);
      setFormData({
        brand: 'Michelin',
        model: '',
        dimensions: '225/50 R17 94V',
        category: 'Ultra High Performance',
        unitCost: 120,
        retailPrice: 190,
        currentStock: 50,
        reorderLevel: 15,
      });
      await loadData();
      setTimeout(() => setSuccess(''), 3500);
    } catch (err) {
      console.error('Failed to add product:', err);
      setSuccess('');
      // surface the error to the user without injecting fake data
      alert(err?.response?.data?.error || 'Failed to save product. Please try again.');
    }
  };

  const filteredProducts = products.filter(p => {
    const query = searchQuery.toLowerCase();
    const matchSearch = p.sku.toLowerCase().includes(query) ||
                        p.brand.toLowerCase().includes(query) ||
                        p.model.toLowerCase().includes(query) ||
                        p.dimensions.toLowerCase().includes(query);
    const matchBrand = selectedBrand === 'All Brands' || p.brand === selectedBrand;
    const matchCat = selectedCategory === 'All Categories' || p.category === selectedCategory;
    return matchSearch && matchBrand && matchCat;
  });

  const totalSKUs = products.length;
  const totalStockUnits = products.reduce((acc, p) => acc + p.currentStock, 0);
  const lowStockCount = products.filter(p => p.currentStock <= p.reorderLevel).length;

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
            <Package className="w-3.5 h-3.5" />
            Master Product Catalog &amp; SKU Governance
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Master Product &amp; Tire Catalog</h1>
          <p className="text-slate-500 text-sm mt-0.5">Encode tire specifications, speed indexes, MSRP pricing, and inventory reorder points.</p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-sm font-semibold shadow-md shadow-emerald-500/20 transition-all active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Master Tire SKU
        </button>
      </div>

      {/* ── Summary Stats ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white p-5 border border-slate-200/80 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Tire SKUs</span>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{totalSKUs} Catalog Items</p>
          <p className="text-xs text-slate-500 mt-1">Across 6 tier-one tire brands</p>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-slate-200/80 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Stock on Hand</span>
          <p className="mt-2 text-2xl font-extrabold text-emerald-600">{totalStockUnits.toLocaleString()} Units</p>
          <p className="text-xs text-slate-500 mt-1">Distributed in active warehouses</p>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-slate-200/80 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Low Stock Reorders</span>
          <p className="mt-2 text-2xl font-extrabold text-amber-600">{lowStockCount} Items Pending</p>
          <p className="text-xs text-slate-500 mt-1">Below minimum safety thresholds</p>
        </div>
      </div>

      {/* ── Alerts ────────────────────────────────────────────────── */}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* ── Controls Bar ──────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search SKU, brand, model or size..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
          >
            {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* ── Products Table ────────────────────────────────────────── */}
      {loading ? (
        <Loading />
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          icon={Package}
          title={products.length === 0 ? 'No Products in Catalog' : 'No Products Match Filters'}
          description={
            products.length === 0
              ? 'Add your first tire SKU to the master catalog to get started.'
              : 'Try adjusting your search or filter criteria.'
          }
          actionLabel={products.length === 0 ? 'Add First SKU' : undefined}
          onAction={products.length === 0 ? () => setIsAddModalOpen(true) : undefined}
        />
      ) : (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Tire Specification</th>
                <th className="px-5 py-3.5">Category &amp; Size</th>
                <th className="px-5 py-3.5">Unit Cost / MSRP</th>
                <th className="px-5 py-3.5">Stock Level</th>
                <th className="px-5 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const isLow = p.currentStock <= p.reorderLevel;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Brand & Model & SKU */}
                    <td className="px-5 py-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{p.brand} {p.model}</span>
                        </div>
                        <p className="font-mono text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          <Barcode className="w-3.5 h-3.5 text-slate-400" />
                          {p.sku}
                        </p>
                      </div>
                    </td>

                    {/* Dimensions & Category */}
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800 text-xs">{p.dimensions}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{p.category}</p>
                    </td>

                    {/* Pricing */}
                    <td className="px-5 py-4">
                      <p className="text-xs font-bold text-slate-900">${p.retailPrice.toFixed(2)} MSRP</p>
                      <p className="text-[11px] text-slate-400">Cost: ${p.unitCost.toFixed(2)}</p>
                    </td>

                    {/* Stock */}
                    <td className="px-5 py-4">
                      <p className="text-xs font-extrabold text-slate-900">{p.currentStock} Units</p>
                      <p className="text-[10px] text-slate-400">Min: {p.reorderLevel} units</p>
                    </td>

                    {/* Status badge */}
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                        p.currentStock <= 5
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : isLow
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          p.currentStock <= 5 ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                        }`} />
                        {p.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* ── Add Product Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Add Tire to Master Catalog</h3>
                    <p className="text-xs text-slate-500">Configure dimensional parameters and MSRP pricing</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddProduct} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Brand</label>
                    <select
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
                    >
                      {BRANDS.filter(b => b !== 'All Brands').map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Pattern / Model</label>
                    <input
                      type="text"
                      required
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      placeholder="e.g. Pilot Sport 5"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Dimensions &amp; Load Rating</label>
                    <input
                      type="text"
                      required
                      value={formData.dimensions}
                      onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                      placeholder="245/40 R19 98Y"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
                    >
                      {CATEGORIES.filter(c => c !== 'All Categories').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Unit Cost ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.unitCost}
                      onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Retail MSRP ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.retailPrice}
                      onChange={(e) => setFormData({ ...formData, retailPrice: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Stock (Units)</label>
                    <input
                      type="number"
                      required
                      value={formData.currentStock}
                      onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Reorder Safety Alert</label>
                    <input
                      type="number"
                      required
                      value={formData.reorderLevel}
                      onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-500/20"
                  >
                    Save to Catalog
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
