-- ============================================================================
-- WAREHOUSE RACK MANAGEMENT SYSTEM
-- ============================================================================
-- Comprehensive rack system with capacity tracking
-- Warehouse 1: 5 racks, each rack = 4 shelves × 6 sections × 2 subsections
-- Each subsection capacity: 14-15 tires
-- Each size category has 2 dedicated racks
-- ============================================================================

-- ============================================================================
-- 1. WAREHOUSE LOCATIONS TABLE (Enhanced)
-- ============================================================================
-- First check if table exists and what columns it has
DO $$
BEGIN
  -- If table doesn't exist, create it with all columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'warehouse_locations') THEN
    CREATE TABLE warehouse_locations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE,
      address TEXT,
      total_racks INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    RAISE NOTICE '✅ Created warehouse_locations table';
  ELSE
    -- Table exists, add missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warehouse_locations' AND column_name = 'address') THEN
      ALTER TABLE warehouse_locations ADD COLUMN address TEXT;
      RAISE NOTICE '✅ Added address column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warehouse_locations' AND column_name = 'total_racks') THEN
      ALTER TABLE warehouse_locations ADD COLUMN total_racks INTEGER DEFAULT 0;
      RAISE NOTICE '✅ Added total_racks column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warehouse_locations' AND column_name = 'status') THEN
      ALTER TABLE warehouse_locations ADD COLUMN status TEXT DEFAULT 'active';
      RAISE NOTICE '✅ Added status column';
    END IF;
    
    RAISE NOTICE '✅ warehouse_locations table updated';
  END IF;
END $$;

-- ============================================================================
-- 2. RACK CONFIGURATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS rack_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID REFERENCES warehouse_locations(id) ON DELETE CASCADE,
  rack_number TEXT NOT NULL, -- 'RACK-1', 'RACK-2', etc.
  rack_code TEXT NOT NULL UNIQUE, -- 'WH1-RACK-1'
  
  -- Size specification
  designated_size TEXT NOT NULL, -- 'Dual Sport ST 90/90-17'
  size_category TEXT NOT NULL, -- 'Dual Sport', 'Sawtooth', 'Enduro', etc.
  
  -- Physical structure
  total_shelves INTEGER DEFAULT 4,
  sections_per_shelf INTEGER DEFAULT 6,
  subsections_per_section INTEGER DEFAULT 2,
  capacity_per_subsection INTEGER DEFAULT 15, -- 14-15 tires
  
  -- Calculated capacity
  total_capacity INTEGER GENERATED ALWAYS AS (
    total_shelves * sections_per_shelf * subsections_per_section * capacity_per_subsection
  ) STORED,
  
  -- Current usage
  current_count INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'full', 'maintenance', 'inactive')),
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(warehouse_id, rack_number)
);

-- ============================================================================
-- 3. RACK LOCATIONS TABLE (Individual storage positions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rack_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rack_id UUID REFERENCES rack_configurations(id) ON DELETE CASCADE,
  
  -- Position identifiers
  shelf_number INTEGER NOT NULL CHECK (shelf_number >= 1 AND shelf_number <= 4),
  section_number INTEGER NOT NULL CHECK (section_number >= 1 AND section_number <= 6),
  subsection_number INTEGER NOT NULL CHECK (subsection_number >= 1 AND subsection_number <= 2),
  
  -- Position code
  position_code TEXT NOT NULL UNIQUE, -- 'WH1-RACK-1-S1-SEC3-SUB2'
  
  -- Capacity tracking
  capacity INTEGER DEFAULT 15,
  current_count INTEGER DEFAULT 0,
  available_space INTEGER GENERATED ALWAYS AS (capacity - current_count) STORED,
  
  -- Status
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'full', 'reserved', 'maintenance')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(rack_id, shelf_number, section_number, subsection_number)
);

-- ============================================================================
-- 4. UPDATE INVENTORY_UNITS TABLE
-- ============================================================================
-- Add detailed location fields
ALTER TABLE inventory_units 
ADD COLUMN IF NOT EXISTS rack_location_id UUID REFERENCES rack_locations(id),
ADD COLUMN IF NOT EXISTS rack_code TEXT,
ADD COLUMN IF NOT EXISTS shelf_number INTEGER,
ADD COLUMN IF NOT EXISTS section_number INTEGER,
ADD COLUMN IF NOT EXISTS subsection_number INTEGER,
ADD COLUMN IF NOT EXISTS position_code TEXT,
ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_relocated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS relocation_count INTEGER DEFAULT 0;

