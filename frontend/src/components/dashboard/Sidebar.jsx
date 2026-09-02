import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  PackageCheck,
  Boxes,
  Warehouse,
  ShoppingCart,
  ClipboardCheck,
  RotateCcw,
  BarChart3,
  FileWarning,
  AlertTriangle,
  Users,
  Truck,
  Settings,
  ChevronDown,
  ChevronRight,
  LogOut,
  Zap,
  ShieldCheck,
  IdCard,
  Package,
  Barcode,
  Ruler,
  ScrollText,
  Layers,
  Ship,
  PackageOpen,
  MapPin,
  FileText,
  PackagePlus,
  BookOpen,
  Search,
  QrCode,
  Printer,
  ClipboardList,
  FileCheck,
  ShoppingBag,
} from 'lucide-react';
import logo from '../../Image/logo.jpg';
import { useAuth } from '../../hooks/useAuth';

const NAVIGATION = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
    roles: ['admin', 'manager', 'operational_staff', 'warehouse_staff', 'sales_staff'],
  },
  {
    id: 'operations',
    label: 'OPERATIONS',
    type: 'section',
    items: [
      {
        id: 'receiving',
        label: 'Receiving & Inspection',
        icon: PackageCheck,
        path: '/receiving',
        roles: ['warehouse_staff'],
      },
      {
        id: 'qc-inspection',
        label: 'QC Inspection',
        icon: ClipboardCheck,
        path: '/warehouse/qc-inspection',
        roles: ['warehouse_staff'],
      },
      {
        id: 'approvals',
        label: 'Approvals Center',
        icon: ClipboardList,
        path: '/approvals',
        roles: ['manager', 'admin'],
      },
      {
        id: 'inventory',
        label: 'Inventory',
        icon: Boxes,
        path: '/inventory',
        roles: ['admin', 'manager', 'operational_staff'],
      },
      {
        id: 'warehouse',
        label: 'Warehouse Locations',
        icon: Warehouse,
        path: '/warehouse',
        roles: ['admin', 'manager', 'operational_staff', 'warehouse_staff'],
      },
      {
        id: 'orders',
        label: 'Orders',
        icon: ShoppingCart,
        path: '/orders',
        roles: ['operational_staff', 'sales_staff', 'manager'],
      },
      {
        id: 'picking',
        label: 'Picking & Packing',
        icon: ClipboardCheck,
        path: '/picking',
        roles: ['warehouse_staff'],
      },
      {
        id: 'returns',
        label: 'Returns',
        icon: RotateCcw,
        path: '/returns',
        roles: ['operational_staff', 'sales_staff', 'warehouse_staff'],
      },
    ],
  },
  // NEW: Shipment & Cargo Section (Operational Staff Only)
  {
    id: 'shipment-cargo',
    label: 'SHIPMENT & CARGO',
    type: 'section',
    items: [
      {
        id: 'incoming-shipments',
        label: 'Incoming Shipments',
        icon: Ship,
        path: '/shipments/incoming',
        roles: ['operational_staff'],
      },
      {
        id: 'all-shipments',
        label: 'All Shipments',
        icon: PackageOpen,
        path: '/shipments',
        roles: ['operational_staff'],
      },
      {
        id: 'process-returns',
        label: 'Process Returns',
        icon: RotateCcw,
        path: '/shipments/returns',
        roles: ['operational_staff'],
      },
    ],
  },
  // NEW: Product Catalog Section (Operational Staff Only)
  {
    id: 'product-catalog',
    label: 'PRODUCT CATALOG',
    type: 'section',
    items: [
      {
        id: 'register-products',
        label: 'Register Products',
        icon: PackagePlus,
        path: '/products/register',
        roles: ['operational_staff'],
      },
      {
        id: 'master-catalog',
        label: 'Master Catalog',
        icon: BookOpen,
        path: '/products/catalog',
        roles: ['operational_staff'],
      },
      {
        id: 'product-lookup',
        label: 'Product Lookup',
        icon: Search,
        path: '/products/lookup',
        roles: ['operational_staff'],
      },
    ],
  },
  // NEW: Barcode & Labels Section (Operational Staff Only)
  {
    id: 'barcode-labels',
    label: 'BARCODE & LABELS',
    type: 'section',
    items: [
      {
        id: 'generate-barcodes',
        label: 'Generate Barcodes',
        icon: QrCode,
        path: '/barcode/generate',
        roles: ['operational_staff'],
      },
      {
        id: 'scan-products',
        label: 'Scan Products',
        icon: Barcode,
        path: '/barcode/scan',
        roles: ['operational_staff'],
      },
      {
        id: 'print-labels',
        label: 'Print Labels',
        icon: Printer,
        path: '/barcode/print',
        roles: ['operational_staff'],
      },
    ],
  },
  // NEW: Batch & Orders Section (Operational Staff Only)
  {
    id: 'batch-orders',
    label: 'BATCH & ORDERS',
    type: 'section',
    items: [
      {
        id: 'manage-batches',
        label: 'Manage Batches',
        icon: Layers,
        path: '/batches/manage',
        roles: ['operational_staff'],
      },
      {
        id: 'waybills-docs',
        label: 'Waybills & Docs',
        icon: FileText,
        path: '/batches/waybills',
        roles: ['operational_staff'],
      },
      {
        id: 'order-processing',
        label: 'Order Processing',
        icon: ShoppingBag,
        path: '/orders/process',
        roles: ['operational_staff'],
      },
    ],
  },
  {
    id: 'reports',
    label: 'REPORTS',
    type: 'section',
    items: [
      {
        id: 'reports-main',
        label: 'All Reports',
        icon: BarChart3,
        path: '/reports',
        roles: ['manager', 'admin'],
      },
      {
        id: 'discrepancy',
        label: 'Discrepancy Reports',
        icon: FileWarning,
        path: '/reports/discrepancies',
        roles: ['manager', 'admin'],
      },
      {
        id: 'defects',
        label: 'Defect Reports',
        icon: AlertTriangle,
        path: '/reports/defects',
        roles: ['manager', 'admin'],
      },
    ],
  },
  {
    id: 'management',
    label: 'MANAGEMENT',
    type: 'section',
    items: [
      {
        id: 'users',
        label: 'Users Directory',
        icon: Users,
        path: '/users',
        roles: ['admin'],
      },
      {
        id: 'roles',
        label: 'Roles & Matrix',
        icon: ShieldCheck,
        path: '/roles',
        roles: ['admin'],
      },
      {
        id: 'employees',
        label: 'Employee Badges',
        icon: IdCard,
        path: '/employees',
        roles: ['admin'],
      },
      {
        id: 'warehouses',
        label: 'Warehouse Layout',
        icon: Warehouse,
        path: '/warehouses',
        roles: ['admin'],
      },
      {
        id: 'products',
        label: 'Master Catalog',
        icon: Package,
        path: '/products',
        roles: ['admin'],
      },
      {
        id: 'barcode-config',
        label: 'Barcode Rules',
        icon: Barcode,
        path: '/barcode/config',
        roles: ['admin'],
      },
      {
        id: 'capacity-rules',
        label: 'Capacity Rules',
        icon: Ruler,
        path: '/capacity-rules',
        roles: ['admin'],
      },
      {
        id: 'suppliers',
        label: 'Suppliers',
        icon: Truck,
        path: '/suppliers',
        roles: ['admin', 'manager', 'operational_staff'],
      },
      {
        id: 'purchase-orders',
        label: 'Purchase Orders',
        icon: FileText,
        path: '/purchase-orders',
        roles: ['admin', 'manager', 'operational_staff'],
      },
      {
        id: 'batches',
        label: 'Batch Management',
        icon: Layers,
        path: '/batches',
        roles: ['admin', 'manager', 'operational_staff'],
      },
      {
        id: 'audit-logs',
        label: 'Audit Trails',
        icon: ScrollText,
        path: '/audit-logs',
        roles: ['admin'],
      },
      {
        id: 'settings',
        label: 'System Settings',
        icon: Settings,
        path: '/settings',
        roles: ['admin'],
      },
    ],
  },
];

