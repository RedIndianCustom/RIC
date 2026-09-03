/**
 * ============================================================================
 * SCAN-DRIVEN RECEIVING ROUTES
 * ============================================================================
 */

import express from 'express';
import {
  identifyBarcodeProduct,
  startReceivingSession,
  submitReceivingReport,
  validateBarcodeSize
} from '../controllers/receivingScanDrivenController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// POST /api/warehouse/receiving/identify-barcode
// Identify product from barcode - core scan validation
router.post('/identify-barcode', identifyBarcodeProduct);

// POST /api/warehouse/receiving/start-session
// Start a receiving session for a shipment
router.post('/start-session', startReceivingSession);

// POST /api/warehouse/receiving/submit-report
// Submit receiving report (with or without discrepancies)
router.post('/submit-report', submitReceivingReport);

// POST /api/warehouse/validate-barcode-size
// Validate barcode matches expected size
router.post('/validate-barcode-size', validateBarcodeSize);

export default router;