-- ============================================================================
-- 5. RELOCATION HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_relocation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_unit_id UUID REFERENCES inventory_units(id) ON DELETE CASCADE,
  barcode_id UUID REFERENCES barcodes(id),
  
  -- Previous location
  from_rack_location_id UUID REFERENCES rack_locations(id),
  from_position_code TEXT,
  
  -- New location
  to_rack_location_id UUID REFERENCES rack_locations(id),
  to_position_code TEXT,
  
  -- Reason
  reason TEXT NOT NULL CHECK (reason IN ('rack_full', 'reorganization', 'maintenance', 'damage', 'optimization', 'other')),
  notes TEXT,
  
  -- Who did it
  relocated_by UUID REFERENCES auth.users(id),
  relocated_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. INITIALIZE WAREHOUSE 1 (Smart Auto-Detection)
-- ============================================================================
-- Automatically detect ALL required columns and provide defaults
DO $$
DECLARE
  v_insert_columns TEXT := '';
  v_insert_values TEXT := '';
  v_col RECORD;
  v_insert_sql TEXT;
BEGIN
  -- Get all NOT NULL columns (except auto-generated ones)
  FOR v_col IN 
    SELECT column_name, data_type
    FROM information_schema.columns 
    WHERE table_name = 'warehouse_locations' 
      AND is_nullable = 'NO'
      AND column_default IS NULL
      AND column_name NOT IN ('id', 'created_at', 'updated_at')
    ORDER BY ordinal_position
  LOOP
    -- Add column name
    IF v_insert_columns != '' THEN
      v_insert_columns := v_insert_columns || ', ';
      v_insert_values := v_insert_values || ', ';
    END IF;
    
    v_insert_columns := v_insert_columns || v_col.column_name;
    
    -- Provide default values based on column name
    CASE v_col.column_name
      WHEN 'name' THEN v_insert_values := v_insert_values || '''Main Warehouse''';
      WHEN 'code' THEN v_insert_values := v_insert_values || '''WH1''';
      WHEN 'zone' THEN v_insert_values := v_insert_values || '''Zone A''';
      WHEN 'aisle' THEN v_insert_values := v_insert_values || '''Aisle 1''';
      WHEN 'level' THEN v_insert_values := v_insert_values || '''Ground Floor''';
      WHEN 'section' THEN v_insert_values := v_insert_values || '''Main Section''';
      WHEN 'address' THEN v_insert_values := v_insert_values || '''Main Warehouse Address''';
      WHEN 'city' THEN v_insert_values := v_insert_values || '''Manila''';
      WHEN 'state' THEN v_insert_values := v_insert_values || '''Metro Manila''';
      WHEN 'country' THEN v_insert_values := v_insert_values || '''Philippines''';
      WHEN 'postal_code' THEN v_insert_values := v_insert_values || '''1000''';
      WHEN 'zip_code' THEN v_insert_values := v_insert_values || '''1000''';
      WHEN 'status' THEN v_insert_values := v_insert_values || '''active''';
      WHEN 'total_racks' THEN v_insert_values := v_insert_values || '5';
      WHEN 'capacity' THEN v_insert_values := v_insert_values || '3600';
      WHEN 'current_stock' THEN v_insert_values := v_insert_values || '0';
      WHEN 'available_space' THEN v_insert_values := v_insert_values || '3600';
      ELSE 
        -- Default for unknown columns
        IF v_col.data_type IN ('integer', 'bigint', 'numeric') THEN
          v_insert_values := v_insert_values || '0';
        ELSE
          v_insert_values := v_insert_values || '''N/A''';
        END IF;
    END CASE;
  END LOOP;
  
  -- Add optional columns that might exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warehouse_locations' AND column_name = 'address' AND is_nullable = 'YES') THEN
    v_insert_columns := v_insert_columns || ', address';
    v_insert_values := v_insert_values || ', ''Main Warehouse Address''';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warehouse_locations' AND column_name = 'total_racks' AND is_nullable = 'YES') THEN
    v_insert_columns := v_insert_columns || ', total_racks';
    v_insert_values := v_insert_values || ', 5';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warehouse_locations' AND column_name = 'status' AND is_nullable = 'YES') THEN
    v_insert_columns := v_insert_columns || ', status';
    v_insert_values := v_insert_values || ', ''active''';
  END IF;
  
  -- Build and execute the INSERT
  v_insert_sql := 'INSERT INTO warehouse_locations (' || v_insert_columns || ') VALUES (' || v_insert_values || ') ON CONFLICT (code) DO NOTHING';
  
  RAISE NOTICE 'Executing: %', v_insert_sql;
  EXECUTE v_insert_sql;
  
  RAISE NOTICE '✅ Warehouse WH1 initialized with all required columns';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error: % - %', SQLERRM, SQLSTATE;
    RAISE NOTICE 'Columns detected: %', v_insert_columns;
    RAISE NOTICE 'Values provided: %', v_insert_values;
    RAISE;
