# QC Inspection Guide

## 🎯 Overview

After a manager approves a receiving report, a QC (Quality Control) inspection is automatically created. This guide explains how to access and use the QC Inspection interface.

---

## 📍 How to Access QC Inspection

### **Option 1: From the Navigation Menu**

1. Look in the left sidebar under **OPERATIONS**
2. Click on **"QC Inspection"** (newly added!)
3. You'll see all pending QC inspections

### **Option 2: Direct URL**

Navigate to: `http://localhost:5173/warehouse/qc-inspection`

---

## 👥 Who Can Access?

- **Warehouse Staff** - Can perform inspections
- **Managers** - Can view and review inspections  
- **Admins** - Full access

---

## 🔍 Current Pending Inspection

Based on the recent approval, you have:

**Inspection Number**: `QC-SHIP354-20260901`
- **Status**: PENDING
- **Total Items**: 5 items to inspect
- **Shipment**: SHIP354
- **Linked Report**: RR-20260901-0001
- **Created**: September 1, 2026, 8:12:42 PM

---

## 📋 QC Inspection Workflow

### **Step 1: View Pending Inspections**

When you open the QC Inspection page, you'll see:
- List of pending inspections
- Inspection numbers
- Shipment details
- Number of items to inspect
- Status badges

### **Step 2: Start Inspection**

1. Click on inspection `QC-SHIP354-20260901`
2. The inspection details will load
3. You'll see the list of 5 items to inspect

### **Step 3: Inspect Each Item**

For each item (barcode):

#### **3.1 Scan or Enter Barcode**
- Use barcode scanner
- Or type barcode manually
- System will load item details

#### **3.2 Classify Quality**
Choose one:
- ✅ **GOOD_QUALITY** - Perfect condition, ready to sell
- ⚠️ **MINOR_DEFECT** - Small issues but still sellable
- ❌ **MAJOR_DEFECT** - Significant issues, cannot sell as-is

#### **3.3 For Defects, Record Details**

If MINOR or MAJOR defect:

**Defect Type** (select):
- Scratches
- Dents
- Color mismatch
- Size mismatch
- Damaged packaging
- Missing parts
- Cracked/Broken
- Stains
- Other

**Defect Location**:
- Front
- Back
- Side
- Top
- Bottom
- Inside
- Multiple areas

**Defect Severity**:
- MINOR - Barely noticeable
- MODERATE - Noticeable but acceptable
- MAJOR - Significant, affects value
- CRITICAL - Product unusable

**Sellable?**
- Yes - Can be sold (perhaps at discount)
- No - Cannot be sold

**Recommended Action**:
- SELL_NORMAL - Sell at full price
- SELL_DISCOUNT - Sell at reduced price
- SELL_AS_IS - Sell with disclaimer
- HOLD - Keep in warehouse
- RETURN_SUPPLIER - Send back
- DISPOSE - Scrap/discard

**Discount Percentage** (if applicable):
- Enter discount % if selling at reduced price

#### **3.4 Add Photos (Optional)**
- Click camera/upload button
- Take or upload photos of defects
- Multiple photos allowed

#### **3.5 Quality Notes**
- Add any additional observations
- Describe specific issues
- Note special handling needs

### **Step 4: Submit Item Inspection**

- Click "Submit Inspection"
- Item is marked as inspected
- Progress updates (e.g., "1 of 5 items inspected")

### **Step 5: Repeat for All Items**

Continue scanning and inspecting until all 5 items are complete.

### **Step 6: Complete Inspection**

Once all items are inspected:

1. Review overall results:
   - Good quality count
   - Minor defect count
   - Major defect count
   - Quality percentages

2. Add overall assessment:
   - General condition of shipment
   - Any patterns noticed
   - Recommendations

3. Click "Complete Inspection"

---

## 📊 What Happens After QC Completion?

### **Automatic Actions:**

1. ✅ **QC Inspection Status** → Changes to `COMPLETED`
2. ✅ **Quality Summary** → Calculated and saved
3. ✅ **Manager Notification** → Manager gets alerted for review
4. ✅ **Shipment Status** → May update based on results

### **Manager Review:**

Manager reviews the QC results and can:
- **APPROVE** - Accept all items for storage
- **REJECT** - Reject shipment (return to supplier)
- **PARTIAL_APPROVED** - Accept some, reject others
- **REQUIRES_REINSPECTION** - QC team inspects again

### **After Manager Approval:**

Items move to warehouse storage:
- Good quality items → Regular inventory
- Minor defect items → Marked with discount
- Major defect items → Separate defect inventory
- Items ready for sale/orders

---

## 🔧 Backend API Endpoints

The QC Inspection page uses these APIs:

```
GET  /api/receiving-qc/qc-inspection/pending/all    - List pending inspections
GET  /api/receiving-qc/qc-inspection/:id            - Get inspection details
POST /api/receiving-qc/qc-inspection/record-item    - Record item inspection
PUT  /api/receiving-qc/qc-inspection/:id/complete   - Complete inspection
```

---

## 🎯 Quick Start Checklist

- [x] Manager approved receiving report
- [x] QC inspection auto-created (`QC-SHIP354-20260901`)
- [x] "QC Inspection" menu item added to sidebar
- [x] Backend routes configured
- [ ] **Next**: Log in as warehouse staff or manager
- [ ] **Next**: Click "QC Inspection" in sidebar
- [ ] **Next**: Start inspecting the 5 items!

---

## 🐛 Troubleshooting

### **Can't see QC Inspection menu item?**
- Refresh the page (Ctrl+R)
- Check you're logged in as warehouse_staff, manager, or admin
- Clear browser cache if needed

### **No pending inspections showing?**
- Check if manager actually approved the report
- Run backend test: `node backend/check-qc-inspection.mjs`
- Verify backend is running on port 4000

### **API errors?**
- Check backend console for errors
- Verify backend restart after code changes
- Check network tab in browser DevTools

---

## 📞 Need Help?

1. Check backend logs for errors
2. Run test script: `node backend/check-qc-inspection.mjs`
3. Verify user role permissions
4. Check browser console for frontend errors

---

## 🎉 Complete Workflow Summary

```
📦 SHIPMENT ARRIVES
     ↓
🔍 Warehouse Receiving (Scan items, count by size)
     ↓
📋 Submit Receiving Report
     ↓
👔 Manager Approval ✅ (COMPLETED)
     ↓
🔬 QC Inspection ← **YOU ARE HERE**
   - List: View pending inspections
   - Start: Open inspection QC-SHIP354-20260901
   - Inspect: Check each of 5 items
   - Classify: Good/Minor/Major defect
   - Record: Photos, notes, recommendations
   - Complete: Submit full inspection
     ↓
👔 Manager Review (Approve QC results)
     ↓
📦 Warehouse Putaway (Store items in locations)
     ↓
✅ ITEMS AVAILABLE IN INVENTORY
```

---

**Ready to start? Navigate to "QC Inspection" in the sidebar!** 🚀
