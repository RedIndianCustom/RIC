# 📦 Enhanced Incoming Shipment → Receiving → QC Inspection Workflow

## 🎯 Complete Workflow Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    INCOMING SHIPMENT LIFECYCLE                          │
└─────────────────────────────────────────────────────────────────────────┘

1. INCOMING SHIPMENT (Operational Staff)
   ├─ Register shipment with expected quantities by size
   ├─ Set expected arrival date
   └─ Status: PENDING / IN_TRANSIT

2. RECEIVING (Warehouse Staff)
   ├─ Scan each product by barcode
   ├─ Count quantities per size
   ├─ Compare with expected quantities
   ├─ Generate discrepancy report (if any)
   │  ├─ Missing items
   │  ├─ Extra items
   │  └─ Notify manager immediately
   ├─ If NO DISCREPANCY → Mark as "Ready for QC"
   └─ If DISCREPANCY → Manager approval required before QC

3. QC INSPECTION (Warehouse Staff)
   ├─ Due date: 15 days from received date
   ├─ Inspect each product individually
   ├─ Classify defects:
   │  ├─ GOOD QUALITY → Ready for stock
   │  ├─ MINOR DEFECT (Sellable) → Discounted stock
   │  └─ MAJOR DEFECT (Unsellable) → Return to supplier
   ├─ Take photos of defects
   ├─ Record defect details
   └─ Submit for manager approval

4. MANAGER APPROVAL
   ├─ Review QC inspection results
   ├─ Review defect photos and descriptions
   ├─ Approve or reject classifications
   └─ Notify warehouse staff of decision

5. FINAL STOCK ALLOCATION
   ├─ GOOD QUALITY → Add to available stock
   ├─ MINOR DEFECT → Add to defect inventory (sellable)
   └─ MAJOR DEFECT → Add to return inventory (return to supplier)
