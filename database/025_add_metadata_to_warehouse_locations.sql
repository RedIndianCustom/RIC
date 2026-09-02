-- ============================================================================
-- 025: Add metadata column to warehouse_locations
-- ============================================================================
-- Adds a JSONB metadata column to store rack configuration details
-- (totalRacks, shelvesPerRack, sectionsPerShelf, subsectionsPerSection,
--  tiresPerSubsection, rackDesignation, rackSize)
-- ============================================================================

ALTER TABLE public.warehouse_locations
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Backfill existing rows with empty object (already handled by DEFAULT)
UPDATE public.warehouse_locations
  SET metadata = '{}'::jsonb
  WHERE metadata IS NULL;

SELECT 'metadata column added to warehouse_locations' AS status;
