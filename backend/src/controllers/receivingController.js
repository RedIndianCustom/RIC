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

    const hasDiscrepancies = total_discrepancy !== 0;
    const reportNumber = `RR-${Date.now()}`;

    const { data: report, error } = await supabase
      .from('receiving_reports')
      .insert({
        shipment_id,
        session_id,
        report_number: reportNumber,
        submitted_by: userId,
        size_breakdown,
        total_expected,
        total_scanned,
        total_discrepancy,
        notes: notes || null,
        scan_details: scan_details || null,
        status: hasDiscrepancies ? 'PENDING' : 'APPROVED'
      })
      .select('id, report_number')
      .single();

    if (error) {
      console.error('❌ Error submitting report:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to submit receiving report'
      });
    }

    const { error: shipmentError } = await supabase
      .from('shipments')
      .update({
        status: hasDiscrepancies ? 'AWAITING_APPROVAL' : 'QC_READY',
        updated_at: new Date().toISOString()
      })
      .eq('id', shipment_id);

    if (shipmentError) {
      console.error('❌ Error updating shipment after report submission:', shipmentError);
    }

    const reportDiscrepancies = size_breakdown
      .filter(item => item.discrepancy !== 0 && item.product_id && item.size)
      .map(item => ({
        shipment_id,
        product_id: item.product_id,
        product_size: item.size,
        expected_quantity: item.expected,
        received_quantity: item.scanned,
        discrepancy_type: item.discrepancy > 0 ? 'SHORT' : 'OVERAGE',
        reported_by: userId,
        status: 'OPEN',
        manager_decision: 'PENDING'
      }));

    if (reportDiscrepancies.length > 0) {
      const { error: discrepancyError } = await supabase
        .from('shipment_discrepancies')
        .insert(reportDiscrepancies);

      if (discrepancyError) {
        console.error('❌ Error creating discrepancy records:', discrepancyError);
      }
    }

    const data = {
      report_id: report.id,
      report_number: report.report_number,
      has_discrepancies: hasDiscrepancies
    };

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

    const { data: reports, error } = await supabase
      .from('receiving_reports')
      .select(`
        id,
        report_number,
        shipment_id,
        submitted_by,
        created_at,
        total_expected,
        total_scanned,
        total_discrepancy,
        has_discrepancies,
        size_breakdown,
        notes,
        status,
        shipments (
          shipment_number,
          container_number,
          suppliers (name)
        )
      `)
      .in('status', ['PENDING', 'PENDING_APPROVAL', 'APPROVED'])
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Error fetching pending approvals:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch pending approvals'
      });
    }

    const approvedShipmentIds = [...new Set((reports || [])
      .filter(report => report.status === 'APPROVED')
      .map(report => report.shipment_id))];
    let shipmentsWithQc = new Set();
    if (approvedShipmentIds.length > 0) {
      const { data: qcInspections } = await supabase
        .from('qc_inspections')
        .select('shipment_id')
        .in('shipment_id', approvedShipmentIds);
      shipmentsWithQc = new Set((qcInspections || []).map(inspection => inspection.shipment_id));
    }

    const actionableReports = (reports || []).filter(report =>
      report.status !== 'APPROVED' || !shipmentsWithQc.has(report.shipment_id)
    );
    const submitterIds = [...new Set(actionableReports.map(report => report.submitted_by).filter(Boolean))];
    let submitters = [];
    if (submitterIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', submitterIds);

      if (usersError) {
        console.warn('⚠️ Could not load report submitters:', usersError.message);
      } else {
        submitters = users || [];
      }
    }

    const submitterById = new Map(submitters.map(user => [user.id, user]));
    const data = actionableReports.map(report => ({
      ...report,
      shipment_number: report.shipments?.shipment_number,
      supplier: report.shipments?.suppliers || null,
      received_by: submitterById.get(report.submitted_by) || null,
      received_at: report.created_at,
      needs_qc_setup: report.status === 'APPROVED',
      items: Array.isArray(report.size_breakdown)
        ? report.size_breakdown.map((item, index) => ({
          id: `${report.id}-${index}`,
          product: { name: item.product_name || item.productName || item.sku || 'Unknown Product' },
          product_size: item.size,
          expected_quantity: item.expected,
          received_quantity: item.scanned
        }))
        : []
    }));

    console.log('✅ Found pending approvals:', data.length);

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

    const { data: approvalReport, error: reportLookupError } = await supabase
      .from('receiving_reports')
      .select('id, report_number, shipment_id')
      .eq('id', reportId)
      .single();

    if (reportLookupError || !approvalReport) {
      return res.status(404).json({
        success: false,
        error: reportLookupError?.message || 'Report not found'
      });
    }

    const { error } = await supabase
      .from('receiving_reports')
      .update({
        status: decision,
        updated_at: new Date().toISOString(),
        rejection_reason: decision === 'REJECTED' ? (decision_notes || null) : null
      })
      .eq('id', reportId);

    if (error) {
      console.error('❌ Error approving report:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to process approval'
      });
    }

    const shipmentStatus = decision === 'APPROVED' ? 'READY_FOR_QC' : 'INSPECTING';
    const { error: shipmentUpdateError } = await supabase
      .from('shipments')
      .update({ status: shipmentStatus, updated_at: new Date().toISOString() })
      .eq('id', approvalReport.shipment_id);

    if (shipmentUpdateError) {
      console.warn('⚠️ Could not update shipment after approval:', shipmentUpdateError.message);
    }

    const data = {
      success: true,
      report_id: approvalReport.id,
      report_number: approvalReport.report_number,
      decision,
      actions: { shipment_status: shipmentStatus },
      message: decision === 'APPROVED'
        ? 'Report approved. Set the QC inspection deadline to continue.'
        : 'Report rejected. Shipment returned to inspection.'
    };

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
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (shipment_id) {
      query = query.eq('shipment_id', shipment_id);
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
