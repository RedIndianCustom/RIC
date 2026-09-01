/**
 * ============================================================================
 * WAREHOUSE CONTROLLER
 * ============================================================================
 * Handles warehouse locations, racks, and positions
 * ============================================================================
 */

import { supabaseAdmin } from '../config/supabase.js';

/**
 * GET /api/warehouses
 * Get all warehouses from the warehouses table
 */
export async function getWarehouses(req, res) {
  try {
    console.log('🏭 GET /api/warehouses - Fetching warehouses...');
    
    // Get all warehouses from the WAREHOUSES table (not warehouse_locations!)
    const { data, error } = await supabaseAdmin
      .from('warehouses')
      .select('id, code, name, location, total_slots, occupied_slots, status, created_at')
      .eq('status', 'active')
      .order('code');

    if (error) {
      console.error('❌ Warehouse query error:', error);
      throw error;
    }

    console.log(`✅ Found ${(data || []).length} warehouses`);
    if (data && data.length > 0) {
      console.log('📦 Warehouses:', data.map(w => ({ id: w.id, name: w.name, code: w.code })));
    }

    return res.json({
      success: true,
      warehouses: data || []
    });
  } catch (error) {
    console.error('❌ Get warehouses error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to load warehouses'
    });
  }
}

/**
 * GET /api/racks
 * Get racks filtered by warehouse and/or size category
 * Query params: warehouse_id, size_category
 */
export async function getRacks(req, res) {
  try {
    const { warehouse_id, size_category } = req.query;
    
    // Set cache-control headers to prevent 304 caching issues
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    console.log('🏗️ GET /api/racks');
    console.log('   warehouse_id:', warehouse_id);
    console.log('   size_category:', size_category);

    let query = supabaseAdmin
      .from('rack_configurations')
      .select(`
        *,
        warehouse:warehouses(id, name, code)
      `)
      .in('status', ['active', 'full'])
      .order('rack_number');

    if (warehouse_id) {
      query = query.eq('warehouse_id', warehouse_id);
    }

    if (size_category) {
      query = query.eq('size_category', size_category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Rack query error:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      throw error;
    }

    console.log(`✅ Found ${data?.length || 0} racks`);
    if (data && data.length > 0) {
      console.log('📦 Sample rack:', data[0]);
    }

    return res.json({
      success: true,
      racks: data || []
    });
  } catch (error) {
    console.error('❌ Get racks error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to load racks'
    });
  }
}

/**
 * GET /api/rack-locations
 * Get available positions in a rack
 * Query params: rack_id, status
 */
export async function getRackLocations(req, res) {
  try {
    const { rack_id, status } = req.query;

    if (!rack_id) {
      return res.status(400).json({
        success: false,
        error: 'rack_id is required'
      });
    }

    let query = supabaseAdmin
      .from('rack_locations')
      .select('*')
      .eq('rack_id', rack_id)
      .order('shelf_number')
      .order('section_number')
      .order('subsection_number');

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return res.json({
      success: true,
      locations: data || []
    });
  } catch (error) {
    console.error('❌ Get rack locations error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to load rack locations'
    });
  }
}

/**
 * POST /api/inventory/relocate
 * Relocate an inventory unit to new position
 * Body: { inventory_unit_id, new_rack_location_id, reason, notes }
 */
export async function relocateInventoryUnit(req, res) {
  try {
    const { inventory_unit_id, new_rack_location_id, reason, notes } = req.body;
    const userId = req.user?.id;

    if (!inventory_unit_id || !new_rack_location_id || !reason) {
      return res.status(400).json({
        success: false,
        error: 'inventory_unit_id, new_rack_location_id, and reason are required'
      });
    }

    // Get current inventory unit
    const { data: currentUnit, error: fetchError } = await supabaseAdmin
      .from('inventory_units')
      .select('*, barcodes(id)')
      .eq('id', inventory_unit_id)
      .single();

    if (fetchError || !currentUnit) {
      return res.status(404).json({
        success: false,
        error: 'Inventory unit not found'
      });
    }

    // Get new location details
    const { data: newLocation, error: locError } = await supabaseAdmin
      .from('rack_locations')
      .select('*, rack:rack_configurations(*)')
      .eq('id', new_rack_location_id)
      .single();

    if (locError || !newLocation) {
      return res.status(404).json({
        success: false,
        error: 'New rack location not found'
      });
    }

    // Check if new location has space
    if (newLocation.available_space <= 0) {
      return res.status(400).json({
        success: false,
        error: 'New location is full'
      });
    }

    // Create relocation history record
    const { error: historyError } = await supabaseAdmin
      .from('inventory_relocation_history')
      .insert({
        inventory_unit_id,
        barcode_id: currentUnit.barcodes?.[0]?.id,
        from_rack_location_id: currentUnit.rack_location_id,
        from_position_code: currentUnit.position_code,
        to_rack_location_id: new_rack_location_id,
        to_position_code: newLocation.position_code,
        reason,
        notes,
        relocated_by: userId
      });

    if (historyError) throw historyError;

    // Update inventory unit location
    const { data: updatedUnit, error: updateError } = await supabaseAdmin
      .from('inventory_units')
      .update({
        rack_location_id: new_rack_location_id,
        rack_code: newLocation.rack.rack_code,
        shelf_number: newLocation.shelf_number,
        section_number: newLocation.section_number,
        subsection_number: newLocation.subsection_number,
        position_code: newLocation.position_code,
        last_relocated_at: new Date().toISOString(),
        relocation_count: (currentUnit.relocation_count || 0) + 1
      })
      .eq('id', inventory_unit_id)
      .select()
      .single();

    if (updateError) throw updateError;

    return res.json({
      success: true,
      inventory_unit: updatedUnit,
      message: 'Inventory unit relocated successfully'
    });
  } catch (error) {
    console.error('❌ Relocate inventory error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to relocate inventory unit'
    });
  }
}