```

---

## 📋 Enhanced Features & Requirements

### 1. **Incoming Shipment Enhancement**

#### Current Issues:
- ❌ No quantity breakdown by size
- ❌ No scanning capability during registration
- ❌ No discrepancy tracking
- ❌ No manager notifications

#### New Features:
```
┌─────────────────────────────────────────────────────────────┐
│  INCOMING SHIPMENT - ENHANCED                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Shipment Number: SHIP-2024-001                            │
│  Supplier: Marvel Star Industrial                          │
│  Expected Arrival: 2024-02-15                              │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  EXPECTED PRODUCTS BY SIZE                             │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │                                                          │ │
│  │  Product: Red Indian Customs Dual Sport XT             │ │
│  │  SKU: RIC-XT-90-90-17                                  │ │
│  │                                                          │ │
│  │  Size Breakdown:                                        │ │
│  │  ├─ 90/90-17:  150 pcs  [Add] [Remove]                │ │
│  │  ├─ 100/90-17: 200 pcs  [Add] [Remove]                │ │
│  │  └─ 110/90-17: 134 pcs  [Add] [Remove]                │ │
│  │                                                          │ │
│  │  Total Expected: 484 pcs                               │ │
│  │                                                          │ │
│  │  [+ Add Another Size]                                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  [+ Add Another Product]                                   │
│                                                              │
│  Total Shipment Quantity: 484 pcs                         │
│                                                              │
│  [Save Shipment] [Cancel]                                  │
└─────────────────────────────────────────────────────────────┘
```

### 2. **Receiving Process Enhancement**

#### Workflow Steps:

**Step 1: Start Receiving**
```
┌─────────────────────────────────────────────────────────────┐
│  RECEIVING SHIPMENT: SHIP-2024-001                         │
├─────────────────────────────────────────────────────────────┤
│  Status: RECEIVING IN PROGRESS                             │
│  Started By: John Doe (Warehouse Staff)                    │
│  Started At: 2024-02-15 10:30 AM                          │
└─────────────────────────────────────────────────────────────┘
```

**Step 2: Scan & Count Products**
```
┌─────────────────────────────────────────────────────────────┐
│  SCAN PRODUCTS                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Product: Red Indian Customs Dual Sport XT 90/90-17        │
│                                                              │
│  [📱 Scan Barcode] or [Enter Manually]                     │
│  ┌──────────────────────────────────┐                      │
│  │  RIC000000000123                 │                      │
│  └──────────────────────────────────┘                      │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  QUANTITY TRACKING BY SIZE                             │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │                                                          │ │
│  │  Size 90/90-17:                                         │ │
│  │  Expected: 150 pcs                                      │ │
│  │  Received: 148 pcs  [+ Scan] [-] [+]                  │ │
│  │  Status: ⚠️ SHORT 2 pcs                                 │ │
│  │                                                          │ │
│  │  Size 100/90-17:                                        │ │
│  │  Expected: 200 pcs                                      │ │
│  │  Received: 202 pcs  [+ Scan] [-] [+]                  │ │
│  │  Status: ⚠️ OVERAGE 2 pcs                              │ │
│  │                                                          │ │
│  │  Size 110/90-17:                                        │ │
│  │  Expected: 134 pcs                                      │ │
│  │  Received: 134 pcs  [+ Scan] [-] [+]                  │ │
│  │  Status: ✅ MATCH                                       │ │
│  │                                                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Total Expected: 484 pcs                                   │
│  Total Received: 484 pcs                                   │
│  Total Matched: 482 pcs (99.6%)                           │
│                                                              │
│  ⚠️ DISCREPANCIES DETECTED: 2 issues                       │
│                                                              │
│  [View Discrepancy Report] [Continue Scanning]             │
└─────────────────────────────────────────────────────────────┘
```

**Step 3: Discrepancy Report**
```
┌─────────────────────────────────────────────────────────────┐
│  📊 DISCREPANCY REPORT                                      │
├─────────────────────────────────────────────────────────────┤
│  Shipment: SHIP-2024-001                                   │
│  Date: 2024-02-15                                          │
│  Receiver: John Doe                                        │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  DISCREPANCIES FOUND                                    │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │                                                          │ │
│  │  1. SHORT QUANTITY                                      │ │
│  │     Product: RIC XT 90/90-17                           │ │
│  │     Expected: 150 pcs                                   │ │
│  │     Received: 148 pcs                                   │ │
│  │     Missing: 2 pcs                                      │ │
│  │     Reason: [Select Reason ▼]                          │ │
│  │             □ Damaged in transit                        │ │
│  │             □ Not packed by supplier                    │ │
│  │             □ Lost during transport                     │ │
│  │             ☑ Other: _________________                  │ │
│  │     Notes: [___________________________________]        │ │
│  │                                                          │ │
│  │  2. OVERAGE                                             │ │
│  │     Product: RIC XT 100/90-17                          │ │
│  │     Expected: 200 pcs                                   │ │
│  │     Received: 202 pcs                                   │ │
│  │     Extra: 2 pcs                                        │ │
│  │     Action: [Select Action ▼]                          │ │
│  │             ☑ Accept extra (update order)               │ │
│  │             □ Return to supplier                        │ │
│  │             □ Hold for clarification                    │ │
│  │     Notes: [___________________________________]        │ │
│  │                                                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Total Discrepancies: 2                                    │
│  Financial Impact: Calculate based on unit prices          │
│                                                              │
│  ☑ Notify Manager Immediately                              │
│  ☑ Attach Photos (Optional)                                │
│  [📷 Upload Photos]                                         │
│                                                              │
│  Manager Approval Required: YES                            │
│                                                              │
│  [Submit Discrepancy Report]  [Cancel]                     │
└─────────────────────────────────────────────────────────────┘
```

**Step 4: Manager Notification**
```
┌─────────────────────────────────────────────────────────────┐
│  🔔 NOTIFICATION SENT TO MANAGER                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  To: Robert Johnson (Manager)                              │
│  Subject: Discrepancy Report - SHIP-2024-001               │
│                                                              │
│  Message:                                                   │
│  A discrepancy has been detected during receiving          │
│  of shipment SHIP-2024-001.                                │
│                                                              │
│  Summary:                                                   │
│  - Short: 2 pcs (90/90-17)                                 │
│  - Overage: 2 pcs (100/90-17)                              │
│                                                              │
│  Awaiting your review and approval.                        │
│                                                              │
│  [View Full Report] [Approve] [Reject]                     │
│                                                              │
│  ✅ Notification sent successfully                          │
└─────────────────────────────────────────────────────────────┘
```

**Step 5: Complete Receiving**
```
┌─────────────────────────────────────────────────────────────┐
│  RECEIVING COMPLETE                                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ✅ NO DISCREPANCIES                                        │
│  All quantities match expected values                       │
│                                                              │
│  Status: READY FOR QC INSPECTION                           │
│  QC Due Date: 2024-03-01 (15 days)                        │
│                                                              │
│  [Proceed to QC Inspection]                                │
└─────────────────────────────────────────────────────────────┘

