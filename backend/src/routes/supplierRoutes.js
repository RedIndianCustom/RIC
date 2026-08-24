import express from 'express';
import * as supplierController from '../controllers/supplierController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

// All supplier routes require authentication
router.use(authenticate);

router.get('/',
  authorize('admin', 'manager', 'operational_staff', 'warehouse_staff', 'sales_staff'),
  supplierController.getSuppliers
);

router.get('/:id',
  authorize('admin', 'manager', 'operational_staff', 'warehouse_staff', 'sales_staff'),
  supplierController.getSupplierById
);

router.post('/',
  authorize('admin', 'manager', 'operational_staff'),
  supplierController.createSupplier
);

router.put('/:id',
  authorize('admin', 'manager', 'operational_staff'),
  supplierController.updateSupplier
);

router.delete('/:id',
  authorize('admin', 'manager', 'operational_staff'),
  supplierController.deleteSupplier
);

export default router;
