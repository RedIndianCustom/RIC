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

/**
 * Get storage positions for a warehouse location (rack)
 * @route GET /api/warehouse-locations/:id/positions
 */
export async function getStoragePositions(req, res) {
  try {
    const { id } = req.params;

    // First, verify the warehouse location exists
    const { data: location, error: locationError } = await supabaseAdmin
      .from('warehouse_locations')
      .select('id, code, metadata')
      .eq('id', id)
      .single();

    if (locationError || !location) {
      return res.status(404).json({ error: 'Warehouse location not found' });
    }

    // Get existing positions from database
    const { data: positions, error: positionsError } = await supabaseAdmin
      .from('warehouse_storage_positions')
      .select('*')
      .eq('warehouse_location_id', id)
      .order('section_number')
      .order('shelf_number')
      .order('subsection_number');

    if (positionsError) {
      console.error('Error fetching positions:', positionsError);
      throw positionsError;
    }

    // If no positions exist, generate them from metadata
    if (!positions || positions.length === 0) {
      const metadata = location.metadata || {};
      
      if (metadata.sectionsPerRack && metadata.shelvesPerSection && 
          metadata.subsectionsPerSection && metadata.tiresPerSubsection) {
        
        console.log(`📦 Generating positions for rack ${location.code}...`);
        
        // Call the generate function
        const { data: generateResult, error: generateError } = await supabaseAdmin
          .rpc('generate_storage_positions_for_rack', {
            p_warehouse_location_id: id,
            p_sections: metadata.sectionsPerRack,
            p_shelves: metadata.shelvesPerSection,
            p_subsections: metadata.subsectionsPerSection,
            p_capacity_per_subsection: metadata.tiresPerSubsection
          });

        if (generateError) {
          console.error('Error generating positions:', generateError);
          throw generateError;
        }

        console.log(`✅ Generated ${generateResult} positions`);

        // Fetch the newly created positions
        const { data: newPositions, error: newError } = await supabaseAdmin
          .from('warehouse_storage_positions')
          .select('*')
          .eq('warehouse_location_id', id)
          .order('section_number')
          .order('shelf_number')
          .order('subsection_number');

        if (newError) throw newError;

        return res.json({ positions: newPositions || [] });
      }
      
      // No metadata to generate from, return empty
      return res.json({ positions: [] });
    }

    return res.json({ positions: positions || [] });
  } catch (err) {
    console.error('Error fetching storage positions:', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Update a specific storage position (assign/update tires)
 * @route PUT /api/warehouse-locations/:id/positions/:positionId
 * 
 * Supports both single and multiple products per position:
 * 
 * Single product (legacy):
 * { tire_size: "90/90-17", quantity: 8 }
 * 
 * Multiple products (enhanced):
 * { 
 *   products: [
 *     { product_id: "uuid", tire_size: "90/90-17", quantity: 5 },
 *     { product_id: "uuid", tire_size: "100/90-19", quantity: 3 }
 *   ],
 *   total_quantity: 8
 * }
 */
/**
 * Update a specific storage position (assign/update tires)
 * @route PUT /api/warehouse-locations/:id/positions/:positionId
 * 
 * Supports three formats:
 * 
 * 1. Single tire (legacy):
 * { tire_size: "90/90-17", quantity: 8 }
 * 
 * 2. Multiple tire sizes (new - from WarehouseLocations.jsx):
 * { 
 *   tire_entries: [
 *     { tire_size: "90/90-17", quantity: 5 },
 *     { tire_size: "100/90-19", quantity: 3 }
 *   ],
 *   total_quantity: 8
 * }
 * 
 * 3. Multiple products with IDs:
 * { 
 *   products: [
 *     { product_id: "uuid", tire_size: "90/90-17", quantity: 5 },
 *     { product_id: "uuid", tire_size: "100/90-19", quantity: 3 }
 *   ],
 *   total_quantity: 8
 * }
 */
export async function updateStoragePosition(req, res) {
  try {
    const { id, positionId } = req.params;
    const { 
      tire_size, 
      quantity, 
      products, 
      total_quantity, 
      tire_entries,
      // Reservation fields
      status,
      reserved_quantity,
      reserved_for_shipment,
      product_metadata
    } = req.body;

    // Get the position
    const { data: position, error: positionError } = await supabaseAdmin
      .from('warehouse_storage_positions')
      .select('*')
      .eq('id', positionId)
      .eq('warehouse_location_id', id)
      .single();

    if (positionError || !position) {
      return res.status(404).json({ error: 'Storage position not found' });
    }

    let updateData;
    let finalQuantity;
    let tireSizeDisplay;

    // Handle multiple tire entries (new format from WarehouseLocations.jsx)
    if (tire_entries && Array.isArray(tire_entries)) {
      // Validate tire_entries array
      if (tire_entries.length === 0) {
        return res.status(400).json({ error: 'tire_entries array cannot be empty' });
      }

      // Calculate total quantity
      finalQuantity = tire_entries.reduce((sum, entry) => sum + (parseInt(entry.quantity) || 0), 0);

      // Validate total doesn't exceed capacity
      if (finalQuantity > position.capacity) {
        return res.status(400).json({ 
          error: `Total quantity (${finalQuantity}) exceeds position capacity (${position.capacity})` 
        });
      }

      // Validate each entry has tire_size
      for (const entry of tire_entries) {
        if (!entry.tire_size && finalQuantity > 0) {
          return res.status(400).json({ 
            error: 'All entries must have tire_size when quantity > 0' 
          });
        }
      }

      // Create display string
      tireSizeDisplay = tire_entries.length === 1 
        ? tire_entries[0].tire_size 
        : `${tire_entries[0].tire_size} +${tire_entries.length - 1} more`;

      updateData = {
        current_stock: finalQuantity,
        tire_size: tireSizeDisplay,
        metadata: { tire_entries }, // Store full breakdown
        status: finalQuantity === 0 ? 'empty' : 
                finalQuantity >= position.capacity ? 'full' : 'available'
      };

    } else if (products && Array.isArray(products)) {
      // Validate products array
      if (products.length === 0) {
        return res.status(400).json({ error: 'products array cannot be empty' });
      }

      // Calculate total quantity from products
      finalQuantity = products.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0);

      // Validate total doesn't exceed capacity
      if (finalQuantity > position.capacity) {
        return res.status(400).json({ 
          error: `Total quantity (${finalQuantity}) exceeds position capacity (${position.capacity})` 
        });
      }

      // Validate each product has required fields
      for (const product of products) {
        if (!product.tire_size && finalQuantity > 0) {
          return res.status(400).json({ 
            error: 'All products must have tire_size when quantity > 0' 
          });
        }
      }

      // Create display string (first tire size + count if multiple)
      tireSizeDisplay = products.length === 1 
        ? products[0].tire_size 
        : `${products[0].tire_size} +${products.length - 1} more`;

      updateData = {
        current_stock: finalQuantity,
        tire_size: tireSizeDisplay,
        metadata: { products }, // Store full product breakdown in metadata
        status: finalQuantity === 0 ? 'empty' : 
                finalQuantity >= position.capacity ? 'full' : 'available'
      };

    } else {
      // Handle single product (legacy format) or reservation
      if (quantity === undefined || quantity === null) {
        return res.status(400).json({ error: 'quantity is required' });
      }

      finalQuantity = parseInt(quantity);
      if (isNaN(finalQuantity) || finalQuantity < 0) {
        return res.status(400).json({ error: 'quantity must be a non-negative number' });
      }

      // Validate capacity
      if (finalQuantity > position.capacity) {
        return res.status(400).json({ 
          error: `Quantity (${finalQuantity}) exceeds position capacity (${position.capacity})` 
        });
      }

      // Validate tire_size is provided if quantity > 0
      if (finalQuantity > 0 && (!tire_size || tire_size.trim() === '')) {
        return res.status(400).json({ 
          error: 'tire_size is required when quantity is greater than zero' 
        });
      }

      updateData = {
        current_stock: finalQuantity,
        tire_size: finalQuantity > 0 ? tire_size.trim() : null,
        status: status || (finalQuantity === 0 ? 'empty' : 
                finalQuantity >= position.capacity ? 'full' : 'available')
      };

      // Add reservation fields if provided
      if (reserved_quantity !== undefined) {
        updateData.reserved_quantity = reserved_quantity;
      }
      if (reserved_for_shipment) {
        updateData.reserved_for_shipment = reserved_for_shipment;
      }
      if (product_metadata) {
        updateData.product_metadata = product_metadata;
      }
      if (status === 'reserved') {
        updateData.reservation_date = new Date().toISOString();
      }
    }

    // Update the position
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('warehouse_storage_positions')
      .update(updateData)
      .eq('id', positionId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating position:', updateError);
      throw updateError;
    }

    console.log(`✅ Updated position ${position.position_code}: ${updateData.tire_size || 'empty'} × ${finalQuantity}${updateData.status === 'reserved' ? ' (RESERVED)' : ''}`);

    return res.json({ 
      success: true,
      position: updated,
      message: 'Storage position updated successfully'
    });
  } catch (err) {
    console.error('Error updating storage position:', err);
    return res.status(500).json({ error: err.message });
  }
}

