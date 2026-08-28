# Manual Migration Instructions

## ⚠️ Important Note

The automated migration script has a limitation with transaction blocks. Please run the migration **manually** using the Supabase SQL Editor.

---

## 📝 Step-by-Step Instructions

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase Dashboard: https://supabase.com
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **"New Query"** button

### Step 2: Copy the Migration SQL

Open this file in your code editor:
```
backend/database/030_add_all_product_sizes.sql
```

**Select ALL content** (Ctrl+A) and **Copy** (Ctrl+C)

### Step 3: Paste and Run

1. **Paste** the SQL into the Supabase SQL Editor (Ctrl+V)
2. Click the **"Run"** button (or press Ctrl+Enter)
3. Wait for execution to complete (should take 5-10 seconds)

### Step 4: Verify Success

You should see output similar to:
```
============================================
PRODUCT COUNT VERIFICATION
============================================
Classic Sawtooth:     17 products
Enduro Trail:         14 products
Street Dual Sport:    11 products
Dual Sport XT:        10 products
Armor XT:             5 products
Armor ADV:            9 products
ARMOR ST:             13 products
ARMOR ST-X:           2 products
--------------------------------------------
TOTAL:                81 products
============================================
✅ Migration 030 completed successfully!
```

---

## ✅ What This Migration Does

1. **Adds `imperial_size` column** to products table (if not exists)
2. **Inserts 81 tire products** across 8 brand/model lines:
   - Classic Sawtooth (17 sizes)
   - Enduro Trail (14 sizes)  
   - Street Dual Sport (11 sizes)
   - Dual Sport XT (10 sizes)
   - Armor XT (5 sizes)
   - Armor ADV (9 sizes)
   - ARMOR ST (13 sizes - Scooter)
   - ARMOR ST-X (2 sizes - Scooter)

3. **Uses `ON CONFLICT (sku) DO UPDATE`** - safe to run multiple times
4. **Includes verification** - shows product counts per brand

---

## 🧪 After Migration: Test the UI

1. **Refresh** your ShipmentRegistration page (Ctrl+F5)
2. Click **"New Shipment"**
3. Click **"Add Product"**
4. You should see **Brand Selection Modal** with all 8 brands
5. Click any brand (e.g., "Street Dual Sport")
6. You should see **Size Selection Modal** with only that brand's sizes
7. Select a size → Enter quantity → Product added!

---

## 🔧 Alternative: Verify via Script

After running the migration, verify products were created:

```powershell
node backend/verify-products.mjs
```

Expected output:
```
✅ Total Red Indian Customs products: 81
```

---

## ❓ Troubleshooting

### "imperial_size column already exists"
✅ This is fine! The migration checks before adding the column.

### "duplicate key value violates unique constraint"
✅ This is fine! The migration uses `ON CONFLICT DO UPDATE` to handle existing products.

### Products not showing in UI?
1. Hard refresh the page (Ctrl+Shift+R)
2. Check browser console for errors
3. Verify API endpoint is working: Open DevTools → Network tab → Look for `/api/products` request

### Wrong product count?
Run this query in SQL Editor to check:
```sql
SELECT model, COUNT(*) as count
FROM products
WHERE brand = 'Red Indian Customs'
GROUP BY model
ORDER BY model;
```

---

## 📚 Related Files

- **Migration SQL**: `backend/database/030_add_all_product_sizes.sql`
- **Verification Script**: `backend/verify-products.mjs`
- **Documentation**: `PRODUCT_CATALOG_SETUP.md`
- **UI Component**: `frontend/src/pages/dashboard/operational/ShipmentRegistration.jsx`

---

**Last Updated**: 2026-08-26  
**Status**: ✅ Ready to run manually in Supabase SQL Editor
