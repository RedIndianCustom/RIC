-- Fix rack_configurations permissions
ALTER TABLE rack_configurations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read racks" ON rack_configurations;
DROP POLICY IF EXISTS "Allow all to read rack_configurations" ON rack_configurations;

-- Create simple policy to allow reading
CREATE POLICY "Allow authenticated users to read racks"
ON rack_configurations FOR SELECT
TO authenticated, anon
USING (true);

-- Grant table access
GRANT SELECT ON rack_configurations TO authenticated, anon;

-- Refresh schema
NOTIFY pgrst, 'reload schema';

-- Test query
SELECT 
  rack_code,
  designated_size,
  size_category,
  status
FROM rack_configurations
WHERE warehouse_id = 'b1eff6be-b968-4861-94c2-f220e4eeffed'
ORDER BY rack_number;

SELECT '✅ Rack permissions fixed! Should see 5 racks above.' as status;
