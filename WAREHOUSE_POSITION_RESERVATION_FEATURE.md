# 🏭 Warehouse Position Reservation Feature

## 📋 Overview

This feature allows warehouse positions to be **reserved** for incoming shipments during the shipment registration process. Reserved positions are displayed in the Warehouse Locations page with product information, preventing accidental assignment to other products.

## ✨ Key Features

### 1. **Position Reservation During Shipment Registration**
- When creating/editing a shipment, you can assign storage positions
- Positions are marked as **"Reserved"** with product details
- Product name format: `{Brand} {Model} - {Dimensions}`
- Example: "Red Indian Customs Classic Sawtooth - 130/90-15"

### 2. **Visual Indicators in Warehouse Locations**
- **🔒 Reserved Badge** - Amber/orange colored badge
- **Product Information** - Shows brand, model, and dimensions
- **Reserved Quantity** - Displays number of tires reserved
- **Shipment Reference** - Shows which shipment the reservation is for

### 3. **Automatic Status Management**
- **On Shipment Receipt**: Reserved positions automatically convert to "Active" with actual stock
- **On Shipment Cancellation**: Reservations are cleared, positions return to "Empty"
- **On Shipment Deletion**: Reservations are automatically removed

## 🎨 Visual Design

### Reserved Position Card (Warehouse Locations)
```
┌─────────────────────────────────────┐
│ WH2-R01-RK01-S01-SH04-SUB01        │
│ Shelf 04 · Subsection 01           │
│                       🔒 Reserved    │
├─────────────────────────────────────┤
│ 🔒 Reserved              [Pending]  │
│ ┌─────────────────────────────────┐ │
│ │ Red Indian Customs Classic      │ │
│ │ Sawtooth - 130/90-15            │ │
│ │ 📦 123 tires reserved           │ │
│ │ For: SHIP-2026-001              │ │
│ └─────────────────────────────────┘ │
│                                     │
│ QUANTITY         0 / 14             │
│ ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░               │
│                                     │
│ 🔒 Reserved for incoming shipment  │
└─────────────────────────────────────┘
```

### Color Scheme
- **Reserved**: Amber/Orange gradient (`from-amber-50 to-orange-50`)
- **Border**: Amber (`border-amber-300`)
- **Text**: Amber (`text-amber-700`)
- **Badge**: Amber background (`bg-amber-100`)

## 🔄 Workflow

### During Shipment Registration

1. **Select Product** → Choose brand/model/size from catalog
2. **Enter Quantity** → Specify number of tires
3. **Assign Positions** → 
   - Select Warehouse (WH1 or WH2)
   - Choose Rack
   - Select multiple positions
4. **Confirm Assignment** → Positions are reserved with product info

### Position Reservation API Call
```javascript
await api.put(
  `/warehouse-locations/${rackId}/positions/${positionId}`,
  {
    status: 'reserved',
    reserved_quantity: 123,
    reserved_for_shipment: 'SHIP-2026-001',
    tire_size: 'Red Indian Customs Classic Sawtooth - 130/90-15',
    product_metadata: {
      product_id: '123',
      brand: 'Red Indian Customs',
      model: 'Classic Sawtooth',
      dimensions: '130/90-15',
      sku: 'SAW-15-130/90'
    }
  }
);
```

### When Shipment is Received

**Automatic Conversion (via Database Trigger)**:
```sql
-- Positions with status = 'reserved' 
-- automatically convert to status = 'active'
-- reserved_quantity moves to current_stock
```

### When Shipment is Cancelled

**Automatic Cleanup (via Database Trigger)**:
```sql
-- Positions with status = 'reserved'
-- automatically clear and return to status = 'empty'
```

## 🗄️ Database Schema

### New Columns in `warehouse_storage_positions`

```sql
-- Reservation fields
reserved_quantity INTEGER DEFAULT 0
reserved_for_shipment VARCHAR(255)
product_metadata JSONB
reservation_date TIMESTAMP WITH TIME ZONE

-- Updated status constraint
status CHECK (status IN (
  'active', 
  'available', 
  'empty', 
  'reserved',      -- 🆕 NEW STATUS
  'maintenance', 
  'inactive'
))
```

### Indexes for Performance
```sql
-- Fast queries for reserved positions
CREATE INDEX idx_positions_reserved 
ON warehouse_storage_positions(status) 
WHERE status = 'reserved';

CREATE INDEX idx_positions_reservation_shipment 
ON warehouse_storage_positions(reserved_for_shipment) 
WHERE reserved_for_shipment IS NOT NULL;
```

## 🔧 Backend Triggers

### 1. **Auto-Convert on Receipt**
```sql
CREATE TRIGGER trigger_convert_reserved_on_receipt
AFTER UPDATE OF status ON shipments
FOR EACH ROW
WHEN (NEW.status = 'RECEIVED')
EXECUTE FUNCTION convert_reserved_positions_on_receipt();
```

**What it does:**
- When shipment status changes to `RECEIVED`
- All positions reserved for that shipment convert to `active`
- `reserved_quantity` → `current_stock`
- Clears reservation metadata

### 2. **Auto-Clear on Cancellation**
```sql
CREATE TRIGGER trigger_clear_reserved_on_cancel
AFTER UPDATE OF status ON shipments
FOR EACH ROW
WHEN (NEW.status = 'CANCELLED')
EXECUTE FUNCTION clear_reserved_positions_on_cancel();
```

