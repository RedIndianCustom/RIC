// ============================================================
// ROLES & NAV SECTIONS
// Based on: Inventory_Management_System_User_Roles_and_Dashboard_Features.docx
// ============================================================

export const ROLES = {
  ADMIN:             'admin',
  MANAGER:           'manager',
  OPERATIONAL_STAFF: 'operational_staff',
  WAREHOUSE_STAFF:   'warehouse_staff',
  SALES_STAFF:       'sales_staff',
};

const ALL_ROLES = Object.values(ROLES);

// ── NAV_SECTIONS ─────────────────────────────────────────────
// Each section renders as a sidebar group.
// The sidebar filters by the current user's roles automatically.
// Document reference (RECOMMENDED DASHBOARD SIDEBAR):
//   ADMIN        – Users | Roles & Permissions | Employee Registration |
//                  Warehouses | Products | Barcode Configuration |
//                  Capacity Rules | Suppliers | Audit Logs | Settings
//   MANAGER      – Inventory | Receiving | Warehouse | Barcodes |
//                  Stock Movement | Discrepancies | Suppliers | Orders |
//                  Returns | Reports | Notifications
//   OPERATIONAL  – Suppliers | Incoming Shipments | Shipment Documents |
//                  Products | Expected Inventory | Barcode Preparation |
//                  Shipment Schedule
//   WAREHOUSE    – Receiving | Barcode Scanner | Inventory |
//                  Storage Locations | Stock Movement | Inventory Count |
//                  Discrepancies
//   SALES        – Orders | Customers | Inventory Lookup | Picking |
//                  Barcode Scanner | Acknowledgement Receipts | Returns

