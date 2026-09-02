-- ============================================================================
-- 028: Warehouse Storage Positions Table
-- ============================================================================
-- Creates the warehouse_storage_positions table for managing individual
-- storage positions within racks (section/shelf/subsection level).
-- Each position can store a specific tire size with quantity tracking.
-- ============================================================================

-- Create warehouse_storage_positions table
CREATE TABLE IF NOT EXISTS public.warehouse_storage_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key to warehouse_locations (the rack)
  warehouse_location_id UUID NOT NULL REFERENCES public.warehouse_locations(id) ON DELETE CASCADE,
  
  -- Physical position within the rack
  section_number INTEGER NOT NULL CHECK (section_number > 0),
  shelf_number INTEGER NOT NULL CHECK (shelf_number > 0),
  subsection_number INTEGER NOT NULL CHECK (subsection_number > 0),
  
  -- Position code for easy identification (e.g., "WH1-R01-RK02-S01-SH01-SUB01")
  position_code VARCHAR(100) NOT NULL,
  
  -- Capacity and current stock
  capacity INTEGER NOT NULL DEFAULT 0 CHECK (capacity >= 0),
  current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  
  -- Tire assignment (string for now, can be FK to tire_sizes table later)
  tire_size VARCHAR(100),
  tire_size_id UUID,  -- Reserved for future FK to tire_sizes table
  
  -- Metadata for storing multiple products breakdown
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'empty' 
    CHECK (status IN ('empty', 'available', 'full', 'reserved', 'maintenance')),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_stock_not_exceed_capacity CHECK (current_stock <= capacity),
  CONSTRAINT unique_position_per_rack UNIQUE (warehouse_location_id, section_number, shelf_number, subsection_number)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_storage_positions_location 
  ON public.warehouse_storage_positions(warehouse_location_id);

CREATE INDEX IF NOT EXISTS idx_storage_positions_tire_size 
  ON public.warehouse_storage_positions(tire_size);

CREATE INDEX IF NOT EXISTS idx_storage_positions_status 
  ON public.warehouse_storage_positions(status);

CREATE INDEX IF NOT EXISTS idx_storage_positions_code 
  ON public.warehouse_storage_positions(position_code);

-- Composite index for position lookup
CREATE INDEX IF NOT EXISTS idx_storage_positions_coordinates 
  ON public.warehouse_storage_positions(warehouse_location_id, section_number, shelf_number, subsection_number);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_storage_positions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_storage_positions_updated_at
  BEFORE UPDATE ON public.warehouse_storage_positions
  FOR EACH ROW
  EXECUTE FUNCTION update_storage_positions_updated_at();

-- Create trigger to update warehouse_location.current_stock when positions change
CREATE OR REPLACE FUNCTION update_rack_stock_from_positions()
RETURNS TRIGGER AS $$
DECLARE
  v_total_stock INTEGER;
BEGIN
  -- Calculate total stock for the rack
  SELECT COALESCE(SUM(current_stock), 0)
  INTO v_total_stock
  FROM public.warehouse_storage_positions
  WHERE warehouse_location_id = COALESCE(NEW.warehouse_location_id, OLD.warehouse_location_id);
  
  -- Update the warehouse_location
  UPDATE public.warehouse_locations
  SET 
    current_stock = v_total_stock,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.warehouse_location_id, OLD.warehouse_location_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_rack_stock_on_position_change
  AFTER INSERT OR UPDATE OR DELETE ON public.warehouse_storage_positions
  FOR EACH ROW
  EXECUTE FUNCTION update_rack_stock_from_positions();

-- Enable Row Level Security (RLS)
ALTER TABLE public.warehouse_storage_positions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow authenticated users to read storage positions
CREATE POLICY "Allow authenticated users to read storage positions"
  ON public.warehouse_storage_positions
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow admin, manager, and operational_staff to insert storage positions
CREATE POLICY "Allow specific roles to insert storage positions"
  ON public.warehouse_storage_positions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND r.name IN ('admin', 'manager', 'operational_staff')
    )
  );

-- Allow admin, manager, and operational_staff to update storage positions
CREATE POLICY "Allow specific roles to update storage positions"
  ON public.warehouse_storage_positions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND r.name IN ('admin', 'manager', 'operational_staff')
    )
  );

-- Allow only admin to delete storage positions
CREATE POLICY "Allow admin to delete storage positions"
  ON public.warehouse_storage_positions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND r.name = 'admin'
    )
  );

-- Grant permissions
GRANT SELECT ON public.warehouse_storage_positions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.warehouse_storage_positions TO authenticated;

-- ============================================================================
-- Helper function to generate positions for a rack
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_storage_positions_for_rack(
  p_warehouse_location_id UUID,
  p_sections INTEGER,
  p_shelves INTEGER,
  p_subsections INTEGER,
  p_capacity_per_subsection INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_rack_code VARCHAR(100);
  v_position_code VARCHAR(100);
  v_count INTEGER := 0;
  v_section INTEGER;
  v_shelf INTEGER;
  v_subsection INTEGER;
BEGIN
  -- Get the rack code
  SELECT code INTO v_rack_code
  FROM public.warehouse_locations
  WHERE id = p_warehouse_location_id;
  
  IF v_rack_code IS NULL THEN
    RAISE EXCEPTION 'Warehouse location not found: %', p_warehouse_location_id;
  END IF;
  
  -- Delete existing positions for this rack
  DELETE FROM public.warehouse_storage_positions
  WHERE warehouse_location_id = p_warehouse_location_id;
  
  -- Generate positions
  FOR v_section IN 1..p_sections LOOP
    FOR v_shelf IN 1..p_shelves LOOP
      FOR v_subsection IN 1..p_subsections LOOP
        -- Generate position code
        v_position_code := v_rack_code || 
          '-S' || LPAD(v_section::TEXT, 2, '0') ||
          '-SH' || LPAD(v_shelf::TEXT, 2, '0') ||
          '-SUB' || LPAD(v_subsection::TEXT, 2, '0');
        
        -- Insert position
        INSERT INTO public.warehouse_storage_positions (
          warehouse_location_id,
          section_number,
          shelf_number,
          subsection_number,
          position_code,
          capacity,
          current_stock,
          status
        ) VALUES (
          p_warehouse_location_id,
          v_section,
          v_shelf,
          v_subsection,
          v_position_code,
          p_capacity_per_subsection,
          0,
          'empty'
        );
        
        v_count := v_count + 1;
      END LOOP;
    END LOOP;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 'Warehouse storage positions table created successfully!' as status;

