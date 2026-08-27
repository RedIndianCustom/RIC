/**
 * ============================================================================
 * BARCODE CONTROLLER
 * ============================================================================
 * Handles HTTP requests for barcode generation and traceability
 * ============================================================================
 */

import { supabaseAdmin } from '../config/supabase.js';
import {
  createBarcodes,
  createBarcodesFromBatchPositions,
  getBarcodes,
  getTraceability,
  deactivateBarcode
} from '../services/barcodeService.js';

/**
 * POST /api/barcodes
 * Create new barcodes with complete traceability
 * 
 * Request body:
 * {
 *   batchId: "uuid", // Required
 *   // Optional legacy fields for backward compatibility:
 *   productId: "uuid",
 *   shipmentId: "uuid",
 *   quantity: 1,
 *   warehouseId: "uuid",
 *   rackId: "uuid",
 *   positionCode: "WH1-R05-RK05-S01-SH05-SUB01"
 * }
 * 
 * NEW BEHAVIOR:
 * - If batch has metadata.products_with_positions, generates barcodes for each
 *   product/position combination
 * - If no metadata, falls back to legacy single-product mode
 */
export async function createBarcodeController(req, res) {
  try {
    const {
      productId,
      batchId,
      shipmentId,
      quantity = 1,
      warehouseId,
      rackId,
      rackLocationId,
      shelfNumber,
      sectionNumber,
      subsectionNumber,
      positionCode
    } = req.body;

    if (!batchId) {
      return res.status(400).json({
        success: false,
        error: 'batchId is required'
      });
    }

    console.log('📦 Barcode generation request:', {
      batchId,
      productId,
      shipmentId,
      quantity,
      warehouseId,
      rackId,
      positionCode
    });

    // Fetch batch to check for metadata with assigned positions
    const { data: batch, error: batchError } = await supabaseAdmin
      .from('batches')
      .select('id, batch_number, shipment_id, metadata')
      .eq('id', batchId)
      .single();

    if (batchError || !batch) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found'
      });
    }

    // Check if batch has products with assigned positions
    const hasAssignedPositions = batch.metadata?.products_with_positions?.length > 0;

    if (hasAssignedPositions) {
      console.log('✅ Batch has assigned positions - generating barcodes for each position');
      
      // Generate barcodes for all products and their positions
      const result = await createBarcodesFromBatchPositions({
        batchId: batch.id,
        batchNumber: batch.batch_number,
        shipmentId: batch.shipment_id,
        productsWithPositions: batch.metadata.products_with_positions,
        warehouseCode: batch.metadata.warehouse_code
      });

      return res.status(201).json({
        success: true,
        message: `${result.totalBarcodes} barcode(s) generated for ${result.totalProducts} product(s) across ${result.totalPositions} position(s)`,
        ...result
      });
    } else {
      console.log('ℹ️ No assigned positions - using legacy single-product mode');
      
      // Legacy mode: generate barcodes for a single product
      const result = await createBarcodes({
        productId: productId || batch.product_id,
        batchId: batch.id,
        shipmentId: shipmentId || batch.shipment_id,
        quantity: Number(quantity),
        warehouseId,
        rackId,
        rackLocationId,
        shelfNumber,
        sectionNumber,
        subsectionNumber,
        positionCode
      });

      return res.status(201).json({
        success: true,
        message: `${result.barcodes.length} barcode(s) generated successfully`,
        ...result
      });
    }
  } catch (error) {
    console.error('❌ Barcode generation error:', error);
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/barcodes
 * Get list of barcodes with traceability info
 * 
 * Query params:
 * - limit: number (optional, no default limit to fetch all barcodes)
 */
export async function getBarcodesController(req, res) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    console.log(`📋 Loading ${limit ? limit : 'ALL'} barcodes...`);

    const barcodes = await getBarcodes({ limit });

    return res.json({
      success: true,
      barcodes,
      total: barcodes.length
    });
  } catch (error) {
    console.error('❌ Get barcodes error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to load barcodes',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * GET /api/barcodes/config
 * Get barcode configuration
 */
export async function getBarcodeConfigController(req, res) {
  try {
    // For now, return default config
    // Later this can be fetched from database settings table
    const config = {
      format: 'CODE128',
      prefix: 'RIC',
      include_date_stamp: false,
      include_checksum: true,
      serial_length: 12,
      label_size: '4x2',
      printer_dpi: 300,
      qr_error_correction: 'M',
      qr_size: 300
    };

    return res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('❌ Get config error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to load barcode configuration'
    });
  }
}

/**
 * GET /api/barcodes/trace/:barcodeValue
 * Get complete traceability chain for a barcode
 * Used by QR code scanning
 * 
 * Path params:
 * - barcodeValue: string (e.g., RIC000000000001)
 */
export async function getTraceabilityController(req, res) {
  try {
    const { barcodeValue } = req.params;

    if (!barcodeValue) {
      return res.status(400).json({
        success: false,
        error: 'Barcode value is required'
      });
    }

    console.log(`🔍 Traceability lookup: ${barcodeValue}`);

    const traceability = await getTraceability(barcodeValue);

    return res.json({
      success: true,
      traceability
    });
  } catch (error) {
    console.error('❌ Traceability error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve traceability'
    });
  }
}

