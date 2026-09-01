/**
 * ============================================================================
 * INVENTORY ADVANCED FEATURES ROUTES
 * ============================================================================
 * Routes for low stock alerts, bulk operations, analytics, movement history
 * ============================================================================
 */

import express from 'express';
import {
  getLowStockAlerts,
  getLowStockThresholds,
  createLowStockThreshold,
  updateLowStockThreshold,
  getStockMovements,
  createStockMovement,
  bulkUpdateInventory,
  getBulkOperations,
  getInventoryAnalytics,
  getDashboardStats
} from '../controllers/inventoryAdvancedController.js';

const router = express.Router();

// ──────────────────────────────────────────────────────────────────────────
// LOW STOCK ALERTS
// ──────────────────────────────────────────────────────────────────────────

/**
 * GET /api/inventory/low-stock-alerts
 * Get all products with stock below threshold
 */
router.get('/low-stock-alerts', getLowStockAlerts);

/**
 * GET /api/inventory/low-stock-thresholds
 * Get configured thresholds
 */
router.get('/low-stock-thresholds', getLowStockThresholds);

/**
 * POST /api/inventory/low-stock-thresholds
 * Create new threshold configuration
 */
router.post('/low-stock-thresholds', createLowStockThreshold);

/**
 * PATCH /api/inventory/low-stock-thresholds/:id
 * Update existing threshold
 */
router.patch('/low-stock-thresholds/:id', updateLowStockThreshold);

// ──────────────────────────────────────────────────────────────────────────
// STOCK MOVEMENT HISTORY
// ──────────────────────────────────────────────────────────────────────────

/**
 * GET /api/inventory/movements
 * Get stock movement history
 * Query params: product_id, warehouse_id, days, limit
 */
router.get('/movements', getStockMovements);

/**
 * POST /api/inventory/movements
 * Manually log a stock movement
 */
router.post('/movements', createStockMovement);

// ──────────────────────────────────────────────────────────────────────────
// BULK OPERATIONS
// ──────────────────────────────────────────────────────────────────────────

/**
 * POST /api/inventory/bulk-update
 * Bulk update inventory units (status, location, etc.)
 * Body: { inventory_unit_ids: [], updates: {} }
 */
router.post('/bulk-update', bulkUpdateInventory);

/**
 * GET /api/inventory/bulk-operations
 * Get bulk operation history
 */
router.get('/bulk-operations', getBulkOperations);

// ──────────────────────────────────────────────────────────────────────────
// ANALYTICS & DASHBOARD
// ──────────────────────────────────────────────────────────────────────────

/**
 * GET /api/inventory/analytics
 * Get comprehensive inventory analytics and trends
 * Query params: warehouse_id, period, days
 */
router.get('/analytics', getInventoryAnalytics);

/**
 * GET /api/inventory/dashboard-stats
 * Get quick statistics for dashboard
 * Query params: warehouse_id
 */
router.get('/dashboard-stats', getDashboardStats);

export default router;
