import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import RoleRoute from './RoleRoute.jsx';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import { ROLES } from '../utils/permissions.js';

// ── Public ────────────────────────────────────────────────────
import Landing       from '../pages/public/Landing.jsx';
import Login         from '../pages/public/Login.jsx';
import SignUp        from '../pages/public/SignUp.jsx';
import ResetPassword from '../pages/public/ResetPassword.jsx';
import TraceabilityView from '../pages/public/TraceabilityView.jsx';
import Traceability from '../pages/public/Traceability.jsx';

// ── Common ────────────────────────────────────────────────────
import Dashboard from '../pages/dashboard/Dashboard.jsx';

// ── Admin ─────────────────────────────────────────────────────
import UserManagement      from '../pages/dashboard/UserManagement.jsx';
import RoleManagement      from '../pages/dashboard/admin/RoleManagement.jsx';
import EmployeeRegistration from '../pages/dashboard/admin/EmployeeRegistration.jsx';
import Warehouses          from '../pages/dashboard/admin/Warehouses.jsx';
import ProductManagement   from '../pages/dashboard/admin/ProductManagement.jsx';
import BarcodeConfig       from '../pages/dashboard/admin/BarcodeConfig.jsx';
import CapacityRules       from '../pages/dashboard/admin/CapacityRules.jsx';
import AuditLogs           from '../pages/dashboard/admin/AuditLogs.jsx';
import SystemSettings      from '../pages/dashboard/admin/SystemSettings.jsx';

// ── Manager ───────────────────────────────────────────────────
import BarcodeMonitoring   from '../pages/dashboard/manager/BarcodeMonitoring.jsx';
import ApprovalRequests    from '../pages/dashboard/manager/ApprovalRequests.jsx';
import DiscrepancyApproval from '../pages/dashboard/manager/DiscrepancyApproval.jsx';
import QCApproval          from '../pages/dashboard/manager/QCApproval.jsx';
import AllReports          from '../pages/dashboard/manager/AllReports.jsx';
import InventoryReports    from '../pages/dashboard/manager/InventoryReports.jsx';
import SalesReports        from '../pages/dashboard/manager/SalesReports.jsx';
import StockMovementReports from '../pages/dashboard/manager/StockMovementReports.jsx';
import DiscrepancyReports  from '../pages/dashboard/manager/DiscrepancyReports.jsx';
import DefectReports       from '../pages/dashboard/manager/DefectReports.jsx';
import ReturnReports       from '../pages/dashboard/manager/ReturnReports.jsx';
import EmployeeEfficiency  from '../pages/dashboard/manager/EmployeeEfficiency.jsx';

// ── Operational Staff ─────────────────────────────────────────
import ShipmentRegistrationEnhanced from '../pages/dashboard/operational/ShipmentRegistrationEnhanced.jsx';
import ShipmentDocuments   from '../pages/dashboard/operational/ShipmentDocuments.jsx';
import ShipmentSchedule    from '../pages/dashboard/operational/ShipmentSchedule.jsx';
import ProductsList        from '../pages/dashboard/operational/ProductsList.jsx';
import ProductRegistration from '../pages/dashboard/operational/ProductRegistration.jsx';
import ExpectedInventory   from '../pages/dashboard/operational/ExpectedInventory.jsx';
import BarcodePreparation  from '../pages/dashboard/operational/BarcodePreparation.jsx';
import BarcodeGeneration   from '../pages/dashboard/operational/BarcodeGeneration.jsx';
import RelocateInventory   from '../pages/dashboard/operational/RelocateInventory.jsx';
import BatchManagement     from '../pages/dashboard/operational/BatchManagement.jsx';
import InventoryRegistration from '../pages/dashboard/operational/InventoryRegistration.jsx';
import InventoryUpdate     from '../pages/dashboard/operational/InventoryUpdate.jsx';
import OrderManagement     from '../pages/dashboard/operational/OrderManagement.jsx';
import PackingSlip         from '../pages/dashboard/operational/PackingSlip.jsx';
import ReturnProcessing    from '../pages/dashboard/operational/ReturnProcessing.jsx';
import Waybill             from '../pages/dashboard/operational/Waybill.jsx';
import ScanBarcode         from '../pages/dashboard/operational/ScanBarcode.jsx';