export const NAV_SECTIONS = [

  // ── Dashboard (all roles) ──────────────────────────────────
  {
    section: null,
    items: [
      { label: 'Dashboard', path: '/dashboard', roles: ALL_ROLES },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // ADMIN SIDEBAR
  // ══════════════════════════════════════════════════════════
  {
    section: 'System Administration',
    items: [
      { label: 'Users',                  path: '/users',               roles: [ROLES.ADMIN] },
      { label: 'Roles & Permissions',    path: '/roles',               roles: [ROLES.ADMIN] },
      { label: 'Employee Registration',  path: '/employees',           roles: [ROLES.ADMIN] },
    ],
  },
  {
    section: 'Configuration',
    items: [
      { label: 'Warehouses',             path: '/warehouses',          roles: [ROLES.ADMIN] },
      { label: 'Products',               path: '/products',            roles: [ROLES.ADMIN] },
      { label: 'Barcode Configuration',  path: '/barcode/config',      roles: [ROLES.ADMIN] },
      { label: 'Capacity Rules',         path: '/capacity-rules',      roles: [ROLES.ADMIN] },
      { label: 'Suppliers',              path: '/suppliers',           roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATIONAL_STAFF] },
    ],
  },
  {
    section: 'System',
    items: [
      { label: 'Audit Logs',             path: '/audit-logs',          roles: [ROLES.ADMIN] },
      { label: 'Settings',               path: '/settings',            roles: [ROLES.ADMIN] },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // MANAGER SIDEBAR
  // ══════════════════════════════════════════════════════════
  {
    section: 'Inventory & Warehouse',
    items: [
      { label: 'Inventory Overview',     path: '/inventory',           roles: [ROLES.MANAGER] },
      { label: 'Receiving',              path: '/receiving',           roles: [ROLES.MANAGER] },
      { label: 'Warehouse Storage',      path: '/warehouse',           roles: [ROLES.MANAGER] },
      { label: 'Barcode Monitoring',     path: '/barcodes',            roles: [ROLES.MANAGER] },
      { label: 'Stock Movement',         path: '/stock-movement',      roles: [ROLES.MANAGER] },
      { label: 'Discrepancies',          path: '/discrepancies',       roles: [ROLES.MANAGER] },
    ],
  },
  {
    section: 'Operations',
    items: [
      { label: 'Orders',                 path: '/orders',              roles: [ROLES.MANAGER] },
      { label: 'Returns / Refunds',      path: '/returns',             roles: [ROLES.MANAGER] },
      { label: 'Approval Requests',      path: '/approvals',           roles: [ROLES.MANAGER] },
    ],
  },
  {
    section: 'Reports',
    items: [
      { label: 'All Reports',            path: '/reports',             roles: [ROLES.MANAGER] },
      { label: 'Inventory Reports',      path: '/reports/inventory',   roles: [ROLES.MANAGER] },
      { label: 'Sales Reports',          path: '/reports/sales',       roles: [ROLES.MANAGER] },
      { label: 'Stock Movement',         path: '/reports/stock-movement', roles: [ROLES.MANAGER] },
      { label: 'Discrepancy Reports',    path: '/reports/discrepancies',  roles: [ROLES.MANAGER] },
      { label: 'Defect Reports',         path: '/reports/defects',     roles: [ROLES.MANAGER] },
      { label: 'Return Reports',         path: '/reports/returns',     roles: [ROLES.MANAGER] },
      { label: 'Employee Efficiency',    path: '/reports/employee-efficiency', roles: [ROLES.MANAGER] },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // OPERATIONAL STAFF SIDEBAR
  // ══════════════════════════════════════════════════════════
  {
    section: 'Shipment & Cargo',
    items: [
      { label: 'Incoming Shipments',     path: '/shipments/incoming',  roles: [ROLES.OPERATIONAL_STAFF] },
      { label: 'All Shipments',          path: '/shipments',           roles: [ROLES.OPERATIONAL_STAFF] },
      { label: 'Process Returns',        path: '/returns',             roles: [ROLES.OPERATIONAL_STAFF] },
    ],
  },
  {
    section: 'Product Catalog',
    items: [
      { label: 'Register Products',      path: '/products/register',   roles: [ROLES.OPERATIONAL_STAFF] },
      { label: 'Master Catalog',         path: '/products/list',       roles: [ROLES.OPERATIONAL_STAFF] },
      { label: 'Product Lookup',         path: '/products/search',     roles: [ROLES.OPERATIONAL_STAFF] },
    ],
  },
  {
    section: 'Barcode & Labels',
    items: [
      { label: 'Generate Barcodes',      path: '/barcode/generate',    roles: [ROLES.OPERATIONAL_STAFF] },
      { label: 'Scan Products',          path: '/barcode/scan',        roles: [ROLES.OPERATIONAL_STAFF] },
      { label: 'Print Labels',           path: '/barcode/labels',      roles: [ROLES.OPERATIONAL_STAFF] },
    ],
  },
  {
    section: 'Batch & Orders',
    items: [
      { label: 'Manage Batches',         path: '/batches',             roles: [ROLES.OPERATIONAL_STAFF] },
      { label: 'Waybills & Docs',        path: '/waybill',             roles: [ROLES.OPERATIONAL_STAFF] },
      { label: 'Order Processing',       path: '/orders',              roles: [ROLES.OPERATIONAL_STAFF] },
    ],
  },
  {
    section: 'Inventory',
    items: [
      { label: 'Warehouse Locations',    path: '/warehouse',           roles: [ROLES.OPERATIONAL_STAFF] },
      { label: 'Expected Inventory',     path: '/expected-inventory',  roles: [ROLES.OPERATIONAL_STAFF] },
      { label: 'Inventory Update',       path: '/inventory/update',    roles: [ROLES.OPERATIONAL_STAFF] },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // WAREHOUSE STAFF SIDEBAR
  // ══════════════════════════════════════════════════════════
  {
    section: 'Warehouse Operations',
    items: [
      { label: 'Receiving',              path: '/receiving',           roles: [ROLES.WAREHOUSE_STAFF] },
      { label: 'Barcode Scanner',        path: '/barcode/scan',        roles: [ROLES.WAREHOUSE_STAFF] },
      { label: 'Inventory',              path: '/inventory',           roles: [ROLES.WAREHOUSE_STAFF] },
      { label: 'Storage Locations',      path: '/warehouse',           roles: [ROLES.WAREHOUSE_STAFF] },
      { label: 'Stock Movement',         path: '/stock-movement',      roles: [ROLES.WAREHOUSE_STAFF] },
      { label: 'Inventory Count',        path: '/inventory/count',     roles: [ROLES.WAREHOUSE_STAFF] },
      { label: 'Discrepancies',          path: '/discrepancies',       roles: [ROLES.WAREHOUSE_STAFF] },
      { label: 'Location Lookup',        path: '/location-lookup',     roles: [ROLES.WAREHOUSE_STAFF] },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // SALES STAFF SIDEBAR
  // ══════════════════════════════════════════════════════════
  {
    section: 'Sales',
    items: [
      { label: 'Orders',                 path: '/orders',              roles: [ROLES.SALES_STAFF] },
      { label: 'Customers',              path: '/customers',           roles: [ROLES.SALES_STAFF] },
      { label: 'Inventory Lookup',       path: '/inventory/lookup',    roles: [ROLES.SALES_STAFF] },
      { label: 'Picking',                path: '/picking',             roles: [ROLES.SALES_STAFF] },
      { label: 'Barcode Scanner',        path: '/barcode/scan',        roles: [ROLES.SALES_STAFF] },
      { label: 'Acknowledgement Receipts', path: '/receipts',          roles: [ROLES.SALES_STAFF] },
      { label: 'Returns',                path: '/returns',             roles: [ROLES.SALES_STAFF] },
    ],
  },
];

// Flat list — used by route guards and dashboard quick-links
export const NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);
