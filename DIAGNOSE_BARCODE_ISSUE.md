# Barcode Size Mismatch Diagnostic

## Problem
You're scanning the correct QR code for size `120/80-18`, but the system says it scanned size `060/80-80`.

## Root Cause Analysis

The error message shows:
- **Expected:** 120/80-18
- **Scanned:** 060/80-80

This means the barcode in your database is linked to a product with dimensions `060/80-80` instead of `120/80-18`.

## Possible Causes

### 1. Wrong Product Selected During Barcode Generation
When you generated the barcodes, you may have selected the wrong product from the dropdown.

### 2. Product Dimensions are Incorrect in Database
The product record itself might have the wrong dimensions stored.

### 3. Batch is Linked to Wrong Product
The batch you selected might be linked to the wrong product_id.

## How to Fix

### Step 1: Run the Diagnostic Query

Run this SQL query in Supabase SQL Editor:

```sql
-- Find the problematic barcode
SELECT 
  b.barcode_value,
  p.id as product_id,
  p.sku,
  p.brand,
  p.model,
  p.dimensions as stored_size,
  bat.batch_number,
  s.shipment_number
FROM barcodes b
LEFT JOIN products p ON b.product_id = p.id
LEFT JOIN batches bat ON b.batch_id = bat.id  
LEFT JOIN shipments s ON b.shipment_id = s.id
WHERE p.dimensions LIKE '%060/80-80%'
   OR p.dimensions LIKE '%06080%'
ORDER BY b.created_at DESC
LIMIT 20;
```

This will show you:
- Which barcodes are linked to the wrong product
- What product they're actually linked to
- The batch number

### Step 2: Check if Product Exists with Correct Size

```sql
-- Find products with the CORRECT size
SELECT 
  id,
  sku,
  brand,
  model,
  name,
  dimensions,
  category,
  status
FROM products
WHERE dimensions ILIKE '%120/80-18%'
   OR dimensions ILIKE '%120/80%18%';
```

### Step 3: Option A - Delete Wrong Barcodes and Regenerate

If the barcodes are wrong, the cleanest solution is to:

1. **Delete the incorrect barcodes** in the Barcode Generation page (use the bulk delete feature)
2. **Select the CORRECT product** (the one with dimensions 120/80-18)
3. **Regenerate the barcodes** with the correct product

### Step 4: Option B - Update Existing Barcodes (Advanced)

If you want to keep the same barcode numbers but fix the product linkage:

```sql
-- ⚠️ WARNING: This will change existing barcode links!
-- Only run this if you're sure

-- First, find the correct product ID
SELECT id, sku, dimensions 
FROM products 
WHERE dimensions ILIKE '%120/80-18%'
LIMIT 1;

-- Then update the barcodes
-- Replace 'CORRECT_PRODUCT_ID_HERE' with the ID from above
UPDATE barcodes
SET product_id = 'CORRECT_PRODUCT_ID_HERE'
WHERE product_id IN (
  SELECT id FROM products 
  WHERE dimensions LIKE '%060/80-80%'
);
```

## Prevention

### During Barcode Generation:

1. **Double-check the product dropdown** - Make sure the product name and size match what you're generating
2. **Verify the dimensions** - Look for the size in the product card before clicking "Generate"
3. **Check batch metadata** - If using batch positions, verify the batch has the correct products assigned

### Example Product Display:
```
Red Indian Customs Dual Sport XT
SKU: DSXT-18-120/80
Size: 120/80-18  ← CHECK THIS!
```

## Quick Check Script

Run this query to see all your recent barcodes and their sizes:

```sql
SELECT 
  b.barcode_value,
  p.dimensions as size,
  p.sku,
  p.brand || ' ' || p.model as product,
  bat.batch_number,
  b.created_at
FROM barcodes b
LEFT JOIN products p ON b.product_id = p.id
LEFT JOIN batches bat ON b.batch_id = bat.id
ORDER BY b.created_at DESC
LIMIT 50;
```

Look for any barcodes with unexpected sizes.

## Summary

The validation logic is working correctly - it's correctly identifying that the barcode is for size `060/80-80` when you expected `120/80-18`. The fix is to ensure barcodes are generated with the correct product selected, or to correct the product linkage in the database.
