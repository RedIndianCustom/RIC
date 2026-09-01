# 📡 Receiving Workflow API Documentation

Complete API reference for the size-by-size receiving workflow with manager approval.

---

## 🔐 Authentication

All endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

---

## 📋 API Endpoints

### **1. Submit Receiving Report**

Submit a receiving report for manager approval.

**Endpoint**: `POST /api/receiving/submit-report`

**Access**: Warehouse Staff, Admin

**Request Body**:
```json
{
  "shipment_id": 123,
  "size_breakdown": [
    {
      "size": "120/80-18",
      "expected": 14,
      "scanned": 13,
      "discrepancy": 1
    },
    {
      "size": "130/80-18",
      "expected": 14,
      "scanned": 14,
      "discrepancy": 0
    }
  ],
  "total_expected": 28,
  "total_scanned": 27,
  "total_discrepancy": 1,
  "notes": "One item damaged during unloading",
  "scan_details": {
    "120/80-18": {
      "items": [
        { "barcode": "RIC-12345", "timestamp": "2026-08-26T10:30:00Z" }
      ]
    }
  }
}
```

**Response** (Success - 201):
```json
{
  "success": true,
  "data": {
    "report_id": 45,
    "report_number": "RR-20260826-0001",
    "message": "Receiving report submitted successfully"
  },
  "notifications": {
    "success": true,
    "notified": 3
  },
  "message": "Receiving report submitted successfully. Awaiting manager approval."
}
```

**Response** (Error - 400):
```json
{
  "success": false,
  "error": "Missing required fields: shipment_id, size_breakdown"
}
```

---

### **2. Get Pending Approvals**

Get all receiving reports awaiting manager approval.

**Endpoint**: `GET /api/receiving/pending-approvals`

**Access**: Manager, Admin

**Request**: No body required

**Response** (Success - 200):
```json
{
  "success": true,
  "data": [
    {
      "report_id": 45,
      "report_number": "RR-20260826-0001",
      "shipment_id": 123,
      "shipment_number": "SHIP-312",
      "submitted_by_id": 7,
      "submitted_by_name": "John Warehouse",
      "submitted_at": "2026-08-26T10:35:22Z",
      "total_expected": 28,
      "total_scanned": 27,
      "total_discrepancy": 1,
      "size_breakdown": [
        {
          "size": "120/80-18",
          "expected": 14,
          "scanned": 13,
          "discrepancy": 1
        }
      ],
      "notes": "One item damaged during unloading"
    }
  ],
  "count": 1
}
```

**Response** (Error - 403):
```json
{
  "success": false,
  "error": "Access denied. Only managers can view pending approvals."
}
```

---

### **3. Approve/Reject Report**

Make a decision on a receiving report (approve or reject).

**Endpoint**: `POST /api/receiving/approve/:reportId`

**Access**: Manager, Admin

**URL Parameters**:
- `reportId` (integer) - The ID of the report to approve/reject

**Request Body**:
```json
{
  "decision": "APPROVED",
  "decision_notes": "Discrepancy acceptable, net is correct"
}
```

Or for rejection:
```json
{
  "decision": "REJECTED",
  "decision_notes": "Too many discrepancies. Please re-scan carefully."
}
```

**Response** (Success - Approved - 200):
```json
{
  "success": true,
  "data": {
    "success": true,
    "approval_id": 78,
    "decision": "APPROVED",
    "actions": {
      "qc_batch_created": true,
      "qc_batch_id": 234,
      "qc_batch_number": "QC-SHIP-312-20260826",
      "shipment_status": "READY_FOR_QC"
    },
    "message": "Report approved and QC batch created"
  },
  "message": "Report approved and QC batch created"
}
```

**Response** (Success - Rejected - 200):
```json
{
  "success": true,
  "data": {
    "success": true,
    "approval_id": 79,
    "decision": "REJECTED",
    "actions": {
      "shipment_status": "INSPECTING",
      "rejection_reason": "Too many discrepancies. Please re-scan carefully."
    },
    "message": "Report rejected. Shipment returned to inspection."
  },
  "message": "Report rejected. Shipment returned to inspection."
}
```

**Response** (Error - 400):
```json
{
  "success": false,
  "error": "Invalid decision. Must be APPROVED or REJECTED"
}
```

**Response** (Error - 404):
```json
{
  "success": false,
  "error": "Report not found"
}
```

---

### **4. Get Approval History**

Get the full approval history for a shipment.

