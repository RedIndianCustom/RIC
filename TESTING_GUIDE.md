# Testing Guide: ShipmentRegistration Transformation

## 🚀 Quick Start

**Frontend is running at:** http://localhost:5174/

### Prerequisites:
1. ✅ Backend server running (port 5000)
2. ✅ Frontend server running (port 5174)
3. ✅ Logged in as user with shipment permissions
4. ✅ Product catalog populated in database

---

## 📋 **Test Scenarios**

### **Test 1: Create New Shipment with Product Picker**

**Steps:**
1. Navigate to **Shipments** page
2. Click **"New Shipment"** button (emerald/green gradient)
3. Fill in shipment details:
   - Supplier: Select from dropdown
   - Shipment Number: e.g., "SHIP-2026-001"
   - Container Number: e.g., "CONT-12345"
   - BL Number: e.g., "BL-67890"
4. Click **"Add Product"** button in Product Breakdown section
5. **Product Picker Modal opens** ✨
6. Search for a product (type brand/model/size)
7. Click on a product from the list
8. Enter quantity in prompt (e.g., "100")
9. **Product card appears** with details
10. Click **Map Pin icon** on product card
11. **Position Assignment Modal opens** ✨
12. Select a rack from dropdown
13. Check multiple positions (2-3 positions)
14. Verify capacity summary shows correctly
15. Click **"Confirm Assignment"**
16. Verify positions appear in product card
17. Add another product (repeat steps 4-16)
18. Click **"Create Shipment"**

**Expected Results:**
- ✅ Product picker shows searchable catalog
- ✅ Product card displays all details (brand, model, dimensions, SKU)
- ✅ Position picker shows available positions with capacity bars
- ✅ Capacity validation prevents over-assignment
- ✅ Distribution auto-calculates across positions
- ✅ Shipment creates successfully

---

### **Test 2: Edit Existing Legacy Shipment**

**Steps:**
1. Find an **old shipment** (created before transformation)
2. Click **Edit icon** on shipment card
3. Observe product breakdown section
4. Check if products have **"Legacy"** badge
5. Click **Map Pin icon** on legacy product
6. Assign positions using new UI
7. Click **"Update Shipment"**

**Expected Results:**
- ✅ Legacy products load correctly
- ✅ Amber "Legacy" badge appears
- ✅ Can assign positions to legacy products
- ✅ Shipment updates to new format
- ✅ No data loss during migration

---

### **Test 3: Capacity Validation**

**Steps:**
1. Create new shipment with 1 product
2. Enter quantity: **500 tires**
3. Click Map Pin to assign positions
4. Select rack
5. Check only 1-2 positions (with limited capacity)
6. Try to confirm assignment

**Expected Results:**
- ✅ Modal shows capacity summary
- ✅ Warning appears: "Short by: X tires"
- ✅ Cannot confirm (button disabled or error shown)
- ✅ Must select more positions to proceed

---

### **Test 4: Multi-Product Shipment**

**Steps:**
1. Create new shipment
2. Add **3 different products**:
   - Product A: 100 tires → Assign to Rack 1 (3 positions)
   - Product B: 150 tires → Assign to Rack 2 (4 positions)
   - Product C: 80 tires → Assign to Rack 1 (2 positions)
3. Verify each product card shows:
   - Product details
   - Total quantity
   - Assigned positions list
4. Check total summary shows **330 tires**
5. Submit shipment

**Expected Results:**
- ✅ All products display correctly
- ✅ Each has unique position assignments
- ✅ Total quantity auto-calculates
- ✅ No position conflicts
- ✅ Shipment creates successfully

---

### **Test 5: Visual Theme Consistency**

**Steps:**
1. Navigate through Shipments page
2. Check all elements for emerald/green theme:
   - Page header gradient
   - "New Shipment" button
   - Stat cards
   - Form modal header
   - Product cards
   - Capacity bars (green for available)
   - Focus rings on inputs
   - Action buttons

**Expected Results:**
- ✅ No teal/cyan colors remain
- ✅ Consistent emerald/green theme
- ✅ Matches WarehouseLocations page
- ✅ Professional appearance

---

### **Test 6: Position Capacity Indicators**

**Steps:**
1. Open position assignment modal
2. Select a rack with mixed capacity positions:
   - Some positions 0-50% full (should show green bar)
   - Some positions 70-89% full (should show amber bar)
   - Some positions 90-100% full (should show red bar)
3. Check each position card

