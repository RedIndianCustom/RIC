# Fix: Manager Cannot See Completed QC Inspections

## Problem

Manager's QC Inspection Approval page shows:
> "No completed QC inspections awaiting approval"

Even though warehouse staff has completed QC inspections and sent them for approval.

## Root Cause

The issue had **three layers**:

### 1. Database View Issue
- The `pending_qc_inspections` view only includes statuses: `'PENDING', 'IN_PROGRESS', 'OVERDUE'`
- It **DOES NOT** include `'COMPLETED'` status
- So completed inspections never appeared in the query results

### 2. Frontend Using Wrong Endpoint
- Manager page was calling `/qc-inspection/pending/all`
- Then trying to filter for `status === 'COMPLETED'`
- But the view never returned completed inspections in the first place

### 3. No Dedicated Endpoint
- There was no specific endpoint for "completed inspections awaiting manager approval"
- The system conflated "pending work" with "awaiting approval"

## Solution Implemented

### 1. Created New Database View
**File:** `backend/database/011_fix_qc_manager_approval.sql`

```sql
CREATE OR REPLACE VIEW qc_inspections_awaiting_approval AS
SELECT 
  qi.id,
  qi.inspection_number,
  qi.shipment_id,
  s.shipment_number,
  qi.status,
  qi.total_items,
  qi.good_quality_count,
  qi.minor_defect_count,
  qi.major_defect_count,
  qi.good_quality_percentage,
  -- ... all relevant fields
FROM qc_inspections qi
LEFT JOIN shipments s ON s.id = qi.shipment_id
LEFT JOIN users inspector ON inspector.id = qi.inspector_id
WHERE qi.status = 'COMPLETED' 
  AND (qi.manager_decision IS NULL OR qi.manager_decision = 'PENDING')
ORDER BY qi.inspection_end_date ASC;
```

**Key Features:**
- Only shows `COMPLETED` inspections
- Only shows inspections where `manager_decision` is `NULL` or `PENDING`
- Includes all necessary fields for manager review
- Sorted by completion date (oldest first)

### 2. Added New Backend Endpoint
**File:** `backend/src/controllers/receivingQcController.js`

```javascript
export const getCompletedQcInspections = async (req, res) => {
  try {
    console.log('📋 Fetching completed QC inspections awaiting approval...');
    
    // Try to use the view first
    const { data: viewData, error: viewError } = await supabase
      .from('qc_inspections_awaiting_approval')
      .select('*')
      .order('inspection_end_date', { ascending: true });

    if (!viewError && viewData) {
      return res.json({ success: true, data: viewData });
    }

    // Fallback: query table directly if view not available
    const { data, error } = await supabase
      .from('qc_inspections')
      .select(/* ... full fields ... */)
      .eq('status', 'COMPLETED')
      .or('manager_decision.is.null,manager_decision.eq.PENDING')
      .order('inspection_end_date', { ascending: true });

    res.json({ success: true, data: formattedData });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: error.message });
  }
};
```

**Key Features:**
- Tries to use the new view first (faster)
- Falls back to direct table query if view doesn't exist
- Includes comprehensive logging
- Returns properly formatted data

### 3. Added New Route
**File:** `backend/src/routes/receivingQcRoutes.js`

```javascript
router.get('/qc-inspection/completed/all', getCompletedQcInspections);
```

### 4. Updated Frontend
**File:** `frontend/src/pages/dashboard/manager/QCApproval.jsx`

```javascript
const loadCompletedInspections = async () => {
  try {
    setLoading(true);
    console.log('📋 Fetching completed QC inspections for manager approval...');
    
    // Use the new endpoint specifically for completed inspections
    const { data } = await api.get('/receiving-qc/qc-inspection/completed/all');
    
    console.log('✅ Received response:', data);
    console.log('✅ Inspections count:', data.data?.length || 0);
    
    setInspections(data.data || []);
  } catch (error) {
    console.error('❌ Error loading inspections:', error);
    setAlert({ type: 'error', message: 'Failed to load inspections' });
  } finally {
    setLoading(false);
  }
};
```

**Key Changes:**
- Changed from `/pending/all` to `/completed/all`
- Removed client-side filtering
- Added better logging
- Cleaner error handling

## Files Modified

1. ✅ `backend/database/011_fix_qc_manager_approval.sql` - New database view
2. ✅ `backend/src/controllers/receivingQcController.js` - New endpoint function
3. ✅ `backend/src/routes/receivingQcRoutes.js` - New route registration
4. ✅ `frontend/src/pages/dashboard/manager/QCApproval.jsx` - Updated to use new endpoint

## How to Apply Fix

### Step 1: Apply Database Changes

Run the SQL script in Supabase SQL Editor:

```bash
# Copy the contents of this file:
backend/database/011_fix_qc_manager_approval.sql

# Paste and execute in Supabase Dashboard → SQL Editor
```

This will:
- Create the new `qc_inspections_awaiting_approval` view
- Update the `pending_qc_inspections` view (warehouse staff)
- Add RLS policies for managers
- Run verification queries

### Step 2: Restart Backend

```bash
cd backend

# Stop the current server (Ctrl+C)

# Restart
npm start
# or
node src/app.js
```

### Step 3: Refresh Frontend

- Hard refresh browser: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Or restart frontend dev server

## Testing Instructions

### Test 1: Complete a QC Inspection (Warehouse Staff)

1. **Login as Warehouse Staff**
2. **Navigate to:** Warehouse → QC Inspection
3. **Start an inspection** on a pending shipment
4. **Scan barcodes** and classify items:
   - Good quality items
   - Minor defects
   - Major defects
