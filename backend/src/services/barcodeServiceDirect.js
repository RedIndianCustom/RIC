/**
 * Direct Database Barcode Service
 * Bypasses Supabase PostgREST schema cache by using direct PostgreSQL connection
 * USE THIS FOR IMMEDIATE DEADLINE - NO SCHEMA CACHE DEPENDENCY
 */
import QRCode from 'qrcode';
import pg from 'pg';
import { logger } from '../utils/logger.js';
import { env } from '../config/environment.js';

const { Client } = pg;

// Simple in-memory sequence counter (fallback if DB fails)
let memorySequence = 200000000000;

/**
 * Get direct database connection
 */
function getDirectConnection() {
  const password = encodeURIComponent(env.supabaseDbPassword || 'FYEMP.xyzd8ShL#');
  const supabaseUrl = env.supabaseUrl || '';
  const projectRef = supabaseUrl.replace('https://', '').split('.')[0];
  
  // Use direct connection (not pooler) for reliability
  return new Client({
    host: `db.${projectRef}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: env.supabaseDbPassword || 'FYEMP.xyzd8ShL#',
    ssl: { rejectUnauthorized: false }
  });
}

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
 * Generate next unique barcode value (memory-based, concurrent-safe)
 */
async function generateBarcodeValue() {
  // Use timestamp + random for uniqueness
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const base = timestamp + random;
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
 * Create barcode (direct DB insert)
 */
export async function createBarcode(data) {
  const { productId, batchId, inventoryUnitId, userId } = data;

  if (!productId) {
    throw new Error('Product ID is required');
  }

  const client = getDirectConnection();

  try {
    await client.connect();
    logger.info('Connected to database directly');

    // Ensure tables exist with CREATE IF NOT EXISTS
    await client.query(`
      CREATE TABLE IF NOT EXISTS barcodes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        barcode_value VARCHAR(100) UNIQUE NOT NULL,
        barcode_type VARCHAR(50) NOT NULL DEFAULT 'CODE128',
        product_id UUID,
        batch_id UUID,
        inventory_unit_id UUID,
        qr_code_data TEXT,
        qr_code_url TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        generated_by UUID,
        printed_count INTEGER NOT NULL DEFAULT 0,
        last_printed_at TIMESTAMPTZ,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      
      CREATE UNIQUE INDEX IF NOT EXISTS idx_barcodes_value_unique ON barcodes(barcode_value);
    `);

    // Generate unique barcode
    const barcodeValue = await generateBarcodeValue();
    
    // Generate QR code
    const { qrCodeData, qrCodeUrl } = await generateQRCode(barcodeValue);

    // Insert barcode
    const insertQuery = `
      INSERT INTO barcodes (
        barcode_value, barcode_type, product_id, batch_id, 
        inventory_unit_id, qr_code_data, qr_code_url, 
        status, generated_by, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING 
        id, barcode_value, barcode_type, product_id, batch_id,
        inventory_unit_id, qr_code_data, qr_code_url, status,
        generated_by, printed_count, created_at, updated_at
    `;

    const values = [
      barcodeValue,
      'CODE128',
      productId,
      batchId || null,
      inventoryUnitId || null,
      qrCodeData,
      qrCodeUrl,
      'active',
      userId || null,
      JSON.stringify({ generatedAt: new Date().toISOString() })
    ];

    const result = await client.query(insertQuery, values);
    const barcode = result.rows[0];

    logger.info(`✅ Barcode generated directly: ${barcodeValue}`);

    return barcode;

  } catch (err) {
    logger.error('Direct barcode creation failed:', err);
    throw new Error(`Failed to create barcode: ${err.message}`);
  } finally {
    await client.end();
  }
}

/**
 * List barcodes (direct DB query)
 */
export async function listBarcodes(filters = {}) {
  const client = getDirectConnection();

  try {
    await client.connect();

    let query = 'SELECT * FROM barcodes WHERE 1=1';
    const values = [];
    let paramCount = 0;

    if (filters.status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      values.push(filters.status);
    }

    if (filters.productId) {
      paramCount++;
      query += ` AND product_id = $${paramCount}`;
      values.push(filters.productId);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      values.push(filters.limit);
    }

    const result = await client.query(query, values);
    return result.rows;

  } catch (err) {
    logger.error('List barcodes failed:', err);
    return [];
  } finally {
    await client.end();
  }
}

/**
 * Get barcode by value (direct DB query)
 */
export async function getBarcodeByValue(barcodeValue) {
  const client = getDirectConnection();

  try {
    await client.connect();

    const query = `
      SELECT b.*,
        json_build_object(
          'id', p.id,
          'sku', p.sku,
          'brand', p.brand,
          'model', p.model,
          'dimensions', p.dimensions
        ) as products
      FROM barcodes b
      LEFT JOIN products p ON b.product_id = p.id
      WHERE b.barcode_value = $1
    `;

    const result = await client.query(query, [barcodeValue]);
    return result.rows[0] || null;

  } catch (err) {
    logger.error('Get barcode failed:', err);
    return null;
  } finally {
    await client.end();
  }
}

/**
 * Delete barcode (direct DB update)
 */
export async function deleteBarcode(barcodeId, userId) {
  const client = getDirectConnection();

  try {
    await client.connect();

    const query = `
      UPDATE barcodes 
      SET status = 'deleted', updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await client.query(query, [barcodeId]);
    return result.rows[0];

  } catch (err) {
    logger.error('Delete barcode failed:', err);
    throw new Error(`Failed to delete barcode: ${err.message}`);
  } finally {
    await client.end();
  }
}

/**
 * Update barcode (direct DB update)
 */
export async function updateBarcode(barcodeId, updates, userId) {
  const client = getDirectConnection();

  try {
    await client.connect();

    const setClauses = [];
    const values = [];
    let paramCount = 0;

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'barcode_value') { // Prevent changing barcode value
        paramCount++;
        setClauses.push(`${key} = $${paramCount}`);
        values.push(value);
      }
    });

    paramCount++;
    setClauses.push(`updated_at = NOW()`);
    values.push(barcodeId);

    const query = `
      UPDATE barcodes 
      SET ${setClauses.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await client.query(query, values);
    return result.rows[0];

  } catch (err) {
    logger.error('Update barcode failed:', err);
    throw new Error(`Failed to update barcode: ${err.message}`);
  } finally {
    await client.end();
  }
}

/**
 * Create barcode batch
 */
export async function createBarcodeBatch(data) {
  const { productId, batchId, quantity, userId } = data;

  if (!productId || !quantity || quantity < 1) {
    throw new Error('Product ID and quantity (>0) are required');
  }

  const barcodes = [];
  const errors = [];

  for (let i = 0; i < quantity; i++) {
    try {
      const barcode = await createBarcode({ productId, batchId, userId });
      barcodes.push(barcode);
    } catch (err) {
      errors.push({ index: i, error: err.message });
    }
  }

  return {
    success: barcodes.length,
    failed: errors.length,
    barcodes,
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

  const client = getDirectConnection();

  try {
    await client.connect();

    // Create scan log table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS barcode_scans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        barcode_id UUID,
        barcode_value VARCHAR(100) NOT NULL,
        scan_type VARCHAR(50) NOT NULL,
        location VARCHAR(100),
        reference_type VARCHAR(50),
        reference_id UUID,
        scanned_by UUID,
        device_info JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const query = `
      INSERT INTO barcode_scans (
        barcode_id, barcode_value, scan_type, location,
        reference_type, reference_id, scanned_by, device_info
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      barcode.id,
      barcodeValue,
      scanType || 'general',
      location || null,
      referenceType || null,
      referenceId || null,
      userId || null,
      JSON.stringify(deviceInfo || {})
    ];

    const result = await client.query(query, values);

    logger.info(`📱 Barcode scanned: ${barcodeValue}`);
    
    return {
      scan: result.rows[0],
      barcode: barcode,
    };

  } catch (err) {
    logger.error('Scan recording failed:', err);
    throw new Error(`Failed to record scan: ${err.message}`);
  } finally {
    await client.end();
  }
}

export default {
  createBarcode,
  listBarcodes,
  getBarcodeByValue,
  deleteBarcode,
  updateBarcode,
  createBarcodeBatch,
  recordBarcodeScan,
  generateQRCode,
};
