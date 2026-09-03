/**
 * ============================================================================
 * SHIPMENT CONTROLLER
 * ============================================================================
 * Handles shipment CRUD operations for incoming tire shipments
 * ============================================================================
 */

import { supabaseAdmin } from '../config/supabase.js';

/**
 * Get all shipments with filters
 * @route GET /api/shipments
 */
export async function getShipments(req, res) {
  try {
    const { status, supplier_id, limit = 50, offset = 0 } = req.query;

    let query = supabaseAdmin
      .from('shipments')
      .select(`
        *,
        suppliers:supplier_id (
          id,
          name,
          contact_person,
          email,
          phone
        ),
        assigned_location:assigned_location_id (
          id,
          code,
          zone,
          aisle,
          rack,
          capacity,
          current_stock
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (supplier_id) {
      query = query.eq('supplier_id', supplier_id);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching shipments:', error);
      return res.status(500).json({
        error: 'Failed to fetch shipments',
        details: error.message
      });
    }

    res.json({
      success: true,
      shipments: data || [],
      total: count || data?.length || 0
    });
  } catch (err) {
    console.error('getShipments error:', err);
    res.status(500).json({
      error: 'Internal server error',
      details: err.message
    });
  }
}

/**
 * Get single shipment by ID
 * @route GET /api/shipments/:id
 */
export async function getShipmentById(req, res) {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('shipments')
      .select(`
        *,
        suppliers:supplier_id (
          id,
          name,
          contact_person,
          email,
          phone,
          address,
          city,
          country
        ),
        received_by_user:users!shipments_received_by_fkey (
          id,
          email,
          full_name
        ),
        inspected_by_user:users!shipments_inspected_by_fkey (
          id,
          email,
          full_name
        ),
        batches:id (
          id,
          batch_number,
          batch_month,
          batch_year,
          status,
          products:product_id (
            id,
            sku,
            brand,
            model,
            dimensions
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Shipment not found'
        });
      }
      console.error('Error fetching shipment:', error);
      return res.status(500).json({
        error: 'Failed to fetch shipment',
        details: error.message
      });
    }

    res.json({
      success: true,
      shipment: data
    });
  } catch (err) {
    console.error('getShipmentById error:', err);
    res.status(500).json({
      error: 'Internal server error',
      details: err.message
    });
  }
}

/**
 * Create new shipment
 * @route POST /api/shipments
 */
export async function createShipment(req, res) {
  try {
    const {
      supplier_id,
      shipment_number,
      container_number,
      bl_number,
      expected_quantity,
      expected_arrival_date,
      notes,
      product_breakdown,
      assigned_location_id
    } = req.body;

    console.log('📝 ========== CREATING SHIPMENT ==========');
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
    console.log('📦 Product breakdown received:', product_breakdown);
    console.log('📊 Product count:', product_breakdown?.length);
    console.log('📍 Assigned location ID:', assigned_location_id);

    // Validation
    if (!supplier_id) {
      console.error('❌ Validation failed: supplier_id missing');
      return res.status(400).json({ error: 'supplier_id is required' });
    }

    if (!shipment_number) {
      console.error('❌ Validation failed: shipment_number missing');
      return res.status(400).json({ error: 'shipment_number is required' });
    }

    if (!container_number) {
      console.error('❌ Validation failed: container_number missing');
      return res.status(400).json({ error: 'container_number is required' });
    }

    console.log('✅ Validation passed');
    console.log('📤 Preparing to insert into database...');

    const insertData = {
      supplier_id,
      shipment_number,
      container_number,
      bl_number,
      expected_quantity: expected_quantity || 0,
      expected_arrival_date,
      status: 'PENDING',  // Must match check constraint
      notes,
      product_breakdown: product_breakdown || []
      // Removed assigned_location_id - not using it for now
    };

    console.log('📤 Insert data:', JSON.stringify(insertData, null, 2));

    // Create shipment
    const { data, error } = await supabaseAdmin
      .from('shipments')
      .insert(insertData)
      .select(`
        *,
        suppliers:supplier_id (
          id,
          name,
          contact_person,
          email
        )
      `)
      .single();

    if (error) {
      console.error('❌ Database error creating shipment:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      
      if (error.code === '23505') { // Unique violation
        return res.status(409).json({
          error: 'Shipment number or container number already exists',
          details: error.message,
          code: error.code
        });
      }

      return res.status(500).json({
        error: 'Failed to create shipment',
        details: error.message,
        code: error.code,
        hint: error.hint
      });
    }

    console.log('✅ Shipment created successfully');
    console.log('📦 Saved product_breakdown:', data.product_breakdown);
    console.log('📊 Saved product count:', data.product_breakdown?.length);
    console.log('📍 Saved location:', data.assigned_location?.code);
    console.log('========================================\n');

    res.status(201).json({
      success: true,
      shipment: data,
      message: 'Shipment created successfully'
    });
  } catch (err) {
    console.error('❌ ========== CRITICAL ERROR ==========');
    console.error('❌ createShipment caught exception:', err);
    console.error('❌ Error name:', err.name);
    console.error('❌ Error message:', err.message);
    console.error('❌ Error stack:', err.stack);
    console.error('========================================\n');
    res.status(500).json({
      error: 'Internal server error',
      details: err.message,
      name: err.name
    });
  }
}

/**
 * Update shipment
 * @route PUT /api/shipments/:id
 */
export async function updateShipment(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

    console.log('📝 Updating shipment:', id);
    console.log('📦 Updates received:', JSON.stringify(updates, null, 2));
    console.log('📊 Product breakdown in request:', updates.product_breakdown);
    console.log('📊 Product breakdown length:', updates.product_breakdown?.length);

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.created_at;

    console.log('📤 Sending to database:', JSON.stringify(updates, null, 2));

    const { data, error } = await supabaseAdmin
      .from('shipments')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        suppliers:supplier_id (
          id,
          name,
          contact_person,
          email
        ),
        assigned_location:assigned_location_id (
          id,
          code,
          zone,
          aisle,
          rack,
          capacity,
          current_stock
        )
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Shipment not found'
        });
      }

      console.error('❌ Error updating shipment:', error);
      return res.status(500).json({
        error: 'Failed to update shipment',
        details: error.message
      });
    }

    console.log('✅ Shipment updated successfully');
    console.log('📦 Updated product_breakdown:', data.product_breakdown);
    console.log('📊 Updated product count:', data.product_breakdown?.length);

    res.json({
      success: true,
      shipment: data,
      message: 'Shipment updated successfully'
    });
  } catch (err) {
    console.error('updateShipment error:', err);
    res.status(500).json({
      error: 'Internal server error',
      details: err.message
    });
  }
}

