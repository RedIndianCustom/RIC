-- ============================================================================
-- 009: FULL FUNCTIONAL DATABASE SCHEMA FOR ADMIN & SYSTEM SUITE
-- ============================================================================
-- Red Indian Customs (RIC) Inventory Management System
-- Description:
-- Creates complete functional tables, relational constraints, updated_at triggers,
-- Row-Level Security (RLS) policies, and default seed data for:
-- 1. Master Products & Tire Catalog (products)
-- 2. Warehouse Facilities & Hierarchy (warehouses)
-- 3. Tire Storage Capacity Rules (tire_capacity_rules)
-- 4. Barcode Serialization Configuration (barcode_configurations)
-- 5. System Settings & Policies (system_settings)
-- 6. Forensic Audit Logs & Timeline (activity_log / audit_logs)
-- 7. Employee Registration & Badges (employees)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. MASTER PRODUCTS TABLE (TIRE CATALOG)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(150) NOT NULL,
    dimensions VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'Standard',
    unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    retail_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    current_stock INTEGER NOT NULL DEFAULT 0,
    reorder_level INTEGER NOT NULL DEFAULT 15,
    status VARCHAR(50) NOT NULL DEFAULT 'In Stock',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT check_positive_stock CHECK (current_stock >= 0),
    CONSTRAINT check_positive_cost CHECK (unit_cost >= 0),
    CONSTRAINT check_positive_price CHECK (retail_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);

-- ============================================================================
-- 2. WAREHOUSE FACILITIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    location TEXT,
    total_slots INTEGER NOT NULL DEFAULT 500,
    occupied_slots INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    levels_data JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT check_wh_slots CHECK (total_slots >= 0 AND occupied_slots >= 0)
);

CREATE INDEX IF NOT EXISTS idx_warehouses_code ON public.warehouses(code);
CREATE INDEX IF NOT EXISTS idx_warehouses_status ON public.warehouses(status);

-- ============================================================================
-- 3. TIRE STORAGE CAPACITY RULES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tire_capacity_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    rim_range VARCHAR(50) NOT NULL,
    section_width_max INTEGER NOT NULL DEFAULT 255,
    max_stack_height INTEGER NOT NULL DEFAULT 6,
    shelf_capacity INTEGER NOT NULL DEFAULT 30,
    allowed_levels TEXT[] DEFAULT ARRAY['Ground Level', 'Mezzanine']::TEXT[],
    safety_weight_limit_kg INTEGER NOT NULL DEFAULT 400,
    status VARCHAR(50) NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_capacity_rules_rim ON public.tire_capacity_rules(rim_range);
CREATE INDEX IF NOT EXISTS idx_capacity_rules_status ON public.tire_capacity_rules(status);

-- ============================================================================
-- 4. BARCODE CONFIGURATION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.barcode_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    format VARCHAR(50) NOT NULL DEFAULT 'CODE128',
    prefix VARCHAR(50) NOT NULL DEFAULT 'RIC-TR',
    include_date_stamp BOOLEAN NOT NULL DEFAULT true,
    include_checksum BOOLEAN NOT NULL DEFAULT true,
    serial_length INTEGER NOT NULL DEFAULT 6,
    label_size VARCHAR(50) NOT NULL DEFAULT '4x2',
    printer_dpi INTEGER NOT NULL DEFAULT 300,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. SYSTEM SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) UNIQUE NOT NULL,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- ============================================================================
-- 6. FORENSIC AUDIT / ACTIVITY LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'System',
    severity VARCHAR(20) NOT NULL DEFAULT 'info',
    details TEXT,
    ip_address VARCHAR(50),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_action ON public.activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_log_category ON public.activity_log(category);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_severity ON public.activity_log(severity);

-- ============================================================================
-- 7. EMPLOYEES TABLE & COMPATIBILITY COLUMNS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    employee_position VARCHAR(50) NOT NULL DEFAULT 'operational_staff',
    department VARCHAR(100) NOT NULL DEFAULT 'Warehouse Operations',
    assigned_warehouse VARCHAR(255) DEFAULT 'Main Hub - Warehouse A',
    is_used BOOLEAN NOT NULL DEFAULT false,
    used_at TIMESTAMPTZ,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist if table was previously created by an older migration
