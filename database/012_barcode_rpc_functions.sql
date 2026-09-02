-- =====================================================
-- Barcode RPC Functions - Bypass PostgREST Schema Cache
-- =====================================================
-- These functions allow direct database operations when
-- PostgREST schema cache hasn't refreshed yet.
--
-- Run this file in Supabase SQL Editor after 010 and 011
-- =====================================================

-- Function: Insert new barcode
CREATE OR REPLACE FUNCTION insert_barcode(
  p_barcode_value TEXT,
  p_barcode_type TEXT DEFAULT 'CODE128',
  p_product_id UUID DEFAULT NULL,
  p_batch_id UUID DEFAULT NULL,
  p_inventory_unit_id UUID DEFAULT NULL,
  p_generated_by UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_barcode_id UUID;
  v_result JSON;
BEGIN
  -- Insert barcode
  INSERT INTO barcodes (
    barcode_value,
    barcode_type,
    product_id,
    batch_id,
    inventory_unit_id,
    generated_by
  )
  VALUES (
    p_barcode_value,
    p_barcode_type,
    p_product_id,
    p_batch_id,
    p_inventory_unit_id,
    p_generated_by
  )
  RETURNING id INTO v_barcode_id;

  -- Return complete barcode record
  SELECT json_build_object(
    'id', b.id,
    'barcode_value', b.barcode_value,
    'barcode_type', b.barcode_type,
    'product_id', b.product_id,
    'batch_id', b.batch_id,
    'inventory_unit_id', b.inventory_unit_id,
    'generated_by', b.generated_by,
    'status', b.status,
    'created_at', b.created_at,
    'updated_at', b.updated_at
  )
  INTO v_result
  FROM barcodes b
  WHERE b.id = v_barcode_id;

  RETURN v_result;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Barcode % already exists', p_barcode_value;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error inserting barcode: %', SQLERRM;
END;
$$;

-- Function: Get barcodes with pagination
CREATE OR REPLACE FUNCTION get_barcodes(
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0,
  p_status TEXT DEFAULT NULL,
  p_barcode_type TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'data', COALESCE(json_agg(row_to_json(t)), '[]'::json),
    'count', COUNT(*) OVER()
  )
  INTO v_result
  FROM (
    SELECT 
      b.id,
      b.barcode_value,
      b.barcode_type,
      b.product_id,
      b.batch_id,
      b.inventory_unit_id,
      b.generated_by,
      b.status,
      b.created_at,
      b.updated_at,
      p.name as product_name,
      p.sku as product_sku
    FROM barcodes b
    LEFT JOIN products p ON b.product_id = p.id
    WHERE 
      (p_status IS NULL OR b.status = p_status)
      AND (p_barcode_type IS NULL OR b.barcode_type = p_barcode_type)
    ORDER BY b.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ) t;

  RETURN v_result;
END;
$$;

-- Function: Get single barcode by value
CREATE OR REPLACE FUNCTION get_barcode_by_value(p_barcode_value TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'id', b.id,
    'barcode_value', b.barcode_value,
    'barcode_type', b.barcode_type,
    'product_id', b.product_id,
    'batch_id', b.batch_id,
    'inventory_unit_id', b.inventory_unit_id,
    'generated_by', b.generated_by,
    'status', b.status,
    'created_at', b.created_at,
    'updated_at', b.updated_at,
    'product', CASE 
      WHEN b.product_id IS NOT NULL THEN
        json_build_object(
          'id', p.id,
          'name', p.name,
          'sku', p.sku,
          'description', p.description
        )
      ELSE NULL
    END
  )
  INTO v_result
  FROM barcodes b
  LEFT JOIN products p ON b.product_id = p.id
  WHERE b.barcode_value = p_barcode_value;

  RETURN v_result;
END;
$$;

-- Function: Delete barcode
CREATE OR REPLACE FUNCTION delete_barcode(p_barcode_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted BOOLEAN := FALSE;
BEGIN
  DELETE FROM barcodes
  WHERE id = p_barcode_id
  RETURNING TRUE INTO v_deleted;

  IF v_deleted THEN
    RETURN json_build_object('success', true, 'message', 'Barcode deleted successfully');
  ELSE
    RETURN json_build_object('success', false, 'message', 'Barcode not found');
  END IF;
END;
$$;

-- Function: Update barcode status
CREATE OR REPLACE FUNCTION update_barcode_status(
  p_barcode_id UUID,
  p_status TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  UPDATE barcodes
  SET 
    status = p_status,
    updated_at = NOW()
  WHERE id = p_barcode_id
  RETURNING json_build_object(
    'id', id,
    'barcode_value', barcode_value,
    'status', status,
    'updated_at', updated_at
  ) INTO v_result;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Barcode not found';
  END IF;

  RETURN v_result;
END;
$$;

-- Function: Check if barcode exists
CREATE OR REPLACE FUNCTION barcode_exists(p_barcode_value TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM barcodes WHERE barcode_value = p_barcode_value
  ) INTO v_exists;

  RETURN v_exists;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION insert_barcode TO authenticated;
GRANT EXECUTE ON FUNCTION get_barcodes TO authenticated;
GRANT EXECUTE ON FUNCTION get_barcode_by_value TO authenticated;
GRANT EXECUTE ON FUNCTION delete_barcode TO authenticated;
GRANT EXECUTE ON FUNCTION update_barcode_status TO authenticated;
GRANT EXECUTE ON FUNCTION barcode_exists TO authenticated;

-- Grant execute permissions to service_role
GRANT EXECUTE ON FUNCTION insert_barcode TO service_role;
GRANT EXECUTE ON FUNCTION get_barcodes TO service_role;
GRANT EXECUTE ON FUNCTION get_barcode_by_value TO service_role;
GRANT EXECUTE ON FUNCTION delete_barcode TO service_role;
GRANT EXECUTE ON FUNCTION update_barcode_status TO service_role;
GRANT EXECUTE ON FUNCTION barcode_exists TO service_role;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

COMMENT ON FUNCTION insert_barcode IS 'Insert new barcode - bypasses PostgREST cache';
COMMENT ON FUNCTION get_barcodes IS 'Get paginated barcodes list - bypasses PostgREST cache';
COMMENT ON FUNCTION get_barcode_by_value IS 'Get single barcode by value - bypasses PostgREST cache';
COMMENT ON FUNCTION delete_barcode IS 'Delete barcode by ID - bypasses PostgREST cache';
COMMENT ON FUNCTION update_barcode_status IS 'Update barcode status - bypasses PostgREST cache';
COMMENT ON FUNCTION barcode_exists IS 'Check if barcode exists - bypasses PostgREST cache';
