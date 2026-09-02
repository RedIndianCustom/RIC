# QC Inspection Fix - Testing Guide

## Prerequisites

1. Backend server must be restarted after code changes
2. Frontend should be refreshed (hard reload)
3. Database constraint should be applied (optional but recommended)

## Step-by-Step Testing

### Step 1: Apply Database Constraint (Optional)

This prevents duplicates at the database level:

```bash
# Navigate to backend/database folder
cd backend/database

# Run the SQL script in Supabase SQL Editor
# Copy contents of 010_qc_unique_constraint.sql
# Paste and execute in Supabase
```

OR use the check script:

```bash
cd backend
node check-qc-constraints.mjs
```

### Step 2: Restart Backend Server

```bash
cd backend

# If running in terminal, press Ctrl+C to stop

# Start server
npm start
# or
node src/app.js

# Verify server is running - should see:
# ✅ Server running on port 5000
```

### Step 3: Refresh Frontend

- Open your browser
- Navigate to QC Inspection page
- Hard refresh: `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)

---

## Test Case 1: Normal QC Inspection Flow

### Expected: Product name displays correctly

1. **Navigate to QC Inspection**
   - Login as warehouse staff
   - Go to: Warehouse → QC Inspection

2. **Start an Inspection**
   - Click on any pending inspection
   - Should see inspection details

3. **Scan a Barcode**
   - Enter barcode: `RIC000000005904`
   - Press Enter or click Scan

4. **Verify Product Info**
   ✅ **EXPECTED:**
   ```
   Product: Red Indian Customs Classic Sawtooth
   Brand: Red Indian Customs
   Size: 90/90-17
   ```
   
   ❌ **OLD BEHAVIOR (FIXED):**
   ```
   Product: Unknown Product
   Brand: (empty)
   Size: (empty)
   ```

5. **Complete Inspection**
   - Select classification (e.g., GOOD)
   - Click "Record Inspection"
   - Should see: ✅ "Red Indian Customs Classic Sawtooth (90/90-17) inspected successfully"

---

## Test Case 2: Duplicate Barcode Detection (Frontend)

### Expected: Immediate error before API call

1. **Scan First Barcode**
   - Scan: `RIC000000005904`
   - Record inspection successfully

2. **Scan Same Barcode Again**
   - Scan: `RIC000000005904` (same as step 1)
   
   ✅ **EXPECTED:**
   - Immediate error message: "Barcode RIC000000005904 has already been inspected"
   - Form auto-resets
   - No API call made (check Network tab)
   - Ready to scan next barcode

   ❌ **OLD BEHAVIOR (FIXED):**
   - API call sent
   - Backend error
   - Form stuck
   - Record button disabled

---

## Test Case 3: Duplicate Barcode Detection (Backend)

### Expected: Backend prevents duplicates if frontend check is bypassed

**This tests the backend safety net**

1. **Manual API Call Test** (using Postman or curl):

```bash
curl -X POST http://localhost:5000/api/receiving-qc/qc-inspection/record-item \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "qc_inspection_id": "your-inspection-id",
    "barcode": "RIC000000005904",
    "product_id": "your-product-id",
    "classification": "GOOD"
  }'
```

2. **First Call:**
   ✅ Response: `201 Created`
   ```json
   {
     "success": true,
     "message": "Inspection item recorded",
     "data": { ... }
   }
   ```

3. **Second Call (Same Barcode):**
   ✅ Response: `409 Conflict`
   ```json
   {
     "success": false,
     "error": "This barcode (RIC000000005904) has already been inspected in this QC inspection.",
     "duplicate": true
   }
   ```

---

## Test Case 4: Multiple Barcodes

### Expected: Each unique barcode scans successfully

1. **Scan Multiple Different Barcodes**
   - Scan: `RIC000000005904` → ✅ Success
   - Scan: `RIC000000005905` → ✅ Success
   - Scan: `RIC000000005906` → ✅ Success

2. **Try Duplicate**
   - Scan: `RIC000000005904` again → ❌ Error: "Already inspected"

3. **Continue with New Barcode**
   - Scan: `RIC000000005907` → ✅ Success

---

## Debugging Checklist

If tests fail, check:

### Backend Console Logs

Should see:
```
🔍 Recording inspection for barcode: RIC000000005904 in inspection: <uuid>
📦 Fetching barcode details for: RIC000000005904
✅ Found barcode data: inventory_unit=<uuid>, batch=<uuid>, product=<uuid>
📝 Inserting inspection record...
✅ Inspection item recorded successfully: <uuid>
```

For duplicates:
```
⚠️ Duplicate detected: Barcode RIC000000005904 already inspected at 2026-08-19T...
```

### Frontend Browser Console

Should see:
```
Looking up barcode: RIC000000005904
Barcode trace response: {success: true, traceability: {...}}
Product data: {id: '...', brand: 'Red Indian Customs', model: 'Classic Sawtooth', ...}
Product loaded successfully: {name: 'Red Indian Customs Classic Sawtooth', brand: '...', size: '90/90-17'}
```

### Network Tab

**First scan:**
- `POST /api/receiving-qc/qc-inspection/record-item`
- Status: `201 Created`

**Duplicate scan:**
- No API call should be made (frontend catches it)
- If API call made: Status should be `409 Conflict`

---

## Common Issues & Solutions

### Issue 1: "Unknown Product" Still Shows

**Cause:** Backend not restarted or frontend not refreshed

**Solution:**
1. Restart backend: `npm start` in backend folder
2. Hard refresh frontend: `Ctrl + Shift + R`
3. Clear browser cache

### Issue 2: Duplicate Check Not Working

**Cause:** 
- Frontend cache
- Database constraint missing

**Solution:**
1. Hard refresh browser
2. Check Network tab - should NOT see API call on duplicate
3. Run: `node backend/check-qc-constraints.mjs`
4. Apply database constraint from `010_qc_unique_constraint.sql`

### Issue 3: Record Button Not Clickable

**Cause:** Form is waiting for previous request

**Solution:**
1. Check browser console for errors
2. Check if `isProcessing` state is stuck at `true`
3. Refresh page to reset state

### Issue 4: Server Not Starting

**Cause:** Port already in use

**Solution:**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Then restart
npm start
```

---

## Success Criteria

All tests should pass with:

✅ Product names display correctly (not "Unknown Product")  
✅ Frontend catches duplicate scans immediately  
✅ Backend prevents duplicates if frontend is bypassed  
✅ Form auto-resets after duplicate detection  
✅ Clear error messages guide user actions  
✅ Record button remains clickable after errors  
✅ Multiple unique barcodes can be scanned sequentially  

---

## Performance Check

After fixes, verify:

- Scan → Display product info: **< 500ms**
- Record inspection: **< 1s**
- Duplicate detection: **< 50ms** (no API call)
- Form reset: **Instant**

---

## Rollback Plan

If issues occur:

```bash
# Restore old files from git
git checkout HEAD -- backend/src/controllers/receivingQcController.js
git checkout HEAD -- frontend/src/pages/dashboard/warehouse/QCInspectionEnhanced.jsx

# Restart services
cd backend && npm start
cd frontend && npm run dev
```

---

## Contact & Support

If issues persist:
1. Check `QC_INSPECTION_FIX_SUMMARY.md` for detailed changes
2. Review browser console logs
3. Review backend server logs
4. Check database logs in Supabase Dashboard

---

**Last Updated:** 2026-08-19  
**Version:** 1.0  
**Status:** Ready for Testing ✅
