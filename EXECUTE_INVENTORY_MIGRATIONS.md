# Execute Inventory Migrations - INSTRUCTIONS

## Issue
The Inventory page fails to load because required database tables and functions don't exist yet.

## What's Missing
❌ `check_low_stock_alerts()` RPC function  
❌ `low_stock_thresholds` table  
❌ `stock_movements` table (or has wrong column names)

## Solution: Execute SQL Migrations

### Method 1: Supabase SQL Editor (RECOMMENDED - EASIEST)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project: `hbsynkxaadnximuytbor`

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Execute Migration 036 (Low Stock Alerts)**
   - Open file: `backend/database/036_inventory_advanced_features.sql`
   - Copy **ALL** content (Ctrl+A, Ctrl+C)
   - Paste into SQL Editor
   - Click "Run" button (bottom right)
   - ✅ Should see: "Success. No rows returned"

4. **Execute Migration 037 (Stock Movements)**
   - Open file: `backend/database/037_warehouse_operations.sql`
   - Copy **ALL** content (Ctrl+A, Ctrl+C)
   - Paste into SQL Editor
   - Click "Run" button
   - ✅ Should see: "Success. No rows returned"

5. **Verify**
   - Run this query in SQL Editor:
   ```sql
   -- Check if tables exist
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('low_stock_thresholds', 'stock_movements');
   
   -- Check if function exists
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_schema = 'public' 
   AND routine_name = 'check_low_stock_alerts';
   ```
   - ✅ Should return 3 rows (2 tables + 1 function)

### Method 2: Command Line (PostgreSQL psql)

If you have PostgreSQL `psql` installed:

```bash
# Get connection string from Supabase Dashboard -> Project Settings -> Database

psql "postgresql://postgres:[YOUR-PASSWORD]@db.hbsynkxaadnximuytbor.supabase.co:5432/postgres" -f backend/database/036_inventory_advanced_features.sql

psql "postgresql://postgres:[YOUR-PASSWORD]@db.hbsynkxaadnximuytbor.supabase.co:5432/postgres" -f backend/database/037_warehouse_operations.sql
```

### Method 3: Supabase API (if other methods fail)

Create file: `backend/execute-via-api.mjs`

```javascript
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    db: {
      schema: 'public',
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function executeSQL(filePath) {
  const sql = readFileSync(filePath, 'utf8');
  
  // Split into individual statements (simple split by semicolon)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`Executing ${statements.length} statements...`);
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    console.log(`\\n[${i + 1}/${statements.length}] Executing...`);
    
    try {
      // Use REST API to execute
      const response = await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`,
        {
          method: 'POST',
          headers: {
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: stmt })
        }
      );
      
      if (!response.ok) {
        console.error('Failed:', await response.text());
      } else {
        console.log('✅ Success');
      }
    } catch (err) {
      console.error('Error:', err.message);
    }
  }
}

executeSQL('backend/database/036_inventory_advanced_features.sql');
```

## After Executing Migrations

1. **Restart Backend Server** (if running)
   ```bash
   # Stop server (Ctrl+C)
   # Start again
   npm run dev
   ```

2. **Test the API**
   ```bash
   node backend/test-inventory-api.mjs
   ```
   - Should now show ✅ PASS for all tests

3. **Reload Frontend**
   - Refresh the browser page
   - Inventory stats should now load successfully
   - No more "Failed to fetch" errors

## Expected Result After Migration

### Backend Console (when accessing /inventory page):
```
📊 Fetching dashboard stats...
✅ Found 1000 inventory units
✅ Found 0 low stock alerts
✅ Dashboard stats: { totalUnits: 1000, available: 1000, ... }
```

### Frontend:
- ✅ Statistics cards display correctly
- ✅ Total Units: 1000
- ✅ Available: 1000
- ✅ Low Stock Alerts: 0
- ✅ No console errors

## Troubleshooting

### "Permission denied" errors
- Make sure you're using `SUPABASE_SERVICE_ROLE_KEY` not ANON_KEY
- Check that RLS policies allow service role access

### "Function already exists" errors
- Safe to ignore - migration is idempotent
- Use `CREATE OR REPLACE FUNCTION` (already in the SQL files)

### "Table already exists" errors
- Safe to ignore - migration uses `CREATE TABLE IF NOT EXISTS`

### Still getting errors after migration
1. Check backend console for specific error messages
2. Run the test script: `node backend/test-inventory-api.mjs`
3. Check Supabase logs in Dashboard -> Logs
4. Verify migrations executed: Query the `information_schema` tables

## Files Involved

- `backend/database/036_inventory_advanced_features.sql` - Low stock alerts system
- `backend/database/037_warehouse_operations.sql` - Stock movements tracking
- `backend/test-inventory-api.mjs` - Test script to verify setup
- `backend/src/controllers/inventoryAdvancedController.js` - API controller
- `backend/src/routes/inventoryAdvancedRoutes.js` - API routes
- `frontend/src/pages/dashboard/admin/Inventory.jsx` - Frontend page

## Quick Verification Query

After running migrations, execute this in SQL Editor:

```sql
-- Should return data, not errors
SELECT * FROM low_stock_thresholds LIMIT 1;
SELECT * FROM stock_movements LIMIT 1;
SELECT * FROM check_low_stock_alerts();
```

All three queries should execute successfully (even if they return 0 rows).
