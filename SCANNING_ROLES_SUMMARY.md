# 👥 Who Uses the Scanning System?

## Quick Answer
**BOTH Operational Staff AND Warehouse Staff** use the barcode scanning system!

---

## 🎯 Access Permissions

| Role | Access Level | Primary Use Case |
|------|--------------|------------------|
| **Operational Staff** | ✅ Full Access | Process customer returns at counter |
| **Warehouse Staff** | ✅ Full Access | Locate and physically return items to racks |
| **Admin** | ✅ Full Access | System management and oversight |
| **Sales Staff** | ❌ No Access | Use different tools for sales verification |
| **Manager** | ❌ No Direct Access | Views reports, doesn't scan directly |

---

## 📋 Why Both Roles Need Access?

### **The Return Process Has TWO Stages:**

#### **Stage 1: Counter Processing (Operational Staff)**
- **Location:** Front office / Customer service counter
- **What they do:**
  - Scan returned product
  - Verify it's the right product
  - Process return in system
  - Select return reason
  - Print return receipt for customer
  - Mark system status as "RETURNED"

#### **Stage 2: Physical Return (Warehouse Staff)**  
- **Location:** Warehouse floor
- **What they do:**
  - Receive product from operational staff
  - Scan to see exact storage location
  - Transport to correct warehouse rack
  - Place product back in position
  - Update physical inventory

---

## 🔄 Complete Return Workflow

```
CUSTOMER
   |
   | (Returns product)
   ↓
OPERATIONAL STAFF (Counter)
   • Scans barcode
   • Sees: "WH1-RACK-4" 
   • Processes return
   • Updates status → RETURNED
   |
   | (Hands product to warehouse)
   ↓
WAREHOUSE STAFF (Warehouse Floor)
   • Scans same barcode
   • Sees: "Main Warehouse - WH1-RACK-4"
   • Goes to Rack 4
   • Places product back
   • Done!
```

---

## 🎨 What Each Role Sees

### **Operational Staff View:**
```
┌─────────────────────────────────────┐
│  📱 Scan Barcode                    │
├─────────────────────────────────────┤
│  Enter barcode: RIC000000002342     │
│  [Scan Barcode]                     │
│                                     │
│  ✅ Found!                          │
│                                     │
│  📍 Storage Location:               │
│  Main Warehouse                     │
│  WH1-RACK-4                         │
│                                     │
│  📦 Product: ST Dual Sport          │
│  Status: NEW                        │
│                                     │
│  [Process Return] [Full Details]   │
└─────────────────────────────────────┘
```

### **Warehouse Staff View:**
```
┌─────────────────────────────────────┐
│  📱 Scan Barcode                    │
├─────────────────────────────────────┤
│  Barcode: RIC000000002342           │
│                                     │
│  ✅ Location Found!                 │
│                                     │
│  📍 GO TO:                          │
│  ┌───────────────────────────────┐ │
│  │  Main Warehouse               │ │
│  │  WH1-RACK-4                   │ │
│  │  (Dual Sport 90/90-17)        │ │
│  └───────────────────────────────┘ │
│                                     │
│  Status: RETURNED                   │
│                                     │
│  [Scan Another]                     │
└─────────────────────────────────────┘
```

---

## 💡 Real-World Example

**Scenario:** Customer returns a tire that doesn't fit their motorcycle

### **9:00 AM - At the Counter (Operational Staff: Maria)**
1. Customer walks in with tire
2. Maria scans barcode: `RIC000000002342`
3. System shows:
   - Product: ST Dual Sport 90/90-17
   - Location: Main Warehouse, WH1-RACK-4
   - Status: SOLD
4. Maria clicks "Process Return"
5. Selects reason: "Wrong Size/Model"
6. Adds note: "Customer needed 110/80-17"
7. Status changes to: RETURNED
8. Maria prints receipt for customer
9. Maria puts red "RETURNED" sticker on tire
10. Sends tire to warehouse receiving area

### **10:30 AM - In the Warehouse (Warehouse Staff: John)**
1. John picks up tire from receiving area
2. Scans barcode: `RIC000000002342`
3. Big green card shows: **"WH1-RACK-4"**
4. John walks to Rack 4 in Main Warehouse
5. Finds the section for "Dual Sport 90/90-17"
6. Places tire back on the rack
7. Scans next returned item

### **Result:**
- ✅ Customer got refund
- ✅ Product back in correct location
- ✅ System status updated
- ✅ Inventory count accurate
- ✅ Ready to sell again!

---

## 🚀 Benefits for Each Role

### **For Operational Staff:**
- ⚡ **Fast returns** - Scan, process, done!
- 📍 **Know where it goes** - See warehouse location immediately
- 📝 **Track reasons** - Record why products are returned
- 📊 **History** - See recent scans for quick re-checks

### **For Warehouse Staff:**
- 🎯 **No guessing** - Exact rack location shown
- 📱 **Mobile friendly** - Use phone or tablet to scan
- ✅ **Verify placement** - Confirm correct location
- 🔄 **Quick workflow** - Scan, walk, place, done!

---

## 🔐 Security & Access Control

**Both roles have EQUAL access** to the scanning page because:
1. They perform **different parts of the same process**
2. Both need to **see warehouse locations**
3. Both can **process returns** (operational does paperwork, warehouse does physical)
4. System **tracks who did what** via user login

**Note:** The system logs all actions, so you can see:
- Who scanned the barcode
- When they scanned it
- What changes they made
- Which status they set

---

## 📱 How to Access

### **For Operational Staff:**
1. Login to system
2. Go to: **Barcode & Labels** → **Scan Barcode**
3. Or navigate to: `/scan-barcode`

### **For Warehouse Staff:**
1. Login to system
2. Go to: **Warehouse** → **Scan Barcode**
3. Or navigate to: `/scan-barcode`
4. Same page, same features!

---

## ❓ Common Questions

**Q: Can operational staff only scan and warehouse staff only return?**  
**A:** No! Both roles have full access. Operational staff CAN return items physically, and warehouse staff CAN process returns in the system. It's designed to be flexible!

**Q: What if warehouse staff scans a barcode at the counter?**  
**A:** That's fine! They'll see the same information and can process the return if needed.

**Q: Do managers need scanning access?**  
**A:** Usually no - managers review reports and analytics. But if your manager wants access, ask admin to grant it.

**Q: Can sales staff scan barcodes?**  
**A:** Not this page. Sales staff have their own scanning tools for inventory lookup and sales verification.

---

## ✅ Summary

| What | Who | Where | Why |
|------|-----|-------|-----|
| **Scan Barcode** | Operational + Warehouse | Counter + Warehouse | Verify products |
| **See Location** | Operational + Warehouse | Both | Know where to return |
| **Process Return** | Operational + Warehouse | Both | Update status |
| **Physical Return** | Warehouse (mainly) | Warehouse Floor | Put back on rack |

**Bottom line:** The scanning system is a **shared tool** for both operational and warehouse staff to work together on returns! 🤝

---

**Questions?** Ask your supervisor or IT support!
