/**
 * ============================================================================
 * BARCODE ROUTES
 * ============================================================================
 * API endpoints for barcode generation and traceability
 * ============================================================================
 */

import express from 'express';
import {
  createBarcodeController,
  getBarcodesController,
  getBarcodeConfigController,
  getTraceabilityController,
  deactivateBarcodeController,
  deleteBarcodeController,
  bulkDeleteBarcodesController
} from '../controllers/barcodeController.js';

const router = express.Router();

/**
 * GET /api/barcodes/config
 * Get barcode configuration
 */
router.get('/config', getBarcodeConfigController);

/**
 * GET /api/barcodes
 * List barcodes with traceability info
 */
router.get('/', getBarcodesController);

/**
 * POST /api/barcodes
 * Generate new barcodes
 */
router.post('/', createBarcodeController);

/**
 * GET /api/barcodes/trace/:barcodeValue
 * Get traceability chain for QR code scanning
 */
router.get('/trace/:barcodeValue', getTraceabilityController);

/**
 * PATCH /api/barcodes/:id/deactivate
 * Deactivate a barcode (soft delete)
 */
router.patch('/:id/deactivate', deactivateBarcodeController);

/**
 * POST /api/barcodes/bulk-delete
 * Delete multiple barcodes at once
 */
router.post('/bulk-delete', bulkDeleteBarcodesController);
router.delete('/bulk', bulkDeleteBarcodesController);

/**
 * DELETE /api/barcodes/:id
 * Delete a barcode (hard delete)
 */
router.delete('/:id', deleteBarcodeController);

export default router;
