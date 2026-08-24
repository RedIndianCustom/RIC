# Debug Shipment Products - Step by Step

## 🔍 Enhanced Logging Added

I've added detailed console logging to both frontend and backend to track exactly what's happening with product_breakdown.

---

## 🧪 Test Procedure

### **Step 1: Restart Backend**
```powershell
cd backend
npm start
```

### **Step 2: Open Browser Console**
- Press `F12` or `Ctrl+Shift+I`
- Go to **Console** tab
- Clear console (click trash icon)

### **Step 3: Edit SHIP-312321**
1. Go to Shipment Registration page
2. Find SHIP-312321
3. Click **Edit** button
4. **Check Console** - You should see:
   ```
   📝 Editing shipment: SHIP-312321
   📦 Product breakdown: []
   📊 Products length: 0
   ⚠️ Shipment SHIP-312321 has NO products - you can add them now!
   ```

### **Step 4: Add Products**
1. Click **"+ Add Product"** button
2. Fill in:
   - **Category**: Dual Sport
   - **Size**: 90/90-17
   - **Quantity**: 50
3. Click **"+ Add Product"** again
4. Fill in:
   - **Category**: Sawtooth
   - **Size**: 110/90-17
   - **Quantity**: 40
5. **Check Console** - formData should update as you type

### **Step 5: Save (Update)**
1. Click **"Update Shipment"** button
2. **Check BROWSER Console** - You should see:
   ```
   💾 Saving shipment...
   📦 formData.product_breakdown: [Array(2)]
   📊 Product count: 2
   📤 Full submission data: {
     supplier_id: "...",
     shipment_number: "SHIP-312321",
     product_breakdown: [
       { category: "Dual Sport", size: "90/90-17", quantity: "50" },
       { category: "Sawtooth", size: "110/90-17", quantity: "40" }
     ],
     ...
   }
   ✏️ UPDATING shipment: [shipment-id]
   ✅ Update result: { success: true, ... }
   ```

3. **Check BACKEND Console** - You should see:
   ```
   📝 Updating shipment: [shipment-id]
   📦 Updates received: {
     "supplier_id": "...",
     "shipment_number": "SHIP-312321",
     "product_breakdown": [
       { "category": "Dual Sport", "size": "90/90-17", "quantity": "50" },
       { "category": "Sawtooth", "size": "110/90-17", "quantity": "40" }
     ],
     ...
   }
   📊 Product breakdown in request: [Array(2)]
   📊 Product breakdown length: 2
   📤 Sending to database: {...}
   ✅ Shipment updated successfully
   📦 Updated product_breakdown: [Array(2)]
   📊 Updated product count: 2
   ```

### **Step 6: Verify in Database**
Run the check script:
```powershell
cd backend
node check-shipment-products.mjs
```

You should see:
```
1. SHIP-312321 (CON-2132)
   Status: PENDING
   ✅ Has 2 products:
      1. Dual Sport - 90/90-17 (50 units)
      2. Sawtooth - 110/90-17 (40 units)
```

### **Step 7: Edit Again**
1. Click **Edit** on SHIP-312321 again
2. **Check Console**:
   ```
   📝 Editing shipment: SHIP-312321
   📦 Product breakdown: [Array(2)]
   📊 Products length: 2
   ```
3. **You should now see the 2 products in the form!** ✅

---

## 🐛 If Products Still Don't Show

### **Check 1: Are products being sent?**
Look for this in **browser console**:
```
📦 formData.product_breakdown: [...]
📊 Product count: 2
```

**If count is 0**, the form isn't capturing the products. This means:
- Products weren't added (click + Add Product)
- OR form state isn't updating

### **Check 2: Are products reaching backend?**
Look for this in **backend console**:
```
📦 Updates received: {...}
📊 Product breakdown in request: [...]
📊 Product breakdown length: 2
```

**If backend shows length: 0**, the frontend isn't sending them. Check:
- API call in browser Network tab
- Look at Request Payload

### **Check 3: Are products being saved?**
Look for this in **backend console**:
```
✅ Shipment updated successfully
📦 Updated product_breakdown: [...]
📊 Updated product count: 2
```

**If count is 0 after save**, database isn't accepting them. This could be:
- Column type issue (should be JSONB)
- RLS policy blocking update
- Data validation error

### **Check 4: Are products being loaded on edit?**
Look for this in **browser console** when editing:
```
📦 Product breakdown: [Array(2)]
📊 Products length: 2
```

**If shows 0**, the GET endpoint isn't returning them. Check:
- Backend GET /shipments/:id response
- Database has the data (run check script)

---

## 📋 Diagnostic Questions

Based on the console logs, tell me:

1. **When you click "Add Product"**, does the product row appear in the form?
2. **When you fill in Category/Size/Quantity**, do you see them in the form?
3. **When you click "Update Shipment"**, what does browser console show?
4. **What does backend console show** when you update?
5. **When you edit the shipment again**, do products appear?

---

## 🔧 Manual Database Check

If all else fails, check the database directly:

```sql
SELECT 
  shipment_number,
  container_number,
  product_breakdown,
  jsonb_array_length(product_breakdown) as product_count
FROM shipments
WHERE shipment_number = 'SHIP-312321';
```

This will show:
- The actual JSON data in product_breakdown
- How many products are stored
- If it's NULL vs empty array []

---

## 🎯 Expected Behavior

### ✅ Correct Flow:
1. Edit SHIP-312321 → See "No products added yet"
2. Click "+ Add Product" → Empty form row appears
3. Fill in details → See values in form
4. Click "Update Shipment" → See success message
5. Edit SHIP-312321 again → **See the products you added** ✅

### ❌ If Not Working:
The console logs will show EXACTLY where it's failing:
- Frontend form not capturing input
- Frontend not sending data
- Backend not receiving data
- Database not saving data
- Backend not returning saved data
- Frontend not displaying loaded data

---

## 📞 Next Steps

1. **Clear all caches** (Ctrl+Shift+R in browser)
2. **Restart backend server**
3. **Follow the test procedure above**
4. **Share the console output** with me

The enhanced logging will tell us exactly what's happening at each step!

---

*Logging Added: 2026-08-19*
*Ready for Testing*
