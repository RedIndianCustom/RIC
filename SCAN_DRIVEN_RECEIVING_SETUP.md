# Scan-Driven Receiving Workflow - Setup Guide

## ✅ Completed Steps

### Frontend
- ✅ Created `ReceivingScanDriven.jsx` component
- ✅ Added route to AppRoutes.jsx: `/warehouse/receiving-scan`
- ✅ Implemented automatic barcode identification
- ✅ Added duplicate barcode prevention
- ✅ Built scan history tracking
- ✅ Created receiving summary and report submission

### Backend
- ✅ Created `receivingScanDrivenController.js` with 4 identification strategies
- ✅ Created `receivingScanDrivenRoutes.js` 
- ✅ Integrated routes into `app.js`
- ✅ Created database migration SQL file

## 🔧 Remaining Setup Steps

### 1. Create Database Table

You need to run the SQL migration to create the `receiving_reports` table.

**Option A: Using Supabase SQL Editor (Recommended)**

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Navigate to: **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of:
   ```
   backend/database/migrations/create_receiving_reports.sql
   ```
5. Click **Run** to execute the migration

**Option B: Using Migration Script**

```bash
cd backend
node run-receiving-reports-migration.mjs
```

### 2. Verify API Endpoints

The following endpoints should now be available:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/warehouse/receiving/identify-barcode` | Core product identification from barcode |
| POST | `/api/warehouse/receiving/start-session` | Start receiving session |
| POST | `/api/warehouse/receiving/submit-report` | Submit receiving report |
| POST | `/api/warehouse/validate-barcode-size` | Validate barcode matches expected size |

### 3. Test the Workflow

#### Access the Page
Navigate to: `http://localhost:5174/warehouse/receiving-scan`

#### Test Scenario
1. **Select a Shipment** - Must be in status: IN_TRANSIT, ARRIVED, or INSPECTING
2. **Scan Barcodes** - Use keyboard input or camera scanner
3. **Verify Auto-Identification** - System should automatically identify product/size
4. **Test Duplicate Prevention** - Try scanning same barcode twice
5. **Complete Receiving** - Click "Done Scanning"
6. **Review Summary** - Check product counts and discrepancies
7. **Submit Report** - Submit to manager

## 🔍 Barcode Identification Strategies

The system uses 4 strategies in priority order:

### Strategy 1: Direct Barcode Lookup
- Searches `products` table for exact barcode match
- Most reliable method

### Strategy 2: RIC Format Parsing
- Pattern: `RIC-BRAND-WIDTH-ASPECT-RIM-SERIAL`
- Example: `RIC-DSXT-90-90-19-TL-001234`
- Extracts size: `90/90-19`

### Strategy 3: Generic Tire Format
- Embedded tire size in barcode
- Pattern: `90/90-19` or `90-90-19`
- Flexible format matching

### Strategy 4: SKU Pattern Matching
- Checks if barcode contains product SKU
- Fallback method

## 📊 Features

### ✅ Implemented
- [x] Scan-first approach (no manual size selection)
- [x] Automatic product identification
- [x] Duplicate barcode detection
- [x] Scan history with timestamps
- [x] Real-time progress tracking
- [x] Discrepancy calculation
- [x] Camera scanner support
- [x] Audio feedback (success/error sounds)
- [x] Receiving report generation
- [x] Manager approval workflow for discrepancies

### 🎯 Workflow States

**1. Shipment Selection**
- Display all available shipments
- Filter by status

**2. Scanning Session**
- Active barcode scanning
- Real-time validation
- Progress tracking
- Duplicate prevention

**3. Review Summary**
- Size breakdown table
- Expected vs Received counts
- Discrepancy highlighting
- Optional notes

**4. Report Submission**
- Auto-approval if no discrepancies
- Manager approval required if discrepancies exist
- Shipment status update

## 🚨 Known Requirements

### Expected Items Must Be Registered
- Before receiving, shipment must have expected items registered
- This is done in Shipment Registration or Incoming Shipments
- Without expected items, the workflow will show an error

### Barcode Format
- Barcodes should follow one of the supported formats
- If using custom format, add to identification strategies in `receivingScanDrivenController.js`

## 🔐 Permissions

### Required Roles
- Warehouse Staff (WH)
- Warehouse Manager (M)
- Admin (A)

### RLS Policies
The `receiving_reports` table has RLS enabled with policies for:
- SELECT: Warehouse staff, managers, admins
- INSERT: Warehouse staff, admins
- UPDATE: Managers, admins (for approval/rejection)

## 📝 Database Schema

### `receiving_reports` Table

```sql
id                  BIGSERIAL PRIMARY KEY
shipment_id         BIGINT REFERENCES shipments(id)
session_id          VARCHAR(100)
submitted_by        UUID REFERENCES auth.users(id)
size_breakdown      JSONB  -- Array of product/size/counts
total_expected      INTEGER
total_scanned       INTEGER
total_discrepancy   INTEGER
notes               TEXT
scan_history        JSONB  -- Array of scan records
has_discrepancies   BOOLEAN
status              VARCHAR(50)  -- PENDING_APPROVAL, APPROVED, REJECTED
report_number       VARCHAR(100) UNIQUE
approved_by         UUID
approved_at         TIMESTAMPTZ
rejection_reason    TEXT
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
```

## 🧪 Testing Checklist

- [ ] Database table created successfully
- [ ] Backend server starts without errors
- [ ] Frontend route accessible
- [ ] Shipment list loads
- [ ] Can start receiving session
- [ ] Barcode identification works for all formats
- [ ] Duplicate detection prevents re-scanning
- [ ] Progress bar updates correctly
- [ ] Scan history displays properly
- [ ] Done scanning transitions to review
- [ ] Summary shows correct counts
- [ ] Can submit report successfully
- [ ] Discrepancies trigger manager approval
- [ ] No discrepancies auto-approve

## 🔗 Related Files

### Frontend
- `frontend/src/pages/dashboard/warehouse/ReceivingScanDriven.jsx`
- `frontend/src/routes/AppRoutes.jsx`

### Backend
- `backend/src/controllers/receivingScanDrivenController.js`
- `backend/src/routes/receivingScanDrivenRoutes.js`
- `backend/src/app.js`

### Database
- `backend/database/migrations/create_receiving_reports.sql`
- `backend/run-receiving-reports-migration.mjs`

## 📞 Support

If you encounter issues:
1. Check browser console for frontend errors
2. Check backend logs for API errors
3. Verify database table exists
4. Confirm expected items are registered for shipment
5. Test barcode format matches one of the supported patterns

## 🎉 Next Steps

After completing setup:
1. Run the database migration
2. Restart the backend server
3. Test the workflow end-to-end
4. Train warehouse staff on the new process
5. Monitor for any edge cases or new barcode formats

---

**Status**: Ready for testing after database migration
**Access URL**: http://localhost:5174/warehouse/receiving-scan
**Required Role**: Warehouse Staff, Manager, or Admin