**Expected Results:**
- ✅ Green bars for low utilization
- ✅ Amber bars for medium utilization
- ✅ Red bars for high utilization
- ✅ Capacity text shows "X / Y" format
- ✅ "Available" badges show correct count

---

### **Test 7: Search and Filter Products**

**Steps:**
1. Click "Add Product"
2. Product picker opens
3. Test search functionality:
   - Search by brand: "Michelin"
   - Search by model: "Dual Sport"
   - Search by size: "90/90-17"
   - Search by SKU: "MCH-DS"
4. Verify results filter in real-time

**Expected Results:**
- ✅ Search updates instantly (no lag)
- ✅ Matches on all fields (brand, model, dimensions, SKU)
- ✅ Case-insensitive matching
- ✅ Shows "No products found" if no matches

---

### **Test 8: Remove Products and Positions**

**Steps:**
1. Create shipment with 2 products (both with positions assigned)
2. Click **Trash icon** on first product
3. Verify product removed
4. Check total quantity updated
5. Save shipment with remaining product

**Expected Results:**
- ✅ Product card removes smoothly
- ✅ Total quantity recalculates
- ✅ No errors in console
- ✅ Shipment saves correctly

---

### **Test 9: Mobile Responsiveness**

**Steps:**
1. Open browser dev tools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Test on different screen sizes:
   - Mobile (375px)
   - Tablet (768px)
   - Desktop (1920px)
4. Check all modals and forms

**Expected Results:**
- ✅ Modals resize appropriately
- ✅ Product cards stack on mobile
- ✅ Position grid scrolls horizontally if needed
- ✅ Touch interactions work
- ✅ No horizontal overflow

---

### **Test 10: Error Handling**

**Steps:**
1. Try to submit shipment with **no products**
2. Try to submit shipment with **products but no positions assigned**
3. Try to assign more quantity than available capacity
4. Test with network disconnected (API failure)

**Expected Results:**
- ✅ Error message: "Please add at least one product"
- ✅ Error message: "Product X has no positions assigned"
- ✅ Error message: "Cannot store all X tires"
- ✅ Graceful handling of API failures
- ✅ User can retry after fixing issues

---

## 🐛 **Known Issues to Watch**

1. **Product Search Performance**: With 1000+ products, search may lag
2. **Position Loading**: First time loading rack positions may take 1-2 seconds
3. **Modal Animations**: May stutter on slower devices
4. **Large Shipments**: 10+ products may make form scrolling cumbersome

---

## 📊 **What to Check in Browser Console**

### **Good Signs:**
```
✅ Shipment has X products - they should load into the form
✅ Product breakdown content: [...]
✅ Setting formData to: {...}
```

### **Bad Signs (Should NOT Appear):**
```
❌ Warning: Shipment has NO product_breakdown or it is empty
❌ TypeError: Cannot read property 'assigned_positions' of undefined
❌ Error loading products: 404
❌ Error loading positions: 500
```

---

## 🎯 **Success Indicators**

After testing, you should confirm:

- ✅ Product picker modal opens and closes smoothly
- ✅ Product search filters correctly
- ✅ Products add to breakdown with all details
- ✅ Position assignment modal shows capacity bars
- ✅ Multi-select positions works with checkboxes
- ✅ Distribution calculates correctly
- ✅ Total quantity auto-updates
- ✅ Validation prevents invalid submissions
- ✅ Legacy shipments migrate seamlessly
- ✅ Emerald/green theme consistent throughout
- ✅ No console errors
- ✅ Shipments save to database correctly

---

## 🔧 **Troubleshooting**

### **Problem: Product picker is empty**
**Solution:** Check `/products` API endpoint returns data

### **Problem: Position modal shows no positions**
**Solution:** Verify `/warehouse-locations/:id/positions` API works

### **Problem: Colors still teal/cyan**
**Solution:** Clear browser cache and hard reload (Ctrl+Shift+R)

### **Problem: Distribution fails**
**Solution:** Check capacity values are numbers, not strings

### **Problem: Legacy products don't load**
**Solution:** Check `migrateProductBreakdown()` function handles null/undefined

---

## 📞 **Support**

If you encounter issues:
1. Check browser console for errors
2. Verify backend API is responding
3. Test with different products/positions
4. Clear browser cache
5. Review SHIPMENT_REGISTRATION_TRANSFORMATION.md for implementation details

---

**Happy Testing! 🎉**

The transformation is complete and ready for quality assurance testing. All features have been implemented according to the plan.