/**
 * PATCH /api/barcodes/:id/deactivate
 * Deactivate a barcode (soft delete)
 * NEVER hard-delete - preserves traceability for returns/rejection
 * 
 * Path params:
 * - id: barcode UUID
 */
export async function deactivateBarcodeController(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Barcode ID is required'
      });
    }

    console.log(`🚫 Deactivating barcode: ${id}`);

    const barcode = await deactivateBarcode(id);

    return res.json({
      success: true,
      message: 'Barcode deactivated successfully',
      barcode
    });
  } catch (error) {
    console.error('❌ Deactivate barcode error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to deactivate barcode'
    });
  }
}


/**
 * ============================================================================
 * DELETE BARCODE CONTROLLER
 * ============================================================================
 * Hard delete a barcode from the database
 * ============================================================================
 */

/**
 * Delete barcode (hard delete)
 * @route DELETE /api/barcodes/:id
 */
export async function deleteBarcodeController(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Barcode ID is required'
      });
    }

    console.log(`🗑️ Deleting barcode: ${id}`);

    // STEP 1: Get barcode with inventory_unit data BEFORE deleting
    // We need warehouse_id and rack to update rack count
    const { data: barcodeData, error: fetchError } = await supabaseAdmin
      .from('barcodes')
      .select(`
        id,
        inventory_unit_id,
        inventory_units!barcodes_inventory_unit_id_fkey (
          warehouse_id,
          rack
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching barcode for deletion:', fetchError);
      return res.status(500).json({
        success: false,
        error: fetchError.message || 'Failed to fetch barcode'
      });
    }

    const warehouseId = barcodeData?.inventory_units?.warehouse_id;
    const rackCode = barcodeData?.inventory_units?.rack;

    console.log(`📍 Barcode location: Warehouse ${warehouseId}, Rack ${rackCode}`);

    // STEP 2: Delete from database
    const { data, error } = await supabaseAdmin
      .from('barcodes')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Database delete error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete barcode'
      });
    }

    console.log(`✅ Barcode deleted successfully: ${id}`);

    // STEP 3: Clear warehouse assignment from inventory_unit and update rack count
    if (warehouseId && rackCode && data.inventory_unit_id) {
      console.log(`🔄 Clearing warehouse assignment and updating rack count for: ${rackCode}`);

      // Clear warehouse_id and rack from the inventory_unit
      const { error: clearError } = await supabaseAdmin
        .from('inventory_units')
        .update({ 
          warehouse_id: null,
          rack: null,
          assigned_at: null
        })
        .eq('id', data.inventory_unit_id);

      if (clearError) {
        console.error('⚠️ Failed to clear warehouse assignment:', clearError);
      } else {
        console.log(`✅ Cleared warehouse assignment from inventory_unit`);
      }

      // Count remaining BARCODES (not inventory_units) assigned to this rack
      // This ensures we only count barcodes that still exist
      const { count, error: countError } = await supabaseAdmin
        .from('barcodes')
        .select(`
          id,
          inventory_units!barcodes_inventory_unit_id_fkey!inner (
            warehouse_id,
            rack
          )
        `, { count: 'exact', head: true })
        .eq('inventory_units.warehouse_id', warehouseId)
        .eq('inventory_units.rack', rackCode)
        .eq('status', 'active');

      if (countError) {
        console.error('⚠️ Failed to count remaining barcodes:', countError);
      } else {
        console.log(`📊 Remaining barcodes in rack ${rackCode}: ${count}`);

        // Update rack_configurations.current_count
        const { error: updateError } = await supabaseAdmin
          .from('rack_configurations')
          .update({ current_count: count || 0 })
          .eq('warehouse_id', warehouseId)
          .eq('rack_code', rackCode);

        if (updateError) {
          console.error('⚠️ Failed to update rack count:', updateError);
        } else {
          console.log(`✅ Rack count updated: ${rackCode} now has ${count || 0} units`);
        }
      }
    } else {
      console.log(`ℹ️ Barcode was not assigned to a rack, no update needed`);
    }

    return res.json({
      success: true,
      message: 'Barcode deleted successfully',
      barcode: data
    });
  } catch (error) {
    console.error('❌ Delete barcode error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete barcode'
    });
  }
}
