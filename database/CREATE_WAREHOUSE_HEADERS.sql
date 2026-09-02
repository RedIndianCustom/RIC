-- ============================================================================
-- CREATE WAREHOUSE HEADERS (SEPARATE FROM POSITIONS)
-- ============================================================================
-- Your warehouse_locations table has specific positions (Zone/Aisle/Rack)
-- We need a separate table for warehouse-level data
-- ============================================================================

-- 1. Create warehouse header table (main warehouses)
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  address TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert Main Warehouse
INSERT INTO warehouses (name, code, address, status)
VALUES ('Main Warehouse', 'WH1', 'Main Warehouse Address', 'active')
ON CONFLICT (code) DO NOTHING;

-- 3. Now check if rack_configurations exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rack_configurations') THEN
    -- Update rack_configurations to use new warehouses table
    -- First, add the warehouse reference if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'rack_configurations' AND column_name = 'warehouse_ref_id'
    ) THEN
      ALTER TABLE rack_configurations 
      ADD COLUMN warehouse_ref_id UUID REFERENCES warehouses(id);
      
      -- Link existing racks to Main Warehouse
      UPDATE rack_configurations 
      SET warehouse_ref_id = (SELECT id FROM warehouses WHERE code = 'WH1');
    END IF;
    
    RAISE NOTICE '✅ rack_configurations linked to warehouses table';
  ELSE
    RAISE NOTICE '⚠️ rack_configurations table does not exist';
  END IF;
END $$;

-- 4. Create a view to list warehouses for dropdown
CREATE OR REPLACE VIEW warehouse_selector AS
SELECT 
  id,
  name,
  code,
  status
FROM warehouses
WHERE status = 'active'
ORDER BY name;

-- 5. Verify setup
SELECT * FROM warehouses;
SELECT * FROM warehouse_selector;

-- 6. Check rack_configurations (if exists)
SELECT 
  rc.*,
  w.name as warehouse_name,
  w.code as warehouse_code
FROM rack_configurations rc
LEFT JOIN warehouses w ON w.id = rc.warehouse_ref_id
ORDER BY rc.rack_number;

DO $$
BEGIN
  RAISE NOTICE '✅ Warehouse headers created!';
  RAISE NOTICE '📦 Use "warehouses" table for top-level warehouse selection';
  RAISE NOTICE '📦 Use "rack_configurations" for rack selection';
  RAISE NOTICE '📦 Use "warehouse_locations" for detailed positions';
END $$;
