import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  // Expected Items (Shipment Registration)
  registerExpectedItems,
  getExpectedItems,
  
  // Receiving
  startReceiving,
  scanProduct,
  completeReceiving,
  
  // Discrepancies
  getShipmentDiscrepancies,
  approveDiscrepancy,
  getPendingDiscrepancies,
  
  // QC Inspection
  createQcInspection,
  recordInspectionItem,
  completeQcInspection,
  approveQcInspection,
  getQcInspection,
  getPendingQcInspections,
  getCompletedQcInspections,
  
  // QC Deadline Management
  setQcDeadline,
  getQcDeadlinePresets,
  
  // Defect Inventory
  getDefectInventory,
  
  // Notifications
  getNotifications,
  markNotificationRead,
  createWorkflowNotification
} from '../controllers/receivingQcController.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);

// ============================================================================
// SHIPMENT REGISTRATION - Expected Items
// ============================================================================
router.post('/expected-items', registerExpectedItems);
router.get('/expected-items/:shipment_id', getExpectedItems);

// ============================================================================
// RECEIVING WORKFLOW
// ============================================================================
router.post('/receiving/start', startReceiving);
router.post('/receiving/scan', scanProduct);
router.post('/receiving/complete', completeReceiving);

// ============================================================================
// DISCREPANCY MANAGEMENT
// ============================================================================
router.get('/discrepancies/pending', getPendingDiscrepancies);
router.get('/discrepancies/:shipment_id', getShipmentDiscrepancies);
router.put('/discrepancies/:discrepancy_id/approve', approveDiscrepancy);

// ============================================================================
// QC INSPECTION WORKFLOW
// ============================================================================
router.post('/qc-inspection/create', createQcInspection);
router.post('/qc-inspection/record-item', recordInspectionItem);
router.put('/qc-inspection/:inspection_id/complete', completeQcInspection);
router.put('/qc-inspection/:inspection_id/approve', approveQcInspection);
router.get('/qc-inspection/:inspection_id', getQcInspection);
router.get('/qc-inspection/pending/all', getPendingQcInspections);
router.get('/qc-inspection/completed/all', getCompletedQcInspections); // New endpoint for managers

// QC Deadline Management
router.put('/qc-inspection/:inspection_id/set-deadline', setQcDeadline);
router.get('/qc-inspection/deadline-presets', getQcDeadlinePresets);

// ============================================================================
// DEFECT INVENTORY
// ============================================================================
router.get('/defect-inventory', getDefectInventory);

// ============================================================================
// NOTIFICATIONS
// ============================================================================
router.get('/notifications', getNotifications);
router.post('/notifications', createWorkflowNotification);
router.put('/notifications/:notification_id/read', markNotificationRead);

export default router;
