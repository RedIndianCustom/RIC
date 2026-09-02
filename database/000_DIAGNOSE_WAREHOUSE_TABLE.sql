-- ============================================================================
-- DIAGNOSE EXISTING WAREHOUSE_LOCATIONS TABLE
-- ============================================================================
-- Run this FIRST to see what the table looks like
-- ============================================================================

-- 1. Check table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'warehouse_locations'
ORDER BY ordinal_position;

-- 2. Check existing data
SELECT * FROM warehouse_locations;

-- 3. Check constraints
SELECT
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  col.attname AS column_name
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_attribute col ON col.attrelid = rel.oid AND col.attnum = ANY(con.conkey)
WHERE rel.relname = 'warehouse_locations';