5. **Complete the inspection**
6. **Verify** status changes to `COMPLETED`

### Test 2: View in Manager Dashboard

1. **Login as Manager**
2. **Navigate to:** Operations → QC Inspection Approval
3. **Expected Result:**
   ```
   ✅ You should see the completed inspection
   ✅ Summary cards show:
      - Pending Approval: 1 (or more)
      - Good Quality: X items
      - Minor Defects: X items
      - Major Defects: X items
   ```

4. **Click "Review"** on the inspection
5. **Verify you can see:**
   - Inspection details
   - All inspected items
   - Quality classifications
   - Inspector notes
   - Manager decision form

### Test 3: Approve Inspection

1. **Select Decision:** "Approve All"
2. **Add Manager Notes** (optional)
3. **Click "Submit Decision"**
4. **Expected Result:**
   ```
   ✅ Success message: "QC inspection approved! Stock will be allocated automatically."
   ✅ Inspection disappears from approval list
   ✅ Stock allocated:
      - Good items → Available inventory
      - Minor defects → Defect sellable inventory
      - Major defects → Return to supplier
   ```

## Verification Queries

Run these in Supabase SQL Editor to verify data:

### Check Completed Inspections

```sql
-- See all completed inspections
SELECT 
  inspection_number,
  shipment_number,
  status,
  items_inspected,
  good_quality_count,
  minor_defect_count,
  major_defect_count,
  manager_decision,
  inspection_end_date
FROM qc_inspections
WHERE status = 'COMPLETED'
ORDER BY inspection_end_date DESC;
```

### Check Awaiting Approval

```sql
-- See inspections awaiting manager approval
SELECT * FROM qc_inspections_awaiting_approval;
```

### Check Pending for Warehouse

```sql
-- See pending work for warehouse staff
SELECT * FROM pending_qc_inspections;
```

## Debugging

### If Manager Still Sees Empty List

**Check 1: Is there actually a completed inspection?**
```sql
SELECT COUNT(*) FROM qc_inspections WHERE status = 'COMPLETED';
```

**Check 2: Is manager_decision already set?**
```sql
SELECT 
  inspection_number,
  status,
  manager_decision,
  manager_reviewed_at
FROM qc_inspections
WHERE status = 'COMPLETED';
```

**Check 3: Does the view return data?**
```sql
SELECT COUNT(*) FROM qc_inspections_awaiting_approval;
```

**Check 4: Backend logs**
Look for these in your backend console:
```
📋 Fetching completed QC inspections awaiting approval...
✅ Found X inspections awaiting approval (from view)
```

**Check 5: Frontend logs**
Open browser console (F12) and look for:
```
📋 Fetching completed QC inspections for manager approval...
✅ Received response: {success: true, data: [...]}
✅ Inspections count: X
```

### If View Doesn't Exist

The backend will automatically fall back to direct table queries, but you should still create the view:

```sql
-- Run the full script
\i backend/database/011_fix_qc_manager_approval.sql
```

### If RLS Blocks Access

Check user has manager role:
```sql
SELECT 
  u.email,
  u.full_name,
  r.name as role_name
FROM users u
INNER JOIN user_roles ur ON ur.user_id = u.id
INNER JOIN roles r ON r.id = ur.role_id
WHERE u.email = 'your-manager-email@example.com';
```

Should return role: `manager` or `admin`

## Architecture Changes

### Before Fix
```
Warehouse Staff
    ↓ Completes QC Inspection
    ↓ Status = 'COMPLETED'
    
Manager Dashboard
    ↓ Calls /qc-inspection/pending/all
    ↓ Queries: pending_qc_inspections view
    ↓ View filters: status IN ('PENDING', 'IN_PROGRESS', 'OVERDUE')
    ↓ COMPLETED inspections NOT included ❌
    ↓ Result: Empty list
```

### After Fix
```
Warehouse Staff
    ↓ Completes QC Inspection
    ↓ Status = 'COMPLETED'
    ↓ manager_decision = NULL
    
Manager Dashboard
    ↓ Calls /qc-inspection/completed/all ✨ NEW
    ↓ Queries: qc_inspections_awaiting_approval view ✨ NEW
    ↓ View filters: status = 'COMPLETED' 
    ↓               AND manager_decision IS NULL
    ↓ Result: Shows all pending approvals ✅
```

## Benefits

1. **Clear Separation of Concerns**
   - Warehouse staff sees: Work to do (PENDING/IN_PROGRESS)
   - Manager sees: Approvals needed (COMPLETED)

2. **Better Performance**
   - Dedicated view with proper indexes
   - No client-side filtering needed

3. **Easier Maintenance**
   - Clear API endpoints
   - Proper separation between roles

4. **Better Debugging**
   - Comprehensive logging
   - Clear error messages

5. **Future-Proof**
   - Easy to add more filtering
   - Easy to add pagination
   - Easy to add sorting options

## Related Issues

This fix also helps with:
- Notification workflow (managers get notified of completed inspections)
- Stock allocation workflow (triggers after manager approval)
- Audit trail (tracks who approved what and when)

## Success Criteria

✅ Manager can see completed QC inspections  
✅ Inspections show correct item counts  
✅ Manager can review all inspection details  
✅ Manager can approve/reject inspections  
✅ Approved inspections allocate stock correctly  
✅ Inspections disappear from list after approval  

---

**Created:** 2026-08-19  
**Issue:** Manager cannot see completed QC inspections  
**Status:** Fixed ✅  
**Version:** 1.0