DO $$
BEGIN
    ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
    ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT 'Warehouse Operations';
    ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS assigned_warehouse VARCHAR(255) DEFAULT 'Main Hub - Warehouse A';
    ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS employee_position VARCHAR(50) DEFAULT 'operational_staff';
    ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT false;
    ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;
    ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
    
    -- Activity log columns
    ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'System';
    ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'info';
    ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS details TEXT;
    ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50);
    ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
    
    -- Warehouses columns
    ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS levels_data JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS total_slots INTEGER DEFAULT 500;
    ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS occupied_slots INTEGER DEFAULT 0;
    ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS location TEXT;

    -- Products columns
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS model VARCHAR(150);
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS dimensions VARCHAR(100);
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12, 2) DEFAULT 0.00;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS retail_price NUMERIC(12, 2) DEFAULT 0.00;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS current_stock INTEGER DEFAULT 0;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS reorder_level INTEGER DEFAULT 15;
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'In Stock';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Columns already configured.';
END $$;

CREATE INDEX IF NOT EXISTS idx_employees_code ON public.employees(employee_code);
CREATE INDEX IF NOT EXISTS idx_employees_dept ON public.employees(department);

-- ============================================================================
-- TRIGGERS FOR AUTO UPDATED_AT
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_warehouses_updated_at ON public.warehouses;
CREATE TRIGGER trg_warehouses_updated_at BEFORE UPDATE ON public.warehouses FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_capacity_rules_updated_at ON public.tire_capacity_rules;
CREATE TRIGGER trg_capacity_rules_updated_at BEFORE UPDATE ON public.tire_capacity_rules FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_barcode_config_updated_at ON public.barcode_configurations;
CREATE TRIGGER trg_barcode_config_updated_at BEFORE UPDATE ON public.barcode_configurations FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER trg_system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS trg_employees_updated_at ON public.employees;
CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tire_capacity_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barcode_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Products Policies
DROP POLICY IF EXISTS "Allow authenticated read products" ON public.products;
CREATE POLICY "Allow authenticated read products" ON public.products FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow staff write products" ON public.products;
CREATE POLICY "Allow staff write products" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Warehouses Policies
DROP POLICY IF EXISTS "Allow authenticated read warehouses" ON public.warehouses;
CREATE POLICY "Allow authenticated read warehouses" ON public.warehouses FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow admin write warehouses" ON public.warehouses;
CREATE POLICY "Allow admin write warehouses" ON public.warehouses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Capacity Rules Policies
DROP POLICY IF EXISTS "Allow authenticated read capacity rules" ON public.tire_capacity_rules;
CREATE POLICY "Allow authenticated read capacity rules" ON public.tire_capacity_rules FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow admin write capacity rules" ON public.tire_capacity_rules;
CREATE POLICY "Allow admin write capacity rules" ON public.tire_capacity_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Barcode Config Policies
DROP POLICY IF EXISTS "Allow authenticated read barcode config" ON public.barcode_configurations;
CREATE POLICY "Allow authenticated read barcode config" ON public.barcode_configurations FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow admin write barcode config" ON public.barcode_configurations;
CREATE POLICY "Allow admin write barcode config" ON public.barcode_configurations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- System Settings Policies
DROP POLICY IF EXISTS "Allow authenticated read system settings" ON public.system_settings;
CREATE POLICY "Allow authenticated read system settings" ON public.system_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow admin write system settings" ON public.system_settings;
CREATE POLICY "Allow admin write system settings" ON public.system_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Activity Log Policies
DROP POLICY IF EXISTS "Allow authenticated read activity log" ON public.activity_log;
CREATE POLICY "Allow authenticated read activity log" ON public.activity_log FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert activity log" ON public.activity_log;
CREATE POLICY "Allow authenticated insert activity log" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (true);

-- Employees Policies
DROP POLICY IF EXISTS "Allow authenticated read employees" ON public.employees;
CREATE POLICY "Allow authenticated read employees" ON public.employees FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow admin write employees" ON public.employees;
CREATE POLICY "Allow admin write employees" ON public.employees FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Grants
GRANT ALL ON public.products TO authenticated;
GRANT ALL ON public.warehouses TO authenticated;
GRANT ALL ON public.tire_capacity_rules TO authenticated;
GRANT ALL ON public.barcode_configurations TO authenticated;
GRANT ALL ON public.system_settings TO authenticated;
GRANT ALL ON public.activity_log TO authenticated;
GRANT ALL ON public.employees TO authenticated;

-- ============================================================================
-- SEED DATA (IF NOT EXISTS)
-- ============================================================================

-- 1. Insert Default Barcode Configuration
INSERT INTO public.barcode_configurations (format, prefix, include_date_stamp, include_checksum, serial_length, label_size, printer_dpi, is_active)
VALUES ('CODE128', 'RIC-TR', true, true, 6, '4x2', 300, true)
ON CONFLICT DO NOTHING;