/**
 * Mark shipment as received
 * @route POST /api/shipments/:id/receive
 */
export async function receiveShipment(req, res) {
  try {
    const { id } = req.params;
    const { actual_quantity, notes } = req.body;
    const userId = req.user?.id; // From auth middleware

    const { data, error } = await supabaseAdmin
      .from('shipments')
      .update({
        status: 'RECEIVED',
        actual_quantity: actual_quantity || 0,
        received_date: new Date().toISOString(),
        received_by: userId,
        notes: notes || null
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error receiving shipment:', error);
      return res.status(500).json({
        error: 'Failed to receive shipment',
        details: error.message
      });
    }

    res.json({
      success: true,
      shipment: data,
      message: 'Shipment marked as received'
    });
  } catch (err) {
    console.error('receiveShipment error:', err);
    res.status(500).json({
      error: 'Internal server error',
      details: err.message
    });
  }
}

/**
 * Delete shipment (soft delete by setting status to CANCELLED)
 * @route DELETE /api/shipments/:id
 */
export async function deleteShipment(req, res) {
  try {
    const { id } = req.params;
    const { force } = req.query; // Check if force delete is requested

    if (force === 'true') {
      // HARD DELETE: Cascading deletion of all related records
      console.log(`⚠️ Force deleting shipment ${id} and all related records...`);
      
      // Step 1: Delete related expected items
      const { error: expectedItemsError } = await supabaseAdmin
        .from('shipment_expected_items')
        .delete()
        .eq('shipment_id', id);
      
      if (expectedItemsError) {
        console.warn('Error deleting expected items:', expectedItemsError);
      }

      // Step 2: Delete related batches and their inventory units
      const { data: batches } = await supabaseAdmin
        .from('batches')
        .select('id')
        .eq('shipment_id', id);

      if (batches && batches.length > 0) {
        for (const batch of batches) {
          // Delete inventory units for this batch
          await supabaseAdmin
            .from('inventory_units')
            .delete()
            .eq('batch_id', batch.id);
        }

        // Delete all batches
        await supabaseAdmin
          .from('batches')
          .delete()
          .eq('shipment_id', id);
      }

      // Step 3: Delete the shipment itself
      const { error: deleteError } = await supabaseAdmin
        .from('shipments')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Error force deleting shipment:', deleteError);
        return res.status(500).json({
          error: 'Failed to delete shipment',
          details: deleteError.message
        });
      }

      return res.json({
        success: true,
        message: 'Shipment and all related records permanently deleted'
      });
    }

    // SOFT DELETE: Check if shipment has batches
    const { data: batches } = await supabaseAdmin
      .from('batches')
      .select('id')
      .eq('shipment_id', id)
      .limit(1);

    if (batches && batches.length > 0) {
      return res.status(409).json({
        error: 'Cannot delete shipment with existing batches',
        message: 'Shipment has related batches. Use force delete to remove everything, or cancel the shipment instead.'
      });
    }

    // Soft delete by setting status to CANCELLED
    const { data, error } = await supabaseAdmin
      .from('shipments')
      .update({ status: 'CANCELLED' })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deleting shipment:', error);
      return res.status(500).json({
        error: 'Failed to delete shipment',
        details: error.message
      });
    }

    res.json({
      success: true,
      message: 'Shipment cancelled successfully'
    });
  } catch (err) {
    console.error('deleteShipment error:', err);
    res.status(500).json({
      error: 'Internal server error',
      details: err.message
    });
  }
}
