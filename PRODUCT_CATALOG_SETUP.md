# Product Catalog Setup - Complete Guide

## Overview
This guide explains how to set up the complete Red Indian Customs tire product catalog with all 81 products across 8 brand/model lines.

---

## 📦 Product Breakdown

### Total: 81 Products across 8 Brands

1. **Classic Sawtooth** - 17 sizes (15", 16", 17", 18", 19", 21")
2. **Enduro Trail** - 14 sizes (17", 18", 19", 21")
3. **Street Dual Sport** - 11 sizes (17", 18", 19")
4. **Dual Sport XT** - 10 sizes (17", 18", 19")
5. **Armor XT** - 5 sizes (17")
6. **Armor ADV** - 9 sizes (17", 18", 19", 21")
7. **ARMOR ST** - 13 sizes (12", 13", 14") - Scooter tires
8. **ARMOR ST-X** - 2 sizes (13") - Scooter tires

---

## 🚀 Installation Methods

### Method 1: Using the Migration Script (Recommended)

**Step 1: Run the migration script from workspace root**
```powershell
node backend/run-product-migration.mjs
```

> **Note:** The migration will automatically add the `imperial_size` column if it doesn't exist.

**Expected Output:**
```
🚀 Starting product migration...
📄 Reading SQL file: backend/database/030_add_all_product_sizes.sql
✅ SQL file loaded
⚡ Executing migration...
✅ Migration executed successfully!

🔍 Verifying products...
📦 Product Count by Model:
==================================================
   Classic Sawtooth      : 17 products
   Enduro Trail          : 14 products
   Street Dual Sport     : 11 products
   Dual Sport XT         : 10 products
   Armor XT              : 5 products
   Armor ADV             : 9 products
   ARMOR ST              : 13 products
   ARMOR ST-X            : 2 products
==================================================
   TOTAL                 : 81 products
==================================================
```

### Method 2: Using Supabase SQL Editor

**Step 1: Open Supabase Dashboard**
1. Go to https://supabase.com
2. Open your project
3. Navigate to SQL Editor

**Step 2: Execute the SQL**
1. Open: `backend/database/030_add_all_product_sizes.sql`
2. Copy all contents
3. Paste into Supabase SQL Editor
4. Click "Run"

**Step 3: Verify**
Run this query to verify:
```sql
SELECT model, COUNT(*) as count
FROM products
WHERE brand = 'Red Indian Customs'
GROUP BY model
ORDER BY model;
```

---

## 📊 Product Details

### 1. Classic Sawtooth (17 products)

**SKU Pattern:** `SAW-{SIZE}-{DIMENSION}`

| Size | Metric | Imperial | SKU |
|------|--------|----------|-----|
| 15" | 130/90-15 | 5.00-15 | SAW-15-130/90 |
| 15" | 170/80-15 | 6.50-15 | SAW-15-170/80 |
| 16" | 130/90-16 | 5.00-16 | SAW-16-130/90 |
| 16" | 150/80-16 | 6.00-16 | SAW-16-150/80 |
| 16" | 180/65-16 | 7.00-16 | SAW-16-180/65 |
| 17" | 90/90-17 | 3.50-17 | SAW-17-90/90 |
| 17" | 100/90-17 | 4.00-17 | SAW-17-100/90 |
| 17" | 120/90-17 | 4.50-17 | SAW-17-120/90 |
| 17" | 130/90-17 | 5.00-17 | SAW-17-130/90 |
| 18" | 90/90-18 | 3.50-18 | SAW-18-90/90 |
| 18" | 100/90-18 | 4.00-18 | SAW-18-100/90 |
| 18" | 120/90-18 | 4.50-18 | SAW-18-120/90 |
| 18" | 130/90-18 | 5.00-18 | SAW-18-130/90 |
| 19" | 80/90-19 | 3.25-19 | SAW-19-80/90 |
| 19" | 100/90-19 | 4.00-19 | SAW-19-100/90 |
| 19" | 120/90-19 | 4.50-19 | SAW-19-120/90 |
| 21" | 90/90-21 | 3.00-21 | SAW-21-90/90 |

### 2. Enduro Trail (14 products)

**SKU Pattern:** `END-{SIZE}-{DIMENSION}`

| Size | Metric | Imperial | SKU |
|------|--------|----------|-----|
| 17" | 70/90-17 | 2.75-17 | END-17-70/90 |
| 17" | 80/90-17 | 3.00-17 | END-17-80/90 |
| 17" | 90/90-17 | 3.50-17 | END-17-90/90 |
| 17" | 110/90-17 | 4.10-17 | END-17-110/90 |
| 17" | 120/90-17 | 4.60-17 | END-17-120/90 |
| 18" | 70/90-18 | 2.75-18 | END-18-70/90 |
| 18" | 80/90-18 | 3.00-18 | END-18-80/90 |
| 18" | 90/90-18 | 3.50-18 | END-18-90/90 |
| 18" | 110/90-18 | 4.10-18 | END-18-110/90 |
| 18" | 120/90-18 | 4.60-18 | END-18-120/90 |
| 19" | 70/90-19 | 2.75-19 | END-19-70/90 |
| 19" | 90/90-19 | 3.75-19 | END-19-90/90 |
| 21" | 70/90-21 | 2.75-21 | END-21-70/90 |
| 21" | 90/90-21 | 3.00-21 | END-21-90/90 |

### 3. Street Dual Sport (11 products)

**SKU Pattern:** `SDS-{SIZE}-{DIMENSION}`

| Size | Metric | Imperial | SKU |
|------|--------|----------|-----|
| 17" | 90/90-17 | 3.50-17 | SDS-17-90/90 |
| 17" | 100/90-17 | 4.00-17 | SDS-17-100/90 |
| 17" | 110/90-17 | 4.10-17 | SDS-17-110/90 |
| 17" | 120/80-17 | 4.60-17 | SDS-17-120/80 |
| 17" | 130/80-17 | 5.00-17 | SDS-17-130/80 |
| 17" | 140/70-17 | 5.50-17 | SDS-17-140/70 |
| 17" | 150/70-17 | 6.00-17 | SDS-17-150/70 |
| 18" | 90/90-18 | 3.50-18 | SDS-18-90/90 |
| 18" | 100/90-18 | 4.00-18 | SDS-18-100/90 |
| 18" | 120/80-18 | 4.60-18 | SDS-18-120/80 |
| 19" | 90/90-19 | 3.50-19 | SDS-19-90/90 |

### 4. Dual Sport XT (10 products)

**SKU Pattern:** `DSXT-{SIZE}-{DIMENSION}`

| Size | Metric | Imperial | SKU |
|------|--------|----------|-----|
| 17" | 90/90-17 | 3.50-17 | DSXT-17-90/90 |
| 17" | 100/90-17 | 4.00-17 | DSXT-17-100/90 |
| 17" | 110/90-17 | 4.10-17 | DSXT-17-110/90 |
| 17" | 120/80-17 | 4.60-17 | DSXT-17-120/80 |
| 17" | 130/80-17 | 5.00-17 | DSXT-17-130/80 |
| 17" | 140/70-17 | 5.50-17 | DSXT-17-140/70 |
| 18" | 90/90-18 | 3.50-18 | DSXT-18-90/90 |
| 18" | 100/90-18 | 4.00-18 | DSXT-18-100/90 |
| 18" | 120/80-18 | 4.60-18 | DSXT-18-120/80 |
| 19" | 90/90-19 | 3.50-19 | DSXT-19-90/90 |

### 5. Armor XT (5 products)

**SKU Pattern:** `ARXT-{SIZE}-{DIMENSION}`

| Size | Metric | Imperial | SKU |
|------|--------|----------|-----|
| 17" | 100/80-17 | 4.00-17 | ARXT-17-100/80 |
| 17" | 110/80-17 | 4.10-17 | ARXT-17-110/80 |
| 17" | 120/80-17 | 4.60-17 | ARXT-17-120/80 |
| 17" | 130/80-17 | 5.00-17 | ARXT-17-130/80 |
| 17" | 140/70-17 | 5.50-17 | ARXT-17-140/70 |

### 6. Armor ADV (9 products)

**SKU Pattern:** `AADV-{SIZE}-{DIMENSION}`

| Size | Metric | Imperial | SKU |
|------|--------|----------|-----|
| 17" | 100/90-17 | 4.00-17 | AADV-17-100/90 |
| 17" | 110/90-17 | 4.10-17 | AADV-17-110/90 |
| 17" | 120/80-17 | 4.60-17 | AADV-17-120/80 |
| 17" | 130/80-17 | 5.00-17 | AADV-17-130/80 |
| 17" | 140/70-17 | 5.50-17 | AADV-17-140/70 |
| 18" | 90/90-18 | 3.50-18 | AADV-18-90/90 |
| 18" | 120/80-18 | 4.60-18 | AADV-18-120/80 |
| 19" | 90/90-19 | 3.50-19 | AADV-19-90/90 |
| 21" | 90/90-21 | 3.50-19 | AADV-21-90/90 |

### 7. ARMOR ST (13 products - Scooter)

**SKU Pattern:** `AST-{SIZE}-{DIMENSION}`

| Size | Metric | Imperial | SKU |
|------|--------|----------|-----|
| 12" | 110/70-12 | 4.10-12 | AST-12-110/70 |
| 12" | 120/70-12 | 4.60-12 | AST-12-120/70 |
| 13" | 110/70-13 | 4.10-13 | AST-13-110/70 |
| 13" | 130/70-13 | 4.60-13 | AST-13-130/70 |
| 14" | 70/80-14 | 2.75-14 | AST-14-70/80 |
| 14" | 80/80-14 | 3.00-14 | AST-14-80/80 |
| 14" | 80/90-14 | 3.50-14 | AST-14-80/90 |
| 14" | 90/90-14 | 3.50-14 | AST-14-90/90 |
| 14" | 100/80-14 | 4.00-14 | AST-14-100/80 |
| 14" | 110/70-14 | 4.10-14 | AST-14-110/70 |
| 14" | 110/80-14 | 4.10-14 | AST-14-110/80 |
| 14" | 120/70-14 | 4.60-14 | AST-14-120/70 |
| 14" | 140/60-14 | 5.50-14 | AST-14-140/60 |

### 8. ARMOR ST-X (2 products - Scooter)

**SKU Pattern:** `ASTX-{SIZE}-{DIMENSION}`

| Size | Metric | Imperial | SKU |
|------|--------|----------|-----|
| 13" | 110/70-13 | 4.10-13 | ASTX-13-110/70 |
| 13" | 130/70-13 | 5.00-13 | ASTX-13-130/70 |

---

## ✅ Verification Checklist

After running the migration, verify:

- [ ] All 8 brands appear in ShipmentRegistration brand selection
- [ ] Each brand shows correct size count
- [ ] Selecting a brand shows only its sizes
- [ ] SKU codes are correct format
- [ ] Imperial sizes are populated
- [ ] Category is set correctly (Motorcycle/Scooter Tire)
- [ ] All products have status = 'active'

---

## 🧪 Testing the Two-Step Selection

1. **Open ShipmentRegistration page**
2. **Click "New Shipment"**
3. **Click "Add Product"**
4. **Verify Step 1: Brand Selection**
   - Should see: Street Dual Sport, Dual Sport XT, Classic Sawtooth, etc.
   - Each shows size count (e.g., "17 sizes available")
5. **Click "Classic Sawtooth"**
6. **Verify Step 2: Size Selection**
   - Should see ONLY Classic Sawtooth sizes
   - Should see: 130/90-15, 170/80-15, etc.
7. **Click a size (e.g., "130/90-15")**
8. **Verify Step 3: Quantity Input**
   - Should show: "Red Indian Customs Classic Sawtooth 130/90-15"
   - Enter quantity and add

---

## 📝 Database Schema

Products are stored with these fields:

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY,
  brand VARCHAR NOT NULL,           -- "Red Indian Customs"
  model VARCHAR NOT NULL,            -- "Classic Sawtooth"
  dimensions VARCHAR NOT NULL,       -- "130/90-15"
  imperial_size VARCHAR,             -- "5.00-15"
  sku VARCHAR UNIQUE NOT NULL,       -- "SAW-15-130/90"
  category VARCHAR,                  -- "Motorcycle Tire" or "Scooter Tire"
  status VARCHAR DEFAULT 'active',   -- "active", "discontinued"
  stock_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## 🔧 Troubleshooting

### Products not showing in UI?
1. Check browser console for errors
2. Refresh the page (Ctrl+F5)
3. Verify API endpoint: `/api/products`
4. Check network tab for successful response

### Wrong product count?
```sql
-- Run this to see actual counts
SELECT model, COUNT(*) 
FROM products 
WHERE brand = 'Red Indian Customs'
GROUP BY model;
```

### Need to reset products?
```sql
-- Delete all Red Indian Customs products
DELETE FROM products 
WHERE brand = 'Red Indian Customs';

-- Then re-run migration
```

---

## 🎯 Next Steps

After successful migration:

1. ✅ Test product selection in ShipmentRegistration
2. ✅ Create test shipments with different brands
3. ✅ Verify position assignment works
4. ✅ Test barcode generation with new products
5. ✅ Update stock quantities as needed

---

**Last Updated:** 2026-08-26  
**Migration File:** `backend/database/030_add_all_product_sizes.sql`  
**Helper Script:** `backend/run-product-migration.mjs`  
**Status:** ✅ Ready to Deploy