OR

┌─────────────────────────────────────────────────────────────┐
│  RECEIVING COMPLETE WITH DISCREPANCIES                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ⚠️ DISCREPANCIES REPORTED                                  │
│  Awaiting manager approval                                  │
│                                                              │
│  Status: PENDING MANAGER APPROVAL                          │
│                                                              │
│  Once approved, shipment will be ready for QC              │
│                                                              │
│  [View Discrepancy Report] [Back to Dashboard]             │
└─────────────────────────────────────────────────────────────┘
```

---

### 3. **QC Inspection Process**

#### Enhanced QC Workflow:

**Step 1: QC Dashboard**
```
┌─────────────────────────────────────────────────────────────┐
│  🛡️ QC INSPECTION QUEUE                                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Pending Inspections: 3                                     │
│  Overdue: 1 (Past 15 days)                                 │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  SHIP-2024-001                                          │ │
│  │  Received: 2024-02-15                                   │ │
│  │  Due Date: 2024-03-01 (⚠️ 2 days overdue)              │ │
│  │  Quantity: 484 pcs                                      │ │
│  │  Status: READY FOR QC                                   │ │
│  │  [Start QC Inspection]                                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  SHIP-2024-002                                          │ │
│  │  Received: 2024-02-16                                   │ │
│  │  Due Date: 2024-03-02 (5 days left)                   │ │
│  │  Quantity: 300 pcs                                      │ │
│  │  Status: READY FOR QC                                   │ │
│  │  [Start QC Inspection]                                  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Step 2: QC Inspection Interface**
```
┌─────────────────────────────────────────────────────────────┐
│  QC INSPECTION: SHIP-2024-001                              │
├─────────────────────────────────────────────────────────────┤
│  Inspector: John Doe                                        │
│  Date: 2024-02-17                                          │
│  Due Date: 2024-03-01 (12 days left)                      │
│                                                              │
│  Progress: 25/484 inspected (5.2%)                         │
│  [████░░░░░░░░░░░░░░░░] 5%                                 │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  CURRENT ITEM                                           │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │                                                          │ │
│  │  [📱 Scan Barcode]                                      │ │
│  │  Barcode: RIC000000000123                              │ │
│  │                                                          │ │
│  │  Product: Red Indian Customs Dual Sport XT             │ │
│  │  Size: 90/90-17                                         │ │
│  │  SKU: RIC-XT-90-90-17                                  │ │
│  │                                                          │ │
│  │  QUALITY CLASSIFICATION:                                │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │  ○ GOOD QUALITY                                   │  │ │
│  │  │    ✓ No defects                                   │  │ │
│  │  │    ✓ Ready for stock                              │  │ │
│  │  │                                                    │  │ │
│  │  │  ○ MINOR DEFECT (Sellable)                        │  │ │
│  │  │    ✓ Cosmetic issues only                         │  │ │
│  │  │    ✓ Can be sold at discount                      │  │ │
│  │  │    → Examples:                                     │  │ │
│  │  │       - Minor scratches                            │  │ │
│  │  │       - Small stain/mark                          │  │ │
│  │  │       - Packaging damage (product OK)             │  │ │
│  │  │       - Color variation                            │  │ │
│  │  │                                                    │  │ │
│  │  │  ○ MAJOR DEFECT (Return to Supplier)              │  │ │
│  │  │    ✗ Structural/functional issues                 │  │ │
│  │  │    ✗ Cannot be sold                                │  │ │
│  │  │    → Examples:                                     │  │ │
│  │  │       - Cracks/tears                               │  │ │
│  │  │       - Wrong product/size                         │  │ │
│  │  │       - Severe damage                              │  │ │
│  │  │       - Manufacturing defect                       │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │                                                          │ │
│  │  DEFECT DETAILS (if applicable):                        │ │
│  │  Defect Type: [Select ▼]                               │ │
│  │               □ Scratch                                 │ │
│  │               □ Stain                                   │ │
│  │               □ Crack                                   │ │
│  │               □ Tear                                    │ │
│  │               □ Wrong product                          │ │
│  │               □ Manufacturing defect                   │ │
│  │               □ Other: ________________                │ │
│  │                                                          │ │
│  │  Location: [Where on product ▼]                        │ │
│  │            □ Tread                                      │ │
│  │            □ Sidewall                                   │ │
│  │            □ Bead                                       │ │
│  │            □ Multiple areas                            │ │
│  │                                                          │ │
│  │  Description:                                           │ │
│  │  [________________________________________]             │ │
│  │  [________________________________________]             │ │
│  │                                                          │ │
│  │  📷 PHOTOS (Required for defects):                     │ │
│  │  [Upload Photo 1] [Upload Photo 2] [Upload Photo 3]   │ │
│  │  ┌────────┐ ┌────────┐ ┌────────┐                    │ │
│  │  │ Photo1 │ │ Photo2 │ │ Photo3 │                    │ │
│  │  └────────┘ └────────┘ └────────┘                    │ │
│  │                                                          │ │
│  │  [Save & Next Item]  [Save & Pause]                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  INSPECTION SUMMARY SO FAR:                                │
│  ✅ Good Quality: 20 pcs (80%)                             │
│  ⚠️ Minor Defects: 3 pcs (12%)                             │
│  ❌ Major Defects: 2 pcs (8%)                              │
│                                                              │
│  [Pause Inspection] [Complete Inspection]                 │
└─────────────────────────────────────────────────────────────┘
```