// ── Warehouse Staff ───────────────────────────────────────────
import Receiving           from '../pages/dashboard/warehouse/Receiving.jsx';
import ReceivingEnhanced   from '../pages/dashboard/warehouse/ReceivingEnhanced.jsx';
import ReceivingWithScanningEnhanced from '../pages/dashboard/warehouse/ReceivingWithScanningEnhanced.jsx';
import ScanProducts        from '../pages/dashboard/warehouse/ScanProducts.jsx';
import ScanProductsEnhanced from '../pages/dashboard/warehouse/ScanProductsEnhanced.jsx';
import QCInspectionEnhanced from '../pages/dashboard/warehouse/QCInspectionEnhanced.jsx';
import InventoryCount      from '../pages/dashboard/warehouse/InventoryCount.jsx';
import LocationLookup      from '../pages/dashboard/warehouse/LocationLookup.jsx';
import Inspection          from '../pages/dashboard/warehouse/Inspection.jsx';
import Picking             from '../pages/dashboard/warehouse/Picking.jsx';
import FifoPicking         from '../pages/dashboard/warehouse/FifoPicking.jsx';
import PickingDiscrepancy  from '../pages/dashboard/warehouse/PickingDiscrepancy.jsx';
import Packing             from '../pages/dashboard/warehouse/Packing.jsx';
import WaybillAttachment   from '../pages/dashboard/warehouse/WaybillAttachment.jsx';
import EfficiencyReport    from '../pages/dashboard/warehouse/EfficiencyReport.jsx';

// ── Sales Staff ───────────────────────────────────────────────
import Customer            from '../pages/dashboard/sales/Customer.jsx';
import SalesOrders         from '../pages/dashboard/sales/SalesOrders.jsx';
import WalkInSales         from '../pages/dashboard/sales/WalkInSales.jsx';
import InventoryLookup     from '../pages/dashboard/sales/InventoryLookup.jsx';
import Receipt             from '../pages/dashboard/sales/Receipt.jsx';
import ReturnVerification  from '../pages/dashboard/sales/ReturnVerification.jsx';
import Invoice             from '../pages/dashboard/sales/Invoice.jsx';
import Payment             from '../pages/dashboard/sales/Payment.jsx';
import ProductRelease      from '../pages/dashboard/sales/ProductRelease.jsx';
import Refund              from '../pages/dashboard/sales/Refund.jsx';

// ── Shared (multi-role) ───────────────────────────────────────
import IncomingShipmentsEnhanced from '../pages/dashboard/operational/IncomingShipmentsEnhanced.jsx';
import WarehouseLocations  from '../pages/dashboard/shared/WarehouseLocations.jsx';
import StockMovement       from '../pages/dashboard/shared/StockMovement.jsx';
import Discrepancies       from '../pages/dashboard/shared/Discrepancies.jsx';
import Orders              from '../pages/dashboard/shared/Orders.jsx';
import Returns             from '../pages/dashboard/shared/Returns.jsx';
import Suppliers           from '../pages/dashboard/shared/Suppliers.jsx';
import PurchaseOrders      from '../pages/dashboard/shared/PurchaseOrders.jsx';
import Inventory           from '../pages/dashboard/admin/Inventory.jsx';

// ── Shorthand role constants ──────────────────────────────────
const A  = ROLES.ADMIN;
const M  = ROLES.MANAGER;
const OP = ROLES.OPERATIONAL_STAFF;
const WH = ROLES.WAREHOUSE_STAFF;
const SA = ROLES.SALES_STAFF;

