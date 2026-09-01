/**
 * ============================================================================
 * INVENTORY ADVANCED FEATURES CONTROLLER
 * ============================================================================
 * Low Stock Alerts, Bulk Operations, Analytics, Movement History
 * ============================================================================
 */

import { supabaseAdmin } from '../config/supabase.js';

// ──────────────────────────────────────────────────────────────────────────
// LOW STOCK ALERTS
// ──────────────────────────────────────────────────────────────────────────

/**
 * GET /api/inventory/low-stock-alerts
 * Get all products with stock below threshold
 */
export async function getLowStockAlerts(req, res) {
  try {
    console.log('📊 Fetching low stock alerts...');

    const { data, error } = await supabaseAdmin.rpc('check_low_stock_alerts');

    if (error) {
      console.error('Failed to fetch low stock alerts:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch low stock alerts',
        details: error.message
      });
    }

    console.log(`✅ Found ${data?.length || 0} low stock alerts`);

    return res.json({
      success: true,
      alerts: data || [],
      total: data?.length || 0,
      critical: data?.filter(a => a.alert_level === 'CRITICAL').length || 0,
      low: data?.filter(a => a.alert_level === 'LOW').length || 0
    });
  } catch (error) {
    console.error('❌ Get low stock alerts error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch low stock alerts',
      details: error.message
    });
  }
}

/**
 * GET /api/inventory/low-stock-thresholds
 * Get configured thresholds
 */
