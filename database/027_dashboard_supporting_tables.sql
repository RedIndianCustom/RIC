-- ============================================================================
-- 027: Create dashboard supporting tables
-- ============================================================================
-- The dashboardController queries these tables for Manager, Sales, Warehouse,
-- and Operational Staff KPIs. Without them every count returns 0.
-- ============================================================================

-- ── approval_requests ────────────────────────────────────────────────────────
-- Used by: Manager Dashboard → pendingApprovals count
CREATE TABLE IF NOT EXISTS public.approval_requests (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type         VARCHAR(100) NOT NULL DEFAULT 'general',
  title        VARCHAR(255) NOT NULL,
  description  TEXT,
  requested_by UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  status       VARCHAR(50) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  priority     VARCHAR(20) NOT NULL DEFAULT 'normal'
                CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  metadata     JSONB       DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_status     ON public.approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requested  ON public.approval_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_approval_requests_created    ON public.approval_requests(created_at DESC);

-- ── employee_tasks ───────────────────────────────────────────────────────────
-- Used by: Manager Dashboard → employeeEfficiency (avg completion_rate)
CREATE TABLE IF NOT EXISTS public.employee_tasks (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  task_type       VARCHAR(100) NOT NULL DEFAULT 'general',
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  status          VARCHAR(50) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  completion_rate INTEGER     NOT NULL DEFAULT 0 CHECK (completion_rate BETWEEN 0 AND 100),
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_at          TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  metadata        JSONB       DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_tasks_employee   ON public.employee_tasks(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_tasks_status     ON public.employee_tasks(status);
CREATE INDEX IF NOT EXISTS idx_employee_tasks_created    ON public.employee_tasks(created_at DESC);

-- ── discrepancy_reports ───────────────────────────────────────────────────────
-- Used by: Manager Dashboard → discrepancies count (open)
CREATE TABLE IF NOT EXISTS public.discrepancy_reports (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_number  VARCHAR(50) UNIQUE NOT NULL,
  type           VARCHAR(100) NOT NULL DEFAULT 'inventory',
  location       VARCHAR(255),
  description    TEXT        NOT NULL,
  reported_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  status         VARCHAR(50) NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open', 'under_review', 'resolved', 'dismissed')),
  severity       VARCHAR(20) NOT NULL DEFAULT 'medium'
                   CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  quantity_expected INTEGER,
  quantity_actual   INTEGER,
  metadata       JSONB       DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-generate report number
CREATE OR REPLACE FUNCTION generate_discrepancy_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.report_number IS NULL OR NEW.report_number = '' THEN
    NEW.report_number := 'DR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 9999 + 1)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_discrepancy_number ON public.discrepancy_reports;
CREATE TRIGGER trigger_discrepancy_number
  BEFORE INSERT ON public.discrepancy_reports
  FOR EACH ROW EXECUTE FUNCTION generate_discrepancy_number();

CREATE INDEX IF NOT EXISTS idx_discrepancy_reports_status   ON public.discrepancy_reports(status);
CREATE INDEX IF NOT EXISTS idx_discrepancy_reports_severity ON public.discrepancy_reports(severity);
CREATE INDEX IF NOT EXISTS idx_discrepancy_reports_created  ON public.discrepancy_reports(created_at DESC);

-- ── waybills ──────────────────────────────────────────────────────────────────
-- Used by: Operational Staff Dashboard → pendingWaybills count
CREATE TABLE IF NOT EXISTS public.waybills (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  waybill_number  VARCHAR(50) UNIQUE NOT NULL,
  shipment_id     UUID        REFERENCES public.shipments(id) ON DELETE SET NULL,
  carrier         VARCHAR(255),
  origin          VARCHAR(255),
  destination     VARCHAR(255),
  status          VARCHAR(50) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'in_transit', 'delivered', 'returned', 'cancelled')),
  dispatch_date   DATE,
  delivery_date   DATE,
  tracking_number VARCHAR(100),
  metadata        JSONB       DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-generate waybill number
CREATE OR REPLACE FUNCTION generate_waybill_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.waybill_number IS NULL OR NEW.waybill_number = '' THEN
    NEW.waybill_number := 'WB-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 9999 + 1)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_waybill_number ON public.waybills;
CREATE TRIGGER trigger_waybill_number
  BEFORE INSERT ON public.waybills
  FOR EACH ROW EXECUTE FUNCTION generate_waybill_number();

CREATE INDEX IF NOT EXISTS idx_waybills_status    ON public.waybills(status);
CREATE INDEX IF NOT EXISTS idx_waybills_shipment  ON public.waybills(shipment_id);
CREATE INDEX IF NOT EXISTS idx_waybills_created   ON public.waybills(created_at DESC);

-- ── customers ─────────────────────────────────────────────────────────────────
-- Used by: Sales Dashboard → totalCustomers count
CREATE TABLE IF NOT EXISTS public.customers (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code VARCHAR(50) UNIQUE,
  full_name    VARCHAR(255) NOT NULL,
  email        VARCHAR(255) UNIQUE,
  phone        VARCHAR(50),
  address      TEXT,
  type         VARCHAR(50) NOT NULL DEFAULT 'retail'
                 CHECK (type IN ('retail', 'wholesale', 'corporate', 'vip')),
  status       VARCHAR(50) NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'inactive', 'blacklisted')),
  total_orders INTEGER     NOT NULL DEFAULT 0,
  total_spent  NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  metadata     JSONB       DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_email   ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_status  ON public.customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_created ON public.customers(created_at DESC);

-- ── payments ──────────────────────────────────────────────────────────────────
-- Used by: Sales Dashboard → revenue / payments today
CREATE TABLE IF NOT EXISTS public.payments (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number  VARCHAR(50) UNIQUE NOT NULL,
  order_id        UUID        REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_id     UUID        REFERENCES public.customers(id) ON DELETE SET NULL,
  amount          NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  currency        VARCHAR(10) NOT NULL DEFAULT 'PHP',
  method          VARCHAR(50) NOT NULL DEFAULT 'cash'
                    CHECK (method IN ('cash', 'card', 'bank_transfer', 'gcash', 'maya', 'cheque')),
  status          VARCHAR(50) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'voided')),
  reference_number VARCHAR(100),
  notes           TEXT,
  metadata        JSONB       DEFAULT '{}'::jsonb,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-generate payment number
CREATE OR REPLACE FUNCTION generate_payment_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_number IS NULL OR NEW.payment_number = '' THEN
    NEW.payment_number := 'PAY-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 9999 + 1)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_payment_number ON public.payments;
CREATE TRIGGER trigger_payment_number
  BEFORE INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION generate_payment_number();

CREATE INDEX IF NOT EXISTS idx_payments_order    ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status   ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at  ON public.payments(paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_created  ON public.payments(created_at DESC);

-- ── refunds ───────────────────────────────────────────────────────────────────
-- Used by: Sales Dashboard → refundCount this month
CREATE TABLE IF NOT EXISTS public.refunds (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_number  VARCHAR(50) UNIQUE NOT NULL,
  payment_id     UUID        REFERENCES public.payments(id) ON DELETE SET NULL,
  order_id       UUID        REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_id    UUID        REFERENCES public.customers(id) ON DELETE SET NULL,
  amount         NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  reason         VARCHAR(100) NOT NULL DEFAULT 'customer_request'
                   CHECK (reason IN ('customer_request', 'defective', 'wrong_item', 'not_delivered', 'other')),
  status         VARCHAR(50) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'processed', 'rejected')),
  notes          TEXT,
  processed_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  processed_at   TIMESTAMPTZ,
  metadata       JSONB       DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-generate refund number
CREATE OR REPLACE FUNCTION generate_refund_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.refund_number IS NULL OR NEW.refund_number = '' THEN
    NEW.refund_number := 'REF-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 9999 + 1)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_refund_number ON public.refunds;
CREATE TRIGGER trigger_refund_number
  BEFORE INSERT ON public.refunds
  FOR EACH ROW EXECUTE FUNCTION generate_refund_number();

CREATE INDEX IF NOT EXISTS idx_refunds_payment  ON public.refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_order    ON public.refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_customer ON public.refunds(customer_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status   ON public.refunds(status);
CREATE INDEX IF NOT EXISTS idx_refunds_created  ON public.refunds(created_at DESC);

-- ── updated_at triggers for all new tables ────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at_027()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'approval_requests', 'employee_tasks', 'discrepancy_reports',
    'waybills', 'customers', 'payments', 'refunds'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trigger_%s_updated_at ON public.%s;
       CREATE TRIGGER trigger_%s_updated_at
         BEFORE UPDATE ON public.%s
         FOR EACH ROW EXECUTE FUNCTION set_updated_at_027();',
      t, t, t, t
    );
  END LOOP;
END;
$$;

-- ── RLS: Enable + basic authenticated access ──────────────────────────────────
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'approval_requests', 'employee_tasks', 'discrepancy_reports',
    'waybills', 'customers', 'payments', 'refunds'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%s ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format(
      'DROP POLICY IF EXISTS "authenticated_read_%s" ON public.%s;
       CREATE POLICY "authenticated_read_%s"
         ON public.%s FOR SELECT TO authenticated USING (true);',
      t, t, t, t
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS "authenticated_write_%s" ON public.%s;
       CREATE POLICY "authenticated_write_%s"
         ON public.%s FOR ALL TO authenticated USING (true) WITH CHECK (true);',
      t, t, t, t
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%s TO authenticated;', t);
  END LOOP;
END;
$$;

SELECT 'Dashboard supporting tables created successfully' AS status;
