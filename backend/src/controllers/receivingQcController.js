import { supabaseAdmin } from '../config/supabase.js';

const supabase = supabaseAdmin;

// ============================================================================
// SHIPMENT REGISTRATION - Expected Items with Size Breakdown
// ============================================================================

export const registerExpectedItems = async (req, res) => {
  try {
    const { shipment_id, items } = req.body;
    const user_id = req.user.id;

    if (!shipment_id || !items || !Array.isArray(items)) {
      return res.status(400).json({ 
        error: 'shipment_id and items array are required' 
      });
    }

    // Insert expected items
    const { data, error } = await supabase
      .from('shipment_expected_items')
      .insert(
        items.map(item => ({
          shipment_id,
          product_id: item.product_id,
          product_size: item.product_size,
          expected_quantity: item.expected_quantity,
          unit_price: item.unit_price,
          notes: item.notes,
          created_by: user_id
        }))
      )
      .select(`
        *,
        product:products(id, product_code)
      `);

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Expected items registered successfully',
      data
    });
  } catch (error) {
    console.error('Error registering expected items:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getExpectedItems = async (req, res) => {
  try {
    const { shipment_id } = req.params;

    const { data, error } = await supabase
      .from('shipment_expected_items')
      .select(`
        *,
        product:products(id, product_code, brand, model, dimensions, category, sku)
      `)
      .eq('shipment_id', shipment_id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching expected items:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================================
// RECEIVING - Scanning & Counting
// ============================================================================

export const startReceiving = async (req, res) => {
  try {
    const { shipment_id } = req.body;
    const user_id = req.user.id;

    // Get expected items
    const { data: expectedItems, error: fetchError } = await supabase
      .from('shipment_expected_items')
      .select('*')
      .eq('shipment_id', shipment_id);

    if (fetchError) throw fetchError;

    // Create received items records
    const receivedItems = expectedItems.map(item => ({
      shipment_id,
      expected_item_id: item.id,
      product_id: item.product_id,
      product_size: item.product_size,
      received_quantity: 0,
      scanned_barcodes: [],
      status: 'COUNTING',
      received_by: user_id
    }));

    const { data, error } = await supabase
      .from('shipment_received_items')
      .insert(receivedItems)
      .select();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Receiving started',
      data
    });
  } catch (error) {
    console.error('Error starting receiving:', error);
    res.status(500).json({ error: error.message });
  }
};

export const scanProduct = async (req, res) => {
  try {
    const { received_item_id, barcode, quantity = 1 } = req.body;

    // Get current received item
    const { data: receivedItem, error: fetchError } = await supabase
      .from('shipment_received_items')
      .select('*')
      .eq('id', received_item_id)
      .single();

    if (fetchError) throw fetchError;

    // Update received quantity and add barcode
    const newQuantity = receivedItem.received_quantity + quantity;
    const newBarcodes = [...(receivedItem.scanned_barcodes || []), barcode];

    const { data, error } = await supabase
      .from('shipment_received_items')
      .update({
        received_quantity: newQuantity,
        scanned_barcodes: newBarcodes
      })
      .eq('id', received_item_id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Product scanned successfully',
      data
    });
  } catch (error) {
    console.error('Error scanning product:', error);
    res.status(500).json({ error: error.message });
  }
};

export const completeReceiving = async (req, res) => {
  try {
    const { shipment_id } = req.body;
    const user_id = req.user.id;

    // Get all received items for this shipment
    const { data: receivedItems, error: fetchError } = await supabase
      .from('shipment_received_items')
      .select(`
        *,
        expected_item:shipment_expected_items(*)
      `)
      .eq('shipment_id', shipment_id);

    if (fetchError) throw fetchError;

    // Check for discrepancies
    const discrepancies = [];
    let hasDiscrepancies = false;

    for (const item of receivedItems) {
      const expected = item.expected_item.expected_quantity;
      const received = item.received_quantity;
      const difference = received - expected;

      if (difference !== 0) {
        hasDiscrepancies = true;
        
        const discrepancyType = difference < 0 ? 'SHORT' : 'OVERAGE';
        const financialImpact = Math.abs(difference) * (item.expected_item.unit_price || 0);

        discrepancies.push({
          shipment_id,
          expected_item_id: item.expected_item_id,
          received_item_id: item.id,
          product_id: item.product_id,
          discrepancy_type: discrepancyType,
          product_size: item.product_size,
          expected_quantity: expected,
          received_quantity: received,
          financial_impact: financialImpact,
          unit_price: item.expected_item.unit_price,
          reported_by: user_id,
          status: 'OPEN',
          manager_decision: 'PENDING'
        });

        // Update received item status
        await supabase
          .from('shipment_received_items')
          .update({ 
            status: 'DISCREPANCY_FOUND',
            completed_at: new Date().toISOString()
          })
          .eq('id', item.id);
      } else {
        // No discrepancy
        await supabase
          .from('shipment_received_items')
          .update({ 
            status: 'COMPLETED',
            completed_at: new Date().toISOString()
          })
          .eq('id', item.id);
      }
    }

    // Insert discrepancies if any
    if (discrepancies.length > 0) {
      const { data: discrepancyData, error: discrepancyError } = await supabase
        .from('shipment_discrepancies')
        .insert(discrepancies)
        .select();

      if (discrepancyError) throw discrepancyError;

      // Create notification for manager
      await createNotification({
        notification_type: 'DISCREPANCY_REPORTED',
        title: 'Shipment Discrepancy Detected',
        message: `${discrepancies.length} discrepancies found in shipment requiring approval`,
        priority: 'HIGH',
        shipment_id,
        recipient_role: 'MANAGER',
        requires_action: true,
        action_url: `/manager/discrepancies/${shipment_id}`
      });

      return res.json({
        success: true,
        has_discrepancies: true,
        discrepancies: discrepancyData,
        message: 'Receiving completed with discrepancies. Manager approval required.'
      });
    }

    // No discrepancies - ready for QC
    await updateShipmentStatus(shipment_id, 'READY_FOR_QC');

    res.json({
      success: true,
      has_discrepancies: false,
      message: 'Receiving completed successfully. Ready for QC inspection.'
    });
  } catch (error) {
    console.error('Error completing receiving:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================================
// DISCREPANCY MANAGEMENT
// ============================================================================

export const getShipmentDiscrepancies = async (req, res) => {
  try {
    const { shipment_id } = req.params;

    const { data, error } = await supabase
      .from('shipment_discrepancies')
      .select(`
        *,
        product:products(id, brand, model, dimensions, sku),
        reported_by_user:users!reported_by(id, email, full_name),
        manager_reviewed_by_user:users!manager_reviewed_by(id, email, full_name)
      `)
      .eq('shipment_id', shipment_id)
      .order('reported_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching discrepancies:', error);
    res.status(500).json({ error: error.message });
  }
};

export const approveDiscrepancy = async (req, res) => {
  try {
    const { discrepancy_id } = req.params;
    const { decision, resolution_action, notes } = req.body;
    const user_id = req.user.id;

    const { data, error } = await supabase
      .from('shipment_discrepancies')
      .update({
        manager_decision: decision,
        resolution_action,
        manager_notes: notes,
        manager_reviewed_by: user_id,
        manager_reviewed_at: new Date().toISOString(),
        status: decision === 'APPROVED' ? 'RESOLVED' : 'UNDER_REVIEW'
      })
      .eq('id', discrepancy_id)
      .select()
      .single();

    if (error) throw error;

    // If all discrepancies for this shipment are resolved, mark ready for QC
    if (decision === 'APPROVED') {
      const { data: remainingDiscrepancies } = await supabase
        .from('shipment_discrepancies')
        .select('id')
        .eq('shipment_id', data.shipment_id)
        .eq('manager_decision', 'PENDING');

      if (remainingDiscrepancies.length === 0) {
        await updateShipmentStatus(data.shipment_id, 'READY_FOR_QC');

        // Notify warehouse staff
        await createNotification({
          notification_type: 'DISCREPANCY_APPROVED',
          title: 'Discrepancies Approved',
          message: 'All discrepancies have been approved. Shipment is ready for QC inspection.',
          priority: 'MEDIUM',
          shipment_id: data.shipment_id,
          recipient_role: 'WAREHOUSE_STAFF',
          requires_action: true,
          action_url: `/warehouse/qc-inspection/${data.shipment_id}`
        });
      }
    }

    res.json({
      success: true,
      message: 'Discrepancy decision recorded',
      data
    });
  } catch (error) {
    console.error('Error approving discrepancy:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================================
// QC INSPECTION
// ============================================================================

export const createQcInspection = async (req, res) => {
  try {
    const { shipment_id } = req.body;
    const user_id = req.user.id;

    // Get total items count
    const { data: receivedItems } = await supabase
      .from('shipment_received_items')
      .select('received_quantity')
      .eq('shipment_id', shipment_id);

    const totalItems = receivedItems.reduce((sum, item) => sum + item.received_quantity, 0);

    // Generate inspection number
    const inspectionNumber = `QC-${Date.now()}`;

    const { data, error } = await supabase
      .from('qc_inspections')
      .insert({
        shipment_id,
        inspection_number: inspectionNumber,
        inspector_id: user_id,
        ready_for_qc_date: new Date().toISOString(),
        status: 'IN_PROGRESS',
        total_items: totalItems,
        inspection_start_date: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'QC inspection created successfully',
      data
    });
  } catch (error) {
    console.error('Error creating QC inspection:', error);
    res.status(500).json({ error: error.message });
  }
};

export const recordInspectionItem = async (req, res) => {
  try {
    const {
      qc_inspection_id,
      inventory_unit_id,
      product_id,
      barcode,
      product_size,
      batch_id,
      classification,
      defect_type,
      defect_location,
      defect_description,
      defect_severity,
      is_sellable,
      recommended_action,
      suggested_discount_percentage,
      photos,
      quality_notes
    } = req.body;
    const user_id = req.user.id;

    const { data, error } = await supabase
      .from('qc_inspection_items')
      .insert({
        qc_inspection_id,
        inventory_unit_id,
        product_id,
        barcode,
        product_size,
        batch_id,
        classification,
        has_defect: classification !== 'GOOD',
        defect_type,
        defect_location,
        defect_description,
        defect_severity,
        is_sellable,
        recommended_action,
        suggested_discount_percentage,
        photos,
        photo_count: photos?.length || 0,
        quality_notes,
        inspected_by: user_id,
        final_status: 'PENDING'
      })
      .select()
      .single();

    if (error) throw error;

    // Update inspection progress
    await updateInspectionProgress(qc_inspection_id);

    res.status(201).json({
      success: true,
      message: 'Inspection item recorded',
      data
    });
  } catch (error) {
    console.error('Error recording inspection item:', error);
    res.status(500).json({ error: error.message });
  }
};

export const completeQcInspection = async (req, res) => {
  try {
    const { inspection_id } = req.params;
    const { inspector_notes, overall_assessment, recommendations } = req.body;

    // Get inspection summary
    const { data: summary } = await supabase
      .rpc('get_qc_inspection_summary', { p_inspection_id: inspection_id });

    const { data, error } = await supabase
      .from('qc_inspections')
      .update({
        status: 'COMPLETED',
        inspection_end_date: new Date().toISOString(),
        items_inspected: summary.total_items,
        good_quality_count: summary.good_quality,
        minor_defect_count: summary.minor_defects,
        major_defect_count: summary.major_defects,
        good_quality_percentage: summary.good_percentage,
        minor_defect_percentage: summary.minor_percentage,
        major_defect_percentage: summary.major_percentage,
        inspector_notes,
        overall_assessment,
        recommendations
      })
      .eq('id', inspection_id)
      .select()
      .single();

    if (error) throw error;

    // Notify manager
    await createNotification({
      notification_type: 'QC_COMPLETE',
      title: 'QC Inspection Completed',
      message: `QC inspection completed. ${summary.good_quality} good, ${summary.minor_defects} minor defects, ${summary.major_defects} major defects. Awaiting approval.`,
      priority: 'HIGH',
      qc_inspection_id: inspection_id,
      shipment_id: data.shipment_id,
      recipient_role: 'MANAGER',
      requires_action: true,
      action_url: `/manager/qc-approval/${inspection_id}`
    });

    res.json({
      success: true,
      message: 'QC inspection completed',
      data,
      summary
    });
  } catch (error) {
    console.error('Error completing QC inspection:', error);
    res.status(500).json({ error: error.message });
  }
};

export const approveQcInspection = async (req, res) => {
  try {
    const { inspection_id } = req.params;
    const { decision, manager_notes, item_overrides } = req.body;
    const user_id = req.user.id;

    // Update inspection
    const { data: inspection, error: inspectionError } = await supabase
      .from('qc_inspections')
      .update({
        manager_decision: decision,
        manager_notes,
        manager_reviewed_by: user_id,
        manager_reviewed_at: new Date().toISOString()
      })
      .eq('id', inspection_id)
      .select()
      .single();

    if (inspectionError) throw inspectionError;

    // Process item overrides if any
    if (item_overrides && Array.isArray(item_overrides)) {
      for (const override of item_overrides) {
        await supabase
          .from('qc_inspection_items')
          .update({
            manager_override_classification: override.new_classification,
            manager_notes: override.notes,
            manager_reviewed_by: user_id,
            manager_reviewed_at: new Date().toISOString(),
            final_status: 'RECLASSIFIED',
            manager_approved: true
          })
          .eq('id', override.item_id);
      }
    }

    // Approve all items
    await supabase
      .from('qc_inspection_items')
      .update({
        final_status: 'APPROVED',
        manager_approved: true,
        manager_reviewed_by: user_id,
        manager_reviewed_at: new Date().toISOString()
      })
      .eq('qc_inspection_id', inspection_id)
      .eq('final_status', 'PENDING');

    // Allocate stock if approved
    if (decision === 'APPROVED') {
      await allocateInspectedStock(inspection_id);
    }

    res.json({
      success: true,
      message: 'QC inspection approved',
      data: inspection
    });
  } catch (error) {
    console.error('Error approving QC inspection:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================================
// STOCK ALLOCATION
// ============================================================================

async function allocateInspectedStock(inspection_id) {
  try {
    // Get all approved inspection items
    const { data: items } = await supabase
      .from('qc_inspection_items')
      .select('*')
      .eq('qc_inspection_id', inspection_id)
      .eq('final_status', 'APPROVED');

    for (const item of items) {
      const finalClassification = item.manager_override_classification || item.classification;

      if (finalClassification === 'GOOD') {
        // Add to regular inventory as AVAILABLE
        await supabase
          .from('inventory_units')
          .update({ status: 'AVAILABLE' })
          .eq('id', item.inventory_unit_id);

      } else if (finalClassification === 'MINOR_DEFECT') {
        // Add to defect inventory as MINOR_SELLABLE
        await supabase
          .from('defect_inventory')
          .insert({
            inventory_unit_id: item.inventory_unit_id,
            product_id: item.product_id,
            qc_inspection_item_id: item.id,
            defect_classification: 'MINOR_SELLABLE',
            discount_percentage: item.suggested_discount_percentage || 10,
            status: 'AVAILABLE'
          });

        await supabase
          .from('inventory_units')
          .update({ status: 'DEFECT_SELLABLE' })
          .eq('id', item.inventory_unit_id);

      } else if (finalClassification === 'MAJOR_DEFECT') {
        // Add to defect inventory as MAJOR_RETURN
        await supabase
          .from('defect_inventory')
          .insert({
            inventory_unit_id: item.inventory_unit_id,
            product_id: item.product_id,
            qc_inspection_item_id: item.id,
            defect_classification: 'MAJOR_RETURN',
            status: 'AVAILABLE'
          });

        await supabase
          .from('inventory_units')
          .update({ status: 'RETURN_TO_SUPPLIER' })
          .eq('id', item.inventory_unit_id);
      }
    }

    // Notify relevant staff
    const { data: inspection } = await supabase
      .from('qc_inspections')
      .select('shipment_id, good_quality_count, minor_defect_count, major_defect_count')
      .eq('id', inspection_id)
      .single();

    await createNotification({
      notification_type: 'STOCK_ALLOCATED',
      title: 'Stock Allocated',
      message: `QC approved: ${inspection.good_quality_count} items to available stock, ${inspection.minor_defect_count} to defect sellable, ${inspection.major_defect_count} to return.`,
      priority: 'MEDIUM',
      qc_inspection_id: inspection_id,
      shipment_id: inspection.shipment_id,
      recipient_role: 'WAREHOUSE_STAFF'
    });

  } catch (error) {
    console.error('Error allocating stock:', error);
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function updateInspectionProgress(inspection_id) {
  const { data: items } = await supabase
    .from('qc_inspection_items')
    .select('id')
    .eq('qc_inspection_id', inspection_id);

  await supabase
    .from('qc_inspections')
    .update({ items_inspected: items.length })
    .eq('id', inspection_id);
}

async function updateShipmentStatus(shipment_id, status) {
  await supabase
    .from('shipments')
    .update({ status })
    .eq('id', shipment_id);
}

async function createNotification(notificationData) {
  // Get users with the specified role
  const { data: users } = await supabase
    .from('user_roles')
    .select('user_id, roles!inner(name)')
    .eq('roles.name', notificationData.recipient_role.toLowerCase());

  if (users && users.length > 0) {
    const notifications = users.map(user => ({
      ...notificationData,
      recipient_user_id: user.user_id
    }));

    await supabase
      .from('workflow_notifications')
      .insert(notifications);
  }
}

// ============================================================================
// QUERY ENDPOINTS
// ============================================================================

export const getQcInspection = async (req, res) => {
  try {
    const { inspection_id } = req.params;

    const { data, error } = await supabase
      .from('qc_inspections')
      .select(`
        *,
        shipment:shipments(*),
        inspector:users!inspector_id(id, email, full_name),
        items:qc_inspection_items(
          *,
          product:products(id, brand, model, dimensions, sku)
        )
      `)
      .eq('id', inspection_id)
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching QC inspection:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getPendingQcInspections = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pending_qc_inspections')
      .select('*')
      .order('is_overdue', { ascending: false })
      .order('due_date', { ascending: true });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching pending QC inspections:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getPendingDiscrepancies = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pending_discrepancy_approvals')
      .select('*');

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching pending discrepancies:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getDefectInventory = async (req, res) => {
  try {
    const { classification, status } = req.query;

    let query = supabase
      .from('defect_inventory')
      .select(`
        *,
        product:products(id, name, product_code, brand),
        inventory_unit:inventory_units(*),
        qc_item:qc_inspection_items(*)
      `);

    if (classification) {
      query = query.eq('defect_classification', classification);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('added_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching defect inventory:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getNotifications = async (req, res) => {
  try {
    const user_id = req.user.id;

    const { data, error } = await supabase
      .from('workflow_notifications')
      .select('*')
      .eq('recipient_user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: error.message });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const { notification_id } = req.params;

    const { data, error } = await supabase
      .from('workflow_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', notification_id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: error.message });
  }
};

export const createWorkflowNotification = async (req, res) => {
  try {
    const notificationData = req.body;

    // Validate required fields
    if (!notificationData.notification_type || !notificationData.title) {
      return res.status(400).json({ 
        error: 'notification_type and title are required' 
      });
    }

    // If recipient_role is provided, send to all users with that role
    if (notificationData.recipient_role) {
      const { data: users } = await supabase
        .from('user_roles')
        .select('user_id, roles!inner(name)')
        .eq('roles.name', notificationData.recipient_role.toLowerCase());

      if (users && users.length > 0) {
        const notifications = users.map(user => ({
          notification_type: notificationData.notification_type,
          title: notificationData.title,
          message: notificationData.message,
          priority: notificationData.priority || 'MEDIUM',
          shipment_id: notificationData.shipment_id,
          inspection_id: notificationData.inspection_id,
          recipient_user_id: user.user_id,
          requires_action: notificationData.requires_action || false,
          action_url: notificationData.action_url
        }));

        const { data, error } = await supabase
          .from('workflow_notifications')
          .insert(notifications)
          .select();

        if (error) throw error;

        return res.status(201).json({ 
          success: true, 
          message: `Notification sent to ${data.length} user(s)`,
          data 
        });
      } else {
        // Changed from 404 to 200 - Success but with warning
        console.warn(`⚠️  No users found with role: ${notificationData.recipient_role}`);
        return res.status(200).json({ 
          success: true,
          warning: `No users found with role: ${notificationData.recipient_role}. Shipment status updated successfully.`,
          message: 'Shipment updated but notification not sent (no recipients)',
          recipients: 0
        });
      }
    } 
    // If recipient_user_id is provided, send to specific user
    else if (notificationData.recipient_user_id) {
      const { data, error } = await supabase
        .from('workflow_notifications')
        .insert([notificationData])
        .select();

      if (error) throw error;

      return res.status(201).json({ 
        success: true, 
        message: 'Notification sent',
        data 
      });
    } 
    else {
      return res.status(400).json({ 
        error: 'Either recipient_role or recipient_user_id must be provided' 
      });
    }
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: error.message });
  }
};
