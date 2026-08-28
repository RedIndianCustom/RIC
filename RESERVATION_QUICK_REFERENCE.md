# Reservation Quick Reference Guide

## 🚀 Quick Actions

### 1. Delete ALL WH2 Reservations (RIGHT NOW)
```sql
-- Run this script:
backend/database/034_delete_wh2_reservations.sql
```

### 2. View All Current Reservations
```sql
SELECT * FROM v_all_reservations;
```

### 3. Clear All Orphaned Reservations
```sql
SELECT * FROM clear_orphaned_reservations();
```

### 4. Clear Specific Warehouse
```sql
-- Clear WH2
SELECT * FROM clear_warehouse_reservations('WH2');

-- Clear WH1
SELECT * FROM clear_warehouse_reservations('WH1');
```

## 📊 Available Views

### View 1: All Reservations
```sql
SELECT * FROM v_all_reservations;
```
Shows:
- Position details (warehouse, rack, position code)
- Product information
- Shipment number
- Reservation date
- Days reserved
- Shipment status

### View 2: Reservations by Warehouse
```sql
SELECT * FROM v_reservations_by_warehouse;
```
Shows:
- Warehouse code
- Total reserved positions
- Total tires reserved
- Oldest/newest reservation dates

### View 3: Orphaned Reservations
```sql
SELECT * FROM v_orphaned_reservations;
```
Shows reservations that don't have valid shipments:
- "Pending Shipment" (test data)
- Missing shipment numbers
- Deleted shipments

## 🛠️ Management Functions

### Function 1: Clear Orphaned Reservations
```sql
-- Clear all reservations without valid shipments
SELECT * FROM clear_orphaned_reservations();

-- Returns:
-- cleared_count | message
-- --------------|---------------------------
-- 42            | ✅ Cleared 42 orphaned...
```

### Function 2: Clear by Warehouse
```sql
-- Clear ALL reservations in WH2
SELECT * FROM clear_warehouse_reservations('WH2');

-- Clear ALL reservations in WH1
SELECT * FROM clear_warehouse_reservations('WH1');
```

### Function 3: Clear by Shipment
```sql
-- Clear reservations for specific shipment
SELECT * FROM clear_shipment_reservations('SHIP-2026-001');
```

### Function 4: Clear Single Position
```sql
-- Clear one specific position
SELECT * FROM clear_position_reservation('position-uuid-here');
```

## 📋 Common Use Cases

### Use Case 1: Clear All Test Reservations
```sql
-- Step 1: View orphaned reservations
SELECT * FROM v_orphaned_reservations;

-- Step 2: Clear them
SELECT * FROM clear_orphaned_reservations();
```

### Use Case 2: Clear Entire Warehouse
```sql
-- WH2 is being reorganized, clear all reservations
SELECT * FROM clear_warehouse_reservations('WH2');
```

### Use Case 3: Cancel Specific Shipment
```sql
-- Shipment was cancelled, release positions
SELECT * FROM clear_shipment_reservations('SHIP-2026-001');
```

### Use Case 4: Daily Cleanup
```sql
-- Every morning, clear orphaned reservations
SELECT * FROM clear_orphaned_reservations();

-- Check summary
SELECT * FROM v_reservations_by_warehouse;
```

## 🔍 Checking Before Deleting

### Check What Will Be Deleted

#### Before clearing orphaned:
```sql
SELECT * FROM v_orphaned_reservations;
```

#### Before clearing warehouse:
```sql
SELECT * FROM v_all_reservations 
WHERE warehouse_code = 'WH2';
```

#### Before clearing shipment:
```sql
SELECT * FROM v_all_reservations 
WHERE shipment_number = 'SHIP-2026-001';
```

## 📦 Installation

### 1. Install Reservation Management System
```bash
# Run this SQL script first:
backend/database/035_reservation_management_system.sql
```

This creates:
- ✅ 3 Views (v_all_reservations, v_reservations_by_warehouse, v_orphaned_reservations)
- ✅ 4 Functions (clear functions)
- ✅ 1 History table (optional audit trail)

### 2. Delete WH2 Reservations
```bash
# Then run this to clear WH2:
backend/database/034_delete_wh2_reservations.sql
```

## 💡 Tips & Best Practices

### Daily Maintenance
```sql
-- Morning routine:
SELECT * FROM clear_orphaned_reservations();
```

### Before Inventory Count
```sql
-- Clear all reservations to see real stock
SELECT * FROM clear_warehouse_reservations('WH1');
SELECT * FROM clear_warehouse_reservations('WH2');
```

### Check Reservation Age
```sql
-- Find old reservations (>7 days)
SELECT * FROM v_all_reservations 
WHERE days_reserved > 7
ORDER BY days_reserved DESC;
```

### Monitor Warehouse Capacity
```sql
-- See how many positions are tied up
SELECT * FROM v_reservations_by_warehouse;
```

## 🚨 Important Notes

### What Gets Cleared
When you clear a reservation:
- ✅ status → 'empty'
- ✅ current_stock → 0
- ✅ tire_size → NULL
- ✅ reserved_quantity → NULL
- ✅ reserved_for_shipment → NULL
- ✅ product_metadata → NULL
- ✅ reservation_date → NULL
- ✅ updated_at → NOW()

### What Doesn't Get Cleared
- ❌ Shipment records (unchanged)
- ❌ Position capacity (unchanged)
- ❌ Warehouse structure (unchanged)

### Safe Operations
All clear functions are **safe**:
- Only affect positions with status = 'reserved'
- Don't delete position records
- Don't affect active inventory
- Don't modify shipments

## 🎯 Your Immediate Action

### To Clear WH2 Right Now:

**Option 1: Use SQL Script (Recommended)**
```bash
Run file: backend/database/034_delete_wh2_reservations.sql
```

**Option 2: Use Function (After installing system)**
```sql
-- First install:
Run file: backend/database/035_reservation_management_system.sql

-- Then clear WH2:
SELECT * FROM clear_warehouse_reservations('WH2');
```

**Option 3: Manual SQL**
```sql
UPDATE warehouse_storage_positions wsp
SET 
  status = 'empty',
  current_stock = 0,
  tire_size = NULL,
  reserved_quantity = NULL,
  reserved_for_shipment = NULL,
  product_metadata = NULL,
  reservation_date = NULL,
  updated_at = NOW()
FROM warehouse_locations wl
WHERE wsp.warehouse_location_id = wl.id
  AND wl.warehouse_code = 'WH2'
  AND wsp.status = 'reserved';
```

## 📞 Quick Commands Summary

```sql
-- View all reservations
SELECT * FROM v_all_reservations;

-- View by warehouse
SELECT * FROM v_reservations_by_warehouse;

-- View orphaned (safe to delete)
SELECT * FROM v_orphaned_reservations;

-- Clear orphaned
SELECT * FROM clear_orphaned_reservations();

-- Clear WH2
SELECT * FROM clear_warehouse_reservations('WH2');

-- Clear WH1
SELECT * FROM clear_warehouse_reservations('WH1');

-- Clear specific shipment
SELECT * FROM clear_shipment_reservations('SHIP-2026-001');

-- Clear single position
SELECT * FROM clear_position_reservation('uuid-here');
```

---

**Files Created:**
1. ✅ `034_delete_wh2_reservations.sql` - Immediate WH2 cleanup
2. ✅ `035_reservation_management_system.sql` - Complete management system
3. ✅ `RESERVATION_QUICK_REFERENCE.md` - This guide

**Status:** Ready to use
**Updated:** August 26, 2026