function NavItem({ item, isActive, onClick }) {
  const Icon = item.icon;
  const active = isActive(item.path);

  return (
    <Link
      to={item.path}
      onClick={onClick}
      className="group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 mb-0.5"
      style={
        active
          ? {
              background: 'linear-gradient(135deg, #2650ab 0%, #3568d4 100%)',
              color: '#ffffff',
              boxShadow: '0 4px 14px 0 rgba(53,104,212,0.45)',
            }
          : {}
      }
    >
      {/* Active left-glow bar */}
      {active && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full"
          style={{ background: '#93b4ff' }}
        />
      )}

      {/* Hover bg for inactive items */}
      {!active && (
        <span className="absolute inset-0 rounded-xl bg-slate-800/0 group-hover:bg-slate-800/60 transition-all duration-200" />
      )}

      <span
        className={`relative flex-shrink-0 transition-colors duration-200 ${
          active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
        }`}
      >
        <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
      </span>

      <span
        className={`relative transition-colors duration-200 ${
          active ? 'text-white' : 'text-slate-300 group-hover:text-slate-100'
        }`}
      >
        {item.label}
      </span>
    </Link>
  );
}

function SidebarContent({ isActive, expandedSections, toggleSection, filteredNavigation, onClose, user, signOut }) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800/80">
        <div
          className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-brand-600/40"
          style={{ boxShadow: '0 0 12px 0 rgba(53,104,212,0.35)' }}
        >
          <img src={logo} alt="Logo" className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-white truncate leading-tight">Inventory Management</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Zap size={10} className="text-brand-400 flex-shrink-0" />
            <p className="text-xs text-slate-500 truncate">Warehouse Operations</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
        {filteredNavigation.map((item) => {
          if (!item.type) {
            return (
              <NavItem key={item.id} item={item} isActive={isActive} onClick={onClose} />
            );
          }

          if (item.type === 'section') {
            const isExpanded = expandedSections.includes(item.id);
            return (
              <div key={item.id} className="mb-2">
                <button
                  onClick={() => toggleSection(item.id)}
                  className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold tracking-widest uppercase transition-colors duration-200 text-slate-600 hover:text-slate-400"
                >
                  <span>{item.label}</span>
                  <span className="transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                    <ChevronDown size={13} />
                  </span>
                </button>

                {/* Divider line */}
                <div className="mx-3 mb-1 h-px bg-slate-800/60" />

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      {item.items.map((subItem) => (
                        <NavItem key={subItem.id} item={subItem} isActive={isActive} onClick={onClose} />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          return null;
        })}
      </nav>

      {/* Bottom user strip */}
      <div className="border-t border-slate-800/80 px-3 py-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl group">
          <div
            className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #2650ab, #5b8def)' }}
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-slate-500 truncate">{user?.role || ''}</p>
          </div>
          <button
            onClick={signOut}
            title="Sign out"
            className="flex-shrink-0 p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const { hasRole, user: authUser, roles, signOut } = useAuth();
  const [expandedSections, setExpandedSections] = useState([
    'operations', 
    'shipment-cargo', 
    'product-catalog', 
    'barcode-labels', 
    'batch-orders', 
    'reports', 
    'management'
  ]);

  const toggleSection = (sectionId) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
    );
  };

  const isActive = (path) => location.pathname === path;

  const filterNavByRole = (items) =>
    items.filter((item) => {
      if (!item.roles) return true;
      return item.roles.some((role) => hasRole(role));
    });

  const filteredNavigation = NAVIGATION.map((item) => {
    if (item.type === 'section') {
      const filteredItems = filterNavByRole(item.items);
      return filteredItems.length > 0 ? { ...item, items: filteredItems } : null;
    }
    if (item.roles && !item.roles.some((role) => hasRole(role))) return null;
    return item;
  }).filter(Boolean);

  const user = {
    name:
      authUser?.full_name ||
      authUser?.user_metadata?.full_name ||
      authUser?.email ||
      'Unknown User',
    role:
      roles.length > 0
        ? roles[0].replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        : 'No role assigned',
  };

  const sidebarBg = { background: '#0b1220' };
  const sharedProps = { isActive, expandedSections, toggleSection, filteredNavigation, user, signOut };

  return (
    <>
      {/* ── Desktop Sidebar ─────────────────────────────────── */}
      <aside
        className="hidden lg:flex lg:flex-col lg:w-64 h-screen fixed left-0 top-0 z-30"
        style={sidebarBg}
      >
        <SidebarContent {...sharedProps} onClose={undefined} />
      </aside>

      {/* ── Mobile Sidebar Overlay ───────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed left-0 top-0 h-screen w-72 z-50 lg:hidden overflow-hidden"
              style={sidebarBg}
            >
              <SidebarContent {...sharedProps} onClose={onClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
