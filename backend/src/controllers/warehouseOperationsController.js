/**
 * ============================================================================
 * WAREHOUSE OPERATIONS CONTROLLER
 * ============================================================================
 * Handles all warehouse staff operations:
 * - Dashboard stats
 * - Receiving
 * - Picking
 * - Packing
 * - Inspection
 * - Inventory counting
 * - Location lookup
 * - Performance tracking
 * ============================================================================
 */

import { supabaseAdmin as supabase } from '../config/supabase.js';

// ──────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ──────────────────────────────────────────────────────────────────────────

export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user?.id;

    // Get stats from function
    const { data: stats, error } = await supabase
      .rpc('get_warehouse_dashboard_stats', { p_user_id: userId });

    if (error) throw error;

    // Get recent activity
    const { data: recentActivity } = await supabase
      .from('warehouse_tasks')
      .select(`
        id,
        task_type,
        task_number,
        status,
        completed_at,
        assigned_to
      `)
      .order('updated_at', { ascending: false })
      .limit(10);

    // Get today's tasks
    const { data: todayTasks } = await supabase
      .from('warehouse_tasks')
      .select('*')
      .eq('assigned_to', userId)
      .gte('created_at', new Date().toISOString().split('T')[0])
      .order('priority', { ascending: false });

    res.json({
      success: true,
      stats,
      recentActivity: recentActivity || [],
      todayTasks: todayTasks || []
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// RECEIVING
// ──────────────────────────────────────────────────────────────────────────

export const getIncomingShipments = async (req, res) => {
  try {
    const { status = 'all', limit = 50 } = req.query;

    let query = supabase
      .from('shipments')
      .select(`
        id,
        shipment_number,
        status,
        expected_date,
        actual_date,
        received_date,
        supplier_id,
        expected_quantity,
        actual_quantity,
        container_number,
        bl_number,
        notes,
        product_breakdown,
        created_at,
        supplier:suppliers(id, name)
      `)
      .order('expected_date', { ascending: true })
      .limit(limit);

    if (status !== 'all') {
      query = query.eq('status', status);
    } else {
      query = query.in('status', ['IN_TRANSIT', 'ARRIVED', 'INSPECTING']);
    }

    const { data: shipments, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      shipments: shipments || []
    });
  } catch (error) {
    console.error('Get incoming shipments error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const getShipmentDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Get shipment
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select(`
        *,
        supplier:suppliers(id, name)
      `)
      .eq('id', id)
      .single();

    if (shipmentError) throw shipmentError;

    // For shipments that haven't been received yet, use product_breakdown
    // For received shipments, get actual inventory_units
    let items = [];
    
    if (shipment.status === 'RECEIVED' || shipment.status === 'INSPECTING') {
      // Get actual inventory units
      const { data: inventoryItems, error: itemsError } = await supabase
        .from('inventory_units')
        .select(`
          id,
          barcode_value,
          status,
          product_id,
          batch_id,
          warehouse_id,
          rack_code,
          position_code,
          products!inner (
            id,
            sku,
            brand,
            model,
            product_type,
            size
          )
        `)
        .eq('shipment_id', id);

      if (!itemsError) {
        items = inventoryItems || [];
      }
    } else {
      // Use product_breakdown for expected items
      if (shipment.product_breakdown) {
        // Convert product_breakdown JSON to item list
        // product_breakdown format: { "38": 10, "40": 15, "42": 20 }
        items = Object.entries(shipment.product_breakdown).map(([size, quantity]) => ({
          size,
          quantity,
          expected: true // Flag to indicate this is expected, not actual
        }));
      }
    }

    res.json({
      success: true,
      shipment,
      items: items || []
    });
  } catch (error) {
    console.error('Get shipment details error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const startReceiving = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const { data, error } = await supabase
      .from('shipments')
      .update({
        status: 'INSPECTING',  // Use INSPECTING status (allowed by constraint)
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Create warehouse task
    await supabase
      .from('warehouse_tasks')
      .insert({
        task_type: 'RECEIVING',
        task_number: `RCV-${Date.now()}`,
        shipment_id: id,
        assigned_to: userId,
        status: 'IN_PROGRESS',
        started_at: new Date().toISOString(),
        created_by: userId
      });

    res.json({
      success: true,
      shipment: data
    });
  } catch (error) {
    console.error('Start receiving error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const completeReceiving = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, receivedItems } = req.body;
    const userId = req.user?.id;

    // Update shipment status
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .update({
        status: 'RECEIVED',
        actual_date: new Date().toISOString().split('T')[0], // Store as DATE
        received_date: new Date().toISOString(), // Store as TIMESTAMPTZ
        notes: notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (shipmentError) throw shipmentError;

    // Update inventory units if provided
    if (receivedItems && receivedItems.length > 0) {
      for (const item of receivedItems) {
        await supabase
          .from('inventory_units')
          .update({
            status: item.condition || 'AVAILABLE',
            rack_code: item.rackCode,
            position_code: item.positionCode,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id);

        // Create stock movement
        await supabase
          .from('stock_movements')
          .insert({
            inventory_unit_id: item.id,
            movement_type: 'RECEIVING',
            from_location: null,
            to_location: `${item.rackCode}-${item.positionCode}`,
            quantity: 1,
            performed_by: userId,
            notes: `Received from shipment ${shipment.shipment_number}`
          });
      }
    }

    // Complete warehouse task
    await supabase
      .from('warehouse_tasks')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        notes: notes
      })
      .eq('shipment_id', id)
      .eq('task_type', 'RECEIVING')
      .eq('assigned_to', userId);

    res.json({
      success: true,
      shipment
    });
  } catch (error) {
    console.error('Complete receiving error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// SCANNING & LOCATION LOOKUP
// ──────────────────────────────────────────────────────────────────────────

export const scanBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;

    // Find inventory unit
    const { data: unit, error: unitError } = await supabase
      .from('inventory_units')
      .select(`
        id,
        barcode,
        status,
        warehouse_id,
        rack_code,
        position_code,
        product_id,
        batch_id,
        shipment_id,
        created_at,
        products (
          id,
          sku,
          name,
          brand,
          product_type,
          size,
          description
        ),
        batches (
          id,
          batch_number,
          manufacture_date,
          expiry_date
        ),
        warehouses (
          id,
          name,
          code
        )
      `)
      .eq('barcode', barcode)
      .single();

    if (unitError) {
      return res.status(404).json({
        success: false,
        error: 'Barcode not found'
      });
    }

    // Get movement history
    const { data: movements } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('inventory_unit_id', unit.id)
      .order('created_at', { ascending: false })
      .limit(10);

    res.json({
      success: true,
      unit,
      movements: movements || []
    });
  } catch (error) {
    console.error('Scan barcode error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const lookupLocation = async (req, res) => {
  try {
    const { search, type = 'all' } = req.query;

    let query = supabase
      .from('inventory_units')
      .select(`
        id,
        barcode,
        status,
        warehouse_id,
        rack_code,
        position_code,
        products (
          id,
          sku,
          name,
          brand,
          size
        ),
        warehouses (
          id,
          name,
          code
        )
      `)
      .eq('status', 'AVAILABLE')
      .not('rack_code', 'is', null);

    // Apply search
    if (search) {
      if (type === 'barcode') {
        query = query.ilike('barcode', `%${search}%`);
      } else if (type === 'sku') {
        query = query.filter('products.sku', 'ilike', `%${search}%`);
      } else {
        // Search all fields
        query = query.or(`barcode.ilike.%${search}%,products.name.ilike.%${search}%,products.sku.ilike.%${search}%`);
      }
    }

    const { data: units, error } = await query.limit(50);

    if (error) throw error;

    // Group by location
    const locationMap = {};
    units?.forEach(unit => {
      const location = `${unit.warehouses?.name || 'Unknown'} - ${unit.rack_code}-${unit.position_code}`;
      if (!locationMap[location]) {
        locationMap[location] = {
          location,
          warehouse: unit.warehouses?.name,
          rackCode: unit.rack_code,
          positionCode: unit.position_code,
          items: []
        };
      }
      locationMap[location].items.push(unit);
    });

    res.json({
      success: true,
      units: units || [],
      locations: Object.values(locationMap)
    });
  } catch (error) {
    console.error('Location lookup error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// PICKING
// ──────────────────────────────────────────────────────────────────────────

export const getPickingTasks = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { status = 'active' } = req.query;

    let query = supabase
      .from('picking_tasks')
      .select(`
        id,
        pick_number,
        order_reference,
        customer_name,
        status,
        priority,
        due_date,
        assigned_to,
        created_at
      `)
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true });

    if (status === 'active') {
      query = query.in('status', ['PENDING', 'ASSIGNED', 'PICKING']);
    } else if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Filter by assigned user unless manager/admin
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role_name')
      .eq('user_id', userId)
      .single();

    if (userRole?.role_name === 'warehouse_staff') {
      query = query.or(`assigned_to.eq.${userId},assigned_to.is.null`);
    }

    const { data: tasks, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      tasks: tasks || []
    });
  } catch (error) {
    console.error('Get picking tasks error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const getPickingTaskDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Get task
    const { data: task, error: taskError } = await supabase
      .from('picking_tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (taskError) throw taskError;

    // Get items
    const { data: items, error: itemsError } = await supabase
      .from('picking_task_items')
      .select(`
        id,
        inventory_unit_id,
        product_id,
        warehouse_id,
        rack_code,
        position_code,
        quantity_requested,
        quantity_picked,
        status,
        batch_id,
        manufacture_date,
        expiry_date,
        products (
          id,
          sku,
          name,
          size
        ),
        batches (
          batch_number
        )
      `)
      .eq('picking_task_id', id)
      .order('rack_code', { ascending: true });

    if (itemsError) throw itemsError;

    res.json({
      success: true,
      task,
      items: items || []
    });
  } catch (error) {
    console.error('Get picking task details error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const pickItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { itemId, barcode, quantityPicked } = req.body;
    const userId = req.user?.id;

    // Update item
    const { data: item, error: itemError } = await supabase
      .from('picking_task_items')
      .update({
        quantity_picked: quantityPicked,
        status: 'PICKED',
        scanned_barcode: barcode,
        picked_by: userId,
        picked_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .select()
      .single();

    if (itemError) throw itemError;

    // Check if all items are picked
    const { data: allItems } = await supabase
      .from('picking_task_items')
      .select('status')
      .eq('picking_task_id', id);

    const allPicked = allItems?.every(i => i.status === 'PICKED');

    if (allPicked) {
      await supabase
        .from('picking_tasks')
        .update({
          status: 'PICKED',
          completed_at: new Date().toISOString()
        })
        .eq('id', id);
    }

    res.json({
      success: true,
      item,
      taskComplete: allPicked
    });
  } catch (error) {
    console.error('Pick item error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// PACKING
// ──────────────────────────────────────────────────────────────────────────

export const getPackingTasks = async (req, res) => {
  try {
    const userId = req.user?.id;

    const { data: tasks, error } = await supabase
      .from('packing_tasks')
      .select(`
        id,
        packing_number,
        order_reference,
        status,
        assigned_to,
        created_at,
        picking_task_id
      `)
      .in('status', ['PENDING', 'PACKING'])
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      tasks: tasks || []
    });
  } catch (error) {
    console.error('Get packing tasks error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const completePacking = async (req, res) => {
  try {
    const { id } = req.params;
    const { boxType, weight, fragile, notes } = req.body;
    const userId = req.user?.id;

    const { data, error } = await supabase
      .from('packing_tasks')
      .update({
        status: 'PACKED',
        box_type: boxType,
        total_weight: weight,
        fragile: fragile,
        notes: notes,
        packed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      task: data
    });
  } catch (error) {
    console.error('Complete packing error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// INSPECTION
// ──────────────────────────────────────────────────────────────────────────

export const getInspectionQueue = async (req, res) => {
  try {
    const { data: inspections, error } = await supabase
      .from('inspection_records')
      .select(`
        id,
        inspection_number,
        inspection_type,
        result,
        inspector_id,
        inspected_at,
        requires_approval,
        inventory_units (
          barcode,
          products (
            name,
            sku
          )
        )
      `)
      .or('result.is.null,requires_approval.eq.true')
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) throw error;

    res.json({
      success: true,
      inspections: inspections || []
    });
  } catch (error) {
    console.error('Get inspection queue error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const createInspection = async (req, res) => {
  try {
    const {
      inspectionType,
      inventoryUnitId,
      result,
      defects,
      actionTaken,
      notes
    } = req.body;
    const userId = req.user?.id;

    const { data, error } = await supabase
      .from('inspection_records')
      .insert({
        inspection_number: `INS-${Date.now()}`,
        inspection_type: inspectionType,
        inventory_unit_id: inventoryUnitId,
        inspector_id: userId,
        result: result,
        defects: defects || [],
        action_taken: actionTaken,
        notes: notes,
        requires_approval: result === 'FAIL'
      })
      .select()
      .single();

    if (error) throw error;

    // Update inventory unit status if needed
    if (result === 'FAIL' && actionTaken === 'REJECTED') {
      await supabase
        .from('inventory_units')
        .update({ status: 'DAMAGED' })
        .eq('id', inventoryUnitId);
    }

    res.json({
      success: true,
      inspection: data
    });
  } catch (error) {
    console.error('Create inspection error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// INVENTORY COUNTING
// ──────────────────────────────────────────────────────────────────────────

export const getCountSessions = async (req, res) => {
  try {
    const { status = 'active' } = req.query;

    let query = supabase
      .from('inventory_count_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (status === 'active') {
      query = query.in('status', ['PLANNED', 'IN_PROGRESS']);
    } else if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: sessions, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      sessions: sessions || []
    });
  } catch (error) {
    console.error('Get count sessions error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const createCountSession = async (req, res) => {
  try {
    const { countType, warehouseId, rackCodes, scheduledDate } = req.body;
    const userId = req.user?.id;

    const { data, error } = await supabase
      .from('inventory_count_sessions')
      .insert({
        count_number: `CNT-${Date.now()}`,
        count_type: countType,
        warehouse_id: warehouseId,
        rack_codes: rackCodes || [],
        scheduled_date: scheduledDate,
        status: 'PLANNED',
        created_by: userId
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      session: data
    });
  } catch (error) {
    console.error('Create count session error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const recordCount = async (req, res) => {
  try {
    const { sessionId, inventoryUnitId, countedQuantity, notes } = req.body;
    const userId = req.user?.id;

    // Get system quantity
    const { data: unit } = await supabase
      .from('inventory_units')
      .select('id, product_id, warehouse_id, rack_code, position_code')
      .eq('id', inventoryUnitId)
      .single();

    const { data, error } = await supabase
      .from('inventory_count_items')
      .insert({
        count_session_id: sessionId,
        inventory_unit_id: inventoryUnitId,
        product_id: unit.product_id,
        warehouse_id: unit.warehouse_id,
        rack_code: unit.rack_code,
        position_code: unit.position_code,
        system_quantity: 1, // Each unit is 1
        counted_quantity: countedQuantity,
        status: 'COUNTED',
        counted_by: userId,
        counted_at: new Date().toISOString(),
        notes: notes
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      countItem: data
    });
  } catch (error) {
    console.error('Record count error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// PERFORMANCE
// ──────────────────────────────────────────────────────────────────────────

export const getPerformanceStats = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { period = 'today' } = req.query;

    let dateFilter;
    if (period === 'today') {
      dateFilter = new Date().toISOString().split('T')[0];
    } else if (period === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFilter = weekAgo.toISOString().split('T')[0];
    }

    const { data: performance, error } = await supabase
      .from('warehouse_staff_performance')
      .select('*')
      .eq('user_id', userId)
      .gte('performance_date', dateFilter)
      .order('performance_date', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      performance: performance || []
    });
  } catch (error) {
    console.error('Get performance stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export default {
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
};
