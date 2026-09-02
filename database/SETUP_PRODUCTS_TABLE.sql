-- ============================================================================
-- SETUP: Products Table with Sample Tire Data
-- Copy and paste this entire file into Supabase SQL Editor and run it
-- ============================================================================

-- Create products table if not exists (matching existing schema)
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Operational staff can manage products" ON public.products;

-- Create policies
CREATE POLICY "Authenticated users can view products"
ON public.products FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage products"
ON public.products FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
    )
);

CREATE POLICY "Operational staff can manage products"
ON public.products FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name IN ('Admin', 'Operational Staff')
    )
);

-- Grant permissions
GRANT SELECT ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

-- Insert sample tire products
INSERT INTO public.products (sku, brand, model, dimensions, category, unit_cost, retail_price, current_stock, reorder_level, status)
VALUES
-- Classic Sawtooth
('SAW-15-130/90', 'Red Indian Customs', 'Classic Sawtooth', '130/90-15', 'Sawtooth', 45.00, 89.99, 25, 10, 'In Stock'),
('SAW-15-170/80', 'Red Indian Customs', 'Classic Sawtooth', '170/80-15', 'Sawtooth', 52.00, 99.99, 18, 10, 'In Stock'),
('SAW-16-130/90', 'Red Indian Customs', 'Classic Sawtooth', '130/90-16', 'Sawtooth', 46.00, 89.99, 30, 10, 'In Stock'),
('SAW-16-150/80', 'Red Indian Customs', 'Classic Sawtooth', '150/80-16', 'Sawtooth', 48.00, 94.99, 22, 10, 'In Stock'),
('SAW-16-180/65', 'Red Indian Customs', 'Classic Sawtooth', '180/65-16', 'Sawtooth', 55.00, 109.99, 15, 10, 'In Stock'),
('SAW-17-90/90', 'Red Indian Customs', 'Classic Sawtooth', '90/90-17', 'Sawtooth', 42.00, 84.99, 35, 10, 'In Stock'),
('SAW-17-100/90', 'Red Indian Customs', 'Classic Sawtooth', '100/90-17', 'Sawtooth', 43.00, 86.99, 28, 10, 'In Stock'),
('SAW-17-120/90', 'Red Indian Customs', 'Classic Sawtooth', '120/90-17', 'Sawtooth', 47.00, 92.99, 20, 10, 'In Stock'),
('SAW-17-130/90', 'Red Indian Customs', 'Classic Sawtooth', '130/90-17', 'Sawtooth', 49.00, 96.99, 12, 10, 'In Stock'),
('SAW-18-90/90', 'Red Indian Customs', 'Classic Sawtooth', '90/90-18', 'Sawtooth', 43.00, 85.99, 32, 10, 'In Stock'),
('SAW-18-100/90', 'Red Indian Customs', 'Classic Sawtooth', '100/90-18', 'Sawtooth', 44.00, 87.99, 26, 10, 'In Stock'),
('SAW-18-120/90', 'Red Indian Customs', 'Classic Sawtooth', '120/90-18', 'Sawtooth', 48.00, 93.99, 19, 10, 'In Stock'),
('SAW-18-130/90', 'Red Indian Customs', 'Classic Sawtooth', '130/90-18', 'Sawtooth', 50.00, 97.99, 14, 10, 'In Stock'),
('SAW-19-80/90', 'Red Indian Customs', 'Classic Sawtooth', '80/90-19', 'Sawtooth', 41.00, 82.99, 24, 10, 'In Stock'),
('SAW-19-100/90', 'Red Indian Customs', 'Classic Sawtooth', '100/90-19', 'Sawtooth', 45.00, 88.99, 21, 10, 'In Stock'),
('SAW-19-120/90', 'Red Indian Customs', 'Classic Sawtooth', '120/90-19', 'Sawtooth', 49.00, 94.99, 16, 10, 'In Stock'),
('SAW-21-90/90', 'Red Indian Customs', 'Classic Sawtooth', '90/90-21', 'Sawtooth', 46.00, 90.99, 18, 10, 'In Stock'),

