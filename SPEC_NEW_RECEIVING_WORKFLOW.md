# SPECIFICATION: New Size-Based Receiving Workflow

## Overview
Complete redesign of the receiving workflow to support size-selection-based receiving with quantity counting, discrepancy tracking, and manager approval.

---

## Current Workflow (OLD)
```
1. Start Receiving
2. Scan item 1 → Scan item 2 → Scan item 3 (one by one)
3. Verify conditions
4. Assign locations
5. Complete
```

**Problems:**
- Must scan every single item (28 items takes 28 scans!)
- No flexibility in order
- No discrepancy tracking
- No quantity verification

---

## New Workflow (PROPOSED)

### Phase 1: Size Selection & Scanning
```
1. Start Receiving
2. VIEW all sizes in shipment:
   ☐ 120/80-17 (Expected: 28 units)
   ☐ 100/90-17 (Expected: 28 units)
   ☐ 120/80-18 (Expected: 14 units)

3. SELECT a size to receive (e.g., 120/80-18)

4. SCAN items of that size:
   [Scan QR Code]
   
   Scanned Count: 12 / Expected: 14
   
   Barcodes:
   - RIC000000005722 ✓
   - RIC000000005723 ✓
   - RIC000000005724 ✓
   ... (12 scanned so far)

5. FINISH scanning this size

6. DISCREPANCY CALCULATION:
   Expected: 14 units
   Received: 12 units
   Discrepancy: -2 units (Short 2 units)
   Status: ⚠️ DISCREPANCY

7. REPEAT for next size
```

### Phase 2: Overall Summary
```
Size Receiving Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━
120/80-17:
  Expected: 28 | Received: 28 | Diff: 0 ✓

100/90-17:
  Expected: 28 | Received: 27 | Diff: -1 ⚠️

120/80-18:
  Expected: 14 | Received: 12 | Diff: -2 ⚠️

━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL:
  Expected: 70 units
  Received: 67 units
  Discrepancy: -3 units (4.3% short)
```

### Phase 3: Manager Approval
```
RECEIVING REPORT
Shipment: SHIP312
Received By: John Doe (Warehouse Staff)
Date: 2026-08-26 14:30

Status: ⚠️ PENDING MANAGER APPROVAL

[Manager reviews report]
[Manager adds notes: "Short 3 units - will claim from supplier"]
[Manager clicks "APPROVE"]

→ Status changes: INSPECTING → READY_FOR_QC
→ Notification sent to QC team
```

---

## UI Design

### Step 1: Size Selection Screen
```
┌─────────────────────────────────────────┐
│ Receiving: SHIP312                  [X] │
├─────────────────────────────────────────┤
│ Select size to receive:                 │
│                                         │
│ ┌───────────────────────────────────┐   │
│ │ 📦 120/80-17                      │   │
│ │ Expected: 28 units                │   │
│ │ Status: Not Started               │   │
│ │              [Start Receiving →]  │   │
│ └───────────────────────────────────┘   │
│                                         │
│ ┌───────────────────────────────────┐   │
│ │ 📦 100/90-17                      │   │
│ │ Expected: 28 units                │   │
│ │ Status: Not Started               │   │
│ │              [Start Receiving →]  │   │
│ └───────────────────────────────────┘   │
│                                         │
│ ┌───────────────────────────────────┐   │
│ │ 📦 120/80-18                      │   │
│ │ Expected: 14 units                │   │
│ │ Status: ✓ Complete (14/14)        │   │
│ │              [View Details]       │   │
│ └───────────────────────────────────┘   │
│                                         │
│ Progress: 1/3 sizes completed           │
│                                         │
│ [Generate Summary Report]               │
└─────────────────────────────────────────┘
```

