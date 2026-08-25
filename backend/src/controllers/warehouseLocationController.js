/**
 * ============================================================================
 * WAREHOUSE LOCATION CONTROLLER
 * ============================================================================
 * Handles warehouse location management and availability checks
 * ============================================================================
 */

import { supabaseAdmin } from '../config/supabase.js';

/**
 * Get all warehouse locations with optional filters
 * @route GET /api/warehouse-locations
 */
export async function getWarehouseLocations(req, res) {
  try {
    const { status, zone, min_capacity, limit = 100, offset = 0 } = req.query;

    let query = supabaseAdmin
      .from('warehouse_locations')
      .select('*')
      .order('zone')
      .order('aisle')
      .order('rack')
      .order('shelf')
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (zone) {
      query = query.eq('zone', zone);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    // Filter by available capacity if requested
    let locations = data || [];
    if (min_capacity) {
      const minCap = parseInt(min_capacity);
      locations = locations.filter(
        loc => (loc.capacity - loc.current_stock) >= minCap
      );
    }

    return res.json({
      locations,
      total: count || locations.length,
      limit,
      offset
    });
  } catch (err) {
    console.error('Error fetching warehouse locations:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Get available warehouse locations (active with capacity)
 * @route GET /api/warehouse-locations/available
 */
export async function getAvailableLocations(req, res) {
  try {
    const { min_capacity = 0 } = req.query;

    const { data, error } = await supabaseAdmin
      .rpc('get_available_warehouse_locations', {
        p_min_capacity: parseInt(min_capacity)
      });

    if (error) throw error;

    return res.json({
      locations: data || [],
      total: (data || []).length
    });
  } catch (err) {
    console.error('Error fetching available locations:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Get warehouse location by ID
 * @route GET /api/warehouse-locations/:id
 */
export async function getWarehouseLocationById(req, res) {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('warehouse_locations')
      .select(`
        *,
        batches:batches!warehouse_location_id (
          id,
          batch_number,
          status,
          products (sku, brand, model)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Warehouse location not found' });
      }
      throw error;
    }

    return res.json({ location: data });
  } catch (err) {
    console.error('Error fetching warehouse location:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Create warehouse location
 * @route POST /api/warehouse-locations
 */
export async function createWarehouseLocation(req, res) {
  try {
    const locationData = req.body;

    const { data, error } = await supabaseAdmin
      .from('warehouse_locations')
      .insert([locationData])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ location: data });
  } catch (err) {
    console.error('Error creating warehouse location:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Update warehouse location
 * @route PUT /api/warehouse-locations/:id
 */
export async function updateWarehouseLocation(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabaseAdmin
      .from('warehouse_locations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Warehouse location not found' });
      }
      throw error;
    }

    return res.json({ location: data });
  } catch (err) {
    console.error('Error updating warehouse location:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Delete warehouse location
 * @route DELETE /api/warehouse-locations/:id
 */
export async function deleteWarehouseLocation(req, res) {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('warehouse_locations')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return res.json({ success: true });
  } catch (err) {
    console.error('Error deleting warehouse location:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Assign batch to warehouse location
 * @route POST /api/warehouse-locations/assign-batch
 */
export async function assignBatchToLocation(req, res) {
  try {
    const { batch_id, location_id, notify_warehouse_staff = true } = req.body;
    const assigned_by = req.user.id;

    if (!batch_id || !location_id) {
      return res.status(400).json({ 
        error: 'batch_id and location_id are required' 
      });
    }

    const { data, error } = await supabaseAdmin
      .rpc('assign_batch_location', {
        p_batch_id: batch_id,
        p_location_id: location_id,
        p_assigned_by: assigned_by,
        p_notify_warehouse_staff: notify_warehouse_staff
      });

    if (error) throw error;

    return res.json(data);
  } catch (err) {
    console.error('Error assigning batch to location:', err);
    return res.status(500).json({ error: err.message });
  }
}