**Endpoint**: `GET /api/receiving/history/:shipmentId`

**Access**: All authenticated users

**URL Parameters**:
- `shipmentId` (integer) - The ID of the shipment

**Response** (Success - 200):
```json
{
  "success": true,
  "data": [
    {
      "report_id": 45,
      "report_number": "RR-20260826-0001",
      "submitted_by": "John Warehouse",
      "submitted_at": "2026-08-26T10:35:22Z",
      "approved_by": "Sarah Manager",
      "decided_at": "2026-08-26T11:15:00Z",
      "decision": "APPROVED",
      "decision_notes": "Acceptable discrepancy",
      "qc_batch_number": "QC-SHIP-312-20260826",
      "total_expected": 28,
      "total_scanned": 27,
      "total_discrepancy": 1
    }
  ],
  "count": 1
}
```

---

### **5. Get Receiving Report**

Get a specific receiving report by ID.

**Endpoint**: `GET /api/receiving/report/:reportId`

**Access**: All authenticated users

**URL Parameters**:
- `reportId` (integer) - The ID of the report

**Response** (Success - 200):
```json
{
  "success": true,
  "data": {
    "id": 45,
    "report_number": "RR-20260826-0001",
    "shipment_id": 123,
    "submitted_by": 7,
    "submitted_at": "2026-08-26T10:35:22Z",
    "size_breakdown": [
      {
        "size": "120/80-18",
        "expected": 14,
        "scanned": 13,
        "discrepancy": 1
      }
    ],
    "total_expected": 28,
    "total_scanned": 27,
    "total_discrepancy": 1,
    "notes": "One item damaged during unloading",
    "scan_details": {},
    "status": "PENDING",
    "created_at": "2026-08-26T10:35:22Z",
    "updated_at": "2026-08-26T10:35:22Z",
    "shipments": {
      "shipment_number": "SHIP-312",
      "container_number": "CONT-456",
      "supplier_id": 5,
      "suppliers": {
        "name": "QUINGDAO MARVEL STAR INDUSTRIAL"
      }
    },
    "users": {
      "full_name": "John Warehouse",
      "email": "john@example.com"
    }
  }
}
```

**Response** (Error - 404):
```json
{
  "success": false,
  "error": "Report not found"
}
```

---

### **6. Get Receiving Reports**

Get all receiving reports with optional filters and pagination.

**Endpoint**: `GET /api/receiving/reports`

**Access**: All authenticated users

**Query Parameters**:
- `status` (string, optional) - Filter by status: `PENDING`, `APPROVED`, `REJECTED`
- `shipment_id` (integer, optional) - Filter by shipment ID
- `limit` (integer, optional, default: 50) - Number of results per page
- `offset` (integer, optional, default: 0) - Pagination offset

**Example Request**:
```
GET /api/receiving/reports?status=PENDING&limit=10&offset=0
```

**Response** (Success - 200):
```json
{
  "success": true,
  "data": [
    {
      "id": 45,
      "report_number": "RR-20260826-0001",
      "shipment_id": 123,
      "submitted_by": 7,
      "submitted_at": "2026-08-26T10:35:22Z",
      "size_breakdown": [...],
      "total_expected": 28,
      "total_scanned": 27,
      "total_discrepancy": 1,
      "status": "PENDING",
      "shipments": {
        "shipment_number": "SHIP-312",
        "container_number": "CONT-456",
        "status": "AWAITING_APPROVAL"
      },
      "users": {
        "full_name": "John Warehouse",
        "email": "john@example.com"
      }
    }
  ],
  "count": 1,
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 1
  }
}
```

---

## 📊 Data Models

### **Receiving Report**
```typescript
interface ReceivingReport {
  id: number;
  shipment_id: number;
  report_number: string;          // Format: RR-YYYYMMDD-NNNN
  submitted_by: number;            // User ID
  submitted_at: string;            // ISO 8601 timestamp
  size_breakdown: SizeBreakdown[]; // Array of size details
  total_expected: number;
  total_scanned: number;
  total_discrepancy: number;       // Expected - Scanned
  notes?: string;
  scan_details?: object;           // Full barcode history
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  updated_at: string;
}

interface SizeBreakdown {
  size: string;                    // e.g., "120/80-18"
  expected: number;
  scanned: number;
  discrepancy: number;             // Expected - Scanned
}
```