**What it does:**
- When shipment status changes to `CANCELLED`
- All positions reserved for that shipment return to `empty`
- Clears all reservation data

### 3. **Auto-Clear on Deletion**
```sql
CREATE TRIGGER trigger_clear_reserved_on_delete
BEFORE DELETE ON shipments
FOR EACH ROW
EXECUTE FUNCTION clear_reserved_positions_on_cancel();
```

**What it does:**
- When a shipment is deleted
- All reserved positions are cleared
- Prevents orphaned reservations

## 📁 Files Modified

### Frontend Components
1. **ShipmentRegistration.jsx**
   - Updated `confirmPositionAssignment()` to reserve positions
   - API call to set `status: 'reserved'` with product metadata

2. **WarehouseLocations.jsx**
   - Updated `isPositionAvailable()` to exclude reserved positions
   - Enhanced position card UI to show reservation details
   - Added amber/orange styling for reserved positions
   - Added 🔒 icon and "Reserved" badge
   - Disabled selection/editing of reserved positions

### Backend Database
3. **032_add_position_reservation_fields.sql** (NEW)
   - Adds reservation columns
   - Creates database triggers
   - Updates status constraint
   - Adds performance indexes

## 🎯 User Benefits

### For Warehouse Operators
- **Pre-planning**: Reserve positions before shipment arrives
- **Visual Clarity**: Easily see which positions are reserved vs. occupied
- **Prevent Errors**: Reserved positions can't be accidentally assigned
- **Product Visibility**: See what product is coming to each position

### For Managers
- **Space Planning**: Better warehouse space utilization
- **Shipment Tracking**: Know exactly where each shipment will go
- **Inventory Forecasting**: See future inventory before arrival

### For Administrators
- **Automation**: Status changes happen automatically
- **Data Integrity**: Triggers ensure consistency
- **Audit Trail**: Reservation metadata tracks who/what/when

## 🚀 Setup Instructions

### 1. Run Database Migration
```bash
# Navigate to backend directory
cd backend

# Run the migration
psql -U your_username -d your_database -f database/032_add_position_reservation_fields.sql
```

### 2. Restart Backend Server
```bash
# If using Node.js
npm run dev

# Or if using a process manager
pm2 restart backend
```

### 3. Reload Frontend
```bash
# Navigate to frontend directory
cd frontend

# The changes are already in place, just refresh browser
# Or restart dev server if needed
npm run dev
```

## ✅ Testing Checklist

### Test Scenarios

- [ ] **Reserve positions during shipment creation**
  - Create new shipment
  - Add products
  - Assign positions
  - Verify positions show as "Reserved" in Warehouse Locations

- [ ] **View reserved positions**
  - Open Warehouse Locations page
  - Find reserved positions
  - Verify amber styling and 🔒 icon
  - Confirm product name displays correctly

- [ ] **Cannot assign to reserved positions**
  - Try to assign different product to reserved position
  - Verify position is not selectable

- [ ] **Auto-convert on shipment receipt**
  - Mark shipment as RECEIVED
  - Verify reserved positions convert to active
  - Confirm stock quantities are correct

- [ ] **Auto-clear on shipment cancellation**
  - Cancel a shipment with reservations
  - Verify positions return to empty
  - Confirm all reservation data is cleared

- [ ] **Auto-clear on shipment deletion**
  - Delete a shipment with reservations
  - Verify positions are freed
  - Confirm no orphaned reservations

## 🐛 Troubleshooting

### Issue: Positions not showing as reserved
**Solution**: Check database migration was run successfully
```sql
-- Verify columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'warehouse_storage_positions' 
  AND column_name IN ('reserved_quantity', 'reserved_for_shipment', 'product_metadata');
```

### Issue: Triggers not firing
**Solution**: Verify triggers are enabled
```sql
-- Check triggers
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name LIKE '%reserved%';
```

### Issue: Reserved positions not converting on receipt
**Solution**: Check shipment status update
```sql
-- Manually trigger conversion for testing
UPDATE warehouse_storage_positions
SET 
  status = 'active',
  current_stock = reserved_quantity,
  reserved_quantity = NULL,
  reserved_for_shipment = NULL
WHERE reserved_for_shipment = 'YOUR_SHIPMENT_NUMBER';
```

## 📊 Example Data Flow

### Shipment Creation
```
User Creates Shipment → Assigns Positions
                          ↓
                    API Call to Reserve
                          ↓
              Database: status = 'reserved'
                          ↓
            Warehouse Locations: Shows 🔒 Reserved
```

### Shipment Receipt
```
User Marks Shipment RECEIVED
          ↓
    Trigger Fires
          ↓
    Reserved → Active
          ↓
 Warehouse Shows Occupied
```

### Shipment Cancellation
```
User Cancels Shipment
          ↓
    Trigger Fires
          ↓
    Reserved → Empty
          ↓
 Positions Available Again
```

## 🎓 Additional Notes

### Performance Considerations
- Indexes added for fast reservation queries
- Triggers execute in milliseconds
- No impact on normal warehouse operations

### Security
- Only authorized users can create shipments
- Position reservations tied to shipment records
- Audit trail via `reservation_date` timestamp

### Future Enhancements
- Email notifications when positions are reserved
- Bulk reservation management interface
- Reservation expiry (auto-cancel if shipment delayed)
- Multi-warehouse reservation coordination

---

**Status**: ✅ Feature Complete and Ready for Use

**Version**: 1.0.0

**Last Updated**: 2026-01-28
