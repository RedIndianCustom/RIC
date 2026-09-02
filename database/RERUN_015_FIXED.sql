-- ============================================================================
-- RE-RUN 015 WITH FIXES
-- ============================================================================
-- This updates the create_inventory_barcodes function to:
-- 1. Include unit_number generation (for backward compatibility)
-- 2. Remove product_name reference (doesn't exist in products table)
-- ============================================================================

-- Drop and recreate the function with fixes
DROP FUNCTION IF EXISTS public.create_inventory_barcodes(UUID, UUID, UUID, INTEGER);
DROP FUNCTION IF EXISTS public.get_barcodes_with_traceability(INTEGER);

-- Now run the fixed 015_transaction_safe_barcode_rpc.sql
-- Copy and paste the ENTIRE content of that file here, or just run it directly
