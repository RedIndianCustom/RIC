# Final Steps - Run Bulk Mapping Script

## The Error You're Seeing

```
MULTIPLE_PRODUCTS_NO_MAPPING
Cannot identify RIC serial RIC000000006246
```

**This means**: The backend doesn't know which product RIC000000006246 belongs to!

---

## The Solution (2 Commands)

### Step 1: Run Bulk Mapping Script ⚡
```bash
cd backend
node bulk-add-ric-serials.mjs
```

**Expected output**:
```
🔍 Fetching all barcodes from database...

✅ Found 42 barcodes in database

✅ RIC000000006246 → DSXT-17-100/90 (Dual Sport XT 100/90-17)
✅ RIC000000006247 → DSXT-17-100/90 (Dual Sport XT 100/90-17)
✅ RIC000000006248 → ARXT-17-100/80 (Armor XT 100/80-17)
... (more)

========================================
✅ RIC SERIAL MAPPING CREATED!
========================================
📝 Total barcodes found: 42
✅ Valid RIC serials mapped: 42
📁 Mapping file: /backend/ric-serial-mapping.json

🔄 Next step: Restart your backend
```

---

### Step 2: Restart Backend 🔄
```bash
cd backend
npm start
```

**Expected console output**:
```
✅ Loaded RIC serial mapping: 42 serials
ℹ️  Note: New QR codes use SKU directly and don't need serial mapping
[INFO] Inventory API listening on http://0.0.0.0:4000
```

---

## That's It!

After these 2 steps, scan the QR code again:

**Before** ❌:
```
Raw scanned value: http://localhost:5173/trace/RIC000000006246
❌ MULTIPLE_PRODUCTS_NO_MAPPING
Cannot identify RIC serial RIC000000006246
```

**After** ✅:
```
Raw scanned value: http://localhost:5173/trace/RIC000000006246
📍 Extracted: RIC000000006246
✅ Found serial mapping
Matched to: DSXT-17-100/90
✅ SUCCESS: Dual Sport XT 100/90-17
```

---

## What The Script Does

The bulk mapping script:
1. Queries your database for ALL barcodes
2. Gets the product information for each barcode
3. Creates a JSON file mapping RIC serials to products:

```json
{
  "RIC000000006246": {
    "sku": "DSXT-17-100/90",
    "size": "100/90-17",
    "brand": "Red Indian Customs",
    "model": "Dual Sport XT"
  },
  "RIC000000006247": {
    "sku": "DSXT-17-100/90",
    ...
  },
  ...
}
```

4. Backend loads this mapping on startup
5. When you scan RIC000000006246, backend looks it up and identifies it as DSXT

---

## Quick Check

After restart, backend console should show:
```
✅ Loaded RIC serial mapping: 42 serials
```

If you see this, you're good to go! Scan the QR codes and they should work.

---

**Date**: 2026-09-03  
**Status**: Ready to test after running commands  
**Action**: Run the 2 commands above, then test scanning
