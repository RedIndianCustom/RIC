/**
 * ============================================================================
 * BARCODE SERVICE
 * ============================================================================
 * Handles barcode generation with complete traceability chain
 * 
 * Flow:
 * 1. Verify product, shipment, batch exist
 * 2. Create inventory_units (one per physical tire)
 * 3. Generate unique barcodes using PostgreSQL sequence
 * 4. Create QR codes with traceability URLs
 * 5. Save barcodes to database
 * ============================================================================
 */

import crypto from 'node:crypto';
import QRCode from 'qrcode';
import supabaseAdmin from '../config/supabaseAdmin.js';

const TRACE_BASE_URL = process.env.TRACE_BASE_URL || 'http://localhost:5173/trace';
const BARCODE_PREFIX = 'RIC';

/**
 * Generate barcode value from sequence number
 * Format: RIC000000000001, RIC000000000002, etc.
 */
function generateBarcodeValue(sequence) {
  return `${BARCODE_PREFIX}${String(sequence).padStart(12, '0')}`;
}

/**
 * Create traceability URL for QR code
 * Example: http://localhost:5173/trace/RIC000000000001
 */
function createTraceabilityUrl(barcodeValue) {
  return `${TRACE_BASE_URL}/${encodeURIComponent(barcodeValue)}`;
}

/**
 * Get next barcode sequence from PostgreSQL
 * Uses sequence for concurrent-safe generation
 */
async function getNextBarcodeSequence() {
  const { data, error } = await supabaseAdmin
    .rpc('get_next_barcode_sequence');

  if (error) {
    throw new Error(`Failed to generate barcode sequence: ${error.message}`);
  }

  return Number(data);
}

/**
 * Main service function: Create barcodes with complete traceability
 * Uses transaction-safe PostgreSQL RPC for atomic operation
 * 
 * @param {Object} params
 * @param {string} params.productId - Product UUID
 * @param {string} params.batchId - Batch UUID
 * @param {string} params.shipmentId - Shipment UUID
 * @param {number} params.quantity - Number of barcodes to generate (1-5000)
 * @returns {Object} Created barcodes with traceability info
 */
