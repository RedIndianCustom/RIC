-- ============================================================================
-- 026: Add metadata column to inventory_units
-- ============================================================================
-- The inventoryController writes status change history into a metadata JSONB
-- field on inventory_units. This column was missing from the original schema.
-- ============================================================================

ALTER TABLE public.inventory_units
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Backfill existing rows
UPDATE public.inventory_units
  SET metadata = '{}'::jsonb
  WHERE metadata IS NULL;

-- Index for querying metadata contents efficiently
CREATE INDEX IF NOT EXISTS idx_inventory_units_metadata
  ON public.inventory_units USING GIN (metadata);

SELECT 'metadata column added to inventory_units' AS status;
