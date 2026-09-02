-- ============================================================
-- FINAL FIX — Run this in Supabase SQL Editor
-- ============================================================

-- ── 1. Add missing columns to users table ────────────────────
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS position       text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS employee_code  text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active      boolean NOT NULL DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_at  timestamptz;

-- ── 2. Confirm auth user exists (should return 1 row) ─────────
SELECT id, email FROM auth.users WHERE id = 'e876d8cd-1876-499e-afee-1dede5c87f14';

-- ── 3. Insert user profile (auth.users FK must exist first) ───
-- We reference auth.users(id), so as long as the auth user exists
-- this will work. The error means users table FK points to itself
-- which is wrong — let's check and fix:

-- Check if users table FK references auth.users or itself:
SELECT
    tc.constraint_name,
    ccu.table_name AS references_table,
    ccu.column_name AS references_column
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'users'
  AND tc.constraint_type = 'FOREIGN KEY';

-- ── 4. Insert your profile ────────────────────────────────────
DO $$
BEGIN
    -- Only insert if not already there
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = 'e876d8cd-1876-499e-afee-1dede5c87f14') THEN
        INSERT INTO public.users (id, email, full_name, position)
        VALUES (
            'e876d8cd-1876-499e-afee-1dede5c87f14',
            'daisyreydaguplo18@gmail.com',
            'Daisy Rey Daguplo',
            'admin'
        );
        RAISE NOTICE 'User profile created';
    ELSE
        UPDATE public.users
        SET position = 'admin', updated_at = now()
        WHERE id = 'e876d8cd-1876-499e-afee-1dede5c87f14';
        RAISE NOTICE 'User profile updated';
    END IF;
END $$;

-- ── 5. Assign admin role ──────────────────────────────────────
INSERT INTO public.user_roles (user_id, role_id)
SELECT 'e876d8cd-1876-499e-afee-1dede5c87f14', id
FROM public.roles WHERE name = 'admin'
ON CONFLICT DO NOTHING;

-- ── 6. Create suppliers table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.suppliers (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name           text NOT NULL,
    contact_person text,
    email          text,
    phone          text,
    address        text,
    city           text,
    state          text,
    zip_code       text,
    country        text,
    payment_terms  text,
    tax_id         text,
    status         text NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'inactive', 'suspended')),
    notes          text,
    total_orders   integer NOT NULL DEFAULT 0,
    total_value    numeric(15,2) NOT NULL DEFAULT 0,
    created_by     uuid,
    updated_by     uuid,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);

-- ── 7. RLS for suppliers ──────────────────────────────────────
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suppliers_select_all"   ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_insert_staff" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_update_staff" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_delete_admin" ON public.suppliers;

CREATE POLICY "suppliers_select_all"
    ON public.suppliers FOR SELECT TO authenticated USING (true);

CREATE POLICY "suppliers_insert_staff"
    ON public.suppliers FOR INSERT TO authenticated
    WITH CHECK (public.has_role(ARRAY['admin','manager','operational_staff']));

CREATE POLICY "suppliers_update_staff"
    ON public.suppliers FOR UPDATE TO authenticated
    USING (public.has_role(ARRAY['admin','manager','operational_staff']));

CREATE POLICY "suppliers_delete_admin"
    ON public.suppliers FOR DELETE TO authenticated
    USING (public.has_role(ARRAY['admin']));

-- ── 8. Sample suppliers ───────────────────────────────────────
INSERT INTO public.suppliers (name, contact_person, email, phone, address, city, state, zip_code, country, payment_terms, tax_id, status, total_orders, total_value)
VALUES
('Pacific Tire Distributors',    'James Reyes',    'james.reyes@pacifictire.com',  '+63-2-8888-0001', '123 EDSA',            'Mandaluyong', 'Metro Manila',  '1550', 'Philippines', 'Net 30', 'PH-VAT-001', 'active',   245, 3850000),
('Asian Auto Parts Corp',        'Maria Cruz',     'maria.cruz@asianautops.com',   '+63-32-234-0002', '456 M.J. Cuenco Ave', 'Cebu City',   'Cebu',          '6000', 'Philippines', 'Net 45', 'PH-VAT-002', 'active',   178, 2340000),
('Global Rubber Holdings',       'Carlos Santos',  'c.santos@globalrubber.ph',     '+63-2-8777-0003', '789 Commonwealth Ave','Quezon City', 'Metro Manila',  '1121', 'Philippines', 'Net 60', 'PH-VAT-003', 'active',    89, 1250000),
('Metro Wheel & Tire Supply',    'Ana Villanueva', 'ana@metrowheels.ph',           '+63-46-432-0004', '12 Aguinaldo Hwy',    'Imus',        'Cavite',        '4103', 'Philippines', 'Net 30', 'PH-VAT-004', 'active',    56,  780000),
('Southstar Logistics & Supply', 'Roberto Tan',    'r.tan@southstar.com.ph',       '+63-82-297-0005', '34 Quimpo Blvd',      'Davao City',  'Davao del Sur', '8000', 'Philippines', 'Net 30', 'PH-VAT-005', 'inactive',  12,  145000)
ON CONFLICT DO NOTHING;

-- ── 9. Reload schema cache ────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ── 10. Verify ────────────────────────────────────────────────
SELECT 'USER' AS type, email, position FROM public.users WHERE id = 'e876d8cd-1876-499e-afee-1dede5c87f14';
SELECT 'ROLE' AS type, r.name FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id WHERE ur.user_id = 'e876d8cd-1876-499e-afee-1dede5c87f14';
SELECT 'SUPPLIER' AS type, name, status FROM public.suppliers ORDER BY name;