### Step 2: Scanning Screen (Per Size)
```
┌─────────────────────────────────────────┐
│ Receiving: 120/80-18              [← Back]│
├─────────────────────────────────────────┤
│ Expected Quantity: 14 units             │
│ Scanned Count: 12 units                 │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ [Scan Barcode]                      │ │
│ │ [📷 Camera]  [Verify]               │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Scanned Items:                          │
│ ✓ RIC000000005722                       │
│ ✓ RIC000000005723                       │
│ ✓ RIC000000005724                       │
│ ✓ RIC000000005725                       │
│ ✓ RIC000000005726                       │
│ ... (7 more)                            │
│                                         │
│ [Finish This Size]                      │
└─────────────────────────────────────────┘
```

### Step 3: Discrepancy Screen
```
┌─────────────────────────────────────────┐
│ Size Receiving Complete               │
├─────────────────────────────────────────┤
│ Size: 120/80-18                         │
│                                         │
│ Expected:    14 units                   │
│ Received:    12 units                   │
│ ━━━━━━━━━━━━━━━━━━━━━                  │
│ Discrepancy: -2 units (Short)        ⚠️│
│                                         │
│ Notes (optional):                       │
│ ┌─────────────────────────────────────┐ │
│ │ 2 units damaged in shipping         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Save & Continue]                       │
└─────────────────────────────────────────┘
```

### Step 4: Summary Report
```
┌─────────────────────────────────────────┐
│ Receiving Summary Report                │
├─────────────────────────────────────────┤
│ Shipment: SHIP312                       │
│ Received By: John Doe                   │
│ Date: 2026-08-26 14:30                  │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Size         Expected  Received  Δ  │ │
│ │ ─────────────────────────────────── │ │
│ │ 120/80-17       28        28     0✓│ │
│ │ 100/90-17       28        27    -1⚠│ │
│ │ 120/80-18       14        12    -2⚠│ │
│ │ ─────────────────────────────────── │ │
│ │ TOTAL           70        67    -3⚠│ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Overall Notes:                          │
│ ┌─────────────────────────────────────┐ │
│ │ Some units damaged in transit       │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Submit for Manager Approval]           │
└─────────────────────────────────────────┘
```

### Step 5: Manager Approval
```
┌─────────────────────────────────────────┐
│ Receiving Report #RR-2024-001           │
├─────────────────────────────────────────┤
│ Status: ⏳ PENDING APPROVAL              │
│                                         │
│ Shipment: SHIP312                       │
│ Received By: John Doe (Warehouse)       │
│ Received Date: 2026-08-26 14:30         │
│                                         │
│ Summary:                                │
│ Total Expected: 70 units                │
│ Total Received: 67 units                │
│ Discrepancy: -3 units (4.3% short)   ⚠️│
│                                         │
│ Details: [View Full Report]             │
│                                         │
│ Manager Notes:                          │
│ ┌─────────────────────────────────────┐ │
│ │ Will file insurance claim for       │ │
│ │ damaged units. Proceed to QC.       │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [✓ Approve] [✗ Reject]                  │
└─────────────────────────────────────────┘
```

---

## Database Schema Changes

