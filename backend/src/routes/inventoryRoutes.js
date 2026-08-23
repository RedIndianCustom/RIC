/**
 * ============================================================================
 * INVENTORY ROUTES
 * ============================================================================
 * Routes for inventory unit operations
 * ============================================================================
 */

import express from 'express';
import {
  updateInventoryUnitStatus,
  getInventoryUnit,
  getInventoryUnits
} from '../controllers/inventoryController.js';

const router = express.Router();

/**
 * GET /api/inventory-units
 * Get all inventory units with optional filtering
 */
router.get('/', getInventoryUnits);

/**
 * GET /api/inventory-units/:id
 * Get a single inventory unit by ID
 */
router.get('/:id', getInventoryUnit);

/**
 * PATCH /api/inventory-units/:id/status
 * Update inventory unit status (for returns, moves, etc.)
 */
router.patch('/:id/status', updateInventoryUnitStatus);

export default router;