**Step 3: QC Completion & Manager Review**
```
┌─────────────────────────────────────────────────────────────┐
│  QC INSPECTION COMPLETE                                     │
├─────────────────────────────────────────────────────────────┤
│  Shipment: SHIP-2024-001                                   │
│  Inspector: John Doe                                        │
│  Inspection Date: 2024-02-17                               │
│  Completion Time: 3 hours 45 minutes                       │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  FINAL RESULTS                                          │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │                                                          │ │
│  │  Total Inspected: 484 pcs (100%)                       │ │
│  │                                                          │ │
│  │  ✅ GOOD QUALITY: 450 pcs (93.0%)                       │ │
│  │     → Ready for stock                                   │ │
│  │                                                          │ │
│  │  ⚠️ MINOR DEFECTS (Sellable): 28 pcs (5.8%)            │ │
│  │     → Defect inventory (discounted)                     │ │
│  │     Breakdown:                                           │ │
│  │     - Minor scratches: 15 pcs                          │ │
│  │     - Small stains: 8 pcs                              │ │
│  │     - Packaging damage: 5 pcs                          │ │
│  │                                                          │ │
│  │  ❌ MAJOR DEFECTS (Return): 6 pcs (1.2%)               │ │
│  │     → Return to supplier inventory                      │ │
│  │     Breakdown:                                           │ │
│  │     - Cracks: 3 pcs                                     │ │
│  │     - Wrong size: 2 pcs                                │ │
│  │     - Severe damage: 1 pc                              │ │
│  │                                                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  📸 Photos Attached: 34 photos (for defect documentation)  │
│  [View All Photos]                                          │
│                                                              │
│  Inspector Notes:                                           │
│  Overall shipment quality is good. Minor defects are       │
│  mostly cosmetic and sellable. Major defects need         │
│  immediate return to supplier.                             │
│                                                              │
│  ☑ Submit for Manager Approval                             │
│  ☑ Notify Manager                                          │
│                                                              │
│  [Submit for Approval]  [Save as Draft]                    │
└─────────────────────────────────────────────────────────────┘
```