END $$;

-- ============================================================================
-- 7. CREATE 5 RACKS FOR WAREHOUSE 1
-- ============================================================================
-- Size categories and their designated racks
DO $$
DECLARE
  v_warehouse_id UUID;
  v_rack_id UUID;
  v_shelf INT;
  v_section INT;
  v_subsection INT;
  v_position_code TEXT;
BEGIN
  -- Get Warehouse 1 ID
  SELECT id INTO v_warehouse_id FROM warehouse_locations WHERE code = 'WH1';
  
  -- RACK 1 & 2: Dual Sport ST 90/90-17
  FOR i IN 1..2 LOOP
    INSERT INTO rack_configurations (
      warehouse_id, rack_number, rack_code, designated_size, size_category
    ) VALUES (
      v_warehouse_id, 
      'RACK-' || i, 
      'WH1-RACK-' || i, 
      'Dual Sport ST 90/90-17', 
      'Dual Sport'
    )
    ON CONFLICT (rack_code) DO NOTHING
    RETURNING id INTO v_rack_id;
    
    -- Create all positions for this rack (4 shelves × 6 sections × 2 subsections)
    FOR v_shelf IN 1..4 LOOP
      FOR v_section IN 1..6 LOOP
        FOR v_subsection IN 1..2 LOOP
          v_position_code := 'WH1-RACK-' || i || '-S' || v_shelf || '-SEC' || v_section || '-SUB' || v_subsection;
          
          INSERT INTO rack_locations (
            rack_id, shelf_number, section_number, subsection_number, position_code, capacity
          ) VALUES (
            v_rack_id, v_shelf, v_section, v_subsection, v_position_code, 15
          )
          ON CONFLICT (position_code) DO NOTHING;
        END LOOP;
      END LOOP;
    END LOOP;
  END LOOP;
  
  -- RACK 3: Placeholder for next size category
  INSERT INTO rack_configurations (
    warehouse_id, rack_number, rack_code, designated_size, size_category
  ) VALUES (
    v_warehouse_id, 'RACK-3', 'WH1-RACK-3', 'To Be Assigned', 'General'
  )
  ON CONFLICT (rack_code) DO NOTHING
  RETURNING id INTO v_rack_id;
  
  FOR v_shelf IN 1..4 LOOP
    FOR v_section IN 1..6 LOOP
      FOR v_subsection IN 1..2 LOOP
        v_position_code := 'WH1-RACK-3-S' || v_shelf || '-SEC' || v_section || '-SUB' || v_subsection;
        INSERT INTO rack_locations (
          rack_id, shelf_number, section_number, subsection_number, position_code, capacity
        ) VALUES (
          v_rack_id, v_shelf, v_section, v_subsection, v_position_code, 15
        )
        ON CONFLICT (position_code) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
  
  -- RACK 4: Placeholder
  INSERT INTO rack_configurations (
    warehouse_id, rack_number, rack_code, designated_size, size_category
  ) VALUES (
    v_warehouse_id, 'RACK-4', 'WH1-RACK-4', 'To Be Assigned', 'General'
  )
  ON CONFLICT (rack_code) DO NOTHING
  RETURNING id INTO v_rack_id;
  
  FOR v_shelf IN 1..4 LOOP
    FOR v_section IN 1..6 LOOP
      FOR v_subsection IN 1..2 LOOP
        v_position_code := 'WH1-RACK-4-S' || v_shelf || '-SEC' || v_section || '-SUB' || v_subsection;
        INSERT INTO rack_locations (
          rack_id, shelf_number, section_number, subsection_number, position_code, capacity
        ) VALUES (
          v_rack_id, v_shelf, v_section, v_subsection, v_position_code, 15
        )
        ON CONFLICT (position_code) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
  
  -- RACK 5: Placeholder
  INSERT INTO rack_configurations (
    warehouse_id, rack_number, rack_code, designated_size, size_category
  ) VALUES (
    v_warehouse_id, 'RACK-5', 'WH1-RACK-5', 'To Be Assigned', 'General'
  )
  ON CONFLICT (rack_code) DO NOTHING
  RETURNING id INTO v_rack_id;
  
  FOR v_shelf IN 1..4 LOOP
    FOR v_section IN 1..6 LOOP
      FOR v_subsection IN 1..2 LOOP
        v_position_code := 'WH1-RACK-5-S' || v_shelf || '-SEC' || v_section || '-SUB' || v_subsection;
        INSERT INTO rack_locations (
          rack_id, shelf_number, section_number, subsection_number, position_code, capacity
        ) VALUES (
          v_rack_id, v_shelf, v_section, v_subsection, v_position_code, 15
        )
        ON CONFLICT (position_code) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
  