export async function createBarcodes({
  productId,
  batchId,
  shipmentId,
  quantity,
  warehouseId,
  rackId,
  rackLocationId,
  shelfNumber,
  sectionNumber,
  subsectionNumber,
  positionCode
}) {
  // ---------------------------------------------------------
  // 1. VALIDATION
  // ---------------------------------------------------------
  if (!productId) {
    throw new Error('productId is required');
  }

  if (!batchId) {
    throw new Error('batchId is required');
  }

  if (!shipmentId) {
    throw new Error('shipmentId is required');
  }

  const parsedQuantity = Number(quantity);
  if (
    !Number.isInteger(parsedQuantity) ||
    parsedQuantity < 1 ||
    parsedQuantity > 5000
  ) {
    throw new Error('quantity must be an integer between 1 and 5000');
  }

  console.log(`📦 Generating ${parsedQuantity} barcodes via transaction-safe RPC...`);

  // ---------------------------------------------------------
  // 2. CALL TRANSACTION-SAFE RPC
  // ---------------------------------------------------------
  // This creates inventory units + barcodes atomically in PostgreSQL
  // If any step fails, entire operation rolls back
  const { data, error } = await supabaseAdmin.rpc(
    'create_inventory_barcodes',
    {
      p_product_id: productId,
      p_batch_id: batchId,
      p_shipment_id: shipmentId,
      p_quantity: parsedQuantity
    }
  );

  if (error) {
    console.error('❌ Supabase RPC error:', error);
    throw new Error(error.message || 'Failed to generate barcodes');
  }

  if (!data?.success) {
    throw new Error('Barcode generation failed');
  }

  console.log(`✅ RPC completed: ${data.quantity} barcodes created`);

  // ---------------------------------------------------------
  // 3. ASSIGN WAREHOUSE LOCATIONS (if provided)
  // ---------------------------------------------------------
  if (warehouseId && rackId) {
    console.log(`📍 Assigning warehouse and rack to ${data.barcodes.length} inventory units...`);
    
    try {
      // Get rack details
      const { data: rack, error: rackError } = await supabaseAdmin
        .from('rack_configurations')
        .select('id, rack_code, rack_number, warehouse_id')
        .eq('id', rackId)
        .single();

      if (rackError) {
        console.error('⚠️ Failed to fetch rack:', rackError);
      } else if (rack) {
        // Get all inventory unit IDs from the barcodes
        const inventoryUnitIds = data.barcodes.map(b => b.inventory_unit_id);

        // Prepare update data with hierarchical location fields
        const updateData = {
          warehouse_id: warehouseId,
          rack: rack.rack_code,  // Store rack code in existing 'rack' column
          assigned_at: new Date().toISOString()
        };

        // Add hierarchical position data if provided
        if (shelfNumber) {
          updateData.shelf_number = parseInt(shelfNumber);
        }
        if (sectionNumber) {
          updateData.section_number = parseInt(sectionNumber);
        }
        if (subsectionNumber) {
          updateData.subsection_number = parseInt(subsectionNumber);
        }
        if (positionCode) {
          updateData.position_code = positionCode;
        }

        console.log('📦 Update data:', updateData);

        // Update all inventory units with warehouse, rack, and hierarchical position
        const { error: updateError } = await supabaseAdmin
          .from('inventory_units')
          .update(updateData)
          .in('id', inventoryUnitIds);

        if (updateError) {
          console.error('⚠️ Failed to update inventory units:', updateError);
        } else {
          console.log(`✅ Warehouse and hierarchical location assigned: ${rack.rack_code} (${inventoryUnitIds.length} units)`);
          if (positionCode) {
            console.log(`📍 Position code: ${positionCode}`);
          }
          
          // Update rack's current_count by counting actual inventory units
          try {
            // Count how many inventory units are currently assigned to this rack
            const { count, error: countError } = await supabaseAdmin
              .from('inventory_units')
              .select('*', { count: 'exact', head: true })
              .eq('warehouse_id', warehouseId)
              .eq('rack', rack.rack_code);
            
            if (!countError && count !== null) {
              // Update the rack with the actual count
              await supabaseAdmin
                .from('rack_configurations')
                .update({ current_count: count })
                .eq('id', rackId);
              
              console.log(`✅ Rack count updated to ${count} units`);
            }
          } catch (countError) {
            console.warn('⚠️ Could not update rack count:', countError);
          }
        }
      }
    } catch (locError) {
      console.error('⚠️ Warning: Failed to assign warehouse locations:', locError);
      // Don't fail the entire operation if location assignment fails
    }
  } else {
    console.log('📦 No warehouse/rack provided - units will be unassigned');
  }

  // ---------------------------------------------------------
  // 4. GENERATE QR CODES FOR EACH BARCODE
  // ---------------------------------------------------------
  // QR generation happens in Node.js (not in PostgreSQL)
  // This is cleaner separation of concerns
  console.log(`🔄 Generating QR codes for ${data.barcodes.length} barcodes...`);

  const barcodesWithQR = await Promise.all(
    data.barcodes.map(async (barcode) => {
      try {
        const qrCodeData = await QRCode.toDataURL(
          barcode.traceability_url,
          {
            errorCorrectionLevel: 'H', // HIGH error correction for better scanning
            margin: 0, // Remove border/margin
            width: 512, // Higher resolution (was 300)
            color: {
              dark: '#000000', // Pure black for better contrast
              light: '#FFFFFF' // Pure white background
            },
            scale: 8, // Higher scale for print quality
            type: 'image/png' // PNG for lossless quality
          }
        );

        // Update barcode with QR code data
        await supabaseAdmin
          .from('barcodes')
          .update({ qr_code_data: qrCodeData })
          .eq('id', barcode.barcode_id);

        return {
          ...barcode,
          qr_code_data: qrCodeData
        };
      } catch (qrError) {
        console.error(`⚠️ QR generation failed for ${barcode.barcode_value}:`, qrError);
        return barcode; // Return without QR if generation fails
      }
    })
  );

  console.log(`✅ QR codes generated successfully`);

  // ---------------------------------------------------------
  // 5. RETURN COMPLETE RESULT
  // ---------------------------------------------------------
  return {
    success: true,
    product_id: data.product_id,
    product_sku: data.product_sku,
    product_name: data.product_name,
    batch_id: data.batch_id,
    batch_number: data.batch_number,
    shipment_id: data.shipment_id,
    shipment_number: data.shipment_number,
    container_number: data.container_number,
    bl_number: data.bl_number,
    quantity: data.quantity,
    barcodes: barcodesWithQR,
    summary: {
      total_barcodes: barcodesWithQR.length,
      total_inventory_units: barcodesWithQR.length,
      barcode_range: barcodesWithQR.length > 0 ? {
        first: barcodesWithQR[0].barcode_value,
        last: barcodesWithQR[barcodesWithQR.length - 1].barcode_value
      } : null,
      shipment_number: data.shipment_number,
      container_number: data.container_number,
      bl_number: data.bl_number,
      batch_number: data.batch_number
    }
  };
}

/**
 * Get barcodes with full traceability information
 * Returns empty array until schema cache is ready
 * 
 * @param {Object} params
 * @param {number} params.limit - Max number of barcodes to return
 * @returns {Array} Barcodes with nested product, batch, shipment info
 */
