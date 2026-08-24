# Fix Rack Configurations Foreign Key

## Problem
The `rack_configurations` table has a foreign key pointing to `warehouse_locations` table, but the frontend uses the `warehouses` table. This mismatch prevents racks from loading.

## Solution
Run the SQL script in Supabase SQL Editor to fix the foreign key constraint.

---

## Steps to Fix:

### 1. Open Supabase Dashboard
- Go to: https://supabase.com/dashboard
- Select your project

### 2. Open SQL Editor
- Click **SQL Editor** in the left sidebar
- Click **New Query**

### 3. Copy and Paste This SQL:

```sql
-- Fix rack_configurations foreign key to point to warehouses table
ALTER TABLE rack_configurations 
DROP CONSTRAINT IF EXISTS rack_configurations_warehouse_id_fkey;

ALTER TABLE rack_configurations
ADD CONSTRAINT rack_configurations_warehouse_id_fkey
FOREIGN KEY (warehouse_id) 
REFERENCES warehouses(id) 
ON DELETE CASCADE;
```

### 4. Run the Query
- Click **Run** or press `Ctrl+Enter`
- You should see: "Success. No rows returned"

### 5. Create Sample Racks

After fixing the foreign key, run this script to create sample racks:

```sql
-- Create sample racks for Main Warehouse
INSERT INTO rack_configurations (
  warehouse_id,
  rack_number,
  rack_code,
  designated_size,
  size_category,
  total_shelves,
  sections_per_shelf,
  subsections_per_section,
  capacity_per_subsection,
  status,
  notes
)
SELECT 
  w.id,
  'RACK-' || row_number,
  w.code || '-RACK-' || row_number,
  size,
  category,
  4,
  5,
  2,
  15,
  'active',
  'Rack for ' || category || ' ' || size
FROM (
  SELECT id, code FROM warehouses WHERE code = 'WH1'
) w
CROSS JOIN (
  VALUES 
    ('1', '90/90-18', 'Sawtooth'),
    ('2', '100/90-17', 'Dual Sport'),
    ('3', '110/90-17', 'Sawtooth'),
    ('4', '120/80-17', 'Enduro'),
    ('5', 'General', 'General')
) AS racks(row_number, size, category);

-- Verify racks were created
SELECT 
  rack_code,
  designated_size,
  size_category,
  total_capacity,
  status
FROM rack_configurations
ORDER BY rack_number;
```

### 6. Verify the Fix

You should see 5 racks created:
- WH1-RACK-1: Sawtooth 90/90-18 (Capacity: 600)
- WH1-RACK-2: Dual Sport 100/90-17 (Capacity: 600)
- WH1-RACK-3: Sawtooth 110/90-17 (Capacity: 600)
- WH1-RACK-4: Enduro 120/80-17 (Capacity: 600)
- WH1-RACK-5: General (Capacity: 900)

---

## Alternative: Manual Insert

If the bulk insert above doesn't work, run these individual inserts:

```sql
-- Get warehouse ID first
SELECT id, name, code FROM warehouses WHERE code = 'WH1';

-- Then insert racks one by one (replace YOUR_WAREHOUSE_ID with the ID from above)
INSERT INTO rack_configurations (
  warehouse_id, rack_number, rack_code, designated_size, size_category,
  total_shelves, sections_per_shelf, subsections_per_section, capacity_per_subsection, status
) VALUES
('YOUR_WAREHOUSE_ID', 'RACK-1', 'WH1-RACK-1', '90/90-18', 'Sawtooth', 4, 5, 2, 15, 'active');

INSERT INTO rack_configurations (
  warehouse_id, rack_number, rack_code, designated_size, size_category,
  total_shelves, sections_per_shelf, subsections_per_section, capacity_per_subsection, status
) VALUES
('YOUR_WAREHOUSE_ID', 'RACK-2', 'WH1-RACK-2', '100/90-17', 'Dual Sport', 4, 5, 2, 15, 'active');

INSERT INTO rack_configurations (
  warehouse_id, rack_number, rack_code, designated_size, size_category,
  total_shelves, sections_per_shelf, subsections_per_section, capacity_per_subsection, status
) VALUES
('YOUR_WAREHOUSE_ID', 'RACK-3', 'WH1-RACK-3', 'General', 'General', 5, 6, 2, 15, 'active');
```

Replace `YOUR_WAREHOUSE_ID` with: `b1eff6be-b968-4861-94c2-f220e4eeffed`

---

## After Running SQL:

1. **Refresh your frontend** (Ctrl+Shift+R)
2. Go to **Barcode Generation** page
3. Enable **Batch Mode**
4. Select a batch
5. Select a product
6. Select **Main Warehouse (WH1)**
7. **Racks should now appear in the dropdown!** 🎉
8. Select rack, shelf, section, subsection
9. Generate barcodes

---

## Quick Test Query

To verify everything works:

```sql
-- Check foreign key constraint
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'rack_configurations' 
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'warehouse_id';

-- Should show: foreign_table_name = "warehouses" (NOT warehouse_locations)
```
