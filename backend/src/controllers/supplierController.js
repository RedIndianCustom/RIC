import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../middleware/errorMiddleware.js';
import { logger } from '../utils/logger.js';

// ── Shared helpers ────────────────────────────────────────────────────────────

/** True when the Supabase/PostgREST error means the table doesn't exist yet. */
function isTableMissing(error) {
  const msg  = (error?.message || '').toLowerCase();
  const hint = (error?.hint    || '').toLowerCase();
  const code =  error?.code    || '';
  return (
    code === '42P01'    ||
    code === 'PGRST116' ||
    code === 'PGRST200' ||
    code === 'PGRST205' ||   // schema cache miss (table exists but PostgREST hasn't reloaded)
    msg.includes('does not exist')  ||
    msg.includes('schema cache')    ||
    msg.includes('relation')        ||
    hint.includes('does not exist') ||
    hint.includes('relation')
  );
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUUID = (id) => UUID_RE.test(id);

const TABLE_NOT_READY = 'Suppliers table not configured yet. Run the suppliers migration in Supabase.';


// ── Field mapping: camelCase (frontend) ↔ snake_case (database) ─
const toDb = (d) => ({
  name:           d.name,
  contact_person: d.contactPerson ?? d.contact_person,
  email:          d.email,
  phone:          d.phone,
  address:        d.address,
  city:           d.city,
  state:          d.state,
  zip_code:       d.zipCode ?? d.zip_code,
  country:        d.country,
  payment_terms:  d.paymentTerms ?? d.payment_terms,
  tax_id:         d.taxId ?? d.tax_id,
  status:         d.status ?? 'active',
  notes:          d.notes,
  total_orders:   d.totalOrders ?? d.total_orders ?? 0,
  total_value:    d.totalValue ?? d.total_value ?? 0,
});

const toClient = (row) => ({
  id:            row.id,
  name:          row.name,
  contactPerson: row.contact_person,
  email:         row.email,
  phone:         row.phone,
  address:       row.address,
  city:          row.city,
  state:         row.state,
  zipCode:       row.zip_code,
  country:       row.country,
  paymentTerms:  row.payment_terms,
  taxId:         row.tax_id,
  status:        row.status,
  notes:         row.notes,
  totalOrders:   row.total_orders ?? 0,
  totalValue:    row.total_value  ?? 0,
  createdAt:     row.created_at,
  updatedAt:     row.updated_at,
});

// ── GET /api/suppliers ────────────────────────────────────────
export const getSuppliers = async (req, res, next) => {
  try {
    const { status } = req.query;

    let query = supabaseAdmin
      .from('suppliers')
      .select('*')
      .order('name', { ascending: true });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;

    if (error) {
      logger.error('Supabase error fetching suppliers:', { code: error.code, message: error.message });
      if (isTableMissing(error)) {
        return res.status(503).json({ error: TABLE_NOT_READY, suppliers: [] });
      }
      throw new AppError(error.message, 500);
    }

    res.json({ suppliers: (data || []).map(toClient) });
  } catch (err) {
    next(err);
  }
};


// ── GET /api/suppliers/:id ────────────────────────────────────
export const getSupplierById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ error: `Invalid supplier id: '${id}'.` });

    const { data, error } = await supabaseAdmin
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (isTableMissing(error)) return res.status(503).json({ error: TABLE_NOT_READY });
      return res.status(404).json({ error: 'Supplier not found' });
    }
    if (!data) return res.status(404).json({ error: 'Supplier not found' });

    res.json({ supplier: toClient(data) });
  } catch (err) {
    next(err);
  }
};


// ── POST /api/suppliers ───────────────────────────────────────
export const createSupplier = async (req, res, next) => {
  try {
    const payload = { ...toDb(req.body), created_by: req.user.id };

    const { data, error } = await supabaseAdmin
      .from('suppliers')
      .insert(payload)
      .select()
      .single();

    if (error) {
      logger.error('Supabase error creating supplier:', { code: error.code, message: error.message });
      if (isTableMissing(error)) return res.status(503).json({ error: TABLE_NOT_READY });
      throw new AppError(error.message, 400);
    }

    res.status(201).json({ supplier: toClient(data) });
  } catch (err) {
    next(err);
  }
};


// ── PUT /api/suppliers/:id ────────────────────────────────────
export const updateSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ error: `Invalid supplier id: '${id}'.` });

    const payload = {
      ...toDb(req.body),
      updated_by: req.user.id,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('suppliers')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Supabase error updating supplier:', { code: error.code, message: error.message });
      if (isTableMissing(error)) return res.status(503).json({ error: TABLE_NOT_READY });
      throw new AppError(error.message, 400);
    }
    if (!data) return res.status(404).json({ error: 'Supplier not found' });

    res.json({ supplier: toClient(data) });
  } catch (err) {
    next(err);
  }
};


// ── DELETE /api/suppliers/:id ─────────────────────────────────
export const deleteSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: `Invalid supplier id: '${id}'. This entry only exists as mock data and cannot be deleted.` });
    }

    const { error } = await supabaseAdmin
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Supabase error deleting supplier:', { code: error.code, message: error.message });
      if (isTableMissing(error)) return res.status(503).json({ error: TABLE_NOT_READY });
      throw new AppError(error.message, 400);
    }

    res.json({ message: 'Supplier deleted successfully' });
  } catch (err) {
    next(err);
  }
};

