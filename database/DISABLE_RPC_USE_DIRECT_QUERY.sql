-- ============================================================================
-- DISABLE PROBLEMATIC RPC - USE DIRECT QUERIES INSTEAD
-- ============================================================================
-- The RPC function has too many type mismatches
-- Instead, we'll drop it and let the backend use direct table queries
-- which are more flexible and handle type conversions automatically
-- ============================================================================

-- Drop the problematic RPC function
DROP FUNCTION IF EXISTS public.get_barcodes_with_traceability(INTEGER);

-- We'll use direct table queries instead
-- The backend already has fallback logic for this

-- Enable RLS but grant proper access
ALTER TABLE barcodes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read barcodes
DROP POLICY IF EXISTS "Allow authenticated users to read barcodes" ON barcodes;
CREATE POLICY "Allow authenticated users to read barcodes"
ON barcodes FOR SELECT
TO authenticated
USING (true);

-- Ensure barcodes table has proper foreign key relationships
-- This allows PostgREST to automatically fetch nested data

-- Grant select on all related tables
GRANT SELECT ON barcodes TO authenticated, anon;
GRANT SELECT ON products TO authenticated, anon;
GRANT SELECT ON batches TO authenticated, anon;
GRANT SELECT ON shipments TO authenticated, anon;
GRANT SELECT ON suppliers TO authenticated, anon;
GRANT SELECT ON inventory_units TO authenticated, anon;

-- Refresh schema
NOTIFY pgrst, 'reload schema';

-- Test direct query (this is what the backend will use)
SELECT 
  b.id,
  b.barcode_value,
  b.barcode_type,
  b.status,
  b.created_at,
  b.product_id,
  b.batch_id
FROM barcodes b
ORDER BY b.created_at DESC
LIMIT 5;

SELECT '✅ RPC function removed. Backend will use direct queries with proper type handling.' as status;