-- 2. Insert Default Warehouses
INSERT INTO public.warehouses (code, name, location, total_slots, occupied_slots, status, levels_data)
VALUES
('WH-MAIN-01', 'Main Hub - Warehouse A', 'Building 1, North Industrial Park', 1000, 840, 'active', '[
  {
    "id": "lvl-01",
    "name": "Ground Level - Heavy Stacks",
    "code": "LVL-01",
    "racks": [
      {"id": "rk-01", "code": "RACK-A01", "capacity": 200, "occupied": 180, "tireSizes": "19\"-22\" SUV/Truck"},
      {"id": "rk-02", "code": "RACK-A02", "capacity": 200, "occupied": 175, "tireSizes": "19\"-22\" SUV/Truck"},
      {"id": "rk-03", "code": "RACK-A03", "capacity": 200, "occupied": 160, "tireSizes": "17\"-18\" Passenger"}
    ]
  },
  {
    "id": "lvl-02",
    "name": "Mezzanine Level - Passenger Tires",
    "code": "LVL-02",
    "racks": [
      {"id": "rk-04", "code": "RACK-A04", "capacity": 200, "occupied": 170, "tireSizes": "14\"-16\" Passenger"},
      {"id": "rk-05", "code": "RACK-A05", "capacity": 200, "occupied": 155, "tireSizes": "14\"-16\" Passenger"}
    ]
  }
]'::jsonb),
('WH-EAST-02', 'East Expansion - Warehouse B', 'Building 2, Logistics Sector East', 800, 620, 'active', '[
  {
    "id": "lvl-03",
    "name": "High-Density Storage Bay",
    "code": "LVL-01",
    "racks": [
      {"id": "rk-06", "code": "RACK-B01", "capacity": 400, "occupied": 320, "tireSizes": "15\"-18\" All-Terrain"},
      {"id": "rk-07", "code": "RACK-B02", "capacity": 400, "occupied": 300, "tireSizes": "17\"-20\" Performance"}
    ]
  }
]'::jsonb),
('WH-SOUT-03', 'South Distribution - Warehouse C', 'South Terminal Yard, Gate 4', 500, 470, 'active', '[
  {
    "id": "lvl-04",
    "name": "Express Release Zone",
    "code": "LVL-01",
    "racks": [
      {"id": "rk-08", "code": "RACK-C01", "capacity": 250, "occupied": 240, "tireSizes": "Standard Passenger"},
      {"id": "rk-09", "code": "RACK-C02", "capacity": 250, "occupied": 230, "tireSizes": "Commercial Light Truck"}
    ]
  }
]'::jsonb),
('WH-OVER-04', 'Overflow Yard - Warehouse D', 'Outdoor Staging Depot', 400, 120, 'active', '[
  {
    "id": "lvl-05",
    "name": "Bulk Pallet Stacking Area",
    "code": "LVL-01",
    "racks": [
      {"id": "rk-10", "code": "RACK-D01", "capacity": 400, "occupied": 120, "tireSizes": "Off-Road & Specialty"}
    ]
  }
]'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- 3. Insert Default Products
INSERT INTO public.products (sku, brand, model, dimensions, category, unit_cost, retail_price, current_stock, reorder_level, status)
VALUES
('MICH-PS4S-2454519', 'Michelin', 'Pilot Sport 4S', '245/45 R19 98Y', 'Ultra High Performance', 185.00, 289.00, 64, 20, 'In Stock'),
('PIR-PZERO-2754020', 'Pirelli', 'P Zero PZ4', '275/40 R20 106Y', 'Ultra High Performance', 210.00, 325.00, 14, 25, 'Low Stock'),
('BRDG-DUEL-2657017', 'Bridgestone', 'Dueler A/T Revo 3', '265/70 R17 115T', 'All-Terrain / SUV', 145.00, 220.00, 92, 30, 'In Stock'),
('CONT-EXTR-2254518', 'Continental', 'ExtremeContact DWS06 Plus', '225/45 R18 95Y', 'All-Season Performance', 130.00, 198.00, 8, 20, 'Low Stock'),
('GDYR-WRAN-2856518', 'Goodyear', 'Wrangler Duratrac', '285/65 R18 125Q', 'Rugged Off-Road', 195.00, 295.00, 48, 15, 'In Stock'),
('DNL-SPRT-2354019', 'Dunlop', 'Sport Maxx RT2', '235/40 R19 96Y', 'Ultra High Performance', 140.00, 215.00, 5, 15, 'Critical Low')
ON CONFLICT (sku) DO NOTHING;

