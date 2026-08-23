import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

/**
 * Traceability Service
 * Provides full product lifecycle tracking through barcode scanning
 * 
 * Traceability Flow:
 * Product → Batch → Inventory Unit → Barcode → Shipment → Order → Return
 */

/**
 * Get complete traceability information for a barcode
 * 
 * @param {string} barcodeValue - The barcode value to trace
 * @returns {Promise<Object>} - Complete traceability data
 */
export async function getTraceabilityByBarcode(barcodeValue) {
  try {
    // 1. Get barcode with basic relationships
    const { data: barcode, error: barcodeError } = await supabaseAdmin
      .from('barcodes')
      .select(`
        id,
        barcode_value,
        barcode_type,
        status,
        qr_code_url,
        printed_count,
        last_printed_at,
        created_at,
        updated_at,
        products:product_id (
          id,
          sku,
          brand,
          model,
          dimensions,
          category,
          unit_cost,
          retail_price,
          current_stock,
          reorder_level,
          status
        ),
        batches:batch_id (
          id,
          batch_number,
          container_number,
          bl_number,
          quantity,
          manufactured_date,
          expiry_date,
          status,
          created_at
        )
      `)
      .eq('barcode_value', barcodeValue)
      .single();

    if (barcodeError) {
      if (barcodeError.code === 'PGRST116') {
        return null; // Not found
      }
      throw barcodeError;
    }

    // 2. Get inventory units associated with this barcode
    const { data: inventoryUnits, error: inventoryError } = await supabaseAdmin
      .from('inventory_units')
      .select(`
        id,
        unit_number,
        inventory_unit_code,
        status,
        condition,
        quantity,
        location_code,
        received_date,
        last_movement_date,
        notes,
        shelf_number,
        section_number,
        subsection_number,
        position_code,
        assigned_at,
        warehouses:warehouse_id (
          id,
          code,
          name,
          location
        ),
        rack_configurations:rack_id (
          id,
          rack_code,
          rack_number,
          designated_size,
          size_category,
          total_shelves,
          sections_per_shelf,
          subsections_per_section,
          capacity_per_subsection,
          total_capacity,
          current_count
        )
      `)
      .eq('barcode_id', barcode.id);

    if (inventoryError && inventoryError.code !== 'PGRST116') {
      logger.warn('Error fetching inventory units:', inventoryError);
    }

    // 3. Get shipment information (via batch)
    let shipment = null;
    if (barcode.batches?.id) {
      const { data: batchData } = await supabaseAdmin
        .from('batches')
        .select(`
          shipments:shipment_id (
            id,
            shipment_number,
            expected_date,
            actual_date,
            received_date,
            container_number,
            bl_number,
            status,
            condition,
            inspection_completed,
            quality_status,
            suppliers:supplier_id (
              id,
              name,
              contact_person,
              email,
              phone
            )
          )
        `)
        .eq('id', barcode.batches.id)
        .single();

      shipment = batchData?.shipments || null;
    }

    // 4. Get orders containing this barcode
    const { data: orderItems, error: orderError } = await supabaseAdmin
      .from('order_items')
      .select(`
        id,
        quantity,
        unit_price,
        total_price,
        created_at,
        orders:order_id (
          id,
          order_number,
          customer_name,
          customer_email,
          customer_phone,
          status,
          priority,
          total_amount,
          payment_status,
          payment_method,
          created_at,
          updated_at
        )
      `)
      .eq('barcode_id', barcode.id);

    if (orderError && orderError.code !== 'PGRST116') {
      logger.warn('Error fetching orders:', orderError);
    }

    // 5. Get returns for this barcode
    const { data: returns, error: returnError } = await supabaseAdmin
      .from('returns')
      .select(`
        id,
        return_number,
        reason,
        condition,
        status,
        refund_amount,
        restocking_action,
        discount_percentage,
        is_saleable,
        notes,
        processed_at,
        created_at,
        orders:order_id (
          id,
          order_number,
          customer_name
        )
      `)
      .eq('barcode_id', barcode.id);

    if (returnError && returnError.code !== 'PGRST116') {
      logger.warn('Error fetching returns:', returnError);
    }

    // 6. Get stock movements for this barcode
    const { data: stockMovements, error: movementError } = await supabaseAdmin
      .from('stock_movements')
      .select(`
        id,
        movement_type,
        quantity,
        from_location,
        to_location,
        reason,
        reference_type,
        reference_id,
        created_at,
        from_warehouse:from_warehouse_id (
          id,
          code,
          name
        ),
        to_warehouse:to_warehouse_id (
          id,
          code,
          name
        ),
        created_by_user:created_by (
          id,
          email,
          full_name
        )
      `)
      .eq('barcode_id', barcode.id)
      .order('created_at', { ascending: false });

    if (movementError && movementError.code !== 'PGRST116') {
      logger.warn('Error fetching stock movements:', movementError);
    }

    // 7. Get barcode scan history
    const { data: scanHistory, error: scanError } = await supabaseAdmin
      .from('barcode_scans')
      .select(`
        id,
        scan_type,
        location,
        reference_type,
        reference_id,
        device_info,
        created_at,
        scanned_by_user:scanned_by (
          id,
          email,
          full_name
        )
      `)
      .eq('barcode_id', barcode.id)
      .order('created_at', { ascending: false })
      .limit(50); // Last 50 scans

    if (scanError && scanError.code !== 'PGRST116') {
      logger.warn('Error fetching scan history:', scanError);
    }

    // 8. Get picking tasks involving this barcode
    const { data: pickingTasks, error: pickingError } = await supabaseAdmin
      .from('picking_tasks')
      .select(`
        id,
        task_number,
        quantity_requested,
        quantity_picked,
        actual_quantity,
        status,
        priority,
        completed_at,
        created_at,
        orders:order_id (
          id,
          order_number,
          customer_name
        ),
        picked_by_user:picked_by (
          id,
          email,
          full_name
        )
      `)
      .eq('barcode_id', barcode.id)
      .order('created_at', { ascending: false });

    if (pickingError && pickingError.code !== 'PGRST116') {
      logger.warn('Error fetching picking tasks:', pickingError);
    }

    // 9. Calculate lifecycle summary
    const lifecycleSummary = {
      totalScans: scanHistory?.length || 0,
      totalOrders: orderItems?.length || 0,
      totalReturns: returns?.length || 0,
      totalMovements: stockMovements?.length || 0,
      currentStatus: barcode.status,
      currentLocation: inventoryUnits?.[0]?.location_code || 'Unknown',
      currentWarehouse: inventoryUnits?.[0]?.warehouses?.name || 'Unassigned',
      lastScanned: scanHistory?.[0]?.created_at || null,
      lastMoved: stockMovements?.[0]?.created_at || null,
      isReturned: (returns?.length || 0) > 0,
      isSold: orderItems?.some(item => item.orders?.status === 'completed') || false,
    };

    // 10. Build complete traceability object
    const traceability = {
      barcode: {
        value: barcode.barcode_value,
        type: barcode.barcode_type,
        status: barcode.status,
        qrCodeUrl: barcode.qr_code_url,
        printedCount: barcode.printed_count,
        lastPrinted: barcode.last_printed_at,
        createdAt: barcode.created_at,
        updatedAt: barcode.updated_at,
      },
      product: barcode.products ? {
        id: barcode.products.id,
        sku: barcode.products.sku,
        brand: barcode.products.brand,
        model: barcode.products.model,
        dimensions: barcode.products.dimensions,
        category: barcode.products.category,
        unitCost: barcode.products.unit_cost,
        retailPrice: barcode.products.retail_price,
        currentStock: barcode.products.current_stock,
        reorderLevel: barcode.products.reorder_level,
        status: barcode.products.status,
      } : null,
      batch: barcode.batches ? {
        id: barcode.batches.id,
        batchNumber: barcode.batches.batch_number,
        containerNumber: barcode.batches.container_number,
        blNumber: barcode.batches.bl_number,
        quantity: barcode.batches.quantity,
        manufacturedDate: barcode.batches.manufactured_date,
        expiryDate: barcode.batches.expiry_date,
        status: barcode.batches.status,
        createdAt: barcode.batches.created_at,
      } : null,
      shipment: shipment,
      inventoryUnits: inventoryUnits || [],
      orders: orderItems?.map(item => ({
        orderItemId: item.id,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalPrice: item.total_price,
        orderDate: item.created_at,
        order: item.orders,
      })) || [],
      returns: returns || [],
      stockMovements: stockMovements || [],
      scanHistory: scanHistory || [],
      pickingTasks: pickingTasks || [],
      lifecycleSummary,
    };

    return traceability;

  } catch (err) {
    logger.error('Error fetching traceability:', err);
    throw new Error(`Failed to retrieve traceability data: ${err.message}`);
  }
}

