-- ============================================================================
-- ADD METADATA COLUMN TO BATCHES TABLE
-- ============================================================================
-- Add metadata JSONB column to store warehouse_code, warehouse_name, 
-- and products with assigned positions
-- ============================================================================

-- Add metadata column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'batches' 
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.batches 
    ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    
    RAISE NOTICE 'Added metadata column to batches table';
  ELSE
    RAISE NOTICE 'metadata column already exists in batches table';
  END IF;
  
  RAISE NOTICE '✅ Batch metadata column migration completed';
END $$;

-- Add index for efficient JSON queries
CREATE INDEX IF NOT EXISTS idx_batches_metadata ON public.batches USING GIN (metadata);

-- Add comments
COMMENT ON COLUMN public.batches.metadata IS 'JSONB storage for warehouse_code, warehouse_name, and products with assigned_positions';

-- ============================================================================
-- EXAMPLE METADATA STRUCTURE
-- ============================================================================
/*
{
  "warehouse_code": "WH1",
  "warehouse_name": "Warehouse WH1",
  "products_with_positions": [
    {
      "product_id": "uuid",
      "product_name": "Red Indian Customs Enduro Trail 80/90-18",
      "brand": "Red Indian Customs",
      "model": "Enduro Trail",
      "dimensions": "80/90-18",
      "sku": "END-18-80/90",
      "quantity": 120,
      "assigned_positions": [
        {
          "position_code": "WH1-R05-RK05-S01-SH05-SUB01",
          "quantity": 14
        },
        {
          "position_code": "WH1-R05-RK05-S01-SH05-SUB02",
          "quantity": 14
        }
      ]
    }
  ]
}
*/
