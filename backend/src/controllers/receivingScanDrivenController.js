/**
 * ============================================================================
 * SCAN-DRIVEN RECEIVING CONTROLLER
 * ============================================================================
 * Backend logic for barcode-driven receiving workflow
 * - Automatic product identification from barcodes
 * - Duplicate detection
 * - Validation against expected items
 * - Discrepancy tracking
 * ============================================================================
 */

import supabaseAdmin from '../config/supabaseAdmin.js';

/**
 * Identify product from barcode
 * This is the core function that determines which product a barcode belongs to
 */
export async function identifyBarcodeProduct(req, res) {
  try {
    let { barcode, shipment_id, expected_items } = req.body;

    if (!barcode || !shipment_id) {
      return res.status(400).json({
        success: false,
        reason: 'MISSING_DATA',
        message: 'Barcode and shipment ID are required'
      });
    }

    console.log('\n========================================');
    console.log('🔍 BARCODE IDENTIFICATION DEBUG');
    console.log('========================================');
    console.log('Raw barcode received:', barcode);
    console.log('Barcode length:', barcode.length);
    console.log('Barcode type:', typeof barcode);

    // Extract barcode from URL if it's a full URL
    // Format: http://localhost:5173/trace/RIC000000006038
    // Format: http://domain.com/trace/BARCODE123
    if (barcode.startsWith('http://') || barcode.startsWith('https://')) {
      console.log('📍 Detected URL format, extracting barcode...');
      
      try {
        const url = new URL(barcode);
        // Extract last part of pathname
        const pathParts = url.pathname.split('/').filter(Boolean);
        const extractedBarcode = pathParts[pathParts.length - 1];
        
        console.log(`   URL: ${barcode}`);
        console.log(`   Extracted: ${extractedBarcode}`);
        
        barcode = extractedBarcode;
      } catch (urlError) {
        console.log('⚠️  Failed to parse URL, trying string extraction...');
        // Fallback: extract everything after last /
        const lastSlash = barcode.lastIndexOf('/');
        if (lastSlash !== -1) {
          barcode = barcode.substring(lastSlash + 1);
          console.log(`   Extracted: ${barcode}`);
        }
      }
    }

    console.log('Final barcode value:', barcode);
    console.log('Shipment ID:', shipment_id);
    console.log('Expected items count:', expected_items?.length || 0);
    
    if (expected_items && expected_items.length > 0) {
      console.log('\n📦 Expected Products:');
      expected_items.forEach((item, idx) => {
        console.log(`  ${idx + 1}. Product ID: ${item.product_id}, SKU: ${item.sku || 'NONE'}, Size: ${item.size || 'NONE'}`);
      });
    } else {
      console.log('⚠️  WARNING: No expected items provided!');
    }
    console.log('========================================\n');

    // Strategy 0: Direct SKU match (BEST - no mapping needed!)
    // Check if barcode IS a SKU or contains a SKU
    console.log('🔍 Strategy 0: Direct SKU matching...');
    
    if (expected_items && expected_items.length > 0) {
      for (const item of expected_items) {
        if (item.sku && (barcode === item.sku || barcode.toUpperCase().includes(item.sku.toUpperCase()))) {
          console.log(`✅ Direct SKU match found: ${item.sku}`);
          
          const { data: product } = await supabaseAdmin
            .from('products')
            .select('*')
            .eq('id', item.product_id)
            .single();

          if (product) {
            return res.json({
              success: true,
              product: {
                product_id: product.id,
                product_name: `${product.brand} ${product.model}`,
                brand: product.brand,
                model: product.model,
                size: product.dimensions,
                sku: product.sku
              },
              source: 'direct_sku_match',
              info: 'Identified from SKU in QR code'
            });
          }
        }
      }
    }

    // Strategy 1: Product info extraction from barcode
    // This handles QR codes that embed product details directly
    console.log('🔍 Strategy 1: Product info extraction from barcode...');
    
    // Try to extract brand, model, and size from barcode
    // Common formats: "Dual Sport XT 100/90-17", "DSXT 100/90-17", "Armor XT 100/80-17"
    const productInfoMatch = barcode.match(/(Dual Sport XT|Armor XT|Classic Sawtooth|Enduro Trail|Street Dual Sport|Armor ADV|DSXT|ARXT|SAW|END|SDS|AADV)\s*(\d{2,3}[\/\-]\d{2,3}[\/\-]R?\d{2})/i);
    
    if (productInfoMatch) {
      const brandModelPart = productInfoMatch[1];
      const sizePart = productInfoMatch[2].replace(/\-/g, '/').replace(/R/gi, '-');
      
      console.log(`   Found product info in barcode:`);
      console.log(`   Brand/Model: ${brandModelPart}`);
      console.log(`   Size: ${sizePart}`);
      
      // Normalize size format to match database
      const normalizedSize = sizePart.replace(/\//g, '/').replace(/\-/g, '-');
      
      // Find matching product in expected items by size
      const matchedItem = expected_items?.find(item => {
        const itemSize = item.size?.replace(/\s/g, '');
        const searchSize = normalizedSize.replace(/\s/g, '');
        return itemSize === searchSize || item.size === normalizedSize;
      });
      
      if (matchedItem) {
        console.log(`✅ Matched to expected product by size: ${matchedItem.sku}`);
        
        const { data: product } = await supabaseAdmin
          .from('products')
          .select('*')
          .eq('id', matchedItem.product_id)
          .single();

        if (product) {
          return res.json({
            success: true,
            product: {
              product_id: product.id,
              product_name: `${product.brand} ${product.model}`,
              brand: product.brand,
              model: product.model,
              size: product.dimensions,
              sku: product.sku
            },
            source: 'product_info_extracted',
            info: `Identified from QR code content: ${brandModelPart} ${sizePart}`
          });
        }
      } else {
        console.log(`⚠️  Size ${normalizedSize} found in barcode but not in expected items`);
      }
    }

    // Strategy 1: Direct barcode lookup in products table
    const { data: productByBarcode, error: barcodeError } = await supabaseAdmin
      .from('products')
      .select('id, brand, model, dimensions, sku, barcode')
      .eq('barcode', barcode)
      .single();

    if (productByBarcode && !barcodeError) {
      console.log('✅ Found product by barcode:', productByBarcode);
      
      // Verify this product is in the expected items
      const expectedItem = expected_items?.find(item => 
        item.product_id === productByBarcode.id && 
        item.size === productByBarcode.dimensions
      );

      if (expectedItem) {
        return res.json({
          success: true,
          product: {
            product_id: productByBarcode.id,
            product_name: `${productByBarcode.brand} ${productByBarcode.model}`,
            brand: productByBarcode.brand,
            model: productByBarcode.model,
            size: productByBarcode.dimensions,
            sku: productByBarcode.sku
          },
          source: 'direct_barcode_match'
        });
      } else {
        // Product exists but not in this shipment
        return res.json({
          success: false,
          reason: 'NOT_IN_SHIPMENT',
          message: `Product ${productByBarcode.brand} ${productByBarcode.model} - ${productByBarcode.dimensions} is not expected in this shipment`
        });
      }
    }

    // Strategy 3: Check for RIC serial number format (RIC followed by numbers only)
    // Format: RIC000000006038
    console.log('🔍 Strategy 3: RIC serial number check...');
    const ricSerialMatch = barcode.match(/^RIC(\d+)$/i);
    
    if (ricSerialMatch) {
      const serialNumber = ricSerialMatch[1];
      const fullSerial = `RIC${serialNumber}`;
      console.log(`📋 Found RIC serial number: ${fullSerial}`);
      
      // Check database for RIC serial mapping
      console.log(`🔍 Querying database for serial mapping: ${fullSerial}`);
      const { data: serialMapping, error: mappingError } = await supabaseAdmin
        .from('ric_serial_numbers')
        .select('serial_number, product_id')
        .eq('serial_number', fullSerial)
        .single();
      
      if (serialMapping && !mappingError) {
        console.log(`✅ Found serial mapping in database:`, serialMapping);
        
        // Find the matching product in expected items
        const matchedItem = expected_items?.find(item => 
          item.product_id === serialMapping.product_id
        );
        
        if (matchedItem) {
          console.log(`✅ Matched to expected product: ${matchedItem.sku}`);
          
          const { data: product } = await supabaseAdmin
            .from('products')
            .select('*')
            .eq('id', matchedItem.product_id)
            .single();

          if (product) {
            return res.json({
              success: true,
              product: {
                product_id: product.id,
                product_name: `${product.brand} ${product.model}`,
                brand: product.brand,
                model: product.model,
                size: product.dimensions,
                sku: product.sku
              },
              source: 'ric_serial_mapped',
              serial_number: fullSerial
            });
          }
        } else {
          console.log(`⚠️  Serial ${fullSerial} maps to product ${serialMapping.product_id} but not in expected items`);
          
          // Get product details for better error message
          const { data: mappedProduct } = await supabaseAdmin
            .from('products')
            .select('brand, model, dimensions, sku')
            .eq('id', serialMapping.product_id)
            .single();
          
          return res.json({
            success: false,
            reason: 'NOT_IN_SHIPMENT',
            message: mappedProduct 
              ? `Serial ${fullSerial} belongs to ${mappedProduct.brand} ${mappedProduct.model} ${mappedProduct.dimensions}, which is not expected in this shipment`
              : `Serial ${fullSerial} is not expected in this shipment`
          });
        }
      } else {
        console.log(`ℹ️  No mapping found for serial ${fullSerial} in database, using fallback logic`);
      }
      
      console.log(`   Expected items count: ${expected_items?.length || 0}`);
      
      // Fallback: If only one product expected, assign to it
      if (expected_items && expected_items.length === 1) {
        const singleItem = expected_items[0];
        console.log(`✅ Only one product expected, assigning to: ${singleItem.sku}`);
        
        const { data: product } = await supabaseAdmin
          .from('products')
          .select('*')
          .eq('id', singleItem.product_id)
          .single();

        if (product) {
          return res.json({
            success: true,
            product: {
              product_id: product.id,
              product_name: `${product.brand} ${product.model}`,
              brand: product.brand,
              model: product.model,
              size: product.dimensions,
              sku: product.sku
            },
            source: 'ric_serial_single_product',
            warning: `Auto-matched RIC serial ${serialNumber} to the only expected product`
          });
        }
      } else if (expected_items && expected_items.length > 1) {
        // CRITICAL: Cannot auto-assign to first product - this causes wrong product errors!
        // Instead, return error with all available options
        console.log('❌ Multiple products expected - CANNOT auto-assign (would be wrong!)');
        console.log(`   Available products: ${expected_items.map(i => i.sku).join(', ')}`);
        
        return res.json({
          success: false,
          reason: 'MULTIPLE_PRODUCTS_NO_MAPPING',
          message: `Cannot identify RIC serial ${fullSerial}. Multiple products expected in this shipment.`,
          available_products: expected_items.map(item => ({
            product_id: item.product_id,
            sku: item.sku,
            size: item.size,
            product_name: item.product_name || `${item.sku} - ${item.size}`
          })),
          suggestions: [
            `Option 1 (BEST): Regenerate QR codes with SKU data (go to Barcode Generation page)`,
            `Option 2: Add RIC serial mapping: node backend/add-ric-serial.mjs ${fullSerial} <SKU>`,
            `Option 3: Run bulk mapping script: node backend/bulk-add-ric-serials.mjs`
          ],
          debug: {
            serial: fullSerial,
            expected_count: expected_items.length,
            mapping_exists: false
          }
        });
      } else {
        console.log('⚠️  No expected items found');
      }
    }

    // Strategy 3: Parse tire size from barcode (RIC format with size)
    // Format: RIC-BRAND-MODEL-SIZE-SERIALNUMBER
    // Example: RIC-DSXT-90-90-19-TL-001234
    console.log('🔍 Strategy 3: RIC format with size...');
    const ricMatch = barcode.match(/RIC-([A-Z0-9]+)-(\d+)-(\d+)-(\d+)/i);
    
    if (ricMatch) {
      const [, brandCode, width, aspect, rim] = ricMatch;
      const size = `${width}/${aspect}-${rim}`;
      
      console.log('📏 Parsed size from RIC barcode:', size);

      // Find matching product in expected items by size
      const expectedItem = expected_items?.find(item => item.size === size);

      if (expectedItem) {
        // Get full product details
        const { data: product } = await supabaseAdmin
          .from('products')
          .select('*')
          .eq('id', expectedItem.product_id)
          .single();

        if (product) {
          return res.json({
            success: true,
            product: {
              product_id: product.id,
              product_name: `${product.brand} ${product.model}`,
              brand: product.brand,
              model: product.model,
              size: product.dimensions,
              sku: product.sku
            },
            source: 'ric_barcode_parse'
          });
        }
      }
    }

    // Strategy 5: Extract size from generic tire barcode format
    // Many tire barcodes contain the size in a standard format
    console.log('🔍 Strategy 5: Generic tire size parsing...');
    const genericSizeMatch = barcode.match(/(\d{2,3})[\/-]?(\d{2,3})[\/-]?([RD]?)(\d{2})/i);
    
    if (genericSizeMatch) {
      const [, width, aspect, type, rim] = genericSizeMatch;
      const size = `${width}/${aspect}-${rim}`;
      
      console.log('📏 Parsed size from generic barcode:', size);

      const expectedItem = expected_items?.find(item => item.size === size);

      if (expectedItem) {
        const { data: product } = await supabaseAdmin
          .from('products')
          .select('*')
          .eq('id', expectedItem.product_id)
          .single();

        if (product) {
          return res.json({
            success: true,
            product: {
              product_id: product.id,
              product_name: `${product.brand} ${product.model}`,
              brand: product.brand,
              model: product.model,
              size: product.dimensions,
              sku: product.sku
            },
            source: 'generic_barcode_parse',
            warning: 'Size parsed from barcode format - verify accuracy'
          });
        }
      }
    }

    // Strategy 6: Check if barcode matches SKU pattern
    console.log('🔍 Strategy 6: SKU pattern matching...');
    if (expected_items && expected_items.length > 0) {
      for (const item of expected_items) {
        if (item.sku && barcode.toUpperCase().includes(item.sku.toUpperCase())) {
          console.log('✅ Found SKU match:', item.sku);
          const { data: product } = await supabaseAdmin
            .from('products')
            .select('*')
            .eq('id', item.product_id)
            .single();

          if (product) {
            return res.json({
              success: true,
              product: {
                product_id: product.id,
                product_name: `${product.brand} ${product.model}`,
                brand: product.brand,
                model: product.model,
                size: product.dimensions,
                sku: product.sku
              },
              source: 'sku_match'
            });
          }
        }
      }
    }

    // Strategy 7: Smart fallback - if only ONE product expected, assume it's that one
    // (This is already handled by Strategy 3 for RIC serials, but keep as fallback)
    console.log('🔍 Strategy 7: Smart fallback (single product)...');
    if (expected_items && expected_items.length === 1) {
      const singleItem = expected_items[0];
      console.log('⚠️  Only one product expected - using smart fallback');
      console.log('   Product ID:', singleItem.product_id);
      
      const { data: product } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('id', singleItem.product_id)
        .single();

      if (product) {
        return res.json({
          success: true,
          product: {
            product_id: product.id,
            product_name: `${product.brand} ${product.model}`,
            brand: product.brand,
            model: product.model,
            size: product.dimensions,
            sku: product.sku
          },
          source: 'smart_fallback_single_product',
          warning: 'Matched to the only expected product - please verify'
        });
      }
    }

    // Strategy 8: Check all products in database and see if ANY have this barcode
    console.log('🔍 Strategy 8: Database-wide barcode search...');
    const { data: anyProduct } = await supabaseAdmin
      .from('products')
      .select('*')
      .or(`barcode.ilike.%${barcode}%,sku.ilike.%${barcode}%`)
      .limit(1)
      .single();

    if (anyProduct) {
      console.log('⚠️  Found product in database:', anyProduct.sku);
      // Check if it's in expected items
      const isExpected = expected_items?.some(item => item.product_id === anyProduct.id);
      
      if (isExpected) {
        return res.json({
          success: true,
          product: {
            product_id: anyProduct.id,
            product_name: `${anyProduct.brand} ${anyProduct.model}`,
            brand: anyProduct.brand,
            model: anyProduct.model,
            size: anyProduct.dimensions,
            sku: anyProduct.sku
          },
          source: 'database_wide_search'
        });
      } else {
        return res.json({
          success: false,
          reason: 'NOT_IN_SHIPMENT',
          message: `Found "${anyProduct.brand} ${anyProduct.model} ${anyProduct.dimensions}" but it's not expected in this shipment`
        });
      }
    }

    // No match found - provide detailed debug info
    console.log('❌ NO MATCH FOUND');
    console.log('\n🔍 DEBUG INFO:');
    console.log('   Strategies attempted: 8');
    console.log('   Barcode value:', barcode);
    console.log('   Expected products:', expected_items?.length || 0);
    
    if (expected_items && expected_items.length > 0) {
      console.log('\n💡 TROUBLESHOOTING SUGGESTIONS:');
      console.log('   1. BEST: Generate QR with SKU (e.g., DSXT-17-100/90)');
      console.log('   2. Or product info (e.g., Dual Sport XT 100/90-17)');
      console.log('   3. Or RIC format: RIC-BRAND-90-90-19');
      console.log('   4. Or just tire size: 90/90-19');
      console.log('\n   Expected product details:');
      expected_items.forEach((item, idx) => {
        console.log(`     ${idx + 1}. ID=${item.product_id}, SKU=${item.sku || 'NONE'}, Size=${item.size || 'NONE'}`);
      });
    }

    return res.json({
      success: false,
      reason: 'BARCODE_NOT_FOUND',
      message: `Cannot identify "${barcode.substring(0, 50)}${barcode.length > 50 ? '...' : ''}"`,
      debug: {
        barcode_length: barcode.length,
        expected_products: expected_items?.length || 0,
        strategies_tried: ['direct_sku', 'product_info', 'direct_barcode', 'ric_serial', 'ric_format', 'generic_size', 'sku_pattern', 'smart_fallback', 'database_wide'],
        suggestion: expected_items?.length === 0 
          ? 'No expected items registered for this shipment' 
          : 'Generate QR codes with SKU (e.g., DSXT-17-100/90) for automatic identification'
      }
    });

  } catch (error) {
    console.error('Error identifying barcode:', error);
    return res.status(500).json({
      success: false,
      reason: 'SERVER_ERROR',
      message: 'Failed to identify product from barcode',
      error: error.message
    });
  }
}

/**
 * Start receiving session
 */
export async function startReceivingSession(req, res) {
  try {
    const { shipment_id } = req.body;
    const userId = req.user?.id || req.user?.user_id;

    if (!shipment_id) {
      return res.status(400).json({
        success: false,
        error: 'Shipment ID is required'
      });
    }

    // Update shipment status to INSPECTING
    const { data: shipment, error: updateError } = await supabaseAdmin
      .from('shipments')
      .update({ 
        status: 'INSPECTING',
        updated_at: new Date().toISOString()
      })
      .eq('id', shipment_id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Create session record (optional - for audit trail)
    const sessionId = `SESSION-${Date.now()}`;

    return res.json({
      success: true,
      session_id: sessionId,
      shipment: shipment,
      message: 'Receiving session started'
    });

  } catch (error) {
    console.error('Error starting receiving session:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to start receiving session'
    });
  }
}

/**
 * Submit receiving report
 * This is called when warehouse staff clicks "Done Scanning"
 */
export async function submitReceivingReport(req, res) {
  try {
    const { 
      shipment_id, 
      session_id,
      size_breakdown, 
      total_expected, 
      total_scanned, 
      total_discrepancy,
      notes,
      scan_history 
    } = req.body;

    const userId = req.user?.id || req.user?.user_id;

    if (!shipment_id || !size_breakdown) {
      return res.status(400).json({
        success: false,
        error: 'Missing required data'
      });
    }

    console.log('📝 Submitting receiving report for shipment:', shipment_id);

    // Check if there are discrepancies
    const hasDiscrepancies = total_discrepancy !== 0;

    // Create receiving report
    const { data: report, error: reportError } = await supabaseAdmin
      .from('receiving_reports')
      .insert({
        shipment_id,
        session_id,
        submitted_by: userId,
        size_breakdown,
        total_expected,
        total_scanned,
        total_discrepancy,
        notes,
        scan_history: scan_history || [],
        has_discrepancies: hasDiscrepancies,
        status: hasDiscrepancies ? 'PENDING_APPROVAL' : 'APPROVED',
        report_number: `RR-${Date.now()}`,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (reportError) {
      console.error('Error creating report:', reportError);
      throw reportError;
    }

    // If no discrepancies, auto-approve and move to QC
    if (!hasDiscrepancies) {
      // Update shipment to READY_FOR_QC
      await supabaseAdmin
        .from('shipments')
        .update({ 
          status: 'READY_FOR_QC',
          received_at: new Date().toISOString()
        })
        .eq('id', shipment_id);

      return res.json({
        success: true,
        report_number: report.report_number,
        has_discrepancies: false,
        message: 'Receiving complete - shipment ready for QC inspection'
      });
    }

    // Has discrepancies - require manager approval
    // TODO: Notify managers
    console.log('⚠️ Discrepancies detected - manager approval required');

    return res.json({
      success: true,
      report_number: report.report_number,
      has_discrepancies: true,
      discrepancies: size_breakdown.filter(item => item.discrepancy !== 0),
      message: 'Report submitted - manager approval required for discrepancies'
    });

  } catch (error) {
    console.error('Error submitting report:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to submit receiving report',
      details: error.message
    });
  }
}

/**
 * Validate barcode against expected size (for warehouse validation endpoint)
 */
export async function validateBarcodeSize(req, res) {
  try {
    const { barcode, expected_size, shipment_id } = req.body;

    if (!barcode || !expected_size) {
      return res.status(400).json({
        success: false,
        error: 'Barcode and expected size are required'
      });
    }

    // Parse size from barcode
    const ricMatch = barcode.match(/RIC-([A-Z]+)-(\d+)-(\d+)-(\d+)/i);
    
    if (ricMatch) {
      const [, , width, aspect, rim] = ricMatch;
      const scannedSize = `${width}/${aspect}-${rim}`;
      
      if (scannedSize === expected_size) {
        return res.json({
          success: true,
          actual_size: scannedSize,
          message: 'Barcode matches expected size',
          source: 'ric_barcode'
        });
      } else {
        return res.json({
          success: false,
          actual_size: scannedSize,
          expected_size: expected_size,
          message: `Size mismatch: Expected ${expected_size}, scanned ${scannedSize}`,
          source: 'ric_barcode'
        });
      }
    }

    // Try generic tire barcode format
    const genericMatch = barcode.match(/(\d{2,3})[\/-]?(\d{2,3})[\/-]?([RD]?)(\d{2})/i);
    
    if (genericMatch) {
      const [, width, aspect, , rim] = genericMatch;
      const scannedSize = `${width}/${aspect}-${rim}`;
      
      if (scannedSize === expected_size) {
        return res.json({
          success: true,
          actual_size: scannedSize,
          message: 'Barcode matches expected size',
          source: 'generic_barcode'
        });
      } else {
        return res.json({
          success: false,
          actual_size: scannedSize,
          expected_size: expected_size,
          message: `Size mismatch: Expected ${expected_size}, scanned ${scannedSize}`,
          source: 'generic_barcode'
        });
      }
    }

    // Cannot determine size from barcode
    return res.json({
      success: false,
      message: 'Cannot determine tire size from barcode format',
      source: 'unable_to_validate'
    });

  } catch (error) {
    console.error('Error validating barcode size:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to validate barcode'
    });
  }
}
