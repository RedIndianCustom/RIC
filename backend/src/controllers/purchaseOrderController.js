import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../middleware/errorMiddleware.js';
import { logger } from '../utils/logger.js';

// ── Field mapping: camelCase ↔ snake_case ─────────────────────────────────────

const toDbPO = (d) => ({
  po_number:          d.poNumber ?? d.po_number,
  supplier_id:        d.supplierId ?? d.supplier_id,
  order_date:         d.orderDate ?? d.order_date,
  expected_delivery:  d.expectedDelivery ?? d.expected_delivery,
  actual_delivery:    d.actualDelivery ?? d.actual_delivery,
  subtotal:           d.subtotal ?? 0,
  tax_amount:         d.taxAmount ?? d.tax_amount ?? 0,
  shipping_cost:      d.shippingCost ?? d.shipping_cost ?? 0,
  total_amount:       d.totalAmount ?? d.total_amount ?? 0,
  status:             d.status ?? 'draft',
  notes:              d.notes,
  payment_terms:      d.paymentTerms ?? d.payment_terms,
  shipping_address:   d.shippingAddress ?? d.shipping_address,
});

const toClientPO = (row) => ({
  id:                 row.id,
  poNumber:           row.po_number,
  supplierId:         row.supplier_id,
  supplierName:       row.supplier_name,
  orderDate:          row.order_date,
  expectedDelivery:   row.expected_delivery,
  actualDelivery:     row.actual_delivery,
  subtotal:           parseFloat(row.subtotal) || 0,
  taxAmount:          parseFloat(row.tax_amount) || 0,
  shippingCost:       parseFloat(row.shipping_cost) || 0,
  totalAmount:        parseFloat(row.total_amount) || 0,
  status:             row.status,
  notes:              row.notes,
  paymentTerms:       row.payment_terms,
  shippingAddress:    row.shipping_address,
  createdAt:          row.created_at,
  updatedAt:          row.updated_at,
  createdBy:          row.created_by,
  updatedBy:          row.updated_by,
});

const toDbPOItem = (d) => ({
  purchase_order_id:  d.purchaseOrderId ?? d.purchase_order_id,
  product_name:       d.productName ?? d.product_name,
  product_sku:        d.productSku ?? d.product_sku,
  description:        d.description,
  quantity:           d.quantity,
  received_quantity:  d.receivedQuantity ?? d.received_quantity ?? 0,
  unit_price:         d.unitPrice ?? d.unit_price,
  line_total:         d.lineTotal ?? d.line_total ?? 0,
});

const toClientPOItem = (row) => ({
  id:                 row.id,
  purchaseOrderId:    row.purchase_order_id,
  productName:        row.product_name,
  productSku:         row.product_sku,
  description:        row.description,
  quantity:           row.quantity,
  receivedQuantity:   row.received_quantity,
  unitPrice:          parseFloat(row.unit_price) || 0,
  lineTotal:          parseFloat(row.line_total) || 0,
  createdAt:          row.created_at,
  updatedAt:          row.updated_at,
});

// ── GET /api/purchase-orders ──────────────────────────────────────────────────

export const getPurchaseOrders = async (req, res, next) => {
  try {
    const { status, supplierId } = req.query;

    let query = supabaseAdmin
      .from('purchase_orders')
      .select(`
        *,
        supplier:suppliers!purchase_orders_supplier_id_fkey(name)
      `)
      .order('order_date', { ascending: false });

    if (status) query = query.eq('status', status);
    if (supplierId) query = query.eq('supplier_id', supplierId);

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching purchase orders:', error);
      throw new AppError(error.message, 500);
    }

    // Flatten supplier name
    const formatted = (data || []).map(po => ({
      ...po,
      supplier_name: po.supplier?.name || 'Unknown Supplier'
    }));

    res.json({ purchaseOrders: formatted.map(toClientPO) });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/purchase-orders/:id ──────────────────────────────────────────────

export const getPurchaseOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get purchase order with items
    const { data: poData, error: poError } = await supabaseAdmin
      .from('purchase_orders')
      .select(`
        *,
        supplier:suppliers!purchase_orders_supplier_id_fkey(name),
        items:purchase_order_items(*)
      `)
      .eq('id', id)
      .single();

    if (poError || !poData) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    const formatted = {
      ...poData,
      supplier_name: poData.supplier?.name || 'Unknown Supplier',
      items: (poData.items || []).map(toClientPOItem)
    };

    res.json({ purchaseOrder: toClientPO(formatted), items: formatted.items });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/purchase-orders ─────────────────────────────────────────────────

export const createPurchaseOrder = async (req, res, next) => {
  try {
    const { items, ...poData } = req.body;

    // Create purchase order
    const payload = {
      ...toDbPO(poData),
      created_by: req.user.id
    };

    const { data: newPO, error: poError } = await supabaseAdmin
      .from('purchase_orders')
      .insert(payload)
      .select()
      .single();

    if (poError) {
      logger.error('Error creating purchase order:', poError);
      throw new AppError(poError.message, 400);
    }

    // Add items if provided
    if (items && items.length > 0) {
      const itemPayload = items.map(item => ({
        ...toDbPOItem(item),
        purchase_order_id: newPO.id
      }));

      const { error: itemsError } = await supabaseAdmin
        .from('purchase_order_items')
        .insert(itemPayload);

      if (itemsError) {
        logger.error('Error creating PO items:', itemsError);
        // Rollback: delete the PO
        await supabaseAdmin.from('purchase_orders').delete().eq('id', newPO.id);
        throw new AppError('Failed to create purchase order items', 400);
      }
    }

    res.status(201).json({ purchaseOrder: toClientPO(newPO) });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/purchase-orders/:id ──────────────────────────────────────────────

export const updatePurchaseOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { items, ...poData } = req.body;

    // Update purchase order
    const payload = {
      ...toDbPO(poData),
      updated_by: req.user.id
    };

    const { data: updatedPO, error: poError } = await supabaseAdmin
      .from('purchase_orders')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (poError || !updatedPO) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    // Update items if provided
    if (items && items.length > 0) {
      // Delete existing items
      await supabaseAdmin
        .from('purchase_order_items')
        .delete()
        .eq('purchase_order_id', id);

      // Insert new items
      const itemPayload = items.map(item => ({
        ...toDbPOItem(item),
        purchase_order_id: id
      }));

      await supabaseAdmin
        .from('purchase_order_items')
        .insert(itemPayload);
    }

    res.json({ purchaseOrder: toClientPO(updatedPO) });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/purchase-orders/:id ───────────────────────────────────────────

export const deletePurchaseOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('purchase_orders')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting purchase order:', error);
      throw new AppError(error.message, 400);
    }

    res.json({ message: 'Purchase order deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/purchase-orders/:id/items ────────────────────────────────────────

export const getPurchaseOrderItems = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('purchase_order_items')
      .select('*')
      .eq('purchase_order_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Error fetching PO items:', error);
      throw new AppError(error.message, 500);
    }

    res.json({ items: (data || []).map(toClientPOItem) });
  } catch (err) {
    next(err);
  }
};
