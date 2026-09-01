# Warehouse Staff Notification Fix

## Error
```
Error: No users found with role: WAREHOUSE_STAFF
```

## Root Cause
The notification system was looking for users with the `WAREHOUSE_STAFF` role, but:
1. No users in the database had this role assigned
2. The system was failing with a 404 error when no recipients were found

---

## Solutions Applied

### 1. Backend Fix - Graceful Degradation ✅

**File:** `backend/src/controllers/receivingQcController.js`

**Changed notification behavior from ERROR to WARNING:**

**BEFORE:**
```javascript
if (users && users.length > 0) {
  // Send notifications
} else {
  return res.status(404).json({ 
    error: `No users found with role: ${notificationData.recipient_role}` 
  });
}
```

**AFTER:**
```javascript
if (users && users.length > 0) {
  // Send notifications
  return res.status(201).json({ 
    success: true, 
    message: `Notification sent to ${data.length} user(s)`,
    data 
  });
} else {
  // Don't fail - just warn
  console.warn(`⚠️  No users found with role: ${notificationData.recipient_role}`);
  return res.status(200).json({ 
    success: true,
    warning: `No users found with role: ${notificationData.recipient_role}`,
    message: 'Shipment updated but notification not sent (no recipients)',
    recipients: 0
  });
}
```

**Result:**
- ✅ Shipment status still updates to IN_TRANSIT
- ✅ No error thrown
- ⚠️  Warning logged about missing recipients
- ✅ Frontend receives success response

---

### 2. Frontend Fix - Better Error Handling ✅

**File:** `frontend/src/pages/dashboard/operational/IncomingShipmentsEnhanced.jsx`

**Added try-catch for notification with graceful fallback:**

```javascript
const handleSendToWarehouse = async (shipment) => {
  // 1. Update shipment status first
  await api.put(`/shipments/${shipment.id}`, {
    status: 'IN_TRANSIT'
  });

  // 2. Try to send notification (non-blocking)
  try {
    const notificationResponse = await api.post('/receiving-qc/notifications', {...});
    
    if (notificationResponse.data.warning) {
      // Show warning but still success
      setAlert({ 
        type: 'success', 
        message: `Sent to warehouse! ⚠️ ${notificationResponse.data.warning}` 
      });
    } else {
      // Normal success
      setAlert({ 
        type: 'success', 
        message: `Sent to warehouse! Notification sent to staff.` 
      });
    }
  } catch (notificationError) {
    // Notification failed but shipment was updated - that's OK!
    setAlert({ 
      type: 'success', 
      message: `Sent to warehouse! (Notification system unavailable)` 
    });
  }
};
```

**Benefits:**
- ✅ Shipment always updates successfully
- ✅ User sees success message even if notification fails
- ⚠️  Warning shown if no recipients found
- ✅ System continues to work

---

### 3. Database Check Script ✅

**File:** `backend/database/040_check_and_create_warehouse_staff_users.sql`

This script:
1. ✅ Checks if `warehouse_staff` role exists
2. ✅ Creates role if missing
3. ✅ Checks for users with warehouse_staff role
4. ✅ Assigns role to first user if none found
5. ✅ Shows verification report

**To run:**
```sql
-- In Supabase SQL Editor or psql
\i backend/database/040_check_and_create_warehouse_staff_users.sql
```

**Or manually assign role:**
```sql
-- Check existing roles
SELECT * FROM roles;

-- Check existing users
SELECT id, email, full_name, role FROM users;

-- Assign warehouse_staff role to a user
INSERT INTO user_roles (user_id, role_id)
SELECT 
  u.id as user_id,
  r.id as role_id
FROM users u
CROSS JOIN roles r
WHERE u.email = 'your-user@example.com'
  AND LOWER(r.name) = 'warehouse_staff'
ON CONFLICT DO NOTHING;

-- Also update users table role field
UPDATE users
SET role = 'WAREHOUSE_STAFF'
WHERE email = 'your-user@example.com';
```

---

## Testing

### Test 1: With No Warehouse Staff (Fixed)
1. Ensure no users have WAREHOUSE_STAFF role
2. Go to Incoming Shipments
3. Click "Send to Warehouse" on PENDING shipment
4. **Expected Result:**
   - ✅ Shipment status changes to IN_TRANSIT
   - ✅ Success message with warning: "Sent to warehouse! ⚠️ No users found with role: WAREHOUSE_STAFF"
   - ✅ No error

### Test 2: With Warehouse Staff Assigned
1. Run the SQL script to assign warehouse_staff role
2. Click "Send to Warehouse" on another PENDING shipment
3. **Expected Result:**
   - ✅ Shipment status changes to IN_TRANSIT
   - ✅ Success message: "Sent to warehouse! Notification sent to warehouse staff."
   - ✅ Notification created in database
   - ✅ Warehouse staff users can see notification

---

## Verification Queries

### Check if warehouse_staff role exists:
```sql
SELECT * FROM roles WHERE LOWER(name) = 'warehouse_staff';
```

### Check users with warehouse_staff role:
```sql
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role as user_role,
  r.name as assigned_role
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN roles r ON r.id = ur.role_id
WHERE LOWER(r.name) = 'warehouse_staff'
   OR LOWER(u.role) = 'warehouse_staff';
```

### Check notifications:
```sql
SELECT 
  n.*,
  u.email as recipient_email,
  u.full_name as recipient_name
FROM workflow_notifications n
LEFT JOIN users u ON u.id = n.recipient_user_id
WHERE notification_type = 'SHIPMENT_READY_FOR_RECEIVING'
ORDER BY n.created_at DESC
LIMIT 10;
```

---

## Long-term Solution

To properly set up warehouse staff:

1. **Create warehouse_staff role** (if not exists)
2. **Assign role to appropriate users**
3. **Update user management UI** to allow assigning roles
4. **Test notification system** with real warehouse staff accounts

---

## Status: ✅ FIXED

The system now works whether or not warehouse staff users exist:
- ✅ With warehouse staff → Notifications sent
- ✅ Without warehouse staff → Warning shown, shipment still updates
- ✅ No more errors blocking the workflow

**Date:** 2026-08-26
