/**
 * ============================================================================
 * RECEIVING WORKFLOW NOTIFICATION UTILITIES
 * ============================================================================
 * Helper functions to send notifications for the receiving workflow:
 * - Report submitted (notify managers)
 * - Report approved (notify warehouse staff & QC team)
 * - Report rejected (notify warehouse staff)
 * ============================================================================
 */

import { supabaseAdmin } from '../config/supabase.js';

/**
 * Get all manager user IDs
 */
async function getUserIdsForRoles(roleNames) {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, roles!inner(name), users!inner(is_active)')
      .in('roles.name', roleNames)
      .eq('users.is_active', true);

    if (error) {
      console.error('❌ Error fetching managers:', error);
      return [];
    }

    return data.map(userRole => userRole.user_id);
  } catch (err) {
    console.error('❌ Exception in getUserIdsForRoles:', err);
    return [];
  }
}

async function getManagerUserIds() {
  return getUserIdsForRoles(['manager', 'admin']);
}

/**
 * Get warehouse staff user IDs
 */
async function getWarehouseStaffIds() {
  return getUserIdsForRoles(['warehouse_staff', 'admin']);
}

/**
 * Get QC inspector user IDs
 */
async function getQcInspectorIds() {
  return getUserIdsForRoles(['qc_inspector', 'admin']);
}

/**
 * Create a notification in the database
 */
async function createNotification(userId, type, title, message, metadata, priority = 'MEDIUM') {
  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: userId,
        type: type,
        title: title,
        message: message,
        metadata: metadata,
        priority: priority,
        is_read: false
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating notification:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('❌ Exception in createNotification:', err);
    return null;
  }
}

/**
 * Notify managers when a receiving report is submitted
 * @param {Object} reportData - The submitted report data
 * @param {number} reportData.report_id - Report ID
 * @param {string} reportData.report_number - Report number (e.g., RR-20260826-0001)
 * @param {string} reportData.shipment_number - Shipment number
 * @param {number} reportData.total_discrepancy - Total discrepancy amount
 * @param {string} reportData.submitted_by_name - Name of person who submitted
 */
export async function notifyManagersOfSubmission(reportData) {
  try {
    console.log('📧 Notifying managers of receiving report submission:', reportData.report_number);

    const managerIds = await getManagerUserIds();

    if (managerIds.length === 0) {
      console.warn('⚠️ No managers found to notify');
      return { success: false, notified: 0 };
    }

    const notifications = [];

    for (const managerId of managerIds) {
      const notification = await createNotification(
        managerId,
        'RECEIVING_APPROVAL_PENDING',
        '📦 Receiving Report Awaiting Approval',
        `${reportData.submitted_by_name} submitted receiving report ${reportData.report_number} for shipment ${reportData.shipment_number}. Total discrepancy: ${Math.abs(reportData.total_discrepancy)} units. Please review and approve.`,
        {
          report_id: reportData.report_id,
          report_number: reportData.report_number,
          shipment_number: reportData.shipment_number,
          total_discrepancy: reportData.total_discrepancy,
          action_url: `/receiving/approvals/${reportData.report_id}`
        },
        reportData.total_discrepancy !== 0 ? 'HIGH' : 'MEDIUM'
      );

      if (notification) {
        notifications.push(notification);
      }
    }

    console.log(`✅ Notified ${notifications.length} managers`);

    return {
      success: true,
      notified: notifications.length,
      notifications: notifications
    };

  } catch (err) {
    console.error('❌ Exception in notifyManagersOfSubmission:', err);
    return { success: false, error: err.message, notified: 0 };
  }
}

/**
 * Notify warehouse staff and QC team when report is approved
 * @param {Object} approvalData - The approval data
 * @param {number} approvalData.report_id - Report ID
 * @param {string} approvalData.report_number - Report number
 * @param {string} approvalData.shipment_number - Shipment number
 * @param {string} approvalData.approved_by_name - Name of manager who approved
 * @param {string} approvalData.qc_batch_number - Generated QC batch number
 * @param {number} approvalData.submitted_by_id - ID of person who submitted (warehouse staff)
 */
