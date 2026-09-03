# 🎯 RIC Serial Number Mapping - FIXED!

## Problem Solved

Your RIC serials were assigning to wrong products because:
- `RIC000000006060` should be **Armor XT** but was showing **Classic Sawtooth**
- The system didn't know which serial belongs to which product
- It was just assigning to the first product in the list

## ✅ Solution Implemented

Created a **serial number mapping system** that maps each RIC serial to its correct product.

### How It Works

```
RIC000000006060 → Lookup in mapping → ARXT-17-100/80 → Armor XT 100/80-17
RIC000000006038 → Lookup in mapping → SAW-17-90/90 → Classic Sawtooth 90/90-17
```

### Current Mappings

File: `backend/ric-serial-mapping.json`

```json
{
  "RIC000000006038": {
    "sku": "SAW-17-90/90",
    "size": "90/90-17",
    "brand": "Red Indian Customs",
    "model": "Classic Sawtooth"
  },
  "RIC000000006060": {
    "sku": "ARXT-17-100/80",
    "size": "100/80-17",
    "brand": "Red Indian Customs",
    "model": "Armor XT"
  }
}
```

## 🧪 Test Now

1. **Restart Backend:**
   ```bash
   cd backend
   npm start
   ```

2. **Scan RIC000000006060:**
   ```
   http://localhost:5173/trace/RIC000000006060
   ```

3. **Expected Result:**
   ```
   ✅ Red Indian Customs Armor XT - 100/80-17 (1 scanned)
   ```

4. **Backend Logs:**
   ```
   📋 Found RIC serial number: RIC000000006060
   ✅ Found serial mapping: { sku: 'ARXT-17-100/80', size: '100/80-17', ... }
   ✅ Matched to expected product: ARXT-17-100/80
   ```

## 📝 Adding More Serials

### Method 1: Using the Script (EASY)

```bash
cd backend
node add-ric-serial.mjs RIC000000006061 ARXT-17-100/80
node add-ric-serial.mjs RIC000000006062 SAW-17-90/90
node add-ric-serial.mjs RIC000000006063 DSXT-19-90/90
```

The script will:
- ✅ Look up the product by SKU
- ✅ Add the mapping automatically
- ✅ Show you the product details
- ✅ Tell you to restart the backend

### Method 2: Edit JSON Manually

Edit `backend/ric-serial-mapping.json`:

```json
{
  "RIC000000006038": {
    "sku": "SAW-17-90/90",
    "size": "90/90-17",
    "brand": "Red Indian Customs",
    "model": "Classic Sawtooth"
  },
  "RIC000000006060": {
    "sku": "ARXT-17-100/80",
    "size": "100/80-17",
    "brand": "Red Indian Customs",
    "model": "Armor XT"
  },
  "RIC000000006061": {
    "sku": "ARXT-17-100/80",
    "size": "100/80-17",
    "brand": "Red Indian Customs",
    "model": "Armor XT"
  }
}
```

Then restart the backend.

### Method 3: Bulk Import

Create a CSV file `serials.csv`:
```csv
serial,sku
RIC000000006038,SAW-17-90/90
RIC000000006060,ARXT-17-100/80
RIC000000006061,ARXT-17-100/80
RIC000000006062,SAW-17-90/90
```

Then use a script to import them all at once (I can create this if needed).

## 🔍 How The Backend Logic Works

### Priority Order:

1. **Serial Mapping (NEW!)** - Check `ric-serial-mapping.json`
   - If found → Use mapped product ✅
   - If not found → Continue to next strategy

2. **Direct Barcode Match** - Check `products.barcode` field

3. **RIC Format with Size** - Parse `RIC-DSXT-90-90-19`

4. **Generic Size** - Parse `90/90-19`

5. **SKU Match** - Check if barcode contains SKU

6. **Smart Fallback** - If 1 product → assign to it

7. **Multi-Product Fallback** - Assign to first (with warning)

### Backend Code Flow

```javascript
if (ricSerialMatch) {
  // Check mapping first
  if (ricSerialMapping[fullSerial]) {
    const mapping = ricSerialMapping[fullSerial];
    
    // Find in expected items
    const matchedItem = expected_items.find(item => 
      item.sku === mapping.sku || item.size === mapping.size
    );
    
    if (matchedItem) {
      return CORRECT_PRODUCT ✅
    } else {
      return NOT_IN_SHIPMENT ⚠️
    }
  }
  
  // Fallback to old logic if no mapping
  ...
}
```

## 📊 Available Product SKUs

To see all available SKUs, run:

```bash
cd backend
node add-ric-serial.mjs
```

Without arguments, it will show you available products.

Common SKUs:
- `ARXT-17-100/80` - Armor XT 100/80-17
- `SAW-17-90/90` - Classic Sawtooth 90/90-17
- `DSXT-19-90/90` - Dual Sport XT 90/90-19
- `END-18-70/90` - Enduro Trail 70/90-18
- `SDS-17-90/90` - Street Dual Sport 90/90-17
- `AADV-17-100/90` - Armor ADV 100/90-17
- `AST-14-90/90` - Armor ST 90/90-14

## 🎯 Benefits

### Before (Wrong Product Assignment)
```
Scan RIC000000006060
→ First product in list (Sawtooth) ❌
→ Wrong tire assigned ❌
→ Inventory incorrect ❌
```

### After (Correct Assignment)
```
Scan RIC000000006060  
→ Lookup in mapping
→ Found: Armor XT 100/80-17 ✅
→ Verify it's in shipment ✅
→ Assign correctly ✅
```

## 🔐 Future Enhancement: Database Table

For production, you should create a database table:

```sql
CREATE TABLE ric_serial_numbers (
  serial_number VARCHAR(50) PRIMARY KEY,
  product_id BIGINT REFERENCES products(id),
  manufactured_date DATE,
  batch_number VARCHAR(100),
  status VARCHAR(50)
);
```

Benefits:
- ✅ No need to restart backend
- ✅ Can update via API
- ✅ Can track tire lifecycle
- ✅ Can see manufacturing date, batch, etc.

I created the migration file: `backend/database/migrations/create_ric_serial_mapping.sql`

You can run it when ready!

## ⚠️ Important Notes

### If Serial Not in Mapping

The system will fall back to old logic:
- 1 product in shipment → Assigns to it (with warning)
- Multiple products → Assigns to first (with warning)

### If Product Not in Shipment

Even if serial is mapped correctly, if that product isn't expected in the shipment:
```
❌ Serial RIC000000006060 belongs to Armor XT 100/80-17,
   which is not expected in this shipment
```

This prevents receiving wrong products!

## 📝 Quick Reference

### Add a Serial
```bash
node add-ric-serial.mjs RIC000000006XXX SKU-XX-XXX/XX
```

### View Current Mappings
```bash
cat ric-serial-mapping.json
```

### Restart Backend
```bash
npm start
```

### Test a Serial
Open browser console (F12) and check backend terminal logs.

## ✅ Summary

**Problem:** RIC serials assigned to wrong products  
**Solution:** Serial number mapping system  
**Status:** ✅ RIC000000006060 now correctly maps to Armor XT  
**Next:** Add more serials as you generate QR codes  

Your RIC serial tracking is now accurate! 🎉