export default function AppRoutes() {
  return (
    <Routes>

      {/* ── Public ─────────────────────────────────────────── */}
      <Route path="/"               element={<Landing />} />
      <Route path="/login"          element={<Login />} />
      <Route path="/signup"         element={<SignUp />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/trace/:barcodeValue" element={<Traceability />} />

      {/* ── Protected dashboard ────────────────────────────── */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>

          {/* Dashboard — all roles */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* ══════════════════════════════════════════════════
              ADMIN
          ═══════════════════════════════════════════════════ */}
          <Route element={<RoleRoute allowed={[A]} />}>
            <Route path="/users"           element={<UserManagement />} />
            <Route path="/roles"           element={<RoleManagement />} />
            <Route path="/employees"       element={<EmployeeRegistration />} />
            <Route path="/warehouses"      element={<Warehouses />} />
            <Route path="/products"        element={<ProductManagement />} />
            <Route path="/barcode/config"  element={<BarcodeConfig />} />
            <Route path="/capacity-rules"  element={<CapacityRules />} />
            <Route path="/audit-logs"      element={<AuditLogs />} />
            <Route path="/settings"        element={<SystemSettings />} />
          </Route>

          {/* ══════════════════════════════════════════════════
              MANAGER
          ═══════════════════════════════════════════════════ */}
          <Route element={<RoleRoute allowed={[M, A]} />}>
            <Route path="/barcodes"                      element={<BarcodeMonitoring />} />
            <Route path="/approvals"                     element={<ApprovalRequests />} />
            <Route path="/manager/discrepancy-approval"  element={<DiscrepancyApproval />} />
            <Route path="/manager/qc-approval"           element={<QCApproval />} />
            <Route path="/reports"                       element={<AllReports />} />
            <Route path="/reports/inventory"             element={<InventoryReports />} />
            <Route path="/reports/sales"                 element={<SalesReports />} />
            <Route path="/reports/stock-movement"        element={<StockMovementReports />} />
            <Route path="/reports/discrepancies"         element={<DiscrepancyReports />} />
            <Route path="/reports/defects"               element={<DefectReports />} />
            <Route path="/reports/returns"               element={<ReturnReports />} />
            <Route path="/reports/employee-efficiency"   element={<EmployeeEfficiency />} />
          </Route>

          {/* ══════════════════════════════════════════════════
              OPERATIONAL STAFF
          ═══════════════════════════════════════════════════ */}
          <Route element={<RoleRoute allowed={[OP, A]} />}>
            <Route path="/shipments"                    element={<ShipmentRegistrationEnhanced />} />
            <Route path="/shipments/register"           element={<ShipmentRegistrationEnhanced />} />
            <Route path="/shipments/register-enhanced"  element={<ShipmentRegistrationEnhanced />} />
            <Route path="/operational/incoming-shipments-enhanced" element={<IncomingShipmentsEnhanced />} />
            <Route path="/shipments/documents"          element={<ShipmentDocuments />} />
            <Route path="/shipments/schedule"           element={<ShipmentSchedule />} />
            <Route path="/products"                     element={<ProductsList />} />
            <Route path="/products/list"                element={<ProductsList />} />
            <Route path="/products/register"            element={<ProductRegistration />} />
            <Route path="/products/catalog"             element={<ProductsList />} />
            <Route path="/products/lookup"              element={<ProductsList />} />
            <Route path="/products/search"              element={<ProductsList />} />
            <Route path="/expected-inventory"           element={<ExpectedInventory />} />
            <Route path="/barcode/prepare"              element={<BarcodePreparation />} />
            <Route path="/barcode/generate"             element={<BarcodeGeneration />} />
            <Route path="/barcode/labels"               element={<BarcodeGeneration />} />
            <Route path="/barcode/print"                element={<BarcodeGeneration />} />
            <Route path="/inventory/relocate"           element={<RelocateInventory />} />
            <Route path="/batches"                      element={<BatchManagement />} />
            <Route path="/batches/manage"               element={<BatchManagement />} />
            <Route path="/batches/waybills"             element={<Waybill />} />
            <Route path="/orders/process"               element={<OrderManagement />} />
            <Route path="/inventory/register"           element={<InventoryRegistration />} />
            <Route path="/inventory/update"             element={<InventoryUpdate />} />
            <Route path="/packing-slip"                 element={<PackingSlip />} />
            <Route path="/returns/process"              element={<ReturnProcessing />} />
            <Route path="/waybill"                      element={<Waybill />} />
            <Route path="/waybills"                     element={<Waybill />} />
          </Route>

          {/* ══════════════════════════════════════════════════
              SHARED: OPERATIONAL + WAREHOUSE STAFF
              (Scanning, Returns, Physical Operations)
          ═══════════════════════════════════════════════════ */}
          <Route element={<RoleRoute allowed={[OP, WH, A]} />}>
            <Route path="/barcode/scan-returns" element={<ScanBarcode />} />
            <Route path="/scan-barcode"         element={<ScanBarcode />} />
          </Route>

          {/* ══════════════════════════════════════════════════
              WAREHOUSE STAFF
          ═══════════════════════════════════════════════════ */}
          <Route element={<RoleRoute allowed={[WH, M, A]} />}>
            <Route path="/receiving"                    element={<ReceivingEnhanced />} />
            <Route path="/warehouse/receiving-enhanced" element={<ReceivingWithScanningEnhanced />} />
            <Route path="/warehouse/qc-inspection"      element={<QCInspectionEnhanced />} />
            <Route path="/warehouse/scan"               element={<ScanProductsEnhanced />} />
            <Route path="/scan-products"                element={<ScanProductsEnhanced />} />
            <Route path="/inspection"                   element={<Inspection />} />
            <Route path="/packing"                      element={<Packing />} />
            <Route path="/picking/fifo"                 element={<FifoPicking />} />
            <Route path="/picking/discrepancy"          element={<PickingDiscrepancy />} />
            <Route path="/waybill/attach"               element={<WaybillAttachment />} />
            <Route path="/warehouse/efficiency-report"  element={<EfficiencyReport />} />
          </Route>

          <Route element={<RoleRoute allowed={[WH, A]} />}>
            <Route path="/inventory/count"  element={<InventoryCount />} />
            <Route path="/location-lookup"  element={<LocationLookup />} />
          </Route>

          {/* ══════════════════════════════════════════════════
              SALES STAFF
          ═══════════════════════════════════════════════════ */}
          <Route element={<RoleRoute allowed={[SA, M, A]} />}>
            <Route path="/customers"         element={<Customer />} />
            <Route path="/sales/orders"      element={<SalesOrders />} />
            <Route path="/sales/walk-in"     element={<WalkInSales />} />
            <Route path="/inventory/lookup"  element={<InventoryLookup />} />
            <Route path="/receipts"          element={<Receipt />} />
            <Route path="/returns/verify"    element={<ReturnVerification />} />
            <Route path="/invoices"          element={<Invoice />} />
            <Route path="/payments"          element={<Payment />} />
            <Route path="/product-release"   element={<ProductRelease />} />
            <Route path="/refunds"           element={<Refund />} />
          </Route>

          {/* ══════════════════════════════════════════════════
              SHARED — multiple roles per document permission matrix
          ═══════════════════════════════════════════════════ */}

          {/* Incoming Shipments: Manager(view) | Operational(full) | Warehouse(view) */}
          <Route element={<RoleRoute allowed={[M, OP, WH, A]} />}>
            <Route path="/shipments/incoming" element={<IncomingShipmentsEnhanced />} />
          </Route>

          {/* Process Returns: Operational(full) - Enhanced returns processing page */}
          <Route element={<RoleRoute allowed={[OP, A]} />}>
            <Route path="/shipments/returns" element={<Returns />} />
          </Route>

          {/* Inventory: Admin(full) | Manager(view) | Warehouse(view) | Operational(view) */}
          <Route element={<RoleRoute allowed={[A, M, WH, OP]} />}>
            <Route path="/inventory" element={<Inventory />} />
          </Route>

          {/* Warehouse / Storage Locations: Admin | Manager | Warehouse | Operational */}
          <Route element={<RoleRoute allowed={[A, M, WH, OP]} />}>
            <Route path="/warehouse" element={<WarehouseLocations />} />
          </Route>

          {/* Stock Movement: Manager(approve) | Warehouse(full) */}
          <Route element={<RoleRoute allowed={[M, WH, A]} />}>
            <Route path="/stock-movement" element={<StockMovement />} />
          </Route>

          {/* Discrepancies: Manager(approve) | Warehouse(create) | Operational(create) */}
          <Route element={<RoleRoute allowed={[M, WH, OP, A]} />}>
            <Route path="/discrepancies" element={<Discrepancies />} />
          </Route>

          {/* Picking: Warehouse Staff (physical) | Sales Staff (monitoring) */}
          <Route element={<RoleRoute allowed={[WH, SA, M, A]} />}>
            <Route path="/picking" element={<Picking />} />
          </Route>

          {/* Orders: Manager(view) | Operational(view) | Sales(full) */}
          <Route element={<RoleRoute allowed={[M, OP, SA, A]} />}>
            <Route path="/orders" element={<Orders />} />
          </Route>

          {/* Returns: Manager(approve) | Warehouse(inspect) | Sales(create) | Operational(process) */}
          <Route element={<RoleRoute allowed={[M, WH, SA, OP, A]} />}>
            <Route path="/returns" element={<Returns />} />
          </Route>

          {/* Barcode Scanner: Warehouse(full) | Sales(verify) | Operational(monitoring) */}
          <Route element={<RoleRoute allowed={[WH, SA, OP, A]} />}>
            <Route path="/barcode/scan" element={<ScanBarcode />} />
          </Route>

          {/* Suppliers: Admin(full) | Manager(full) | Operational(full) | Sales/Warehouse(view) */}
          <Route element={<RoleRoute allowed={[A, M, OP, WH, SA]} />}>
            <Route path="/suppliers" element={<Suppliers />} />
          </Route>

          {/* Purchase Orders: Admin | Manager | Operational Staff */}
          <Route element={<RoleRoute allowed={[A, M, OP]} />}>
            <Route path="/purchase-orders" element={<PurchaseOrders />} />
          </Route>

        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
