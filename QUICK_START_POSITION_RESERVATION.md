# 🚀 Quick Start: Position Reservation Feature

## Step-by-Step Guide

### 1️⃣ Run Database Migration (REQUIRED FIRST!)

```bash
# Navigate to backend directory
cd backend

# Run the migration to add reservation fields
psql -U postgres -d your_database_name -f database/032_add_position_reservation_fields.sql

# You should see:
# ✅ Position reservation fields added successfully
# 📊 Current schema: ...
# 🔄 Auto-conversion triggers: ...
```

**Alternative (if using migration script):**
```bash
node run-migration.js 032_add_position_reservation_fields.sql
```

---

### 2️⃣ Use the Feature

#### **A. Reserve Positions (Shipment Registration Page)**

1. Go to **Shipment Registration** page
2. Click **"New Shipment"** or **Edit** existing shipment
3. Fill in shipment details (supplier, container number, etc.)
4. Click **"Add Product"** button
5. Select Brand → Select Size → Enter Quantity
6. Click the **📍 Map Pin icon** to assign positions
7. Select **Warehouse** (WH1 or WH2)
8. Choose a **Rack**
9. Select **multiple positions** (checkboxes)
10. Click **"Confirm Assignment"**

✅ Positions are now **RESERVED**!

---

#### **B. View Reserved Positions (Warehouse Locations Page)**

1. Go to **Warehouse Locations** page
2. Find your rack (e.g., WH2-R01-RK01)
3. Click **👁️ View Tires** button
4. Look for positions with:
   - **Amber/Orange background**
   - **🔒 Reserved badge**
   - **Product name displayed**
   - **"Reserved for incoming shipment" message**

Example:
```
╔════════════════════════════════════╗
║ 🔒 Reserved          [Pending]    ║
║ ┌────────────────────────────────┐ ║
║ │ Red Indian Customs Classic     │ ║
║ │ Sawtooth - 130/90-15           │ ║
║ │ 📦 123 tires reserved          │ ║
║ │ For: SHIP-2026-001             │ ║
║ └────────────────────────────────┘ ║
╚════════════════════════════════════╝
```

---

#### **C. Convert Reserved → Active (When Shipment Arrives)**

1. Go to **Shipment Registration** page
2. Find your shipment
3. Click **Edit**
4. Change status to **"RECEIVED"**
5. Save

🎉 **AUTOMATIC**: Reserved positions convert to Active with actual stock!

---

#### **D. Clear Reservations (If Shipment Cancelled)**

1. Go to **Shipment Registration** page
2. Find your shipment
3. Click **Edit**
4. Change status to **"CANCELLED"**
5. Save

🧹 **AUTOMATIC**: All reserved positions are cleared and return to Empty!

---

## 🎨 Visual Guide

### Before (Normal Position)
```
┌─────────────────┐
│ WH2-R01-...     │
│ Empty           │
│ 0 / 14          │
│ [+ Assign Tire] │
└─────────────────┘
```

### After (Reserved)
```
┌─────────────────────────┐
│ WH2-R01-...             │
│ 🔒 Reserved  [Pending]  │
│ ┌─────────────────────┐ │
│ │ RIC Sawtooth        │ │
│ │ 130/90-15           │ │
│ │ 📦 123 tires        │ │
│ └─────────────────────┘ │
│ 0 / 14                  │
│ 🔒 Reserved for SHIP... │
└─────────────────────────┘
```

### After Receipt (Active)
```
┌─────────────────┐
│ WH2-R01-...     │
│ RIC Sawtooth    │
│ 130/90-15       │
│ 123 / 14  ✅    │
└─────────────────┘
```

---

## ⚠️ Important Notes

### ✅ DO:
- Run database migration FIRST before using the feature
- Reserve positions when creating shipments
- Mark shipments as RECEIVED when they arrive
- Cancel shipments properly to clear reservations

### ❌ DON'T:
- Skip the database migration
- Manually change reserved positions (they auto-convert!)
- Delete shipments without cancelling first (auto-cleanup handles this)

---

## 🐛 Quick Troubleshooting

### Problem: Positions not showing as reserved
**Fix**: Run the database migration script first!

### Problem: Can't select reserved positions
**This is correct!** Reserved positions are locked until shipment is received or cancelled.

### Problem: Reservations not clearing on cancellation
**Fix**: Check if trigger exists:
```sql
SELECT * FROM pg_trigger WHERE tgname LIKE '%reserved%';
```

---

## 📞 Need Help?

1. Check `WAREHOUSE_POSITION_RESERVATION_FEATURE.md` for detailed docs
2. View database logs for trigger execution
3. Check browser console for API errors

---

**Status**: ✅ Ready to Use

**Quick Test**: Create a test shipment → Assign positions → Check Warehouse Locations → You should see 🔒 Reserved!
