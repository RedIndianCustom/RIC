-- ============================================================================
-- CREATE 5 RACKS IMMEDIATELY
-- ============================================================================
-- This creates the rack_configurations table if it doesn't exist
-- and inserts 5 racks with the correct warehouse_id
-- ============================================================================

-- 1. Create rack_configurations table if it doesn't exist
CREATE TABLE IF NOT EXISTS rack_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL,
  rack_number INTEGER NOT NULL,
  rack_code TEXT NOT NULL UNIQUE,
  designated_size TEXT NOT NULL,
  size_category TEXT NOT NULL,
  total_shelves INTEGER DEFAULT 4,
  sections_per_shelf INTEGER DEFAULT 6,
  subsections_per_section INTEGER DEFAULT 2,
  capacity_per_subsection INTEGER DEFAULT 15,
  total_capacity INTEGER DEFAULT 720,
  current_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'full', 'maintenance', 'inactive')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(warehouse_id, rack_number)
);

-- 2. Delete existing racks (if any)
DELETE FROM rack_configurations;

-- 3. Get the correct warehouse_id
DO $$
DECLARE
  v_warehouse_id UUID;
BEGIN
  -- Get Main Warehouse ID
  SELECT id INTO v_warehouse_id 
  FROM warehouse_locations 
  WHERE name = 'Main Warehouse' 
  LIMIT 1;
  
  IF v_warehouse_id IS NULL THEN
    RAISE EXCEPTION 'Main Warehouse not found! Run 017_warehouse_rack_system.sql first';
  END IF;
  
  RAISE NOTICE 'Using warehouse_id: %', v_warehouse_id;
  
  -- 4. Insert 5 racks (total_capacity is auto-calculated, so we don't insert it)
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
    current_count,
    status
  ) VALUES
  -- Rack 1: Sawtooth
  (v_warehouse_id, 1, 'WH1-RACK-1', 'Sawtooth 130/90-15, 170/80-15', 'Sawtooth', 4, 6, 2, 15, 0, 'active'),
  
  -- Rack 2: Sawtooth (backup)
  (v_warehouse_id, 2, 'WH1-RACK-2', 'Sawtooth 130/90-15, 170/80-15', 'Sawtooth', 4, 6, 2, 15, 0, 'active'),
  
  -- Rack 3: Enduro
  (v_warehouse_id, 3, 'WH1-RACK-3', 'Enduro 70/90-17, 80/100-18', 'Enduro', 4, 6, 2, 15, 0, 'active'),
  
  -- Rack 4: Dual Sport
  (v_warehouse_id, 4, 'WH1-RACK-4', 'Dual Sport 90/90-17, 110/80-17', 'Dual Sport', 4, 6, 2, 15, 0, 'active'),
  
  -- Rack 5: Motocross
  (v_warehouse_id, 5, 'WH1-RACK-5', 'Motocross 80/100-18, 100/90-19', 'Motocross', 4, 6, 2, 15, 0, 'active');
  
  RAISE NOTICE '✅ Inserted 5 racks';
END $$;

-- 5. Verify insertion
SELECT 
  rack_code,
  size_category,
  total_capacity,
  current_count,
  status,
  warehouse_id
FROM rack_configurations
ORDER BY rack_number;

-- 6. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON rack_configurations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rack_configurations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON rack_configurations TO anon;

-- 7. Disable RLS to allow backend access
ALTER TABLE rack_configurations DISABLE ROW LEVEL SECURITY;

-- Success message
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM rack_configurations;
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════';
  RAISE NOTICE '✅ SUCCESS: Created % racks', v_count;
  RAISE NOTICE '═══════════════════════════════════════════';
  RAISE NOTICE 'Rack codes: WH1-RACK-1 through WH1-RACK-5';
  RAISE NOTICE 'Categories: Sawtooth, Enduro, Dual Sport, Motocross';
  RAISE NOTICE 'Capacity: 720 tires per rack';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Next step: Restart backend server';
  RAISE NOTICE '';
END $$;