-- Enduro Trail
('END-17-70/90', 'Red Indian Customs', 'Enduro Trail', '70/90-17', 'Enduro', 38.00, 76.99, 28, 10, 'In Stock'),
('END-17-80/90', 'Red Indian Customs', 'Enduro Trail', '80/90-17', 'Enduro', 40.00, 79.99, 25, 10, 'In Stock'),
('END-17-90/90', 'Red Indian Customs', 'Enduro Trail', '90/90-17', 'Enduro', 42.00, 82.99, 22, 10, 'In Stock'),
('END-17-110/90', 'Red Indian Customs', 'Enduro Trail', '110/90-17', 'Enduro', 46.00, 89.99, 19, 10, 'In Stock'),
('END-17-120/90', 'Red Indian Customs', 'Enduro Trail', '120/90-17', 'Enduro', 48.00, 92.99, 15, 10, 'In Stock'),
('END-18-70/90', 'Red Indian Customs', 'Enduro Trail', '70/90-18', 'Enduro', 39.00, 77.99, 27, 10, 'In Stock'),
('END-18-80/90', 'Red Indian Customs', 'Enduro Trail', '80/90-18', 'Enduro', 41.00, 80.99, 24, 10, 'In Stock'),
('END-18-90/90', 'Red Indian Customs', 'Enduro Trail', '90/90-18', 'Enduro', 43.00, 83.99, 21, 10, 'In Stock'),
('END-18-110/90', 'Red Indian Customs', 'Enduro Trail', '110/90-18', 'Enduro', 47.00, 90.99, 17, 10, 'In Stock'),
('END-18-120/90', 'Red Indian Customs', 'Enduro Trail', '120/90-18', 'Enduro', 49.00, 93.99, 14, 10, 'In Stock'),
('END-19-70/90', 'Red Indian Customs', 'Enduro Trail', '70/90-19', 'Enduro', 40.00, 78.99, 26, 10, 'In Stock'),
('END-19-90/90', 'Red Indian Customs', 'Enduro Trail', '90/90-19', 'Enduro', 44.00, 84.99, 20, 10, 'In Stock'),
('END-21-70/90', 'Red Indian Customs', 'Enduro Trail', '70/90-21', 'Enduro', 41.00, 79.99, 23, 10, 'In Stock'),
('END-21-90/90', 'Red Indian Customs', 'Enduro Trail', '90/90-21', 'Enduro', 45.00, 86.99, 18, 10, 'In Stock'),

-- ST Dual Sport
('STD-17-90/90', 'Red Indian Customs', 'ST Dual Sport', '90/90-17', 'Dual Sport', 44.00, 87.99, 30, 10, 'In Stock'),
('STD-17-100/90', 'Red Indian Customs', 'ST Dual Sport', '100/90-17', 'Dual Sport', 45.00, 89.99, 28, 10, 'In Stock'),
('STD-17-110/90', 'Red Indian Customs', 'ST Dual Sport', '110/90-17', 'Dual Sport', 48.00, 93.99, 24, 10, 'In Stock'),
('STD-17-120/80', 'Red Indian Customs', 'ST Dual Sport', '120/80-17', 'Dual Sport', 50.00, 96.99, 20, 10, 'In Stock'),
('STD-17-130/80', 'Red Indian Customs', 'ST Dual Sport', '130/80-17', 'Dual Sport', 52.00, 99.99, 16, 10, 'In Stock'),
('STD-17-140/70', 'Red Indian Customs', 'ST Dual Sport', '140/70-17', 'Dual Sport', 54.00, 104.99, 12, 10, 'In Stock'),
('STD-17-150/70', 'Red Indian Customs', 'ST Dual Sport', '150/70-17', 'Dual Sport', 56.00, 109.99, 8, 10, 'Low Stock'),
('STD-18-90/90', 'Red Indian Customs', 'ST Dual Sport', '90/90-18', 'Dual Sport', 45.00, 88.99, 29, 10, 'In Stock'),
('STD-18-100/90', 'Red Indian Customs', 'ST Dual Sport', '100/90-18', 'Dual Sport', 46.00, 90.99, 26, 10, 'In Stock'),
('STD-18-120/80', 'Red Indian Customs', 'ST Dual Sport', '120/80-18', 'Dual Sport', 51.00, 97.99, 18, 10, 'In Stock'),
('STD-19-90/90', 'Red Indian Customs', 'ST Dual Sport', '90/90-19', 'Dual Sport', 46.00, 89.99, 22, 10, 'In Stock')

ON CONFLICT (sku) DO UPDATE SET
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    dimensions = EXCLUDED.dimensions,
    category = EXCLUDED.category,
    updated_at = NOW();

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Verify setup
SELECT 
    'Products table setup complete!' as message,
    COUNT(*) as total_products,
    COUNT(DISTINCT brand) as brands,
    COUNT(DISTINCT category) as categories
FROM public.products;
