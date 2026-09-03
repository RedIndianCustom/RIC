# 🚀 Scan-Driven Receiving - Quick Start Guide

## ⚡ TL;DR - 3 Steps to Launch

### Step 1: Run SQL Migration (2 minutes)
1. Open Supabase Dashboard → SQL Editor
2. Copy/paste from: `backend/database/migrations/create_receiving_reports.sql`
3. Click Run

### Step 2: Restart Backend (30 seconds)
```bash
cd backend
npm start
```

### Step 3: Test It! (5 minutes)
Open: `http://localhost:5174/warehouse/receiving-scan`

---

## 📋 Complete SQL Migration (Copy This)

If you want to run it manually, here's the complete SQL:

```sql
-- Create receiving_reports table
CREATE TABLE IF NOT EXISTS receiving_reports (
  id BIGSERIAL PRIMARY KEY,
  shipment_id BIGINT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  session_id VARCHAR(100) NOT NULL,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  size_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_expected INTEGER NOT NULL DEFAULT 0,
  total_scanned INTEGER NOT NULL DEFAULT 0,
  total_discrepancy INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  scan_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  has_discrepancies BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
  report_number VARCHAR(100) UNIQUE NOT NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_receiving_reports_shipment_id ON receiving_reports(shipment_id);
CREATE INDEX idx_receiving_reports_status ON receiving_reports(status);
CREATE INDEX idx_receiving_reports_submitted_by ON receiving_reports(submitted_by);
CREATE INDEX idx_receiving_reports_has_discrepancies ON receiving_reports(has_discrepancies);
CREATE INDEX idx_receiving_reports_report_number ON receiving_reports(report_number);

-- Trigger
CREATE OR REPLACE FUNCTION update_receiving_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER receiving_reports_updated_at
  BEFORE UPDATE ON receiving_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_receiving_reports_updated_at();

-- RLS
ALTER TABLE receiving_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Warehouse staff can view receiving reports"
  ON receiving_reports FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_roles
      WHERE role_name IN ('warehouse_manager', 'warehouse_staff', 'admin', 'manager')
    )
  );

CREATE POLICY "Warehouse staff can create receiving reports"
  ON receiving_reports FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM user_roles
      WHERE role_name IN ('warehouse_manager', 'warehouse_staff', 'admin')
    )
  );

CREATE POLICY "Managers can update receiving reports"
  ON receiving_reports FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_roles
      WHERE role_name IN ('warehouse_manager', 'admin', 'manager')
    )
  );

GRANT ALL ON receiving_reports TO service_role;
GRANT USAGE, SELECT ON SEQUENCE receiving_reports_id_seq TO service_role;
```

---

## 🎯 What This Does

### Before (Manual Size Selection)
```
Staff: "Okay, I'm receiving 90/90-19 tires"
       [Selects 90/90-19 from dropdown]
       [Scans 10 tires]
       [Accidentally had 90/90-18 selected]
       → 10 tires now assigned to WRONG size!
```

### After (Scan-Driven)
```
Staff: [Scans tire barcode]
System: "✅ Identified: DSXT 90/90-19 (count: 1)"
Staff: [Scans another tire]
System: "✅ Identified: DSXT 90/90-19 (count: 2)"
Staff: [Scans wrong size by mistake]
System: "❌ Expected 90/90-19, scanned 90/90-18"
       → IMPOSSIBLE to assign to wrong size!
```

---

## 🧪 Test Scenarios

### ✅ Happy Path
1. Select shipment "SHP-001"
2. Scan 10 barcodes of correct products
3. All identified automatically
4. Click "Done Scanning"
5. Review shows: 10 expected, 10 received, 0 discrepancy
6. Submit → Auto-approved → Ready for QC

### ⚠️ Discrepancy Path
1. Select shipment "SHP-002"
2. Expected: 50 tires
3. Scan only 48 tires (2 missing)
4. Click "Done Scanning"
5. Review shows: 50 expected, 48 received, -2 discrepancy
6. Add note: "2 tires damaged in container"
7. Submit → Pending Manager Approval

### 🚫 Error Cases to Test
- **Duplicate**: Scan same barcode twice → Should block with warning
- **Wrong Shipment**: Scan tire not in this shipment → Should flag
- **Invalid Barcode**: Scan unknown barcode → Should reject
- **Already Scanned**: Try to re-scan completed tire → Should prevent

---

## 📱 User Interface Preview

```
┌─────────────────────────────────────────────────┐
│  Receiving: SHP-12345        [Done Scanning] ●  │
├─────────────────────────────────────────────────┤
│  Progress: 42 of 50 tires scanned (84%)        │
│  ████████████████░░░░░░░                        │
├─────────────────────────────────────────────────┤
│  Scan Barcode                                   │
│  [____________________] [📷 Camera]             │
├─────────────────────────────────────────────────┤
│  Recent Scans (42)                              │
│  ✅ RIC-DSXT-90-90-19-001234 DSXT 90/90-19     │
│  ✅ RIC-DSXT-90-90-19-001235 DSXT 90/90-19     │
│  ⚠️  RIC-DSXT-90-90-18-001236 Wrong shipment   │
│  ✅ RIC-DSXT-90-90-19-001237 DSXT 90/90-19     │
└─────────────────────────────────────────────────┘
```

---

## 🎓 Training Script for Warehouse Staff

**"Hey team, we have a new receiving process that's much easier!"**

### Old Way Was:
1. Pick size from dropdown
2. Scan all tires of that size
3. Pick next size
4. Scan all those tires
5. **Problem**: If you pick wrong size, all tires are mis-labeled!

### New Way Is:
1. Just scan the tire
2. Screen tells you what it is automatically
3. **That's it!** No dropdowns, no size selection

### What to watch for:
- **Green ✅** = Good scan, keep going
- **Yellow ⚠️** = Already scanned that one (duplicate)
- **Red ❌** = Wrong barcode or wrong shipment

### When you're done:
- Click "Done Scanning"
- Check the summary (should match what you received)
- Add notes if anything is weird
- Submit

---

## 🔧 Troubleshooting

| Error | Solution |
|-------|----------|
| "No expected items found" | Shipment needs to be registered first with expected items |
| "Barcode not recognized" | Add barcode to products table or update parsing logic |
| Page won't load | Check backend is running on port 4000 |
| Camera won't start | Check browser permissions for camera access |
| Can't submit report | Check database table `receiving_reports` exists |

---

## 📊 Success Metrics

After 1 week, track:
- **Receiving accuracy**: Should be 95%+ (vs ~80% with manual selection)
- **Time per tire**: Should be 10-15 seconds (vs 20-30 seconds)
- **Duplicate attempts**: Should decrease as staff learn system
- **Manager approval rate**: Should be <10% of shipments

---

## ✅ Checklist

Before going live:
- [ ] SQL migration executed successfully
- [ ] Backend server restarted
- [ ] Can access `/warehouse/receiving-scan` page
- [ ] Tested with real barcode scanner
- [ ] Tested camera scanner
- [ ] Tested duplicate prevention
- [ ] Tested discrepancy workflow
- [ ] Trained warehouse staff
- [ ] Created manager approval process

---

**Questions?** Check:
- Full setup: `SCAN_DRIVEN_RECEIVING_SETUP.md`
- Technical details: `SCAN_DRIVEN_RECEIVING_SUMMARY.md`
- This quick start: `QUICK_START.md`

**Status**: 🟢 Ready to deploy after SQL migration

**URL**: http://localhost:5174/warehouse/receiving-scan