export async function getLowStockThresholds(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('low_stock_thresholds')
      .select(`
        *,
        products (
          id,
          sku,
          brand,
          model,
          category
        ),
        warehouses (
          id,
          code,
          name
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json({
      success: true,
      thresholds: data
    });
  } catch (error) {
    console.error('❌ Get thresholds error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch thresholds'
    });
  }
}

/**
 * POST /api/inventory/low-stock-thresholds
 * Create new threshold
 */
export async function createLowStockThreshold(req, res) {
  try {
    const {
      product_id,
      warehouse_id,
      min_quantity,
      reorder_quantity,
      critical_quantity,
      alert_enabled,
      alert_recipients
    } = req.body;

    if (!product_id || !min_quantity) {
      return res.status(400).json({
        success: false,
        error: 'product_id and min_quantity are required'
      });
    }

    const { data, error } = await supabaseAdmin
      .from('low_stock_thresholds')
      .insert({
        product_id,
        warehouse_id: warehouse_id || null,
        min_quantity,
        reorder_quantity: reorder_quantity || min_quantity * 5,
        critical_quantity: critical_quantity || Math.floor(min_quantity / 2),
        alert_enabled: alert_enabled !== undefined ? alert_enabled : true,
        alert_recipients: alert_recipients || [],
        created_by: req.user?.id
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        return res.status(409).json({
          success: false,
          error: 'Threshold already exists for this product and warehouse'
        });
      }
      throw error;
    }

    console.log('✅ Low stock threshold created:', data.id);

    return res.json({
      success: true,
      threshold: data
    });
  } catch (error) {
    console.error('❌ Create threshold error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create threshold'
    });
  }
}

/**
 * PATCH /api/inventory/low-stock-thresholds/:id
 * Update threshold
 */
export async function updateLowStockThreshold(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabaseAdmin
      .from('low_stock_thresholds')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return res.json({
      success: true,
      threshold: data
    });
  } catch (error) {
    console.error('❌ Update threshold error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update threshold'
    });
  }
}

// ──────────────────────────────────────────────────────────────────────────
// STOCK MOVEMENT HISTORY
// ──────────────────────────────────────────────────────────────────────────

/**
 * GET /api/inventory/movements
 * Get stock movement history
 */
export async function getStockMovements(req, res) {
  try {
    const { product_id, warehouse_id, days = 30, limit = 100 } = req.query;

    console.log('📦 Fetching stock movements...');

    const { data, error} = await supabaseAdmin.rpc('get_stock_movement_history', {
      p_product_id: product_id || null,
      p_warehouse_id: warehouse_id || null,
      p_days: parseInt(days)
    });

    if (error) throw error;

    // Limit results
    const limitedData = data.slice(0, parseInt(limit));

    return res.json({
      success: true,
      movements: limitedData,
      total: limitedData.length
    });
  } catch (error) {
    console.error('❌ Get movements error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch stock movements'
    });
  }
}

/**
 * POST /api/inventory/movements
 * Manually log a stock movement
 */
export async function createStockMovement(req, res) {
  try {
    const {
      inventory_unit_id,
      product_id,
      movement_type,
      from_warehouse_id,
      to_warehouse_id,
      from_rack,
      to_rack,
      reason,
      notes,
      quantity = 1
    } = req.body;

    const { data, error } = await supabaseAdmin
      .from('stock_movements')
      .insert({
        inventory_unit_id,
        product_id,
        movement_type,
        from_warehouse_id,
        to_warehouse_id,
        from_rack,
        to_rack,
        reason,
        notes,
        quantity,
        executed_by: req.user?.id,
        executed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Stock movement logged:', data.id);

    return res.json({
      success: true,
      movement: data
    });
  } catch (error) {
    console.error('❌ Create movement error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to log stock movement'
    });
  }
}

// ──────────────────────────────────────────────────────────────────────────
// BULK OPERATIONS
// ──────────────────────────────────────────────────────────────────────────

/**
 * POST /api/inventory/bulk-update
 * Bulk update inventory status or location
 */
export async function bulkUpdateInventory(req, res) {
  try {
    const { inventory_unit_ids, updates } = req.body;

    if (!inventory_unit_ids || !Array.isArray(inventory_unit_ids) || inventory_unit_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'inventory_unit_ids array is required'
      });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'updates object is required'
      });
    }

    console.log(`📦 Bulk updating ${inventory_unit_ids.length} inventory units...`);

    // Log the bulk operation
    const { data: bulkOp, error: bulkOpError } = await supabaseAdmin
      .from('bulk_operations')
      .insert({
        operation_type: 'STATUS_UPDATE',
        affected_count: inventory_unit_ids.length,
        inventory_unit_ids,
        parameters: { updates },
        status: 'processing',
        started_by: req.user?.id
      })
      .select()
      .single();

    if (bulkOpError) throw bulkOpError;

    // Perform the bulk update
    const { data: updatedUnits, error: updateError } = await supabaseAdmin
      .from('inventory_units')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .in('id', inventory_unit_ids)
      .select();

    if (updateError) {
      // Mark operation as failed
      await supabaseAdmin
        .from('bulk_operations')
        .update({
          status: 'failed',
          error_details: { error: updateError.message },
          completed_at: new Date().toISOString()
        })
        .eq('id', bulkOp.id);

      throw updateError;
    }

    // Mark operation as completed
    await supabaseAdmin
      .from('bulk_operations')
      .update({
        status: 'completed',
        success_count: updatedUnits.length,
        completed_at: new Date().toISOString()
      })
      .eq('id', bulkOp.id);

    console.log(`✅ Bulk update completed: ${updatedUnits.length} units updated`);

    return res.json({
      success: true,
      updated_count: updatedUnits.length,
      bulk_operation_id: bulkOp.id
    });
  } catch (error) {
    console.error('❌ Bulk update error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to perform bulk update'
    });
  }
}

/**
 * GET /api/inventory/bulk-operations
 * Get bulk operation history
 */
export async function getBulkOperations(req, res) {
  try {
    const { limit = 50 } = req.query;

    const { data, error } = await supabaseAdmin
      .from('bulk_operations')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    return res.json({
      success: true,
      operations: data
    });
  } catch (error) {
    console.error('❌ Get bulk operations error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch bulk operations'
    });
  }
}

// ──────────────────────────────────────────────────────────────────────────
// ANALYTICS
// ──────────────────────────────────────────────────────────────────────────

/**
 * GET /api/inventory/analytics
 * Get inventory analytics and trends
 */
export async function getInventoryAnalytics(req, res) {
  try {
    const { warehouse_id, period = 'daily', days = 30 } = req.query;

    console.log('📊 Generating inventory analytics...');

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get inventory statistics
    let query = supabaseAdmin
      .from('inventory_units')
      .select('id, status, warehouse_id, created_at, received_at');

    if (warehouse_id && warehouse_id !== 'all') {
      query = query.eq('warehouse_id', warehouse_id);
    }

    const { data: inventoryData, error: invError } = await query;
    if (invError) throw invError;

    // Get stock movements
    let movementQuery = supabaseAdmin
      .from('stock_movements')
      .select('*')
      .gte('executed_at', startDate.toISOString())
      .lte('executed_at', endDate.toISOString());

    if (warehouse_id && warehouse_id !== 'all') {
      movementQuery = movementQuery.or(`from_warehouse_id.eq.${warehouse_id},to_warehouse_id.eq.${warehouse_id}`);
    }

    const { data: movementData, error: movError } = await movementQuery;
    if (movError) throw movError;

    // Calculate metrics
    const totalUnits = inventoryData.length;
    const statusBreakdown = inventoryData.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});

    const movementsByType = movementData.reduce((acc, movement) => {
      acc[movement.movement_type] = (acc[movement.movement_type] || 0) + 1;
      return acc;
    }, {});

    // Calculate trend (compare to previous period)
    const midDate = new Date();
    midDate.setDate(midDate.getDate() - Math.floor(parseInt(days) / 2));
    
    const recentUnits = inventoryData.filter(item => 
      new Date(item.created_at) >= midDate
    ).length;
    
    const olderUnits = inventoryData.filter(item => 
      new Date(item.created_at) < midDate
    ).length;

    const growthRate = olderUnits > 0 
      ? ((recentUnits - olderUnits) / olderUnits * 100).toFixed(2)
      : 0;

    // Calculate turnover rate (simplified)
    const soldUnits = statusBreakdown['SOLD'] || 0;
    const availableUnits = (statusBreakdown['AVAILABLE'] || 0) + (statusBreakdown['NEW'] || 0);
    const turnoverRate = availableUnits > 0
      ? (soldUnits / availableUnits * 100).toFixed(2)
      : 0;

    // Movement trends by date
    const movementTrends = movementData.reduce((acc, movement) => {
      const date = movement.executed_at.split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, count: 0, types: {} };
      }
      acc[date].count++;
      acc[date].types[movement.movement_type] = (acc[date].types[movement.movement_type] || 0) + 1;
      return acc;
    }, {});

    const analytics = {
      summary: {
        totalUnits,
        availableUnits,
        soldUnits,
        returnedUnits: statusBreakdown['RETURNED'] || 0,
        damagedUnits: statusBreakdown['DAMAGED'] || 0,
        growthRate: parseFloat(growthRate),
        turnoverRate: parseFloat(turnoverRate)
      },
      statusBreakdown,
      movementsByType,
      movementTrends: Object.values(movementTrends).sort((a, b) => 
        a.date.localeCompare(b.date)
      ),
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days: parseInt(days)
      }
    };

    return res.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('❌ Get analytics error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate analytics'
    });
  }
}

/**
 * GET /api/inventory/dashboard-stats
 * Get quick dashboard statistics
 */
export async function getDashboardStats(req, res) {
  try {
    console.log('📊 Fetching dashboard stats...');
    const { warehouse_id } = req.query;

    // Get inventory counts
    let invQuery = supabaseAdmin
      .from('inventory_units')
      .select('status, warehouse_id');

    if (warehouse_id && warehouse_id !== 'all') {
      invQuery = invQuery.eq('warehouse_id', warehouse_id);
    }

    const { data: inventory, error: invError } = await invQuery;
    if (invError) {
      console.error('Inventory query error:', invError);
      throw invError;
    }

    console.log(`✅ Found ${inventory?.length || 0} inventory units`);

    // Get low stock alerts count - with fallback
    let alertsCount = 0;
    let criticalCount = 0;
    
    try {
      const { data: alerts, error: alertError } = await supabaseAdmin
        .rpc('check_low_stock_alerts');
      
      if (alertError) {
        console.warn('Low stock alerts RPC warning:', alertError.message);
        // Don't throw, just log and use default values
      } else {
        alertsCount = alerts?.length || 0;
        criticalCount = alerts?.filter(a => a.alert_level === 'CRITICAL').length || 0;
      }
    } catch (alertErr) {
      console.warn('Low stock alerts failed, using defaults:', alertErr.message);
    }

    // Get recent movements - with fallback
    let movementsCount = 0;
    try {
      const { data: recentMovements, error: movError } = await supabaseAdmin
        .from('stock_movements')
        .select('movement_type, executed_at')
        .gte('executed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('executed_at', { ascending: false });
      
      if (movError) {
        console.warn('Stock movements warning:', movError.message);
      } else {
        movementsCount = recentMovements?.length || 0;
      }
    } catch (movErr) {
      console.warn('Stock movements failed, using defaults:', movErr.message);
    }

    const stats = {
      totalUnits: inventory?.length || 0,
      available: inventory?.filter(i => ['NEW', 'AVAILABLE'].includes(i.status)).length || 0,
      sold: inventory?.filter(i => i.status === 'SOLD').length || 0,
      returned: inventory?.filter(i => i.status === 'RETURNED').length || 0,
      damaged: inventory?.filter(i => i.status === 'DAMAGED').length || 0,
      lowStockAlerts: alertsCount,
      criticalAlerts: criticalCount,
      movementsToday: movementsCount
    };

    console.log('✅ Dashboard stats:', stats);

    return res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ Get dashboard stats error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard stats',
      details: error.message
    });
  }
}
