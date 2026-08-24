# 📦 Purchase Orders System - Setup Guide

## 🎯 Overview

This Purchase Orders system automatically calculates and updates supplier totals (`total_orders` and `total_value`) based on actual purchase order data.

---

## ✅ Features

### **Automatic Calculations:**
- ✅ Supplier `total_orders` = count of received/approved purchase orders
- ✅ Supplier `total_value` = sum of all received/approved PO amounts
- ✅ PO line totals auto-calculate: `quantity × unit_price`
- ✅ PO subtotal auto-updates when items change
- ✅ Auto-generates PO numbers (format: `PO-YYYY-NNNN`)

### **Database Triggers:**
1. **Line Total Trigger** - Calculates `line_total` when items are added/updated
2. **PO Total Trigger** - Updates PO `subtotal` and `total_amount` when items change
3. **Supplier Total Trigger** - Updates supplier totals when POs are created/updated/deleted
4. **PO Number Trigger** - Auto-generates unique PO numbers

---

## 🚀 Installation Steps

### **Step 1: Run Database Migration**

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the entire contents of:
   ```
   backend/database/018_purchase_orders_system.sql
   ```
3. Click **Run** ✅
4. Verify success message

This creates:
- `purchase_orders` table
- `purchase_order_items` table
- All triggers and functions
- Sample data with 1 purchase order

### **Step 2: Restart Backend Server**

```bash
cd backend
npm start
```

Or if using nodemon:
```bash
cd backend
npm run dev
```

### **Step 3: Rebuild Frontend**

```bash
cd frontend
npm run build
```

### **Step 4: Test API Endpoints**

Test in browser or Postman:

```http
GET http://localhost:5001/api/purchase-orders
GET http://localhost:5001/api/suppliers
```

You should see:
- Purchase orders list
- Suppliers with updated `totalOrders` and `totalValue`

---

## 📊 Database Schema

### **purchase_orders Table**

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| po_number | TEXT | Auto-generated (PO-2024-0001) |
| supplier_id | UUID | Foreign key → suppliers |
| order_date | DATE | Order date |
| expected_delivery | DATE | Expected delivery date |
| actual_delivery | DATE | Actual delivery date |
| subtotal | NUMERIC | Sum of all line items |
| tax_amount | NUMERIC | Tax amount |
| shipping_cost | NUMERIC | Shipping cost |
| total_amount | NUMERIC | subtotal + tax + shipping |
| status | TEXT | draft, pending, approved, ordered, received, cancelled |
| notes | TEXT | Additional notes |
| payment_terms | TEXT | Payment terms |
| shipping_address | TEXT | Delivery address |

### **purchase_order_items Table**

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| purchase_order_id | UUID | Foreign key → purchase_orders |
| product_name | TEXT | Product name |
| product_sku | TEXT | Product SKU/code |
| description | TEXT | Item description |
| quantity | INTEGER | Ordered quantity |
| received_quantity | INTEGER | Quantity received |
| unit_price | NUMERIC | Price per unit |
| line_total | NUMERIC | Auto: quantity × unit_price |

---

## 🔄 How Automatic Calculation Works

### **Example Flow:**

1. **Create Purchase Order:**
   ```json
   POST /api/purchase-orders
   {
     "supplierId": "xxx-xxx-xxx",
     "orderDate": "2024-01-15",
     "status": "received",
     "taxAmount": 1000,
     "shippingCost": 500,
     "items": [
       {
         "productName": "Tire A",
         "quantity": 100,
         "unitPrice": 5000
       },
       {
         "productName": "Tire B",
         "quantity": 50,
         "unitPrice": 7000
       }
     ]
   }
   ```

2. **Automatic Calculations:**
   ```
   Item 1 line_total = 100 × 5000 = 500,000
   Item 2 line_total = 50 × 7000  = 350,000
   ────────────────────────────────────────
   PO subtotal                     = 850,000
   PO total_amount = 850,000 + 1,000 + 500 = 851,500
   ```

