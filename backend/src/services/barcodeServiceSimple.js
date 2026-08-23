/**
 * EMERGENCY BARCODE SERVICE - NO DATABASE REQUIRED
 * For deadline demo - generates barcodes without database dependency
 * Stores barcodes in memory only
 */
import QRCode from 'qrcode';
import { logger } from '../utils/logger.js';
import { env } from '../config/environment.js';

// In-memory storage (will reset on server restart)
const barcodes = [];
let sequence = 200000000000;

/**
 * Calculate checksum
 */
function calculateChecksum(value) {
  const digits = value.replace(/\D/g, '');
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    const digit = parseInt(digits[i], 10);
    const multiplier = i % 2 === 0 ? 3 : 1;
    sum += digit * multiplier;
  }
  return ((10 - (sum % 10)) % 10).toString();
}

/**
 * Generate unique barcode value
 */
function generateBarcodeValue() {
  sequence++;
  const base = sequence.toString();
  const checksum = calculateChecksum(base);
  return `${base}-${checksum}`;
}

/**
 * Generate QR code
 */
async function generateQRCode(barcodeValue) {
  try {
    const traceabilityUrl = `${env.frontendUrl || 'http://localhost:5174'}/trace/${barcodeValue}`;
    
    const qrDataUrl = await QRCode.toDataURL(traceabilityUrl, {
      errorCorrectionLevel: 'H', // HIGH error correction for better scanning
      width: 512, // Higher resolution (was 300)
      margin: 0, // Remove border
      color: {
        dark: '#000000', // Pure black
        light: '#FFFFFF', // Pure white
      },
      scale: 8, // Higher scale for print quality
      type: 'image/png' // PNG for lossless quality
    });

    return {
      qrCodeData: qrDataUrl,
      qrCodeUrl: traceabilityUrl,
    };
  } catch (err) {
    logger.error('QR code generation failed:', err);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Create barcode (in-memory only)
 */
export async function createBarcode(data) {
  const { productId, batchId, inventoryUnitId, userId, productData } = data;

  if (!productId) {
    throw new Error('Product ID is required');
  }

  try {
    // Generate unique barcode
    const barcodeValue = generateBarcodeValue();
    
    // Generate QR code
    const { qrCodeData, qrCodeUrl } = await generateQRCode(barcodeValue);

    // Create barcode object with product information embedded
    const barcode = {
      id: `bc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      barcode_value: barcodeValue,
      barcode_type: 'CODE128',
      product_id: productId,
      batch_id: batchId || null,
      inventory_unit_id: inventoryUnitId || null,
      qr_code_data: qrCodeData,
      qr_code_url: qrCodeUrl,
      status: 'active',
      generated_by: userId || null,
      printed_count: 0,
      last_printed_at: null,
      // Store product data for traceability
      product_sku: productData?.sku || null,
      product_brand: productData?.brand || 'Red Indian Customs',
      product_model: productData?.model || null,
      product_name: productData?.name || null,
      product_dimensions: productData?.dimensions || null,
      product_category: productData?.category || null,
      metadata: { 
        generatedAt: new Date().toISOString(),
        productData: productData || {}
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Store in memory
    barcodes.push(barcode);

    logger.info(`✅ Barcode generated (in-memory): ${barcodeValue} for product ${productData?.sku || productId}`);

    // Add products object for frontend compatibility
    barcode.products = {
      id: productId,
      sku: barcode.product_sku,
      brand: barcode.product_brand,
      model: barcode.product_model,
      name: barcode.product_name,
      dimensions: barcode.product_dimensions,
      category: barcode.product_category,
    };

    return barcode;

  } catch (err) {
    logger.error('Barcode creation failed:', err);
    throw new Error(`Failed to create barcode: ${err.message}`);
  }
}

/**
 * List barcodes (from memory)
 */
export async function listBarcodes(filters = {}) {
  try {
    let filtered = [...barcodes];

    if (filters.status) {
      filtered = filtered.filter(b => b.status === filters.status);
    }

    if (filters.productId) {
      filtered = filtered.filter(b => b.product_id === filters.productId);
    }

    // Sort by created_at desc
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (filters.limit) {
      filtered = filtered.slice(0, parseInt(filters.limit));
    }

    // Enrich with product data (simulate database join)
    const enriched = filtered.map(barcode => ({
      ...barcode,
      products: barcode.product_id ? {
        id: barcode.product_id,
        sku: barcode.product_sku || 'N/A',
        brand: barcode.product_brand || 'Red Indian Customs',
        model: barcode.product_model || 'Unknown Model',
        dimensions: barcode.product_dimensions || '',
        category: barcode.product_category || ''
      } : null
    }));

    return enriched;

  } catch (err) {
    logger.error('List barcodes failed:', err);
    return [];
  }
}

/**
 * Get barcode by value
 */
export async function getBarcodeByValue(barcodeValue) {
  try {
    return barcodes.find(b => b.barcode_value === barcodeValue) || null;
  } catch (err) {
    logger.error('Get barcode failed:', err);
    return null;
  }
}

/**
 * Get barcode by ID
 */
export async function getBarcodeById(barcodeId) {
  try {
    return barcodes.find(b => b.id === barcodeId) || null;
  } catch (err) {
    logger.error('Get barcode by ID failed:', err);
    return null;
  }
}

/**
 * Delete barcode (soft delete in memory)
 */
export async function deleteBarcode(barcodeId, userId) {
  try {
    const barcode = barcodes.find(b => b.id === barcodeId);
    if (barcode) {
      barcode.status = 'deleted';
      barcode.updated_at = new Date().toISOString();
      logger.info(`Barcode soft-deleted: ${barcode.barcode_value}`);
      return barcode;
    }
    throw new Error('Barcode not found');
  } catch (err) {
    logger.error('Delete barcode failed:', err);
    throw new Error(`Failed to delete barcode: ${err.message}`);
  }
}

/**
 * Update barcode
 */
export async function updateBarcode(barcodeId, updates, userId) {
  try {
    const barcode = barcodes.find(b => b.id === barcodeId);
    if (barcode) {
      Object.assign(barcode, updates);
      barcode.updated_at = new Date().toISOString();
      logger.info(`Barcode updated: ${barcode.barcode_value}`);
      return barcode;
    }
    throw new Error('Barcode not found');
  } catch (err) {
    logger.error('Update barcode failed:', err);
    throw new Error(`Failed to update barcode: ${err.message}`);
  }
}

/**
 * Create barcode batch
 */
export async function createBarcodeBatch(data) {
  const { productId, batchId, quantity, userId, productData } = data;

  if (!productId || !quantity || quantity < 1) {
    throw new Error('Product ID and quantity (>0) are required');
  }

  const results = [];
  const errors = [];

  for (let i = 0; i < quantity; i++) {
    try {
      const barcode = await createBarcode({ productId, batchId, userId, productData });
      results.push(barcode);
    } catch (err) {
      errors.push({ index: i, error: err.message });
    }
  }

  return {
    success: results.length,
    failed: errors.length,
    barcodes: results,
    errors,
  };
}

/**
 * Record barcode scan
 */
export async function recordBarcodeScan(scanData) {
  const { barcodeValue, scanType, location, referenceType, referenceId, userId, deviceInfo } = scanData;

  const barcode = await getBarcodeByValue(barcodeValue);
  
  if (!barcode) {
    throw new Error(`Barcode not found: ${barcodeValue}`);
  }

  const scan = {
    id: `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    barcode_id: barcode.id,
    barcode_value: barcodeValue,
    scan_type: scanType || 'general',
    location: location || null,
    reference_type: referenceType || null,
    reference_id: referenceId || null,
    scanned_by: userId || null,
    device_info: deviceInfo || {},
    created_at: new Date().toISOString(),
  };

  logger.info(`📱 Barcode scanned (in-memory): ${barcodeValue}`);
  
  return {
    scan,
    barcode,
  };
}

export default {
  createBarcode,
  listBarcodes,
  getBarcodeByValue,
  getBarcodeById,
  deleteBarcode,
  updateBarcode,
  createBarcodeBatch,
  recordBarcodeScan,
  generateQRCode,
};