/**
 * GET /api/inventory/scan/:barcode_value
 * Scan and retrieve inventory unit details
 */
export async function scanInventoryUnit(req, res) {
  try {
    const { barcode_value } = req.params;

    if (!barcode_value) {
      return res.status(400).json({
        success: false,
        error: 'Barcode value is required'
      });
    }

    // Get barcode with full traceability
    const { data, error } = await supabaseAdmin
      .rpc('get_barcodes_with_traceability', { p_limit: 1 })
      .eq('barcode_value', barcode_value)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: 'Barcode not found'
      });
    }

    // Transform to expected format
    const result = {
      barcode_id: data.barcode_id,
      barcode_value: data.barcode_value,
      status: data.status,
      product: {
        id: data.product_id,
        sku: data.product_sku,
        brand: data.product_brand,
        model: data.product_model
      },
      batch: {
        id: data.batch_id,
        batch_number: data.batch_number
      },
      warehouse_location: {
        position_code: data.position_code || 'Not assigned',
        rack_code: data.rack_code,
        shelf: data.shelf_number,
        section: data.section_number,
        subsection: data.subsection_number
      }
    };

    return res.json({
      success: true,
      inventory_unit: result
    });
  } catch (error) {
    console.error('❌ Scan inventory error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to scan inventory unit'
    });
  }
}

/**
 * POST /api/warehouse/validate-barcode-size
 * Validate that a scanned barcode matches the expected product size
 * Body: { barcode, expected_size, shipment_id }
 * 
 * NOTE: Barcodes are generated as RIC + 12-digit sequential number (e.g., RIC000000000001)
 * Size information is NOT embedded in the barcode - it's stored in the linked product record
 */