### **Receiving Approval**
```typescript
interface ReceivingApproval {
  id: number;
  report_id: number;
  shipment_id: number;
  approved_by: number;             // User ID (manager)
  decision: 'APPROVED' | 'REJECTED';
  decision_notes?: string;
  qc_batch_id?: number;            // Set if approved
  actions_taken?: object;          // Details of what happened
  decided_at: string;
  created_at: string;
}
```

---

## 🔄 Status Flow

### **Shipment Status**
```
IN_TRANSIT → ARRIVED → INSPECTING → AWAITING_APPROVAL → READY_FOR_QC
                                             ↓ (if rejected)
                                        INSPECTING
```

### **Report Status**
```
PENDING → APPROVED (creates QC batch)
    ↓
REJECTED (returns to receiving)
```

---

## 🔔 Notifications Generated

### **On Report Submission**
- **Type**: `RECEIVING_APPROVAL_PENDING`
- **Recipients**: All managers (role: MANAGER, ADMIN)
- **Priority**: HIGH (if discrepancy ≠ 0), MEDIUM (if match)
- **Metadata**:
  ```json
  {
    "report_id": 45,
    "report_number": "RR-20260826-0001",
    "shipment_number": "SHIP-312",
    "total_discrepancy": 1,
    "action_url": "/receiving/approvals/45"
  }
  ```

### **On Approval**
- **Type**: `RECEIVING_APPROVED` (to submitter), `QC_BATCH_READY` (to QC team)
- **Recipients**: 
  - Submitter (warehouse staff who created report)
  - All QC inspectors (role: QC_INSPECTOR, ADMIN)
- **Priority**: MEDIUM (submitter), HIGH (QC team)
- **Metadata**:
  ```json
  {
    "report_number": "RR-20260826-0001",
    "shipment_number": "SHIP-312",
    "qc_batch_number": "QC-SHIP-312-20260826",
    "action_url": "/qc/inspect/QC-SHIP-312-20260826"
  }
  ```

### **On Rejection**
- **Type**: `RECEIVING_REJECTED`
- **Recipients**: Submitter (warehouse staff)
- **Priority**: HIGH
- **Metadata**:
  ```json
  {
    "report_id": 45,
    "report_number": "RR-20260826-0001",
    "shipment_number": "SHIP-312",
    "rejection_reason": "Too many discrepancies",
    "action_url": "/warehouse/receiving/SHIP-312"
  }
  ```

---

## ⚠️ Error Codes

| Code | Description |
|------|-------------|
| `401` | Unauthorized - Invalid or missing JWT token |
| `403` | Forbidden - User role doesn't have access |
| `400` | Bad Request - Invalid input data |
| `404` | Not Found - Resource doesn't exist |
| `500` | Internal Server Error - Server-side error |

---

## 🧪 Testing Examples

### **Example 1: Submit Report with cURL**
```bash
curl -X POST http://localhost:3000/api/receiving/submit-report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "shipment_id": 123,
    "size_breakdown": [
      {"size": "120/80-18", "expected": 14, "scanned": 13, "discrepancy": 1}
    ],
    "total_expected": 14,
    "total_scanned": 13,
    "total_discrepancy": 1,
    "notes": "One item damaged"
  }'
```

### **Example 2: Get Pending Approvals**
```bash
curl -X GET http://localhost:3000/api/receiving/pending-approvals \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### **Example 3: Approve Report**
```bash
curl -X POST http://localhost:3000/api/receiving/approve/45 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "decision": "APPROVED",
    "decision_notes": "Acceptable discrepancy"
  }'
```

---

## 📝 Notes

1. **Discrepancy Calculation**: Always `Expected - Scanned`
   - Positive = Short (fewer items received)
   - Negative = Over (more items received)
   - Zero = Match

2. **Report Numbers**: Auto-generated in format `RR-YYYYMMDD-NNNN`

3. **QC Batch Creation**: Automatic when report is approved

4. **Notifications**: Sent asynchronously, don't block API response

5. **RLS Security**: All queries respect Row Level Security policies

---

## 🔗 Related APIs

- **Shipments API**: `/api/shipments`
- **QC Batches API**: `/api/qc/batches`
- **Notifications API**: `/api/notifications`
- **Receiving-QC API**: `/api/receiving-qc`

---

## 📞 Support

For API issues:
1. Check authentication token validity
2. Verify user role has required permissions
3. Review request body format matches schema
4. Check backend console logs for detailed errors

---

**API Version**: 1.0  
**Last Updated**: August 26, 2026  
**Base URL**: `http://localhost:3000/api` (development)
