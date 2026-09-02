Failed to run sql query: ERROR:  42804: structure of query does not match function result type
DETAIL:  Returned type text does not match expected type character varying in column 17.
CONTEXT:  SQL statement "SELECT 
        b.id as barcode_id,
        b.barcode_value::TEXT,
        b.barcode_type,
        b.traceability_url::TEXT,
        b.qr_code_data::TEXT,
        b.status,
        b.created_at,
        p.id as product_id,
        p.sku as product_sku,
        p.brand as product_brand,
        p.model as product_model,
        bat.id as batch_id,
        bat.batch_number,
        s.container_number,
        s.bl_number,
        s.shipment_number,
        sup.name as supplier_name,
        iu.id as inventory_unit_id,
        iu.inventory_unit_code,
        iu.status as unit_status,
        CASE 
            WHEN w.name IS NOT NULL THEN 
                w.name || ' - ' || 
                COALESCE(iu.level, '') || ' ' || 
                COALESCE(iu.rack, '') || ' ' || 
                COALESCE(iu.shelf, '')
            ELSE NULL
        END as warehouse_location
    FROM public.barcodes b
    INNER JOIN public.inventory_units iu ON b.inventory_unit_id = iu.id
    INNER JOIN public.products p ON iu.product_id = p.id
    INNER JOIN public.batches bat ON iu.batch_id = bat.id
    INNER JOIN public.shipments s ON bat.shipment_id = s.id
    LEFT JOIN public.suppliers sup ON s.supplier_id = sup.id
    LEFT JOIN public.warehouses w ON iu.warehouse_id = w.id
    ORDER BY b.created_at DESC
    LIMIT p_limit"
PL/pgSQL function get_barcodes_with_traceability(integer) line 3 at RETURN QUERY