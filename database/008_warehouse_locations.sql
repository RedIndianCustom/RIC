-- ============================================================================
-- 008: Warehouse Locations Table
-- ============================================================================
-- Creates the warehouse_locations table for managing storage locations
-- in the warehouse (zones, aisles, racks, shelves)
-- ============================================================================

-- Create warehouse_locations table
CREATE TABLE IF NOT EXISTS public.warehouse_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  zone VARCHAR(10) NOT NULL,
  aisle VARCHAR(10) NOT NULL,
  rack VARCHAR(10) NOT NULL,
  shelf VARCHAR(10) NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 0,
  current_stock INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_capacity CHECK (capacity >= 0),
  CONSTRAINT check_current_stock CHECK (current_stock >= 0),
  CONSTRAINT check_stock_not_exceed_capacity CHECK (current_stock <= capacity),
  CONSTRAINT check_status CHECK (status IN ('active', 'full', 'empty', 'maintenance'))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_zone ON public.warehouse_locations(zone);
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_status ON public.warehouse_locations(status);
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_code ON public.warehouse_locations(code);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_warehouse_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_warehouse_locations_updated_at
  BEFORE UPDATE ON public.warehouse_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_warehouse_locations_updated_at();

-- Insert sample data for development/testing
INSERT INTO public.warehouse_locations (code, name, zone, aisle, rack, shelf, capacity, current_stock, status) VALUES
  ('A-01-01-01', 'Zone A - Aisle 1 - Rack 1 - Shelf 1', 'A', '01', '01', '01', 100, 75, 'active'),
  ('A-01-01-02', 'Zone A - Aisle 1 - Rack 1 - Shelf 2', 'A', '01', '01', '02', 100, 50, 'active'),
  ('A-01-02-01', 'Zone A - Aisle 1 - Rack 2 - Shelf 1', 'A', '01', '02', '01', 100, 30, 'active'),
  ('B-02-01-01', 'Zone B - Aisle 2 - Rack 1 - Shelf 1', 'B', '02', '01', '01', 150, 120, 'active'),
  ('B-02-01-02', 'Zone B - Aisle 2 - Rack 1 - Shelf 2', 'B', '02', '01', '02', 150, 150, 'full'),
  ('B-02-02-01', 'Zone B - Aisle 2 - Rack 2 - Shelf 1', 'B', '02', '02', '01', 150, 80, 'active'),
  ('C-03-01-01', 'Zone C - Aisle 3 - Rack 1 - Shelf 1', 'C', '03', '01', '01', 200, 0, 'empty'),
  ('C-03-01-02', 'Zone C - Aisle 3 - Rack 1 - Shelf 2', 'C', '03', '01', '02', 200, 180, 'active'),
  ('D-04-01-01', 'Zone D - Aisle 4 - Rack 1 - Shelf 1', 'D', '04', '01', '01', 120, 0, 'maintenance')
ON CONFLICT (code) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE public.warehouse_locations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow authenticated users to read warehouse locations
CREATE POLICY "Allow authenticated users to read warehouse locations"
  ON public.warehouse_locations
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow admin, manager, and operational_staff to insert warehouse locations
CREATE POLICY "Allow specific roles to insert warehouse locations"
  ON public.warehouse_locations
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

-- Allow admin, manager, and operational_staff to update warehouse locations
CREATE POLICY "Allow specific roles to update warehouse locations"
  ON public.warehouse_locations
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

-- Allow only admin to delete warehouse locations
CREATE POLICY "Allow admin to delete warehouse locations"
  ON public.warehouse_locations
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
GRANT SELECT ON public.warehouse_locations TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.warehouse_locations TO authenticated;

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 'Warehouse locations table created successfully!' as status;
SELECT COUNT(*) as sample_locations FROM public.warehouse_locations;