3. **Supplier Totals Update:**
   ```
   Supplier total_orders = COUNT of received POs = 1
   Supplier total_value  = SUM of received POs   = 851,500
   ```

4. **Summary Card Display:**
   ```
   Total Value: ₱851K
   ```

---

## 🎨 API Endpoints

### **Purchase Orders**

```http
# Get all purchase orders
GET /api/purchase-orders
GET /api/purchase-orders?status=received
GET /api/purchase-orders?supplierId=xxx-xxx-xxx

# Get single purchase order
GET /api/purchase-orders/:id

# Get items for a purchase order
GET /api/purchase-orders/:id/items

# Create purchase order
POST /api/purchase-orders
{
  "supplierId": "uuid",
  "orderDate": "2024-01-15",
  "status": "received",
  "taxAmount": 1000,
  "shippingCost": 500,
  "items": [...]
}

# Update purchase order
PUT /api/purchase-orders/:id

# Delete purchase order
DELETE /api/purchase-orders/:id
```

### **Response Format**

```json
{
  "purchaseOrders": [
    {
      "id": "uuid",
      "poNumber": "PO-2024-0001",
      "supplierName": "Asian Auto Parts Corp",
      "orderDate": "2024-01-15",
      "totalAmount": 851500,
      "status": "received",
      ...
    }
  ]
}
```

---

## 🧪 Testing the System

### **Test 1: Create Purchase Order**

```bash
curl -X POST http://localhost:5001/api/purchase-orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "supplierId": "SUPPLIER_ID",
    "status": "received",
    "items": [
      {
        "productName": "Test Product",
        "quantity": 10,
        "unitPrice": 1000
      }
    ]
  }'
```

### **Test 2: Check Supplier Totals**

```bash
curl http://localhost:5001/api/suppliers \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected:
```json
{
  "suppliers": [
    {
      "name": "Asian Auto Parts Corp",
      "totalOrders": 2,
      "totalValue": 861500
    }
  ]
}
```

### **Test 3: Update PO Status**

```bash
curl -X PUT http://localhost:5001/api/purchase-orders/PO_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "status": "cancelled"
  }'
```

Result: Supplier totals automatically decrease!

---

## 🎯 Next Steps

### **Frontend UI (Coming Soon):**
1. Purchase Orders management page
2. Create/Edit PO forms
3. PO status tracking
4. Supplier PO history
5. Receiving workflow

### **Additional Features:**
- PDF generation for POs
- Email notifications
- Approval workflow
- Inventory integration
- Payment tracking

---

## 📝 Notes

- Only POs with status **"received"** or **"approved"** count towards supplier totals
- PO numbers are auto-generated in format: `PO-YYYY-NNNN`
- All calculations happen automatically via database triggers
- No manual updates needed - everything syncs in real-time!

---

## ✅ Verification Checklist

- [ ] Database migration ran successfully
- [ ] Backend server restarted
- [ ] API endpoints return data
- [ ] Supplier totals show correct values
- [ ] Creating PO updates supplier totals
- [ ] Deleting PO updates supplier totals

---

## 🆘 Troubleshooting

**Problem:** Supplier totals not updating

**Solution:**
1. Check if PO status is "received" or "approved"
2. Verify triggers exist:
   ```sql
   SELECT * FROM pg_trigger 
   WHERE tgname LIKE '%supplier%';
   ```
3. Check for errors in backend logs

**Problem:** PO number not auto-generating

**Solution:**
1. Verify function exists:
   ```sql
   SELECT * FROM pg_proc 
   WHERE proname = 'generate_po_number';
   ```
2. Check trigger is active

---

## 🎉 Success!

Your Purchase Orders system is now live with automatic supplier total calculation! 🚀

**Total Orders** and **Total Value** will update automatically whenever you:
- Create a new purchase order
- Update PO status to received/approved
- Delete a purchase order
- Modify PO amounts

No manual intervention needed! ✨