export async function validateBarcodeSize(req, res) {
  try {
    let { barcode, expected_size, shipment_id } = req.body;

    console.log('🔍 POST /api/warehouse/validate-barcode-size');
    console.log('   barcode (raw):', barcode);
    console.log('   expected_size:', expected_size);
    console.log('   expected_size type:', typeof expected_size);
    console.log('   expected_size length:', expected_size?.length);
    console.log('   shipment_id:', shipment_id);

    if (!barcode || !expected_size) {
      return res.status(400).json({
        success: false,
        error: 'Barcode and expected_size are required'
      });
    }

    // ✅ EXTRACT BARCODE FROM URL if it's a full URL
    // QR codes contain full URL like: http://localhost:5173/trace/RIC000000005906
    // We need just: RIC000000005906
    if (barcode.includes('/trace/') || barcode.includes('http://') || barcode.includes('https://')) {
      const urlParts = barcode.split('/');
      barcode = urlParts[urlParts.length - 1]; // Get last part after final /
      console.log('   ✅ Extracted barcode from URL:', barcode);
    }

    // Additional cleanup - remove any query parameters or fragments
    barcode = barcode.split('?')[0].split('#')[0].trim();
    console.log('   Final barcode value:', barcode);

    // ✅ PRIMARY METHOD: Query database for barcode and get linked product
    // Barcodes format: RIC000000000001, RIC000000000002, etc.
    // Size is stored in the products table via product_id foreign key
    
    const { data: barcodeData, error: barcodeError } = await supabaseAdmin
      .from('barcodes')
      .select(`
        id,
        barcode_value,
        product_id,
        batch_id,
        products (
          id,
          sku,
          brand,
          model,
          product_name,
          dimensions,
          product_code,
          category
        ),
        batches (
          id,
          batch_number
        )
      `)
      .eq('barcode_value', barcode)
      .single();

    if (barcodeData && barcodeData.products) {
      // Found in database - validate against product dimensions
      const product = barcodeData.products;
      const actualSize = product.dimensions || '';
      
      console.log('📏 Size comparison (from database):');
      console.log('   Expected:', expected_size);
      console.log('   Actual from product.dimensions:', actualSize);
      console.log('   Product:', product);

      // ✅ Check if product has valid dimensions
      if (!actualSize || actualSize.trim() === '' || actualSize === '000/00-00') {
        console.error('❌ PRODUCT HAS INVALID DIMENSIONS!');
        console.error('   Product ID:', product.id);
        console.error('   SKU:', product.sku);
        console.error('   Dimensions field:', actualSize || 'EMPTY');
        
        return res.status(400).json({
          success: false,
          message: `Barcode found but product has no size information. Product: ${product.brand} ${product.model} (SKU: ${product.sku})`,
          expected_size: expected_size,
          actual_size: actualSize || '000/00-00',
          source: 'database',
          error_type: 'INVALID_PRODUCT_DIMENSIONS',
          product: {
            id: product.id,
            sku: product.sku,
            brand: product.brand,
            model: product.model,
            name: product.product_name,
            category: product.category
          },
          hint: 'The product in the database needs to have the dimensions field filled in. Please update the product or regenerate barcodes with a product that has valid dimensions.'
        });
      }

      // Normalize size for comparison - MORE FLEXIBLE
      const normalizeSize = (size) => {
        if (!size) return '';
        
        return size.toString()
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '')          // Remove all whitespace
          .replace(/[\/\-_]/g, '/')     // Convert all separators to /
          .replace(/[^\d\/]/g, '')      // Remove non-digits and non-slashes
          || '';
      };

      const normalizedExpected = normalizeSize(expected_size);
      const normalizedActual = normalizeSize(actualSize);

      console.log('   Normalized Expected:', normalizedExpected);
      console.log('   Normalized Actual:', normalizedActual);
      console.log('   Raw Expected:', expected_size);
      console.log('   Raw Actual:', actualSize);

      // FLEXIBLE MATCH - handles different formats
      // Matches: "90/90-17", "90/90/17", "90-90-17", " 90 / 90 - 17 ", etc.
      if (normalizedActual === normalizedExpected) {
        console.log('✅ Size match! Barcode is for the correct product size.');
        return res.json({
          success: true,
          message: 'Barcode validated successfully - correct size',
          source: 'database',
          product: {
            id: product.id,
            sku: product.sku,
            brand: product.brand,
            model: product.model,
            name: product.name,
            size: actualSize,
            category: product.category
          },
          batch: barcodeData.batches ? {
            id: barcodeData.batches.id,
            batch_number: barcodeData.batches.batch_number
          } : null
        });
      } else {
        // ❌ Wrong size detected
        console.warn('❌ SIZE MISMATCH!');
        console.warn(`   Scanned barcode is for size: "${actualSize}"`);
        console.warn(`   But you selected size: "${expected_size}"`);
        console.warn(`   Product: ${product.brand} ${product.model}`);
        
        return res.json({
          success: false,
          message: `Wrong size! This barcode is for ${actualSize}, but you selected ${expected_size}`,
          expected_size: expected_size,
          actual_size: actualSize,
          source: 'database',
          product: {
            id: product.id,
            sku: product.sku,
            brand: product.brand,
            model: product.model,
            name: product.product_name,
            category: product.category
          },
          batch: barcodeData.batches ? {
            id: barcodeData.batches.id,
            batch_number: barcodeData.batches.batch_number
          } : null
        });
      }
    }

    // Barcode not found in database
    if (barcodeError) {
      console.error('❌ Database error:', barcodeError);
    }
    
    console.warn('⚠️ Barcode not found in system');
    console.warn('   Barcode:', barcode);
    console.warn('   This barcode has not been generated yet or does not exist');
    
    return res.status(404).json({
      success: false,
      message: 'Barcode not found in the system. Please generate barcodes first before scanning.',
      source: 'not_found',
      barcode_received: barcode,
      expected_size: expected_size,
      hint: 'Generate barcodes for this product batch in the Barcode Generation page first'
    });

  } catch (error) {
    console.error('❌ Validate barcode size error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to validate barcode size'
    });
  }
}

/**
 * GET /api/warehouses/:warehouseId/racks/:rackId/capacity
 * Get real-time capacity usage for all shelves/sections/subsections in a rack
 * Returns tire counts with capacity limits
 */
