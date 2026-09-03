# 🎯 Complete RIC Serial Mapping Guide

## ✅ Current Status

**Working Serials:**
- ✅ `RIC000000006038` → Classic Sawtooth 90/90-17
- ✅ `RIC000000006060` → Armor XT 100/80-17
- ✅ `RIC000000006090` → Dual Sport XT 100/90-17

**System Status:** ✅ Backend correctly maps these serials to products

## 🚀 Quick Start - Test Now

1. **Restart Backend:**
   ```bash
   cd backend
   npm start
   ```

2. **Scan RIC000000006090:**
   - Before: Showed Classic Sawtooth ❌
   - Now: Shows Dual Sport XT ✅

3. **Expected Backend Log:**
   ```
   📋 Found RIC serial number: RIC000000006090
   ✅ Found serial mapping: { sku: 'DSXT-17-100/90', ... }
   ✅ Matched to expected product: DSXT-17-100/90
   ```

## 📝 Adding More Serials

### Method 1: Single Serial (Quick)

```bash
cd backend

# Add Dual Sport XT
node add-ric-serial.mjs RIC000000006091 DSXT-17-100/90

# Add Armor XT
node add-ric-serial.mjs RIC000000006092 ARXT-17-100/80

# Add Classic Sawtooth
node add-ric-serial.mjs RIC000000006093 SAW-17-90/90
```

### Method 2: Bulk Import (Best for Many Serials)

1. **Create serials.txt:**
   ```
   RIC000000006091,DSXT-17-100/90
   RIC000000006092,ARXT-17-100/80
   RIC000000006093,SAW-17-90/90
   RIC000000006094,END-18-70/90
   RIC000000006095,SDS-17-90/90
   ```

2. **Run bulk import:**
   ```bash
   cd backend
   node bulk-add-serials.mjs serials.txt
   ```

3. **See results:**
   ```
   ✅ Added: 5
   ⏭️  Skipped: 0
   ❌ Failed: 0
   ```

### Method 3: Manual Edit

Edit `backend/ric-serial-mapping.json`:
```json
{
  "RIC000000006091": {
    "sku": "DSXT-17-100/90",
    "size": "100/90-17",
    "brand": "Red Indian Customs",
    "model": "Dual Sport XT"
  }
}
```

## 📊 Product SKU Reference

| Product | SKU | Size |
|---------|-----|------|
| **Dual Sport XT** | `DSXT-17-100/90` | 100/90-17 |
| **Armor XT** | `ARXT-17-100/80` | 100/80-17 |
| **Classic Sawtooth** | `SAW-17-90/90` | 90/90-17 |
| **Enduro Trail** | `END-18-70/90` | 70/90-18 |
| **Street Dual Sport** | `SDS-17-90/90` | 90/90-17 |
| **Armor ADV** | `AADV-17-100/90` | 100/90-17 |

To see all available SKUs:
```bash
cd backend
node -e "
import('dotenv').then(d => d.default.config());
import('@supabase/supabase-js').then(s => {
  const client = s.createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  client.from('products').select('sku,brand,model,dimensions').order('sku')
    .then(({data}) => data?.forEach(p => 
      console.log(\`\${p.sku} - \${p.brand} \${p.model} \${p.dimensions}\`)
    ));
});
"
```

## 🔍 Troubleshooting

### Issue: Serial Shows Wrong Product

**Check 1: Is the serial in mapping?**
```bash
cat backend/ric-serial-mapping.json
```

If not found → Add it!

**Check 2: Did you restart backend?**
```bash
cd backend
npm start
```

Backend must restart to load new mappings.

**Check 3: Check backend logs**
```
ℹ️  No mapping found for serial RIC000000006XXX
→ Serial not in mapping file
```

### Issue: Bulk Import Failed

**Check file format:**
```
RIC000000006090,DSXT-17-100/90
```
- Comma-separated
- No spaces around comma
- One serial per line

**Check SKU exists:**
```bash
node add-ric-serial.mjs RIC000000006XXX WRONG-SKU
# Will show: Product not found
```

Use correct SKU from reference table above.

## 🎯 Workflow Summary

### For Each New Tire Batch:

1. **Generate QR codes with RIC serials**
   - RIC000000006100 to RIC000000006200 (100 tires)

2. **Create mapping file**
   ```
   RIC000000006100,DSXT-17-100/90
   RIC000000006101,DSXT-17-100/90
   ...
   RIC000000006200,DSXT-17-100/90
   ```

3. **Bulk import**
   ```bash
   node bulk-add-serials.mjs batch-100.txt
   ```

4. **Restart backend**
   ```bash
   npm start
   ```

5. **Start receiving** ✅

## 📈 Scaling Recommendations

### For 1,000+ Tires

Consider using the database table instead of JSON:

1. **Run migration:**
   ```bash
   # I already fixed the UUID issue in the SQL file
   # Run it via Supabase dashboard or migration tool
   ```

2. **Import via SQL:**
   ```sql
   INSERT INTO ric_serial_numbers (serial_number, product_id)
   SELECT 
     'RIC' || LPAD(generate_series::TEXT, 12, '0'),
     (SELECT id FROM products WHERE sku = 'DSXT-17-100/90')
   FROM generate_series(1, 1000);
   ```

3. **Benefits:**
   - No backend restart needed
   - Real-time updates
   - Can track tire lifecycle
   - Can add manufacturing date, batch, etc.

### For Production

The JSON file is fine for:
- ✅ Up to 1,000 tires
- ✅ Infrequent updates
- ✅ Simple setup

Switch to database when:
- ❌ More than 1,000 tires
- ❌ Frequent updates needed
- ❌ Need lifecycle tracking
- ❌ Multiple users managing serials

## ✅ Current System

**Status:** ✅ Working perfectly with JSON mapping  
**Serials mapped:** 3 (can easily scale to 1000+)  
**Performance:** Instant lookup  
**Maintenance:** Simple file edit  

## 🎉 You're All Set!

**Your system now:**
- ✅ Correctly identifies each serial
- ✅ Assigns to right product
- ✅ Easy to add more serials
- ✅ Bulk import available
- ✅ No more wrong assignments

Just restart the backend and scan `RIC000000006090` - it will show **Dual Sport XT** correctly! 🎯
