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
import { supabaseAdmin } from '../config/supabase.js';

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
 * Create barcodes from batch metadata with assigned positions
 * Loops through each product and each position, generating barcodes
 * with the exact position code embedded in the barcode
 * 
 * @param {Object} params
 * @param {string} params.batchId - Batch UUID
 * @param {string} params.batchNumber - Batch number
 * @param {string} params.shipmentId - Shipment UUID
 * @param {Array} params.productsWithPositions - Products with assigned_positions arrays
 * @param {string} params.warehouseCode - Warehouse code (e.g., "WH1")
 * @returns {Object} Summary of generated barcodes
 */
export async function createBarcodesFromBatchPositions({
  batchId,
  batchNumber,
  shipmentId,
  productsWithPositions,
  warehouseCode
}) {
  console.log('📦 Starting barcode generation from batch positions...');
  console.log(`   Batch: ${batchNumber}`);
  console.log(`   Warehouse: ${warehouseCode}`);
  console.log(`   Products: ${productsWithPositions.length}`);

  const allGeneratedBarcodes = [];
  let totalPositions = 0;

  // Fetch warehouse by code
  const { data: warehouse, error: warehouseError } = await supabaseAdmin
    .from('warehouses')
    .select('id, code, name')
    .eq('code', warehouseCode)
    .single();

  if (warehouseError) {
    console.warn(`⚠️ Warehouse ${warehouseCode} not found:`, warehouseError);
  }

  const warehouseId = warehouse?.id;

  // Loop through each product
  for (const product of productsWithPositions) {
    console.log(`\n🔧 Processing product: ${product.product_name}`);
    console.log(`   Product ID: ${product.product_id}`);
    console.log(`   Assigned Positions: ${product.assigned_positions?.length || 0}`);

    if (!product.assigned_positions || product.assigned_positions.length === 0) {
      console.log(`   ⚠️ No assigned positions for this product - skipping`);
      continue;
    }

    // Loop through each assigned position
    for (const position of product.assigned_positions) {
      const positionCode = position.position_code;
      const positionQuantity = position.quantity;

      console.log(`\n   📍 Position: ${positionCode}`);
      console.log(`      Quantity: ${positionQuantity}`);

      // Parse position code to extract rack and hierarchical location
      // Format: WH1-R05-RK05-S01-SH05-SUB01
      const positionParts = positionCode.split('-');
      let rackNumber = null;
      let shelfNumber = null;
      let sectionNumber = null;
      let subsectionNumber = null;

      if (positionParts.length >= 6) {
        rackNumber = parseInt(positionParts[1].replace('R', ''));
        shelfNumber = parseInt(positionParts[4].replace('SH', ''));
        sectionNumber = parseInt(positionParts[3].replace('S', ''));
        subsectionNumber = parseInt(positionParts[5].replace('SUB', ''));
      }

      // Find rack by parsing position code and looking up in warehouse_locations
      // Position code format: WH1-R05-RK05-S01-SH05-SUB01
      // We need to find the warehouse_location that matches this rack
      let rackLocationId = null;
      let rackCode = null;
      
      if (warehouseId && positionParts.length >= 6) {
        // Extract rack code from position: "WH1-R05-RK05"
        const warehousePrefix = positionParts[0]; // "WH1"
        const rowPart = positionParts[1]; // "R05"
        const rackPart = positionParts[2]; // "RK05"
        const expectedRackCode = `${warehousePrefix}-${rowPart}-${rackPart}`;
        
        console.log(`      🔍 Looking for rack: ${expectedRackCode}`);
        
        const { data: location, error: locationError } = await supabaseAdmin
          .from('warehouse_locations')
          .select('id, code')
          .eq('code', expectedRackCode)
          .single();

        if (locationError) {
          console.warn(`      ⚠️ Rack ${expectedRackCode} not found in warehouse_locations`);
        } else if (location) {
          rackLocationId = location.id;
          rackCode = location.code;
          console.log(`      ✅ Found warehouse location: ${rackCode}`);
        }
      }

      try {
        // Generate barcodes for this position's quantity
        const result = await createBarcodes({
          productId: product.product_id,
          batchId,
          shipmentId,
          quantity: positionQuantity,
          warehouseId,
          rackLocationId, // Pass warehouse_location ID instead of rack_configuration ID
          shelfNumber,
          sectionNumber,
          subsectionNumber,
          positionCode
        });

        console.log(`      ✅ Generated ${result.barcodes.length} barcode(s) for position ${positionCode}`);

        // Collect all barcodes
        allGeneratedBarcodes.push(...result.barcodes);
        totalPositions++;
      } catch (err) {
        console.error(`      ❌ Failed to generate barcodes for position ${positionCode}:`, err.message);
        throw err; // Fail entire operation if any position fails
      }
    }
  }

  console.log(`\n✅ Barcode generation complete!`);
  console.log(`   Total Products: ${productsWithPositions.length}`);
  console.log(`   Total Positions: ${totalPositions}`);
  console.log(`   Total Barcodes: ${allGeneratedBarcodes.length}`);

  return {
    success: true,
    batchId,
    batchNumber,
    shipmentId,
    warehouseCode,
    totalProducts: productsWithPositions.length,
    totalPositions,
    totalBarcodes: allGeneratedBarcodes.length,
    barcodes: allGeneratedBarcodes,
    summary: {
      batch_number: batchNumber,
      warehouse_code: warehouseCode,
      products_processed: productsWithPositions.length,
      positions_processed: totalPositions,
      total_barcodes: allGeneratedBarcodes.length,
      barcode_range: allGeneratedBarcodes.length > 0 ? {
        first: allGeneratedBarcodes[0].barcode_value,
        last: allGeneratedBarcodes[allGeneratedBarcodes.length - 1].barcode_value
      } : null
    }
  };
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
  if (warehouseId) {
    console.log(`📍 Assigning warehouse location to ${data.barcodes.length} inventory units...`);
    
    try {
      // Get all inventory unit IDs from the barcodes
      const inventoryUnitIds = data.barcodes.map(b => b.inventory_unit_id);

      // Prepare update data with hierarchical location fields
      const updateData = {
        warehouse_id: warehouseId,
        assigned_at: new Date().toISOString()
      };

      // If rackLocationId is provided, get the rack code from warehouse_locations
      if (rackLocationId) {
        const { data: location, error: locationError } = await supabaseAdmin
          .from('warehouse_locations')
          .select('code')
          .eq('id', rackLocationId)
          .single();

        if (!locationError && location) {
          updateData.rack = location.code; // Store warehouse location code in 'rack' column
          console.log(`✅ Found warehouse location: ${location.code}`);
        }
      }

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

      // Update all inventory units with warehouse and hierarchical position
      const { error: updateError } = await supabaseAdmin
        .from('inventory_units')
        .update(updateData)
        .in('id', inventoryUnitIds);

      if (updateError) {
        console.error('⚠️ Failed to update inventory units:', updateError);
      } else {
        console.log(`✅ Warehouse location assigned to ${inventoryUnitIds.length} units`);
        if (positionCode) {
          console.log(`📍 Position code: ${positionCode}`);
        }
      }
    } catch (locError) {
      console.error('⚠️ Warning: Failed to assign warehouse locations:', locError);
      // Don't fail the entire operation if location assignment fails
    }
  } else {
    console.log('📦 No warehouse provided - units will be unassigned');
  }

  // ---------------------------------------------------------
  // 4. GENERATE QR CODES FOR EACH BARCODE
  // ---------------------------------------------------------
  // QR generation happens in Node.js (not in PostgreSQL)
  // This is cleaner separation of concerns
  // 
  // **IMPORTANT**: Use traceability_url (contains unique RIC serial)
  // Each tire gets unique ID: RIC000000006072, RIC000000006073, etc.
  // This enables duplicate detection AND product identification
  console.log(`🔄 Generating QR codes for ${data.barcodes.length} barcodes...`);
  console.log(`📦 Product: ${data.product_sku}`);

  const barcodesWithQR = await Promise.all(
    data.barcodes.map(async (barcode) => {
      try {
        // Use traceability_url which contains unique RIC serial
        // Format: http://localhost:5173/trace/RIC000000006072
        // Backend will extract RIC serial and map it to product
        const qrCodeData = await QRCode.toDataURL(
          barcode.traceability_url,
          {
            errorCorrectionLevel: 'M', // Medium error correction - standard & fast
            margin: 1,
            width: 240,
            type: 'image/png'
          }
        );

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

  // Batch update barcodes with QR code data in controlled chunks
  const qrUpdates = barcodesWithQR.filter(b => b.qr_code_data);
  const CHUNK_SIZE = 50;
  for (let i = 0; i < qrUpdates.length; i += CHUNK_SIZE) {
    const chunk = qrUpdates.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map(b =>
        supabaseAdmin
          .from('barcodes')
          .update({ qr_code_data: b.qr_code_data })
          .eq('id', b.barcode_id)
      )
    );
  }

  console.log(`✅ QR codes generated and saved successfully`);

  // ---------------------------------------------------------
  // 5. CREATE RIC SERIAL MAPPINGS FOR AUTOMATIC IDENTIFICATION
  // ---------------------------------------------------------
  console.log(`🔗 Creating RIC serial mappings for automatic product identification...`);
  
  try {
    // Fetch product details for the mapping
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, sku, dimensions, category')
      .eq('id', productId)
      .single();
    
    if (productError) {
      console.warn(`⚠️  Could not fetch product details:`, productError.message);
    } else {
      // Create mapping entries for each barcode
      const mappingPromises = barcodesWithQR.map(async (barcode) => {
        const { error: mapError } = await supabaseAdmin
          .from('ric_serial_numbers')
          .upsert({
            serial_number: barcode.barcode_value,
            product_id: productId,
            batch_number: data.batch_number || null,
            status: 'MANUFACTURED',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'serial_number' // Update if already exists
          });
        
        if (mapError) {
          console.warn(`⚠️  Failed to create mapping for ${barcode.barcode_value}:`, mapError.message);
        }
      });
      
      await Promise.all(mappingPromises);
      console.log(`✅ Created ${barcodesWithQR.length} RIC serial mapping(s) for ${product.sku}`);
    }
  } catch (mappingError) {
    console.warn(`⚠️  RIC serial mapping creation failed (non-fatal):`, mappingError.message);
    // Don't fail the entire operation if mapping fails
  }

  // ---------------------------------------------------------
  // 6. RETURN COMPLETE RESULT
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
        warehouses (
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
