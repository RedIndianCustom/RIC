/**
 * ============================================================================
 * WAREHOUSE ROUTES
 * ============================================================================
 */

import express from 'express';
import {
  getWarehouses,
  getRacks,
  getRackLocations,
  relocateInventoryUnit,
  scanInventoryUnit,
  getRackCapacity,
  validateBarcodeSize
} from '../controllers/warehouseController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

// ============================================================================
// PUBLIC ROUTES (for warehouse staff scanning)
// ============================================================================

// Scan barcode (read-only for warehouse staff)
router.get('/inventory/scan/:barcode_value', authenticate, scanInventoryUnit);

// Validate barcode matches expected size during receiving
router.post('/warehouse/validate-barcode-size', authenticate, validateBarcodeSize);

// ============================================================================
// AUTHENTICATED ROUTES
// ============================================================================

// Get warehouses
router.get('/warehouses', authenticate, getWarehouses);

// Get racks
router.get('/racks', authenticate, getRacks);

// Get rack locations
router.get('/rack-locations', authenticate, getRackLocations);

// Get rack capacity usage (for barcode generation)
router.get('/warehouses/:warehouseId/racks/:rackId/capacity', authenticate, getRackCapacity);

// ============================================================================
// OPERATIONAL STAFF & MANAGER ONLY
// ============================================================================

// Relocate inventory (operational staff and manager only)
router.post(
  '/inventory/relocate',
  authenticate,
  requireRole('operational_staff', 'manager'),
  relocateInventoryUnit
);

export default router;