END $$;

-- ============================================================================
-- 8. TRIGGER: UPDATE RACK CAPACITY ON INVENTORY ASSIGNMENT
-- ============================================================================
CREATE OR REPLACE FUNCTION update_rack_capacity()
RETURNS TRIGGER AS $$
DECLARE
  v_rack_id UUID;
  v_new_count INTEGER;
BEGIN
  -- When inventory unit is assigned to a rack location
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.rack_location_id IS DISTINCT FROM OLD.rack_location_id) THEN
    
    -- Decrement old location if exists
    IF TG_OP = 'UPDATE' AND OLD.rack_location_id IS NOT NULL THEN
      UPDATE rack_locations 
      SET current_count = GREATEST(current_count - 1, 0),
          updated_at = NOW()
      WHERE id = OLD.rack_location_id;
      
      -- Update old rack total
      SELECT rack_id INTO v_rack_id FROM rack_locations WHERE id = OLD.rack_location_id;
      UPDATE rack_configurations 
      SET current_count = GREATEST(current_count - 1, 0),
          status = CASE 
            WHEN current_count - 1 < total_capacity THEN 'active'
            ELSE status
          END,
          updated_at = NOW()
      WHERE id = v_rack_id;
    END IF;
    
    -- Increment new location
    IF NEW.rack_location_id IS NOT NULL THEN
      UPDATE rack_locations 
      SET current_count = current_count + 1,
          status = CASE 
            WHEN current_count + 1 >= capacity THEN 'full'
            ELSE 'available'
          END,
          updated_at = NOW()
      WHERE id = NEW.rack_location_id;
      
      -- Update new rack total
      SELECT rack_id INTO v_rack_id FROM rack_locations WHERE id = NEW.rack_location_id;
      UPDATE rack_configurations 
      SET current_count = current_count + 1,
          status = CASE 
            WHEN current_count + 1 >= total_capacity THEN 'full'
            ELSE 'active'
          END,
          updated_at = NOW()
      WHERE id = v_rack_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_rack_capacity ON inventory_units;
CREATE TRIGGER trigger_update_rack_capacity
  AFTER INSERT OR UPDATE ON inventory_units
  FOR EACH ROW
  EXECUTE FUNCTION update_rack_capacity();

-- ============================================================================
-- 9. FUNCTION: GET AVAILABLE RACK LOCATIONS FOR SIZE
-- ============================================================================
CREATE OR REPLACE FUNCTION get_available_rack_locations(
  p_size_category TEXT,
  p_warehouse_code TEXT DEFAULT 'WH1'
)
RETURNS TABLE (
  rack_id UUID,
  rack_code TEXT,
  rack_number TEXT,
  designated_size TEXT,
  total_capacity INTEGER,
  current_count INTEGER,
  available_capacity INTEGER,
  location_id UUID,
  position_code TEXT,
  shelf_number INTEGER,
  section_number INTEGER,
  subsection_number INTEGER,
  location_capacity INTEGER,
  location_current_count INTEGER,
  location_available_space INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rc.id as rack_id,
    rc.rack_code,
    rc.rack_number,
    rc.designated_size,
    rc.total_capacity,
    rc.current_count,
    (rc.total_capacity - rc.current_count) as available_capacity,
    rl.id as location_id,
    rl.position_code,
    rl.shelf_number,
    rl.section_number,
    rl.subsection_number,
    rl.capacity as location_capacity,
    rl.current_count as location_current_count,
    rl.available_space as location_available_space
  FROM rack_configurations rc
  JOIN rack_locations rl ON rl.rack_id = rc.id
  JOIN warehouse_locations wl ON wl.id = rc.warehouse_id
  WHERE 
    wl.code = p_warehouse_code
    AND rc.size_category = p_size_category
    AND rc.status != 'inactive'
    AND rl.status = 'available'
    AND rl.available_space > 0
  ORDER BY rc.rack_number, rl.shelf_number, rl.section_number, rl.subsection_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. GRANT PERMISSIONS
-- ============================================================================
GRANT ALL ON warehouse_locations TO authenticated;
GRANT ALL ON rack_configurations TO authenticated;
GRANT ALL ON rack_locations TO authenticated;
GRANT ALL ON inventory_relocation_history TO authenticated;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Warehouse rack system created successfully!';
  RAISE NOTICE '📦 Warehouse 1: 5 racks initialized';
  RAISE NOTICE '📊 Each rack: 4 shelves × 6 sections × 2 subsections × 15 capacity = 720 total positions per rack';
  RAISE NOTICE '🏷️ Total capacity: 3,600 tire positions in Warehouse 1';
END $$;
