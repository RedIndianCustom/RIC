-- ============================================================================
-- 022: ADD PRODUCT BREAKDOWN TO SHIPMENTS
-- ============================================================================
-- This script adds a JSONB column to store detailed product breakdown
-- Staff can specify exact categories, sizes, and quantities per shipment
-- ============================================================================

-- Add product_breakdown column to shipments table
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS product_breakdown JSONB DEFAULT '[]'::jsonb;

-- Add index for faster queries on product breakdown
CREATE INDEX IF NOT EXISTS idx_shipments_product_breakdown 
ON shipments USING gin(product_breakdown);

-- Add comment for documentation
COMMENT ON COLUMN shipments.product_breakdown IS 'Detailed breakdown of products in shipment: [{category, size, quantity}]';

-- Example product_breakdown structure:
-- [
--   {"category": "Dual Sport", "size": "90/90-17", "quantity": 50},
--   {"category": "Sawtooth", "size": "100/90-17", "quantity": 30},
--   {"category": "Enduro", "size": "120/80-17", "quantity": 20}
-- ]

-- Verify the column was added
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'shipments' AND column_name = 'product_breakdown';

-- ============================================================================
-- DONE!
-- The shipments table now has a product_breakdown column
-- Staff can now specify exact products and sizes in each shipment
-- ============================================================================