export async function getRackCapacity(req, res) {
  try {
    const { warehouseId, rackId } = req.params;
    
    console.log('📊 GET /api/warehouses/:warehouseId/racks/:rackId/capacity');
    console.log('   warehouseId:', warehouseId);
    console.log('   rackId:', rackId);

    if (!warehouseId || !rackId) {
      return res.status(400).json({
        success: false,
        error: 'warehouseId and rackId are required'
      });
    }

    // Get rack configuration to know the structure
    const { data: rack, error: rackError } = await supabaseAdmin
      .from('rack_configurations')
      .select('id, rack_code, total_shelves, sections_per_shelf, subsections_per_section')
      .eq('id', rackId)
      .eq('warehouse_id', warehouseId)
      .single();

    if (rackError || !rack) {
      console.error('❌ Rack not found:', rackError);
      return res.status(404).json({
        success: false,
        error: 'Rack not found'
      });
    }

    console.log('📦 Rack config:', rack);

    // Count tires in each location (shelf, section, subsection)
    // Group by shelf_number, section_number, subsection_number
    const { data: inventoryUnits, error: inventoryError } = await supabaseAdmin
      .from('inventory_units')
      .select('shelf_number, section_number, subsection_number, quantity, warehouse_id, rack, status')
      .eq('warehouse_id', warehouseId)
      .eq('rack', rack.rack_code)
      .in('status', ['NEW', 'pending', 'received', 'available', 'reserved']); // Added 'NEW' status

    if (inventoryError) {
      console.error('❌ Error fetching inventory units:', inventoryError);
      throw inventoryError;
    }

    console.log(`📦 Found ${inventoryUnits?.length || 0} inventory units in this rack`);
    console.log('📊 Query parameters:', {
      warehouse_id: warehouseId,
      rack: rack.rack_code,
      statuses: ['NEW', 'pending', 'received', 'available', 'reserved']
    });
    
    if (inventoryUnits && inventoryUnits.length > 0) {
      console.log('📦 Sample unit:', inventoryUnits[0]);
    } else {
      console.warn('⚠️ NO INVENTORY UNITS FOUND - checking if any exist at all...');
      
      // Debug: Check all inventory units
      const { data: allUnits } = await supabaseAdmin
        .from('inventory_units')
        .select('id, warehouse_id, rack, status, shelf_number')
        .limit(5);
      
      console.log('🔍 Sample of ALL inventory units:', allUnits);
    }

    // Calculate usage by location
    const usage = {
      shelves: {},
      sections: {},
      subsections: {}
    };

    // Process each inventory unit
    (inventoryUnits || []).forEach(unit => {
      const qty = unit.quantity || 1;
      const shelf = unit.shelf_number;
      const section = unit.section_number;
      const subsection = unit.subsection_number;

      // Count by shelf
      if (shelf) {
        const shelfKey = `shelf_${shelf}`;
        usage.shelves[shelfKey] = (usage.shelves[shelfKey] || 0) + qty;
      }

      // Count by section (within shelf)
      if (shelf && section) {
        const sectionKey = `shelf_${shelf}_section_${section}`;
        usage.sections[sectionKey] = (usage.sections[sectionKey] || 0) + qty;
      }

      // Count by subsection (within section)
      if (shelf && section && subsection) {
        const subsectionKey = `shelf_${shelf}_section_${section}_subsection_${subsection}`;
        usage.subsections[subsectionKey] = (usage.subsections[subsectionKey] || 0) + qty;
      }
    });

    // Capacity rules
    const SECTION_MIN_CAPACITY = 28;
    const SECTION_MAX_CAPACITY = 30;
    const SUBSECTION_MIN_CAPACITY = 13;
    const SUBSECTION_MAX_CAPACITY = 15;

    // Format response with capacity info
    const result = {
      rackId: rack.id,
      rackCode: rack.rack_code,
      totalShelves: rack.total_shelves,
      sectionsPerShelf: rack.sections_per_shelf,
      subsectionsPerSection: rack.subsections_per_section,
      usage: {
        shelves: usage.shelves,
        sections: Object.keys(usage.sections).reduce((acc, key) => {
          acc[key] = {
            used: usage.sections[key],
            minCapacity: SECTION_MIN_CAPACITY,
            maxCapacity: SECTION_MAX_CAPACITY,
            percentFull: Math.round((usage.sections[key] / SECTION_MAX_CAPACITY) * 100)
          };
          return acc;
        }, {}),
        subsections: Object.keys(usage.subsections).reduce((acc, key) => {
          acc[key] = {
            used: usage.subsections[key],
            minCapacity: SUBSECTION_MIN_CAPACITY,
            maxCapacity: SUBSECTION_MAX_CAPACITY,
            percentFull: Math.round((usage.subsections[key] / SUBSECTION_MAX_CAPACITY) * 100)
          };
          return acc;
        }, {})
      }
    };

    console.log('✅ Capacity calculated:', JSON.stringify(result, null, 2));

    return res.json({
      success: true,
      capacity: result
    });
  } catch (error) {
    console.error('❌ Get rack capacity error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get rack capacity'
    });
  }
}
