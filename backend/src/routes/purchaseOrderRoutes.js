import express from 'express';
import * as purchaseOrderController from '../controllers/purchaseOrderController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

// All purchase order routes require authentication
router.use(authenticate);

// Get all purchase orders
router.get('/',
  authorize('admin', 'manager', 'operational_staff', 'warehouse_staff'),
  purchaseOrderController.getPurchaseOrders
);

// Get single purchase order with items
router.get('/:id',
  authorize('admin', 'manager', 'operational_staff', 'warehouse_staff'),
  purchaseOrderController.getPurchaseOrderById
);

// Get items for a purchase order
router.get('/:id/items',
  authorize('admin', 'manager', 'operational_staff', 'warehouse_staff'),
  purchaseOrderController.getPurchaseOrderItems
);

// Create purchase order
router.post('/',
  authorize('admin', 'manager', 'operational_staff'),
  purchaseOrderController.createPurchaseOrder
);

// Update purchase order
router.put('/:id',
  authorize('admin', 'manager', 'operational_staff'),
  purchaseOrderController.updatePurchaseOrder
);

// Delete purchase order
router.delete('/:id',
  authorize('admin', 'manager'),
  purchaseOrderController.deletePurchaseOrder
);

export default router;
