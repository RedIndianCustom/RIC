/**
 * ============================================================================
 * WAREHOUSE OPERATIONS ROUTES
 * ============================================================================
 * All routes for warehouse staff operations
 * ============================================================================
 */

import express from 'express';
import {
  getDashboardStats,
  getIncomingShipments,
  getShipmentDetails,
  startReceiving,
  completeReceiving,
  scanBarcode,
  lookupLocation,
  getPickingTasks,
  getPickingTaskDetails,
  pickItem,
  getPackingTasks,
  completePacking,
  getInspectionQueue,
  createInspection,
  getCountSessions,
  createCountSession,
  recordCount,
  getPerformanceStats
} from '../controllers/warehouseOperationsController.js';

const router = express.Router();

// ──────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ──────────────────────────────────────────────────────────────────────────
router.get('/dashboard', getDashboardStats);

// ──────────────────────────────────────────────────────────────────────────
// RECEIVING
// ──────────────────────────────────────────────────────────────────────────
router.get('/receiving', getIncomingShipments);
router.get('/receiving/:id', getShipmentDetails);
router.post('/receiving/:id/start', startReceiving);
router.post('/receiving/:id/complete', completeReceiving);

// ──────────────────────────────────────────────────────────────────────────
// SCANNING & LOCATION
// ──────────────────────────────────────────────────────────────────────────
router.get('/scan/:barcode', scanBarcode);
router.get('/location/lookup', lookupLocation);

// ──────────────────────────────────────────────────────────────────────────
// PICKING
// ──────────────────────────────────────────────────────────────────────────
router.get('/picking/tasks', getPickingTasks);
router.get('/picking/:id', getPickingTaskDetails);
router.post('/picking/:id/pick', pickItem);

// ──────────────────────────────────────────────────────────────────────────
// PACKING
// ──────────────────────────────────────────────────────────────────────────
router.get('/packing/tasks', getPackingTasks);
router.post('/packing/:id/complete', completePacking);

// ──────────────────────────────────────────────────────────────────────────
// INSPECTION
// ──────────────────────────────────────────────────────────────────────────
router.get('/inspection/queue', getInspectionQueue);
router.post('/inspection', createInspection);

// ──────────────────────────────────────────────────────────────────────────
// INVENTORY COUNTING
// ──────────────────────────────────────────────────────────────────────────
router.get('/count/sessions', getCountSessions);
router.post('/count/sessions', createCountSession);
router.post('/count/record', recordCount);

// ──────────────────────────────────────────────────────────────────────────
// PERFORMANCE
// ──────────────────────────────────────────────────────────────────────────
router.get('/performance', getPerformanceStats);

export default router;