-- 4. Insert Default Tire Capacity Rules
INSERT INTO public.tire_capacity_rules (name, rim_range, section_width_max, max_stack_height, shelf_capacity, allowed_levels, safety_weight_limit_kg, status)
VALUES
('Compact & Passenger Standard', '13" - 16"', 215, 8, 40, ARRAY['Ground Level', 'Mezzanine', 'Racks A01-A05'], 480, 'Active'),
('Mid-Size Sedan & Crossover', '17" - 19"', 255, 6, 30, ARRAY['Ground Level', 'Mezzanine', 'Racks A01-A03'], 420, 'Active'),
('Large SUV & Performance Wheels', '20" - 22"', 315, 4, 20, ARRAY['Ground Level Only', 'Heavy Duty Racks'], 380, 'Active'),
('Heavy Duty Commercial & Off-Road', '22.5" - 24"+', 385, 3, 12, ARRAY['Ground Floor Pad Only'], 450, 'Active')
ON CONFLICT DO NOTHING;

-- 5. Insert Default System Settings
INSERT INTO public.system_settings (category, settings)
VALUES
('company', '{
  "companyName": "Red Indian Customs & Tire Logistics",
  "taxId": "RIC-PH-98214-X",
  "supportEmail": "ops@redindiancustoms.com",
  "supportPhone": "+1 (555) 782-9011",
  "headquarters": "104 Industrial Sector Parkway, North Hub",
  "defaultCurrency": "USD ($)",
  "systemTimezone": "Asia/Manila (UTC+08:00)"
}'::jsonb),
('security', '{
  "requireMFA": true,
  "sessionTimeoutMinutes": 45,
  "maxLoginAttempts": 5,
  "enforceStrongPasswords": true,
  "auditLoggingLevel": "Verbose"
}'::jsonb),
('notifications', '{
  "emailAlertLowStock": true,
  "emailAlertDiscrepancy": true,
  "discordWebhookUrl": "https://discord.com/api/webhooks/12345/ric-alerts",
  "discordAlertsEnabled": false,
  "soundAlertsOnScan": true
}'::jsonb),
('database', '{
  "autoBackupDaily": true,
  "backupRetentionDays": 30,
  "cloudSyncBucket": "gs://ric-db-backups-primary",
  "lastBackupTimestamp": "2024-08-18 03:00:00 UTC"
}'::jsonb)
ON CONFLICT (category) DO NOTHING;

-- 6. Insert Default Employees
INSERT INTO public.employees (employee_code, full_name, email, phone, employee_position, department, assigned_warehouse, is_used)
VALUES
('EMP-ADM-9021', 'Alexander Vance', 'admin@ric.com', '+1 (555) 019-1001', 'admin', 'Executive & Admin', 'Main Hub - Warehouse A', true),
('EMP-MGR-4412', 'Sarah Jenkins', 's.jenkins@ric.com', '+1 (555) 019-1002', 'manager', 'Floor Supervision', 'Main Hub - Warehouse A', true),
('EMP-WH-7731', 'Marcus Brody', 'm.brody@ric.com', '+1 (555) 019-1003', 'warehouse_staff', 'Warehouse Operations', 'East Expansion - Warehouse B', true),
('EMP-OP-3319', 'Elena Rostova', 'e.rostova@ric.com', '+1 (555) 019-1004', 'operational_staff', 'Inbound Logistics', 'Main Hub - Warehouse A', true),
('EMP-SL-8820', 'David Kim', 'd.kim@ric.com', '+1 (555) 019-1005', 'sales_staff', 'Sales & POS', 'South Distribution - Warehouse C', true)
ON CONFLICT (employee_code) DO NOTHING;

-- 7. Insert Initial Activity Logs
INSERT INTO public.activity_log (action, category, severity, details, ip_address, metadata)
VALUES
('role.permission_granted', 'Security', 'critical', 'Assigned "Manager" and "Discrepancy Approval" permissions to Sarah Jenkins', '192.168.1.101', '{"targetUser": "s.jenkins@ric.com", "grantedRoles": ["manager"]}'::jsonb),
('warehouse.capacity_override', 'Facilities', 'warning', 'Increased Rack A04 capacity override from 200 to 220 units for incoming shipment batch', '192.168.1.104', '{"rackCode": "RACK-A04", "oldLimit": 200, "newLimit": 220}'::jsonb),
('barcode.scheme_updated', 'System', 'notice', 'Configured Code-128 checksum verification rule for all new tire print runs', '192.168.1.101', '{"format": "CODE128", "checksumModulo": 10, "prefix": "RIC-TR"}'::jsonb),
('user.login_success', 'Authentication', 'info', 'Authenticated via Session Token on Warehouse Floor Terminal #3', '192.168.1.140', '{"device": "Handheld Scanner Zebra TC26"}'::jsonb),
('product.catalog_created', 'Catalog', 'info', 'Added SKU MICH-PS4S-2454519 to Master Catalog with reorder point 20', '192.168.1.112', '{"sku": "MICH-PS4S-2454519", "brand": "Michelin", "msrp": 289.00}'::jsonb);

SELECT '009_admin_full_features.sql executed successfully!' AS status;