export async function notifyApproved(approvalData) {
  try {
    console.log('📧 Notifying of approved receiving report:', approvalData.report_number);

    const notifications = [];

    // 1. Notify the warehouse staff member who submitted
    if (approvalData.submitted_by_id) {
      const notification = await createNotification(
        approvalData.submitted_by_id,
        'RECEIVING_APPROVED',
        '✅ Receiving Report Approved',
        `Your receiving report ${approvalData.report_number} for shipment ${approvalData.shipment_number} has been approved by ${approvalData.approved_by_name}. QC batch ${approvalData.qc_batch_number} has been created.`,
        {
          report_id: approvalData.report_id,
          report_number: approvalData.report_number,
          shipment_number: approvalData.shipment_number,
          qc_batch_number: approvalData.qc_batch_number,
          action_url: `/qc/batches/${approvalData.qc_batch_number}`
        },
        'MEDIUM'
      );

      if (notification) notifications.push(notification);
    }

    // 2. Notify all QC inspectors that a new batch is ready
    const qcInspectorIds = await getQcInspectorIds();

    for (const inspectorId of qcInspectorIds) {
      const notification = await createNotification(
        inspectorId,
        'QC_BATCH_READY',
        '🔍 New QC Batch Ready for Inspection',
        `QC batch ${approvalData.qc_batch_number} for shipment ${approvalData.shipment_number} is ready for inspection. Receiving report ${approvalData.report_number} was approved by ${approvalData.approved_by_name}.`,
        {
          qc_batch_number: approvalData.qc_batch_number,
          shipment_number: approvalData.shipment_number,
          report_number: approvalData.report_number,
          action_url: `/qc/inspect/${approvalData.qc_batch_number}`
        },
        'HIGH'
      );

      if (notification) notifications.push(notification);
    }

    console.log(`✅ Sent ${notifications.length} notifications for approved report`);

    return {
      success: true,
      notified: notifications.length,
      notifications: notifications
    };

  } catch (err) {
    console.error('❌ Exception in notifyApproved:', err);
    return { success: false, error: err.message, notified: 0 };
  }
}

/**
 * Notify warehouse staff when report is rejected
 * @param {Object} rejectionData - The rejection data
 * @param {number} rejectionData.report_id - Report ID
 * @param {string} rejectionData.report_number - Report number
 * @param {string} rejectionData.shipment_number - Shipment number
 * @param {string} rejectionData.rejected_by_name - Name of manager who rejected
 * @param {string} rejectionData.rejection_reason - Reason for rejection
 * @param {number} rejectionData.submitted_by_id - ID of person who submitted
 */
export async function notifyRejected(rejectionData) {
  try {
    console.log('📧 Notifying of rejected receiving report:', rejectionData.report_number);

    if (!rejectionData.submitted_by_id) {
      console.warn('⚠️ No submitted_by_id provided');
      return { success: false, notified: 0 };
    }

    const notification = await createNotification(
      rejectionData.submitted_by_id,
      'RECEIVING_REJECTED',
      '❌ Receiving Report Rejected',
      `Your receiving report ${rejectionData.report_number} for shipment ${rejectionData.shipment_number} was rejected by ${rejectionData.rejected_by_name}. Reason: ${rejectionData.rejection_reason || 'No reason provided'}. Please re-scan the shipment.`,
      {
        report_id: rejectionData.report_id,
        report_number: rejectionData.report_number,
        shipment_number: rejectionData.shipment_number,
        rejection_reason: rejectionData.rejection_reason,
        action_url: `/warehouse/receiving/${rejectionData.shipment_number}`
      },
      'HIGH'
    );

    if (!notification) {
      return { success: false, notified: 0 };
    }

    console.log('✅ Notified warehouse staff of rejection');

    return {
      success: true,
      notified: 1,
      notification: notification
    };

  } catch (err) {
    console.error('❌ Exception in notifyRejected:', err);
    return { success: false, error: err.message, notified: 0 };
  }
}

/**
 * Helper to get user name by ID
 */
export async function getUserName(userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('full_name')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return 'Unknown User';
    }

    return data.full_name;
  } catch (err) {
    console.error('❌ Exception in getUserName:', err);
    return 'Unknown User';
  }
}

/**
 * Helper to get shipment number by ID
 */
export async function getShipmentNumber(shipmentId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('shipments')
      .select('shipment_number')
      .eq('id', shipmentId)
      .single();

    if (error || !data) {
      return 'Unknown Shipment';
    }

    return data.shipment_number;
  } catch (err) {
    console.error('❌ Exception in getShipmentNumber:', err);
    return 'Unknown Shipment';
  }
}
