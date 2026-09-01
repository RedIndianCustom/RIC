# Run Enhanced Receiving & QC Workflow Migration

## ✅ SQL File Fixed

**Issue:** Column `role_name` does not exist in `user_roles` table
**Solution:** Updated RLS policies to join with `roles` table to get role name

## 🚀 How to Run Migration

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the contents of `backend/database/038_enhanced_receiving_qc_workflow.sql`
5. Paste into the SQL editor
6. Click **Run** (or press Ctrl+Enter)
7. Wait for success message: "✅ Enhanced Receiving & QC Workflow Schema Created Successfully!"

### Option 2: Via Command Line (psql)

```bash
# Make sure you're in the project root directory
cd c:\Users\user\Documents\GitHub\RedIndianCustoms\RIC

# Run the migration
psql -h <your-db-host> -U postgres -d postgres -f backend/database/038_enhanced_receiving_qc_workflow.sql
```

### Option 3: Via Node.js Script (Create this if needed)

Create `backend/run-migration.mjs`:

```javascript
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const sqlFile = join(__dirname, 'database', '038_enhanced_receiving_qc_workflow.sql');
const sql = readFileSync(sqlFile, 'utf8');

console.log('🚀 Running migration...');

const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

if (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}

console.log('✅ Migration completed successfully!');
```

Then run:
```bash
cd backend
node run-migration.mjs
```

## 📋 What This Migration Creates

### Tables (7)
1. **shipment_expected_items** - Expected quantities by size
2. **shipment_received_items** - Actual scanned quantities
3. **shipment_discrepancies** - AUTO-DETECTED discrepancies
4. **qc_inspections** - QC inspection (15-day deadline)
5. **qc_inspection_items** - Item classification (Good/Minor/Major)
6. **defect_inventory** - Defect tracking (Sellable/Return)
7. **workflow_notifications** - Notification system

### Functions (3)
- `get_shipment_discrepancy_summary()` - Discrepancy statistics
- `get_qc_inspection_summary()` - QC statistics
- `check_overdue_qc_inspections()` - Find overdue QC inspections

### Views (2)
- `pending_qc_inspections` - Dashboard view for pending QC
- `pending_discrepancy_approvals` - Manager approval queue

### Triggers (8)
- Auto-update timestamps
- Auto-set QC due date (ready_for_qc_date + 15 days)
- Auto-update status to OVERDUE

### RLS Policies
- Role-based access control for all tables
- User-specific notification access

## ✅ Verify Migration Success

After running the migration, verify it worked:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'shipment_expected_items',
  'shipment_received_items',
  'shipment_discrepancies',
  'qc_inspections',
  'qc_inspection_items',
  'defect_inventory',
  'workflow_notifications'
);

-- Should return 7 rows

-- Check views exist
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name IN (
  'pending_qc_inspections',
  'pending_discrepancy_approvals'
);

-- Should return 2 rows

-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'get_shipment_discrepancy_summary',
  'get_qc_inspection_summary',
  'check_overdue_qc_inspections'
);

-- Should return 3 rows
```

## 🚀 Next Steps After Migration

1. **Restart backend server** (if running)
   ```bash
   cd backend
   npm start
   ```

2. **Test API endpoints** using Postman or curl:
   ```bash
   # Test expected items endpoint
   curl -X GET http://localhost:3001/api/receiving-qc/expected-items/YOUR_SHIPMENT_ID \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. **Access frontend components:**
   - Shipment Registration (Enhanced): `/operational/shipment-registration-enhanced`
   - Receiving & Scanning: (To be created)
   - QC Inspection: (To be created)
   - Manager Discrepancy Approval: (To be created)
   - Manager QC Approval: (To be created)

## 🐛 Troubleshooting

### Error: "relation already exists"
This means tables were created from a previous migration attempt. You can:

1. **Drop tables first** (⚠️ CAUTION: This deletes data!):
```sql
DROP TABLE IF EXISTS workflow_notifications CASCADE;
DROP TABLE IF EXISTS defect_inventory CASCADE;
DROP TABLE IF EXISTS qc_inspection_items CASCADE;
DROP TABLE IF EXISTS qc_inspections CASCADE;
DROP TABLE IF EXISTS shipment_discrepancies CASCADE;
DROP TABLE IF EXISTS shipment_received_items CASCADE;
DROP TABLE IF EXISTS shipment_expected_items CASCADE;
```

2. **Or skip creation** by adding `IF NOT EXISTS` (already in the SQL file)

### Error: "function already exists"
Similar solution:
```sql
DROP FUNCTION IF EXISTS get_shipment_discrepancy_summary(UUID);
DROP FUNCTION IF EXISTS get_qc_inspection_summary(UUID);
DROP FUNCTION IF EXISTS check_overdue_qc_inspections();
```

### Error: "permission denied"
Make sure you're using a user with proper database privileges (like `postgres` or service role key).

## 📞 Support

If you encounter issues:
1. Check the Supabase logs for detailed error messages
2. Verify your database connection settings
3. Ensure all prerequisite tables exist (products, shipments, auth.users, etc.)

---

**Migration File:** `backend/database/038_enhanced_receiving_qc_workflow.sql`  
**Status:** Ready to run ✅  
**Last Updated:** 2026-08-26
