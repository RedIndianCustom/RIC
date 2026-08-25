import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';
import * as warehouseLocationController from '../controllers/warehouseLocationController.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// GET - All roles can view locations
router.get('/',         authorize('admin', 'manager', 'operational_staff', 'warehouse_staff', 'sales_staff'),
  warehouseLocationController.getWarehouseLocations);

router.get('/available', authorize('admin', 'manager', 'operational_staff', 'warehouse_staff', 'sales_staff'),
  warehouseLocationController.getAvailableLocations);

router.get('/:id',      authorize('admin', 'manager', 'operational_staff', 'warehouse_staff', 'sales_staff'),
  warehouseLocationController.getWarehouseLocationById);

// POST - Admin, Manager, Operational Staff can create
router.post('/',        authorize('admin', 'manager', 'operational_staff'),
  warehouseLocationController.createWarehouseLocation);

// PUT - Admin, Manager, Operational Staff can update
router.put('/:id',      authorize('admin', 'manager', 'operational_staff'),
  warehouseLocationController.updateWarehouseLocation);

// DELETE - Admin and Manager only
router.delete('/:id',   authorize('admin', 'manager'),
  warehouseLocationController.deleteWarehouseLocation);

// Assign batch - Admin, Manager, Operational Staff
router.post('/assign-batch', authorize('admin', 'manager', 'operational_staff'),
  warehouseLocationController.assignBatchToLocation);

// Get storage positions for a rack - All roles can view
router.get('/:id/positions', authorize('admin', 'manager', 'operational_staff', 'warehouse_staff', 'sales_staff'),
  warehouseLocationController.getStoragePositions);

// Update storage position (assign/update tire) - Admin, Manager, Operational Staff
router.put('/:id/positions/:positionId', authorize('admin', 'manager', 'operational_staff'),
  warehouseLocationController.updateStoragePosition);

export default router;
