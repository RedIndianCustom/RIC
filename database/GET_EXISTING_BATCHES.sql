-- Show existing batches that you can use for barcode generation
SELECT 
    b.id as batch_id,
    b.batch_number,
    b.batch_month,
    b.batch_year,
    b.status,
    p.sku as product_sku,
    p.brand as product_brand,
    p.model as product_model,
    s.shipment_number,
    s.container_number,
    sup.name as supplier_name,
    (SELECT COUNT(*) FROM barcodes WHERE batch_id = b.id) as existing_barcodes
FROM batches b
JOIN products p ON b.product_id = p.id
JOIN shipments s ON b.shipment_id = s.id
LEFT JOIN suppliers sup ON s.supplier_id = sup.id
WHERE b.status = 'ACTIVE'
ORDER BY b.created_at DESC;
