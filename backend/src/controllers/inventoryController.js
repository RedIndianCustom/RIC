/**
 * ============================================================================
 * INVENTORY CONTROLLER
 * ============================================================================
 * Handles inventory unit operations including status updates and returns
 * ============================================================================
 */

import { supabaseAdmin } from '../config/supabase.js';

/**
 * PATCH /api/inventory-units/:id/status
 * Update inventory unit status (for returns, moves, etc.)
 * 
 * Request body:
 * {
 *   status: "RETURNED" | "AVAILABLE" | "SOLD" | "DAMAGED",
 *   reason: "DEFECTIVE" | "WRONG_SIZE" | etc. (optional),
 *   notes: "Additional notes" (optional)
 * }
 */
export async function updateInventoryUnitStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, reason, notes } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Inventory unit ID is required'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    // Valid status values
    const validStatuses = ['NEW', 'AVAILABLE', 'SOLD', 'RETURNED', 'DAMAGED', 'INSPECTION'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    console.log(`📦 Updating inventory unit ${id} status to: ${status}`);

    // Get current inventory unit
    const { data: currentUnit, error: fetchError } = await supabaseAdmin
      .from('inventory_units')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentUnit) {
      console.error('Inventory unit not found:', fetchError);
      return res.status(404).json({
        success: false,
        error: 'Inventory unit not found'
      });
    }

    // Update the inventory unit
    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };

    // Add metadata if provided
    if (reason || notes) {
      updateData.metadata = {
        ...(currentUnit.metadata || {}),
        lastStatusChange: {
          from: currentUnit.status,
          to: status,
          reason: reason || null,
          notes: notes || null,
          changedAt: new Date().toISOString()
        }
      };
    }

    const { data: updatedUnit, error: updateError } = await supabaseAdmin
      .from('inventory_units')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update inventory unit:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to update inventory unit status'
      });
    }

    console.log(`✅ Inventory unit status updated: ${currentUnit.status} → ${status}`);

    // Log the status change to activity_log
    try {
      await supabaseAdmin.from('activity_log').insert({
        user_id: req.user?.id || null,
        action: 'inventory.status_updated',
        category: 'Inventory',
        severity: 'info',
        details: `Inventory unit ${id} status changed from ${currentUnit.status} to ${status}`,
        metadata: { inventoryUnitId: id, from: currentUnit.status, to: status, reason, notes },
      });
    } catch (auditError) {
      // Audit logging is non-critical
      console.warn('Failed to create activity log:', auditError.message);
    }

    return res.json({
      success: true,
      message: `Inventory unit status updated to ${status}`,
      inventoryUnit: updatedUnit
    });

  } catch (error) {
    console.error('❌ Update inventory status error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update inventory unit status'
    });
  }
}

/**
 * GET /api/inventory-units/:id
 * Get a single inventory unit by ID with full details
 */
export async function getInventoryUnit(req, res) {
  try {
    const { id } = req.params;

    console.log(`📦 Fetching inventory unit: ${id}`);

    const { data, error } = await supabaseAdmin
      .from('inventory_units')
      .select(`
        *,
        warehouses (
          id,
          code,
          name
        ),
        products (
          id,
          sku,
          brand,
          model,
          category,
          dimensions
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error('Inventory unit not found:', error);
      return res.status(404).json({
        success: false,
        error: 'Inventory unit not found'
      });
    }

    return res.json({
      success: true,
      inventoryUnit: data
    });

  } catch (error) {
    console.error('❌ Get inventory unit error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch inventory unit'
    });
  }
}

/**
 * GET /api/inventory-units
 * Get all inventory units with optional filtering
 * 
 * Query params:
 * - status: filter by status
 * - warehouse_id: filter by warehouse
 * - rack: filter by rack code
 * - limit: number of results
 */
export async function getInventoryUnits(req, res) {
  try {
    const { status, warehouse_id, rack, limit = 100 } = req.query;

    console.log('📦 Fetching inventory units with filters:', { status, warehouse_id, rack });

    let query = supabaseAdmin
      .from('inventory_units')
      .select(`
        *,
        warehouses (
          id,
          code,
          name
        ),
        products (
          id,
          sku,
          brand,
          model,
          category,
          dimensions
        )
      `)
      .limit(Number(limit))
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (warehouse_id) {
      query = query.eq('warehouse_id', warehouse_id);
    }
    if (rack) {
      query = query.eq('rack', rack);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch inventory units:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch inventory units'
      });
    }

    return res.json({
      success: true,
      inventoryUnits: data,
      total: data.length
    });

  } catch (error) {
    console.error('❌ Get inventory units error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch inventory units'
    });
  }
}
