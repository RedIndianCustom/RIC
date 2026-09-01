/**
 * ============================================================================
 * RECEIVING ROUTES
 * ============================================================================
 * Routes for the new size-by-size receiving workflow
 * ============================================================================
 */

import express from 'express';
import {
  submitReceivingReport,
  getPendingApprovals,
  approveReceivingReport,
  getApprovalHistory,
  getReceivingReport,
  getReceivingReports
} from '../controllers/receivingController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/receiving/submit-report
 * Submit a receiving report with discrepancies for manager approval
 * Body: { shipment_id, size_breakdown, total_expected, total_scanned, total_discrepancy, notes, scan_details }
 */
router.post('/submit-report', submitReceivingReport);

/**
 * GET /api/receiving/pending-approvals
 * Get all pending receiving reports awaiting manager approval
 * Access: Managers and Admins only
 */
router.get('/pending-approvals', getPendingApprovals);

/**
 * POST /api/receiving/approve/:reportId
 * Approve or reject a receiving report
 * Body: { decision: 'APPROVED' | 'REJECTED', decision_notes }
 * Access: Managers and Admins only
 * Note: Auto-creates QC batch if approved
 */
router.post('/approve/:reportId', approveReceivingReport);

/**
 * GET /api/receiving/history/:shipmentId
 * Get full approval history for a shipment
 */
router.get('/history/:shipmentId', getApprovalHistory);

/**
 * GET /api/receiving/report/:reportId
 * Get a specific receiving report by ID
 */
router.get('/report/:reportId', getReceivingReport);

/**
 * GET /api/receiving/reports
 * Get all receiving reports with optional filters
 * Query params: status, shipment_id, limit, offset
 */
router.get('/reports', getReceivingReports);

export default router;