**Step 4: Manager Approval Interface**
```
┌─────────────────────────────────────────────────────────────┐
│  MANAGER APPROVAL REQUIRED                                  │
├─────────────────────────────────────────────────────────────┤
│  QC Inspection Report: SHIP-2024-001                       │
│  Inspector: John Doe (Warehouse Staff)                     │
│  Submitted: 2024-02-17 2:30 PM                            │
│                                                              │
│  [View Full Report] [View Photos] [View Defect Details]   │
│                                                              │
│  SUMMARY:                                                   │
│  ✅ Good: 450 pcs (93.0%) → Stock                          │
│  ⚠️ Minor: 28 pcs (5.8%) → Defect Inventory                │
│  ❌ Major: 6 pcs (1.2%) → Return to Supplier               │
│                                                              │
│  MANAGER DECISION:                                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  For GOOD QUALITY (450 pcs):                           │ │
│  │  ○ Approve - Add to Available Stock                    │ │
│  │  ○ Reject - Requires Re-inspection                     │ │
│  │                                                          │ │
│  │  For MINOR DEFECTS (28 pcs):                           │ │
│  │  ○ Approve - Add to Defect Inventory (Sellable)       │ │
│  │  ○ Reject Classification - Should be Major Defects    │ │
│  │  ○ Reject All - Requires Re-inspection                │ │
│  │  Suggested Discount: [_20_]%                           │ │
│  │                                                          │ │
│  │  For MAJOR DEFECTS (6 pcs):                            │ │
│  │  ○ Approve - Mark for Return to Supplier              │ │
│  │  ○ Reject Classification - Should be Minor Defects    │ │
│  │  ○ Reject All - Requires Re-inspection                │ │
│  │                                                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Manager Notes:                                             │
│  [____________________________________________]             │
│  [____________________________________________]             │
│                                                              │
│  ☑ Notify Warehouse Staff                                  │
│  ☑ Notify Operational Staff                                │
│  ☑ Notify Sales Team (about defect inventory)              │
│                                                              │
│  [Approve All] [Approve Selected] [Reject & Request        │
│                                    Re-inspection]           │
└─────────────────────────────────────────────────────────────┘
```