export async function getBarcodes({ limit }) {
  // If limit is provided, use it; otherwise fetch all barcodes
  const useLimit = limit !== undefined;
  const safeLimit = useLimit ? Number(limit) : 10000; // High default for "all"

  try {
    // Use direct query with nested relationships (PostgREST handles this better than RPC)
    console.log('📦 Fetching barcodes with nested data...');
    
    const query = supabaseAdmin
      .from('barcodes')
      .select(`
        id,
        barcode_value,
        barcode_type,
        traceability_url,
        qr_code_data,
        status,
        created_at,
        product_id,
        batch_id,
        inventory_unit_id,
        products!barcodes_product_id_fkey (
          id,
          sku,
          brand,
          model,
          dimensions
        ),
        batches!barcodes_batch_id_fkey (
          id,
          batch_number,
          shipments!batches_shipment_id_fkey (
            id,
            shipment_number,
            container_number,
            bl_number,
            suppliers:supplier_id (
              id,
              name
            )
          )
        ),
        inventory_units!barcodes_inventory_unit_id_fkey (
          id,
          inventory_unit_code,
          status
        )
      `)
      .order('created_at', { ascending: false });
    
    // Only apply limit if explicitly provided
    if (useLimit) {
      query.limit(safeLimit);
    }
    
    const { data: tableData, error: tableError } = await query;

    console.log('Query result:', { 
      hasData: !!tableData, 
      count: tableData?.length || 0,
      hasError: !!tableError,
      errorMsg: tableError?.message 
    });

    if (tableError) {
      console.error('❌ Table query error:', tableError);
      return [];
    }

    if (!tableData || tableData.length === 0) {
      console.log('📊 No barcodes found');
      return [];
    }

    console.log(`✅ Loaded ${tableData.length} barcodes with nested data`);
    console.log('Sample barcode:', JSON.stringify(tableData[0], null, 2));
    
    // PostgREST automatically returns nested data, just return as-is
    return tableData;
  } catch (err) {
    console.error('❌ getBarcodes error:', err.message);
    // Return empty array instead of crashing
    return [];
  }
}

/**
 * Get complete traceability for a single barcode
 * Used by QR code scanning
 * 
 * @param {string} barcodeValue - Barcode value (e.g., RIC000000000001)
 * @returns {Object} Complete traceability chain
 */
export async function getTraceability(barcodeValue) {
  if (!barcodeValue) {
    throw new Error('Barcode value is required');
  }

  const { data, error } = await supabaseAdmin
    .from('barcodes')
    .select(`
      id,
      barcode_value,
      barcode_type,
      traceability_url,
      qr_code_data,
      status,
      created_at,
      products (
        id,
        sku,
        brand,
        model,
        dimensions,
        category
      ),
      batches (
        id,
        batch_number,
        batch_month,
        batch_year,
        manufactured_date,
        expiry_date,
        status,
        shipments!batches_shipment_id_fkey (
          id,
          shipment_number,
          container_number,
          bl_number,
          expected_quantity,
          actual_quantity,
          expected_arrival_date,
          received_date,
          status,
          suppliers:supplier_id (
            id,
            name,
            contact_person,
            email,
            phone
          )
        )
      ),
      inventory_units!barcodes_inventory_unit_id_fkey (
        id,
        inventory_unit_code,
        quantity,
        status,
        warehouse_id,
        rack,
        shelf_number,
        section_number,
        subsection_number,
        position_code,
        assigned_at,
        received_at,
        last_scanned_at,
        warehouses:warehouse_id (
          id,
          name,
          code,
          location
        )
      )
    `)
    .eq('barcode_value', barcodeValue)
    .single();

  if (error) {
    console.error('❌ Traceability query error:', error);
    throw new Error(`Barcode not found: ${barcodeValue}`);
  }

  if (!data) {
    console.error('❌ No data returned for barcode:', barcodeValue);
    throw new Error(`Barcode not found: ${barcodeValue}`);
  }

  // Fetch rack configuration separately if rack column has data
  if (data.inventory_units?.rack) {
    try {
      const { data: rackData, error: rackError } = await supabaseAdmin
        .from('rack_configurations')
        .select(`
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
        `)
        .eq('rack_code', data.inventory_units.rack)
        .single();

      if (!rackError && rackData) {
        data.inventory_units.rack_configurations = rackData;
        console.log('✅ Rack configuration loaded:', rackData.rack_code);
      }
    } catch (rackErr) {
      console.warn('⚠️ Could not load rack configuration:', rackErr);
    }
  }

  console.log('✅ Traceability data loaded:', JSON.stringify(data, null, 2));

  return data;
}

/**
 * Deactivate a barcode (soft delete - preserves for returns/rejection)
 * NEVER hard-delete barcodes
 * 
 * @param {string} barcodeId - Barcode UUID
 * @returns {Object} Updated barcode
 */
export async function deactivateBarcode(barcodeId) {
  if (!barcodeId) {
    throw new Error('Barcode ID is required');
  }

  const { data, error } = await supabaseAdmin
    .from('barcodes')
    .update({
      status: 'inactive',
      updated_at: new Date().toISOString()
    })
    .eq('id', barcodeId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to deactivate barcode: ${error.message}`);
  }

  return data;
}