/**
 * Get traceability timeline (chronological event history)
 */
export async function getTraceabilityTimeline(barcodeValue) {
  const traceability = await getTraceabilityByBarcode(barcodeValue);
  
  if (!traceability) {
    return null;
  }

  // Combine all events into a timeline
  const events = [];

  // Barcode created
  events.push({
    type: 'barcode_created',
    timestamp: traceability.barcode.createdAt,
    description: `Barcode ${barcodeValue} generated`,
    details: traceability.barcode,
  });

  // Batch created
  if (traceability.batch) {
    events.push({
      type: 'batch_created',
      timestamp: traceability.batch.createdAt,
      description: `Assigned to batch ${traceability.batch.batchNumber}`,
      details: traceability.batch,
    });
  }

  // Shipment received
  if (traceability.shipment?.received_date) {
    events.push({
      type: 'shipment_received',
      timestamp: traceability.shipment.received_date,
      description: `Received in shipment ${traceability.shipment.shipment_number}`,
      details: traceability.shipment,
    });
  }

  // Stock movements
  traceability.stockMovements.forEach(movement => {
    events.push({
      type: 'stock_movement',
      timestamp: movement.created_at,
      description: `${movement.movement_type}: ${movement.from_location || 'N/A'} → ${movement.to_location || 'N/A'}`,
      details: movement,
    });
  });

  // Picking tasks
  traceability.pickingTasks.forEach(task => {
    events.push({
      type: 'picking_task',
      timestamp: task.completed_at || task.created_at,
      description: `Picked for order ${task.orders?.order_number || 'N/A'} (${task.status})`,
      details: task,
    });
  });

  // Orders
  traceability.orders.forEach(orderItem => {
    events.push({
      type: 'order_created',
      timestamp: orderItem.orderDate,
      description: `Sold in order ${orderItem.order.order_number} to ${orderItem.order.customer_name}`,
      details: orderItem,
    });
  });

  // Returns
  traceability.returns.forEach(returnItem => {
    events.push({
      type: 'return_created',
      timestamp: returnItem.created_at,
      description: `Returned (${returnItem.reason}) - ${returnItem.status}`,
      details: returnItem,
    });
  });

  // Barcode scans (last 10 only for timeline)
  traceability.scanHistory.slice(0, 10).forEach(scan => {
    events.push({
      type: 'barcode_scan',
      timestamp: scan.created_at,
      description: `Scanned (${scan.scan_type}) at ${scan.location || 'Unknown location'}`,
      details: scan,
    });
  });

  // Sort by timestamp (most recent first)
  events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return {
    barcodeValue,
    totalEvents: events.length,
    timeline: events,
    summary: traceability.lifecycleSummary,
  };
}

export default {
  getTraceabilityByBarcode,
  getTraceabilityTimeline,
};