**Step 5: Stock Allocation**
```
┌─────────────────────────────────────────────────────────────┐
│  ✅ APPROVED - ALLOCATING TO STOCK                          │
├─────────────────────────────────────────────────────────────┤
│  Shipment: SHIP-2024-001                                   │
│  Manager: Robert Johnson                                    │
│  Approved: 2024-02-17 3:00 PM                             │
│                                                              │
│  STOCK ALLOCATION IN PROGRESS...                           │
│                                                              │
│  ✅ Good Quality (450 pcs):                                 │
│     Status: AVAILABLE                                       │
│     Location: Main Warehouse                                │
│     Ready for Sale: Yes                                     │
│     [████████████████████] 100%                            │
│                                                              │
│  ⚠️ Minor Defects (28 pcs):                                 │
│     Status: DEFECT_SELLABLE                                │
│     Location: Defect Inventory Section                     │
│     Ready for Sale: Yes (with 20% discount)                │
│     [████████████████████] 100%                            │
│                                                              │
│  ❌ Major Defects (6 pcs):                                  │
│     Status: RETURN_TO_SUPPLIER                             │
│     Location: Return Holding Area                          │
│     Return Request: Created (RTN-2024-001)                 │
│     [████████████████████] 100%                            │
│                                                              │
│  ✅ ALLOCATION COMPLETE                                     │
│                                                              │
│  🔔 NOTIFICATIONS SENT:                                     │
│  ✓ Warehouse Staff - Stock locations assigned              │
│  ✓ Operational Staff - Shipment processed                  │
│  ✓ Sales Team - New stock available (+ defect inventory)   │
│  ✓ Supplier - Return request for 6 pcs                     │
│                                                              │
│  [View Stock Locations] [Generate Report] [Close]          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema Enhancements

### Additional Tables Needed:

```sql
-- Shipment Expected Items (Size Breakdown)
CREATE TABLE shipment_expected_items (
  id UUID PRIMARY KEY,
  shipment_id UUID REFERENCES shipments(id),
  product_id UUID REFERENCES products(id),
  size VARCHAR(50),
  expected_quantity INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Shipment Received Items (Actual Count)
CREATE TABLE shipment_received_items (
  id UUID PRIMARY KEY,
  shipment_id UUID REFERENCES shipments(id),
  product_id UUID REFERENCES products(id),
  size VARCHAR(50),
  received_quantity INTEGER NOT NULL,
  received_by UUID REFERENCES auth.users(id),
  received_at TIMESTAMPTZ DEFAULT now()
);

-- Shipment Discrepancies
CREATE TABLE shipment_discrepancies (
  id UUID PRIMARY KEY,
  shipment_id UUID REFERENCES shipments(id),
  discrepancy_type VARCHAR(50), -- 'SHORT', 'OVERAGE', 'DAMAGED', 'WRONG_ITEM'
  product_id UUID REFERENCES products(id),
  size VARCHAR(50),
  expected_quantity INTEGER,
  received_quantity INTEGER,
  difference INTEGER,
  reason TEXT,
  resolution_action TEXT,
  photos TEXT[],
  reported_by UUID REFERENCES auth.users(id),
  reported_at TIMESTAMPTZ DEFAULT now(),
  manager_reviewed_by UUID REFERENCES auth.users(id),
  manager_reviewed_at TIMESTAMPTZ,
  manager_decision VARCHAR(50), -- 'APPROVED', 'REJECTED', 'PENDING'
  manager_notes TEXT
);

-- QC Inspections (Enhanced)
CREATE TABLE qc_inspections (
  id UUID PRIMARY KEY,
  shipment_id UUID REFERENCES shipments(id),
  inspection_number VARCHAR(100) UNIQUE,
  inspector_id UUID REFERENCES auth.users(id),
  inspection_start_date TIMESTAMPTZ,
  inspection_end_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ, -- 15 days from received date
  status VARCHAR(50), -- 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'
  total_items INTEGER,
  items_inspected INTEGER,
  good_quality_count INTEGER,
  minor_defect_count INTEGER,
  major_defect_count INTEGER,
  inspector_notes TEXT,
  manager_reviewed_by UUID REFERENCES auth.users(id),
  manager_reviewed_at TIMESTAMPTZ,
  manager_decision VARCHAR(50), -- 'APPROVED', 'REJECTED', 'PARTIAL'
  manager_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- QC Inspection Items (Individual Product Inspection)
CREATE TABLE qc_inspection_items (
  id UUID PRIMARY KEY,
  qc_inspection_id UUID REFERENCES qc_inspections(id),
  inventory_unit_id UUID REFERENCES inventory_units(id),
  product_id UUID REFERENCES products(id),
  barcode VARCHAR(255),
  classification VARCHAR(50), -- 'GOOD', 'MINOR_DEFECT', 'MAJOR_DEFECT'
  defect_type VARCHAR(100), -- 'SCRATCH', 'CRACK', 'TEAR', 'WRONG_PRODUCT', etc.
  defect_location VARCHAR(100), -- 'TREAD', 'SIDEWALL', 'BEAD', etc.
  defect_description TEXT,
  photos TEXT[], -- Array of photo URLs
  severity VARCHAR(50), -- 'COSMETIC', 'FUNCTIONAL', 'CRITICAL'
  recommended_action VARCHAR(50), -- 'SELL', 'DISCOUNT', 'RETURN'
  inspected_at TIMESTAMPTZ,
  manager_approved BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Defect Inventory
CREATE TABLE defect_inventory (
  id UUID PRIMARY KEY,
  inventory_unit_id UUID REFERENCES inventory_units(id),
  product_id UUID REFERENCES products(id),
  defect_classification VARCHAR(50), -- 'MINOR_SELLABLE', 'MAJOR_RETURN'
  original_price DECIMAL(10, 2),
  discount_percentage DECIMAL(5, 2),
  discounted_price DECIMAL(10, 2),
  status VARCHAR(50), -- 'AVAILABLE', 'SOLD', 'RETURNED'
  qc_inspection_item_id UUID REFERENCES qc_inspection_items(id),
  added_by UUID REFERENCES auth.users(id),
  added_at TIMESTAMPTZ DEFAULT now(),
  sold_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ
);
```

---

## 🔔 Notification System

### Notification Triggers:

1. **Discrepancy Detected**
   - Notify: Manager
   - Priority: HIGH
   - Action Required: Review and approve

2. **QC Inspection Overdue**
   - Notify: Warehouse Staff, Manager
   - Priority: URGENT
   - Action Required: Complete inspection

3. **QC Inspection Complete**
   - Notify: Manager
   - Priority: MEDIUM
   - Action Required: Review and approve results

4. **Manager Approval Complete**
   - Notify: Warehouse Staff, Operational Staff, Sales Team
   - Priority: MEDIUM
   - Action Required: None (informational)

5. **Stock Added**
   - Notify: Sales Team
   - Priority: LOW
   - Action Required: None (informational)

6. **Defect Inventory Added**
   - Notify: Sales Team, Manager
   - Priority: MEDIUM
   - Action Required: Review pricing strategy

---

## 📈 Reports & Analytics

### 1. Discrepancy Report
- Shipment-wise discrepancies
- Trend analysis
- Supplier performance

### 2. QC Performance Report
- Inspection completion rate
- Average inspection time
- Defect rate by supplier
- Defect rate by product

### 3. Stock Allocation Report
- Good quality vs defect ratio
- Return rate
- Financial impact

---

## 🎯 Success Metrics

1. **Receiving Efficiency**
   - Target: 100% accuracy in quantity tracking
   - Target: < 2% discrepancy rate

2. **QC Timeliness**
   - Target: 100% completion within 15 days
   - Target: 0 overdue inspections

3. **Defect Rate**
   - Target: < 5% minor defects
   - Target: < 2% major defects

4. **Manager Response Time**
   - Target: < 24 hours for approval

---

## 🚀 Implementation Priority

### Phase 1 (High Priority):
1. ✅ Enhanced shipment registration with size breakdown
2. ✅ Receiving with scanning & quantity tracking
3. ✅ Discrepancy detection & reporting
4. ✅ Manager notification system

### Phase 2 (Medium Priority):
5. ✅ QC inspection interface with 15-day deadline
6. ✅ Defect classification (minor/major)
7. ✅ Photo upload for defects
8. ✅ Manager approval workflow

### Phase 3 (Standard Priority):
9. ✅ Stock allocation automation
10. ✅ Defect inventory management
11. ✅ Return to supplier workflow
12. ✅ Comprehensive reporting

---

**This is a complete, production-ready enhancement plan!** 🎉

Ready to implement? Let me know and I'll start coding!
