# Fix Warehouse Display Issue - Step by Step Guide

## Problem
- WH1 is missing from the warehouse dropdown
- WH1 and WH2 are showing as location codes instead of warehouses
- The "Warehouse" column shows "N/A"

## Root Cause
WH1 and WH2 were incorrectly created in the `warehouse_locations` table. They should be in the `warehouses` table instead.

## Solution - Run These Scripts in Order

### Step 1: Clean up old test data
**File:** `019_cleanup_old_warehouse_locations.sql`

```sql
-- This removes old test/sample location data
-- Keeps WH1, WH2, and any locations you created through the form
```

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `019_cleanup_old_warehouse_locations.sql`
4. Click "Run"

### Step 2: Move WH1 and WH2 to correct table
**File:** `020_fix_warehouses_properly.sql`

```sql
-- This:
-- 1. Removes WH1 and WH2 from warehouse_locations
-- 2. Adds them to warehouses table (correct location)
-- 3. Keeps all your created locations intact
```

1. In Supabase SQL Editor
2. Copy and paste the contents of `020_fix_warehouses_properly.sql`
3. Click "Run"

## After Running Scripts

### Expected Results:

1. **Warehouses table** should have:
   - WH1 - Main Warehouse
   - WH2 - Second Warehouse

2. **Warehouse_locations table** should have:
   - Only actual storage locations (e.g., WH2-LOC-627691)
   - NO entries with code 'WH1' or 'WH2'

3. **Frontend should show:**
   - Both WH1 and WH2 in the warehouse dropdown
   - "Warehouse" column displaying correctly (WH1, WH2)
   - "Rack Type" showing product categories
   - "Configuration" showing rack structure

### Refresh the Page
After running both scripts, refresh your browser and:
1. Click "Add Location"
2. You should see both WH1 and WH2 in the warehouse dropdown
3. Create a new location to test

## Data Structure (Reference)

### warehouses table (main warehouse buildings)
```
code | name              | location
-----|-------------------|------------------------
WH1  | Main Warehouse    | Building 1 - North Zone
WH2  | Second Warehouse  | Building 2 - South Zone
```

### warehouse_locations table (storage positions)
```
code            | zone | name                   | aisle | rack | shelf | capacity
----------------|------|------------------------|-------|------|-------|----------
WH1-LOC-123456  | WH1  | WH1 - Sawtooth 90/90   | 02    | 04   | 06    | 100
WH2-LOC-627691  | WH2  | WH2 - Dual Sport 130/80| 02    | 04   | 06    | 150
```

## Troubleshooting

### If WH1 or WH2 still don't appear:
1. Check if they exist in warehouses table:
   ```sql
   SELECT * FROM warehouses WHERE code IN ('WH1', 'WH2');
   ```

2. If empty, run `020_fix_warehouses_properly.sql` again

### If you see duplicate entries:
```sql
-- Remove duplicates from warehouse_locations
DELETE FROM warehouse_locations WHERE code IN ('WH1', 'WH2');
```

## Summary
✅ Script 019: Cleans old test data  
✅ Script 020: Moves WH1/WH2 to correct table  
✅ Frontend: Will display warehouses properly  
✅ Locations: Can be created with proper warehouse assignment  
