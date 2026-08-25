/**
 * ============================================================================
 * BATCH CONTROLLER
 * ============================================================================
 * Handles batch CRUD operations for tire inventory batches
 * ============================================================================
 */

import { supabaseAdmin } from '../config/supabase.js';

/**
 * Get all batches with filters
 * @route GET /api/batches
 */
export async function getBatches(req, res) {
  try {
    const { status, shipment_id, product_id, limit = 50, offset = 0 } = req.query;

    let query = supabaseAdmin
      .from('batches')
      .select(`
        *,
        products:product_id (
          id,
          sku,
          brand,
          model,
          dimensions,
          category
        ),
        shipments:shipment_id (
          id,
          shipment_number,
          container_number,
          bl_number,
          product_breakdown,
          suppliers:supplier_id (
            id,
            name
          )
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (shipment_id) {
      query = query.eq('shipment_id', shipment_id);
    }

    if (product_id) {
      query = query.eq('product_id', product_id);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching batches:', error);
      return res.status(500).json({
        error: 'Failed to fetch batches',
        details: error.message
      });
    }

    res.json({
      success: true,
      batches: data || [],
      total: count || data?.length || 0
    });
  } catch (err) {
    console.error('getBatches error:', err);
    res.status(500).json({
      error: 'Internal server error',
      details: err.message
    });
  }
}

/**
 * Get single batch by ID
 * @route GET /api/batches/:id
 */
export async function getBatchById(req, res) {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('batches')
      .select(`
        *,
        products:product_id (
          id,
          sku,
          brand,
          model,
          dimensions,
          category,
          unit_cost,
          retail_price
        ),
        shipments:shipment_id (
          id,
          shipment_number,
          container_number,
          bl_number,
          product_breakdown,
          expected_arrival_date,
          received_date,
          suppliers:supplier_id (
            id,
            name,
            contact_person,
            email
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Batch not found'
        });
      }
      console.error('Error fetching batch:', error);
      return res.status(500).json({
        error: 'Failed to fetch batch',
        details: error.message
      });
    }

    // Get barcode count for this batch
    const { count } = await supabaseAdmin
      .from('barcodes')
      .select('id', { count: 'exact', head: true })
      .eq('batch_id', id);

    res.json({
      success: true,
      batch: {
        ...data,
        barcode_count: count || 0
      }
    });
  } catch (err) {
    console.error('getBatchById error:', err);
    res.status(500).json({
      error: 'Internal server error',
      details: err.message
    });
  }
}

/**
 * Create new batch
 * @route POST /api/batches
 */
export async function createBatch(req, res) {
  try {
    const {
      shipment_id,
      product_id,
      batch_number,
      batch_month,
      batch_year,
      manufactured_date,
      expiry_date,
      notes
    } = req.body;

    // Validation
    if (!shipment_id) {
      return res.status(400).json({ error: 'shipment_id is required' });
    }

    if (!batch_number) {
      return res.status(400).json({ error: 'batch_number is required' });
    }

    if (!batch_month || batch_month < 1 || batch_month > 12) {
      return res.status(400).json({ error: 'batch_month must be between 1 and 12' });
    }

    if (!batch_year || batch_year < 2000 || batch_year > 2100) {
      return res.status(400).json({ error: 'batch_year must be valid' });
    }

    // Verify shipment exists
    const { data: shipment, error: shipmentError } = await supabaseAdmin
      .from('shipments')
      .select('id, status')
      .eq('id', shipment_id)
      .single();

    if (shipmentError || !shipment) {
      return res.status(404).json({
        error: 'Shipment not found'
      });
    }

    // Verify product exists (if provided)
    if (product_id) {
      const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('id', product_id)
        .single();

      if (productError || !product) {
        return res.status(404).json({
          error: 'Product not found'
        });
      }
    }

    // Create batch
    const { data, error } = await supabaseAdmin
      .from('batches')
      .insert({
        shipment_id,
        product_id,
        batch_number,
        batch_month,
        batch_year,
        manufactured_date,
        expiry_date,
        status: 'ACTIVE',
        notes
      })
      .select(`
        *,
        products:product_id (
          id,
          sku,
          brand,
          model,
          dimensions
        ),
        shipments:shipment_id (
          id,
          shipment_number,
          container_number,
          product_breakdown
        )
      `)
      .single();

    if (error) {
      console.error('Error creating batch:', error);

      if (error.code === '23505') { // Unique violation
        return res.status(409).json({
          error: 'Batch number already exists',
          details: error.message
        });
      }

      return res.status(500).json({
        error: 'Failed to create batch',
        details: error.message
      });
    }

    res.status(201).json({
      success: true,
      batch: data,
      message: 'Batch created successfully'
    });
  } catch (err) {
    console.error('createBatch error:', err);
    res.status(500).json({
      error: 'Internal server error',
      details: err.message
    });
  }
}

/**
 * Update batch
 * @route PUT /api/batches/:id
 */
