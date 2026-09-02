-- Fix shipments status constraint
-- First, show ALL constraints on the status column
SELECT 
    conname AS constraint_name,
    contype AS type,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
JOIN pg_class cl ON cl.oid = c.conrelid
WHERE cl.relname = 'shipments'
AND n.nspname = 'public';

-- Drop ALL status-related constraints
ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS shipments_status_check CASCADE;
ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS chk_shipments_status CASCADE;
ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS check_status CASCADE;

-- Add correct constraint with correct name
ALTER TABLE public.shipments
    ADD CONSTRAINT chk_shipments_status CHECK (
        status IN ('PENDING','IN_TRANSIT','RECEIVED','INSPECTING','APPROVED','REJECTED','CANCELLED')
    );

-- Verify it worked
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
JOIN pg_class cl ON cl.oid = c.conrelid
WHERE cl.relname = 'shipments'
AND n.nspname = 'public'
AND conname LIKE '%status%';
