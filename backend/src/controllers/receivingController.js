/**
 * ============================================================================
 * RECEIVING CONTROLLER
 * ============================================================================
 * Handles the new size-by-size receiving workflow:
 * - Submit receiving reports with discrepancies
 * - Manager approval/rejection
 * - Auto QC batch creation
 * - Pending approvals listing
 * ============================================================================
 */

import { supabaseAdmin as supabase } from '../config/supabase.js';
import {
  notifyManagersOfSubmission,
  notifyApproved,
  notifyRejected,
  getUserName,
  getShipmentNumber
} from '../utils/receivingNotifications.js';

/**
 * Submit a receiving report for manager approval
 * POST /api/receiving/submit-report
 */
export async function submitReceivingReport(req, res) {
  try {
    const {
      shipment_id,
      session_id, // Session ID from frontend
      size_breakdown, // Array: [{size, expected, scanned, discrepancy}]
      total_expected,
      total_scanned,
      total_discrepancy,
      notes,
      scan_details // Optional: full barcode history
    } = req.body;

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Validation
    if (!shipment_id || !size_breakdown || !Array.isArray(size_breakdown)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: shipment_id, size_breakdown'
      });
    }

    if (typeof total_expected !== 'number' || typeof total_scanned !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'total_expected and total_scanned must be numbers'
      });
    }

    // Validate size_breakdown structure
    const isValidBreakdown = size_breakdown.every(item => 
      item.size && 
      typeof item.expected === 'number' && 
      typeof item.scanned === 'number' &&
      typeof item.discrepancy === 'number'
    );

    if (!isValidBreakdown) {
      return res.status(400).json({
        success: false,
        error: 'Invalid size_breakdown format. Each item must have: size, expected, scanned, discrepancy'
      });
    }

    console.log('📦 Submitting receiving report:', {
      shipment_id,
      session_id,
      submitted_by: userId,
      total_expected,
      total_scanned,
      total_discrepancy,
      sizes_count: size_breakdown.length
    });

    // Call database function
    const { data, error } = await supabase.rpc('submit_receiving_report', {
      p_shipment_id: shipment_id,
      p_session_id: session_id,
      p_submitted_by: userId,
      p_size_breakdown: size_breakdown,
      p_total_expected: total_expected,
      p_total_scanned: total_scanned,
      p_total_discrepancy: total_discrepancy,
      p_notes: notes || null,
      p_scan_details: scan_details || null
    });

    if (error) {
      console.error('❌ Error submitting report:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to submit receiving report'
      });
    }

    console.log('✅ Report submitted successfully:', data);

    // Get additional data for notifications
    const submitterName = await getUserName(userId);
    const shipmentNumber = await getShipmentNumber(shipment_id);

    // Send notifications to managers
    const notificationResult = await notifyManagersOfSubmission({
      report_id: data.report_id,
      report_number: data.report_number,
      shipment_number: shipmentNumber,
      total_discrepancy: total_discrepancy,
      submitted_by_name: submitterName
    });

    console.log('📧 Notification result:', notificationResult);

    return res.status(201).json({
      success: true,
      data: data,
      notifications: notificationResult,
      message: 'Receiving report submitted successfully. Awaiting manager approval.'
    });

  } catch (err) {
    console.error('❌ Exception in submitReceivingReport:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
}

/**
 * Get pending receiving reports (for managers)
 * GET /api/receiving/pending-approvals
 */
export async function getPendingApprovals(req, res) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Check user role from multiple sources
    const userRoles = req.roles || [];
    const userPosition = req.user?.user_metadata?.position || '';
    const userRole = req.user?.user_metadata?.role || '';
    
    console.log('🔍 User access check:', {
      userId,
      email: req.user?.email,
      roles: userRoles,
      position: userPosition,
      role: userRole,
      metadata: req.user?.user_metadata
    });
    
    // Check if user is a manager or admin (case-insensitive, handle variations)
    const roleStrings = [
      ...userRoles.map(r => r?.toUpperCase()),
      userPosition?.toUpperCase(),
      userRole?.toUpperCase()
    ].filter(Boolean);
    
    const isManager = roleStrings.some(r => 
      r === 'MANAGER' || 
      r === 'ADMIN' || 
      r === 'WAREHOUSE_MANAGER' ||
      r.includes('MANAGER') ||
      r.includes('ADMIN')
    );

    if (!isManager) {
      console.log('❌ Access denied - no manager/admin role found in:', roleStrings);
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only managers can view pending approvals.'
      });
    }
    
    console.log('✅ Manager access granted:', roleStrings.join(', '));

    console.log('📋 Fetching pending approvals for manager:', userId);

    // Call database function
    const { data, error } = await supabase.rpc('get_pending_receiving_approvals');

    if (error) {
      console.error('❌ Error fetching pending approvals:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch pending approvals'
      });
    }

    console.log('✅ Found pending approvals:', data?.length || 0);

    return res.status(200).json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });

  } catch (err) {
    console.error('❌ Exception in getPendingApprovals:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
}

/**
 * Approve or reject a receiving report
 * POST /api/receiving/approve/:reportId
 */
export async function approveReceivingReport(req, res) {
  try {
    const { reportId } = req.params;
    const { decision, decision_notes } = req.body; // decision: 'APPROVED' or 'REJECTED'

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Validation
    if (!reportId || !decision) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: reportId, decision'
      });
    }

    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid decision. Must be APPROVED or REJECTED'
      });
    }

    // Check user role from multiple sources
    const userRoles = req.roles || [];
    const userPosition = req.user?.user_metadata?.position || '';
    const userRole = req.user?.user_metadata?.role || '';
    
    console.log('🔍 Approval access check:', {
      userId,
      email: req.user?.email,
      roles: userRoles,
      position: userPosition,
      role: userRole
    });
    
    // Check if user is a manager or admin (case-insensitive, handle variations)
    const roleStrings = [
      ...userRoles.map(r => r?.toUpperCase()),
      userPosition?.toUpperCase(),
      userRole?.toUpperCase()
    ].filter(Boolean);
    
    const isManager = roleStrings.some(r => 
      r === 'MANAGER' || 
      r === 'ADMIN' || 
      r === 'WAREHOUSE_MANAGER' ||
      r.includes('MANAGER') ||
      r.includes('ADMIN')
    );

    if (!isManager) {
      console.log('❌ Access denied - no manager/admin role found in:', roleStrings);
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only managers can approve reports.'
      });
    }
    
    console.log('✅ Manager approval access granted:', roleStrings.join(', '));

    console.log(`📋 Manager ${userId} making decision on report ${reportId}:`, decision);

    // Call database function (includes QC batch creation if approved)
    const { data, error } = await supabase.rpc('approve_receiving_report', {
      p_report_id: reportId, // UUID, not integer
      p_approved_by: userId,
      p_decision: decision,
      p_decision_notes: decision_notes || null
    });

    if (error) {
      console.error('❌ Error approving report:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to process approval'
      });
    }

    if (!data?.success) {
      return res.status(404).json({
        success: false,
        error: data?.error || 'Report not found'
      });
    }

    console.log('✅ Approval processed successfully:', data);

    // Get additional data for notifications
    const approverName = await getUserName(userId);
    
    // Get report details for notifications
    const { data: report, error: reportError } = await supabase
      .from('receiving_reports')
      .select('submitted_by, shipment_id')
      .eq('id', reportId)
      .single();

    if (!reportError && report) {
      const shipmentNumber = await getShipmentNumber(report.shipment_id);

      if (decision === 'APPROVED') {
        // Notify warehouse staff and QC team
        const notificationResult = await notifyApproved({
          report_id: reportId, // UUID
          report_number: data.report_number || `Report #${reportId}`,
          shipment_number: shipmentNumber,
          approved_by_name: approverName,
          qc_batch_number: data.actions?.qc_batch_number || 'N/A',
          submitted_by_id: report.submitted_by
        });

        console.log('📧 Approval notifications:', notificationResult);
      } else {
        // Notify warehouse staff of rejection
        const notificationResult = await notifyRejected({
          report_id: reportId, // UUID
          report_number: data.report_number || `Report #${reportId}`,
          shipment_number: shipmentNumber,
          rejected_by_name: approverName,
          rejection_reason: decision_notes || 'No reason provided',
          submitted_by_id: report.submitted_by
        });

        console.log('📧 Rejection notification:', notificationResult);
      }
    }

    return res.status(200).json({
      success: true,
      data: data,
      message: data.message
    });

  } catch (err) {
    console.error('❌ Exception in approveReceivingReport:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
}

/**
 * Get approval history for a shipment
 * GET /api/receiving/history/:shipmentId
 */
export async function getApprovalHistory(req, res) {
  try {
    const { shipmentId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    if (!shipmentId) {
      return res.status(400).json({
        success: false,
        error: 'Missing shipmentId'
      });
    }

    console.log('📋 Fetching approval history for shipment:', shipmentId);

    const { data, error } = await supabase.rpc('get_shipment_approval_history', {
      p_shipment_id: shipmentId // UUID, not integer
    });

    if (error) {
      console.error('❌ Error fetching history:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch approval history'
      });
    }

    console.log('✅ Found history records:', data?.length || 0);

    return res.status(200).json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });

  } catch (err) {
    console.error('❌ Exception in getApprovalHistory:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
}

/**
 * Get a specific receiving report by ID
 * GET /api/receiving/report/:reportId
 */
export async function getReceivingReport(req, res) {
  try {
    const { reportId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    if (!reportId) {
      return res.status(400).json({
        success: false,
        error: 'Missing reportId'
      });
    }

    console.log('📋 Fetching report:', reportId);

    const { data, error } = await supabase
      .from('receiving_reports')
      .select(`
        *,
        shipments (
          shipment_number,
          container_number,
          supplier_id,
          suppliers (name)
        ),
        users (
          full_name,
          email
        )
      `)
      .eq('id', reportId)
      .single();

    if (error) {
      console.error('❌ Error fetching report:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch report'
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    console.log('✅ Report found:', data.report_number);

    return res.status(200).json({
      success: true,
      data: data
    });

  } catch (err) {
    console.error('❌ Exception in getReceivingReport:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
}

/**
 * Get all receiving reports (with filters)
 * GET /api/receiving/reports
 */
export async function getReceivingReports(req, res) {
  try {
    const userId = req.user?.id;
    const { status, shipment_id, limit = 50, offset = 0 } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    console.log('📋 Fetching receiving reports with filters:', { status, shipment_id, limit, offset });

    let query = supabase
      .from('receiving_reports')
      .select(`
        *,
        shipments (
          shipment_number,
          container_number,
          status
        ),
        users (
          full_name,
          email
        )
      `, { count: 'exact' })
      .order('submitted_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (shipment_id) {
      query = query.eq('shipment_id', parseInt(shipment_id));
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('❌ Error fetching reports:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch reports'
      });
    }

    console.log('✅ Found reports:', data?.length || 0);

    return res.status(200).json({
      success: true,
      data: data || [],
      count: count || 0,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: count || 0
      }
    });

  } catch (err) {
    console.error('❌ Exception in getReceivingReports:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
}
