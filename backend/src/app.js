import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/environment.js';
import { notFoundHandler, errorHandler } from './middleware/errorMiddleware.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import roleRoutes from './routes/roleRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import warehouseRoutes from './routes/warehouseRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import purchaseOrderRoutes from './routes/purchaseOrderRoutes.js';
import productRoutes from './routes/productRoutes.js';
import capacityRuleRoutes from './routes/capacityRuleRoutes.js';
import barcodeRoutes from './routes/barcodeRoutes.js';
import traceabilityRoutes from './routes/traceabilityRoutes.js';
import auditLogRoutes from './routes/auditLogRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import shipmentRoutes from './routes/shipmentRoutes.js';
import batchRoutes from './routes/batchRoutes.js';
import warehouseLocationRoutes from './routes/warehouseLocationRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import inventoryAdvancedRoutes from './routes/inventoryAdvancedRoutes.js';
import warehouseOperationsRoutes from './routes/warehouseOperationsRoutes.js';
import receivingQcRoutes from './routes/receivingQcRoutes.js';
import receivingRoutes from './routes/receiving.js';
import receivingScanDrivenRoutes from './routes/receivingScanDrivenRoutes.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json());
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

app.get('/health', (req, res) => res.json({ status: 'ok', env: env.nodeEnv }));

// Authentication & Authorization
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/employees', employeeRoutes);

// Dashboard
app.use('/api/dashboard', dashboardRoutes);

// Master Product & Tire Catalog
app.use('/api/products', productRoutes);

// Warehouse Operations & Facilities
app.use('/api', warehouseRoutes);

// Capacity Rules & Barcodes
app.use('/api/capacity-rules', capacityRuleRoutes);
app.use('/api/barcodes', barcodeRoutes);
app.use('/api/traceability', traceabilityRoutes);

// Inventory Units
app.use('/api/inventory-units', inventoryRoutes);

// Inventory Advanced Features (Low Stock, Analytics, Bulk Operations)
app.use('/api/inventory', inventoryAdvancedRoutes);

// Warehouse Operations (Receiving, Picking, Packing, Inspection, Counting)
app.use('/api/warehouse', warehouseOperationsRoutes);

// Enhanced Receiving & QC Inspection Workflow
app.use('/api/receiving-qc', receivingQcRoutes);

// Receiving Workflow (Size-by-size receiving, Manager Approval, QC Batch Creation)
app.use('/api/receiving', receivingRoutes);

// Scan-Driven Receiving Workflow (Automatic product identification from barcodes)
app.use('/api/warehouse/receiving', receivingScanDrivenRoutes);

// Orders & Returns
// Returns are sub-paths of orders: GET /api/orders/returns, POST /api/orders/returns
app.use('/api/orders', orderRoutes);

// Suppliers & Purchase Orders
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);

// Shipments & Batches
app.use('/api/shipments', shipmentRoutes);
app.use('/api/batches', batchRoutes);

// Warehouse Locations & Notifications
app.use('/api/warehouse-locations', warehouseLocationRoutes);
app.use('/api/notifications', notificationRoutes);

// System Settings & Audit Logs
app.use('/api/settings', settingsRoutes);
app.use('/api/audit-logs', auditLogRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