### New Table: receiving_sessions
```sql
CREATE TABLE receiving_sessions (
  id BIGSERIAL PRIMARY KEY,
  shipment_id BIGINT REFERENCES shipments(id),
  session_number TEXT UNIQUE, -- RCV-2024-001
  started_by BIGINT REFERENCES users(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT, -- IN_PROGRESS, COMPLETED, PENDING_APPROVAL, APPROVED
  total_expected INTEGER,
  total_received INTEGER,
  total_discrepancy INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### New Table: receiving_size_details
```sql
CREATE TABLE receiving_size_details (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT REFERENCES receiving_sessions(id),
  product_size TEXT,
  expected_quantity INTEGER,
  received_quantity INTEGER,
  discrepancy INTEGER,
  status TEXT, -- NOT_STARTED, IN_PROGRESS, COMPLETED
  notes TEXT,
  scanned_barcodes JSONB, -- ["RIC000000005722", ...]
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### New Table: receiving_reports
```sql
CREATE TABLE receiving_reports (
  id BIGSERIAL PRIMARY KEY,
  report_number TEXT UNIQUE, -- RR-2024-001
  session_id BIGINT REFERENCES receiving_sessions(id),
  shipment_id BIGINT REFERENCES shipments(id),
  submitted_by BIGINT REFERENCES users(id),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by BIGINT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  status TEXT, -- PENDING, APPROVED, REJECTED
  manager_notes TEXT,
  report_data JSONB, -- Full report details
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## API Endpoints Needed

### 1. Start Receiving Session
```
POST /warehouse/receiving/:shipmentId/session/start
Response: { session_id, sizes: [...] }
```

### 2. Start Size Receiving
```
POST /warehouse/receiving/session/:sessionId/size/start
Body: { product_size: "120/80-18" }
Response: { size_detail_id, expected_quantity }
```

### 3. Scan Item for Size
```
POST /warehouse/receiving/session/:sessionId/size/:sizeDetailId/scan
Body: { barcode: "RIC000000005722" }
Response: { scanned_count, remaining_count }
```

### 4. Complete Size Receiving
```
POST /warehouse/receiving/session/:sessionId/size/:sizeDetailId/complete
Body: { notes: "2 units damaged" }
Response: { discrepancy, status }
```

### 5. Get Session Summary
```
GET /warehouse/receiving/session/:sessionId/summary
Response: { total_expected, total_received, total_discrepancy, sizes: [...] }
```

### 6. Submit for Approval
```
POST /warehouse/receiving/session/:sessionId/submit
Response: { report_id, report_number }
```

### 7. Manager Approve/Reject
```
POST /warehouse/receiving/report/:reportId/approve
Body: { approved: true, notes: "..." }
Response: { status, updated_shipment_status }
```

---

## Implementation Phases

### Phase 1: Database & Backend (Week 1)
- [ ] Create new tables
- [ ] Create API endpoints
- [ ] Add RLS policies
- [ ] Test APIs

### Phase 2: Frontend - Size Selection (Week 2)
- [ ] Size selection screen
- [ ] Start size receiving
- [ ] Show progress

### Phase 3: Frontend - Scanning (Week 3)
- [ ] Scan screen per size
- [ ] Quantity counter
- [ ] Barcode list
- [ ] Finish size button

### Phase 4: Frontend - Discrepancy (Week 4)
- [ ] Discrepancy calculation
- [ ] Discrepancy display
- [ ] Notes input
- [ ] Summary report

### Phase 5: Manager Approval (Week 5)
- [ ] Report generation
- [ ] Manager notification
- [ ] Approval UI
- [ ] Status updates

### Phase 6: Testing & Polish (Week 6)
- [ ] End-to-end testing
- [ ] Mobile responsiveness
- [ ] Error handling
- [ ] Documentation

---

## Questions to Resolve

1. **Overage Handling**: What if staff receives MORE than expected? (e.g., Expected: 14, Received: 16)
2. **Damaged Items**: Should damaged items be counted in "Received" quantity?
3. **Location Assignment**: When should locations be assigned? (Per size? After approval?)
4. **QC Batch Creation**: Should this create a QC batch automatically after approval?
5. **Partial Receiving**: Can staff partially receive a size and come back later?
6. **Multi-Staff**: Can multiple staff work on same shipment simultaneously?
7. **Manager Role**: Should this be role-based or user-specific approval?

---

## Estimated Time
- **Full Implementation**: 4-6 weeks
- **Quick Prototype**: 1-2 weeks (basic flow only)
- **MVP (Minimum Viable Product)**: 2-3 weeks

---

**Do you want me to proceed with implementation? If yes, should I:**
1. Start with Phase 1 (Database & Backend)?
2. Create a quick prototype first?
3. Focus on a specific phase?

Let me know your preference and answers to the questions above!
