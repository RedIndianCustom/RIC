-- ============================================================================
-- CREATE RIC SERIAL NUMBER MAPPING TABLE
-- ============================================================================
-- Maps RIC serial numbers to specific products
-- Each serial number is unique and belongs to one product/tire
-- ============================================================================

CREATE TABLE IF NOT EXISTS ric_serial_numbers (
  id BIGSERIAL PRIMARY KEY,
  
  -- Serial number (e.g., RIC000000006060)
  serial_number VARCHAR(50) UNIQUE NOT NULL,
  
  -- Product this serial belongs to (UUID to match products table)
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  
  -- Additional metadata
  manufactured_date DATE,
  batch_number VARCHAR(100),
  
  -- Tracking
  status VARCHAR(50) DEFAULT 'MANUFACTURED', -- MANUFACTURED, IN_TRANSIT, RECEIVED, INSTALLED, DISPOSED
  current_location VARCHAR(255),
  
  -- Lifecycle tracking
  received_at TIMESTAMPTZ,
  received_by UUID REFERENCES auth.users(id),
  installed_at TIMESTAMPTZ,
  installed_on VARCHAR(255), -- Vehicle ID or location
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ric_serial_numbers_serial 
  ON ric_serial_numbers(serial_number);

CREATE INDEX IF NOT EXISTS idx_ric_serial_numbers_product 
  ON ric_serial_numbers(product_id);

CREATE INDEX IF NOT EXISTS idx_ric_serial_numbers_status 
  ON ric_serial_numbers(status);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_ric_serial_numbers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ric_serial_numbers_updated_at
  BEFORE UPDATE ON ric_serial_numbers
  FOR EACH ROW
  EXECUTE FUNCTION update_ric_serial_numbers_updated_at();

-- Enable RLS
ALTER TABLE ric_serial_numbers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view RIC serials"
  ON ric_serial_numbers FOR SELECT
  USING (true); -- All authenticated users can view

CREATE POLICY "Warehouse staff can update RIC serials"
  ON ric_serial_numbers FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT ur.user_id 
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE r.name IN ('warehouse_manager', 'warehouse_staff', 'admin')
    )
  );

CREATE POLICY "Admin can insert RIC serials"
  ON ric_serial_numbers FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT ur.user_id 
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE r.name IN ('admin', 'warehouse_manager')
    )
  );

-- Grant permissions
GRANT ALL ON ric_serial_numbers TO service_role;
GRANT USAGE, SELECT ON SEQUENCE ric_serial_numbers_id_seq TO service_role;

COMMENT ON TABLE ric_serial_numbers IS 'Maps RIC serial numbers to specific products for traceability';