export async function updateBatch(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.created_at;
    delete updates.shipment_id; // Don't allow changing shipment
    delete updates.product_id; // Don't allow changing product

    const { data, error } = await supabaseAdmin
      .from('batches')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        products:product_id (
          id,
          sku,
          brand,
          model
        ),
        shipments:shipment_id (
          id,
          shipment_number,
          product_breakdown
        )
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Batch not found'
        });
      }

      console.error('Error updating batch:', error);
      return res.status(500).json({
        error: 'Failed to update batch',
        details: error.message
      });
    }

    res.json({
      success: true,
      batch: data,
      message: 'Batch updated successfully'
    });
  } catch (err) {
    console.error('updateBatch error:', err);
    res.status(500).json({
      error: 'Internal server error',
      details: err.message
    });
  }
}

/**
 * Delete batch (soft delete by setting status to INACTIVE)
 * @route DELETE /api/batches/:id
 */
export async function deleteBatch(req, res) {
  try {
    const { id } = req.params;

    // Check if batch has barcodes
    const { data: barcodes } = await supabaseAdmin
      .from('barcodes')
      .select('id')
      .eq('batch_id', id)
      .limit(1);

    if (barcodes && barcodes.length > 0) {
      return res.status(409).json({
        error: 'Cannot delete batch with existing barcodes',
        message: 'Please delete all barcodes first'
      });
    }

    // Soft delete by setting status to INACTIVE
    const { data, error } = await supabaseAdmin
      .from('batches')
      .update({ status: 'INACTIVE' })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deleting batch:', error);
      return res.status(500).json({
        error: 'Failed to delete batch',
        details: error.message
      });
    }

    res.json({
      success: true,
      message: 'Batch deactivated successfully'
    });
  } catch (err) {
    console.error('deleteBatch error:', err);
    res.status(500).json({
      error: 'Internal server error',
      details: err.message
    });
  }
}

/**
 * Get batches for a specific shipment
 * @route GET /api/shipments/:shipmentId/batches
 */
export async function getBatchesByShipment(req, res) {
  try {
    const { shipmentId } = req.params;

    const { data, error } = await supabaseAdmin
      .from('batches')
      .select(`
        *,
        products:product_id (
          id,
          sku,
          brand,
          model,
          dimensions
        ),
        shipments:shipment_id (
          id,
          shipment_number,
          product_breakdown
        )
      `)
      .eq('shipment_id', shipmentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching batches:', error);
      return res.status(500).json({
        error: 'Failed to fetch batches',
        details: error.message
      });
    }

    // Get barcode count for each batch
    const batchesWithCounts = await Promise.all(
      (data || []).map(async (batch) => {
        const { count } = await supabaseAdmin
          .from('barcodes')
          .select('id', { count: 'exact', head: true })
          .eq('batch_id', batch.id);

        return {
          ...batch,
          barcode_count: count || 0
        };
      })
    );

    res.json({
      success: true,
      batches: batchesWithCounts,
      total: batchesWithCounts.length
    });
  } catch (err) {
    console.error('getBatchesByShipment error:', err);
    res.status(500).json({
      error: 'Internal server error',
      details: err.message
    });
  }
}

/**
 * Assign warehouse location to batch
 * @route POST /api/batches/:id/assign-location
 */
export async function assignBatchLocation(req, res) {
  try {
    const { id } = req.params;
    const { location_id, notify_warehouse_staff = true } = req.body;
    const assigned_by = req.user.id;

    if (!location_id) {
      return res.status(400).json({ 
        error: 'location_id is required' 
      });
    }

    // Use the database function for proper workflow
    const { data, error } = await supabaseAdmin
      .rpc('assign_batch_location', {
        p_batch_id: id,
        p_location_id: location_id,
        p_assigned_by: assigned_by,
        p_notify_warehouse_staff: notify_warehouse_staff
      });

    if (error) {
      console.error('Error assigning batch location:', error);
      return res.status(500).json({
        error: 'Failed to assign location',
        details: error.message
      });
    }

    res.json({
      success: true,
      ...data,
      message: `Batch assigned to location successfully. ${data.notifications_sent} notification(s) sent.`
    });
  } catch (err) {
    console.error('assignBatchLocation error:', err);
    res.status(500).json({
      error: 'Internal server error',
      details: err.message
    });
  }
}

/**
 * Get batch activities (history log)
 * @route GET /api/batches/:id/activities
 */
export async function getBatchActivities(req, res) {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const { data, error } = await supabaseAdmin
      .from('batch_activities')
      .select(`
        *,
        users:performed_by (
          id,
          full_name,
          email
        )
      `)
      .eq('batch_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching batch activities:', error);
      return res.status(500).json({
        error: 'Failed to fetch batch activities',
        details: error.message
      });
    }

    res.json({
      success: true,
      activities: data || [],
      total: (data || []).length
    });
  } catch (err) {
    console.error('getBatchActivities error:', err);
    res.status(500).json({
      error: 'Internal server error',
      details: err.message
    });
  }
}
