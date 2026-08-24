import axios from 'axios';
import { supabase } from '../config/supabase.js';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
});

api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status  = error.response?.status;
    const message = error.response?.data?.error || error.message || 'Request failed';

    // Build an enriched error that preserves the response object so callers
    // can still inspect error.response?.status (e.g. 503 = table not ready).
    const enriched     = new Error(message);
    enriched.response  = error.response;   // ← keep full Axios response
    enriched.status    = status;

    // Suppress console noise for expected auth errors (401/403 are handled upstream)
    return Promise.reject(enriched);
  }
);

export default api;

// ============================================================================
// SHIPMENT API
// ============================================================================

export async function fetchShipments(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append('status', params.status);
  if (params.supplier_id) queryParams.append('supplier_id', params.supplier_id);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.offset) queryParams.append('offset', params.offset);
  
  // Add cache-busting timestamp to ensure fresh data
  queryParams.append('_t', Date.now());

  const response = await api.get(`/shipments?${queryParams.toString()}`);
  return response.data;
}

export async function fetchShipmentById(id) {
  const response = await api.get(`/shipments/${id}`);
  return response.data;
}

export async function createShipment(data) {
  const response = await api.post('/shipments', data);
  return response.data;
}

export async function updateShipment(id, data) {
  const response = await api.put(`/shipments/${id}`, data);
  return response.data;
}

export async function deleteShipment(id) {
  const response = await api.delete(`/shipments/${id}`);
  return response.data;
}

export async function receiveShipment(id, data) {
  const response = await api.post(`/shipments/${id}/receive`, data);
  return response.data;
}

export async function fetchShipmentBatches(shipmentId) {
  const response = await api.get(`/shipments/${shipmentId}/batches`);
  return response.data;
}

// ============================================================================
// BATCH API
// ============================================================================

export async function fetchBatches(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append('status', params.status);
  if (params.shipment_id) queryParams.append('shipment_id', params.shipment_id);
  if (params.product_id) queryParams.append('product_id', params.product_id);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.offset) queryParams.append('offset', params.offset);

  const response = await api.get(`/batches?${queryParams.toString()}`);
  return response.data;
}

export async function fetchBatchById(id) {
  const response = await api.get(`/batches/${id}`);
  return response.data;
}

export async function createBatch(data) {
  const response = await api.post('/batches', data);
  return response.data;
}

export async function updateBatch(id, data) {
  const response = await api.put(`/batches/${id}`, data);
  return response.data;
}

export async function deleteBatch(id) {
  const response = await api.delete(`/batches/${id}`);
  return response.data;
}

// ============================================================================
// SUPPLIER API
// ============================================================================

export async function fetchSuppliers(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append('status', params.status);
  if (params.limit) queryParams.append('limit', params.limit);

  const response = await api.get(`/suppliers?${queryParams.toString()}`);
  return response.data;
}

// ============================================================================
// PRODUCT API
// ============================================================================

export async function fetchProducts(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.search) queryParams.append('search', params.search);
  if (params.brand) queryParams.append('brand', params.brand);
  if (params.category) queryParams.append('category', params.category);
  if (params.status) queryParams.append('status', params.status);

  const response = await api.get(`/products?${queryParams.toString()}`);
  return response.data;
}

export async function createProduct(data) {
  const response = await api.post('/products', data);
  return response.data;
}

export async function updateProduct(id, data) {
  const response = await api.put(`/products/${id}`, data);
  return response.data;
}

export async function deleteProduct(id) {
  const response = await api.delete(`/products/${id}`);
  return response.data;
}

// ============================================================================
// WAREHOUSE LOCATION API
// ============================================================================

export async function fetchWarehouseLocations(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append('status', params.status);
  if (params.zone) queryParams.append('zone', params.zone);
  if (params.min_capacity) queryParams.append('min_capacity', params.min_capacity);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.offset) queryParams.append('offset', params.offset);

  const response = await api.get(`/warehouse-locations?${queryParams.toString()}`);
  return response.data;
}

export async function fetchAvailableLocations(minCapacity = 0) {
  const response = await api.get(`/warehouse-locations/available?min_capacity=${minCapacity}`);
  return response.data;
}

export async function fetchWarehouseLocationById(id) {
  const response = await api.get(`/warehouse-locations/${id}`);
  return response.data;
}

export async function createWarehouseLocation(data) {
  const response = await api.post('/warehouse-locations', data);
  return response.data;
}

export async function updateWarehouseLocation(id, data) {
  const response = await api.put(`/warehouse-locations/${id}`, data);
  return response.data;
}

export async function deleteWarehouseLocation(id) {
  const response = await api.delete(`/warehouse-locations/${id}`);
  return response.data;
}

export async function assignBatchToLocation(batchId, locationId, notifyStaff = true) {
  const response = await api.post(`/batches/${batchId}/assign-location`, {
    location_id: locationId,
    notify_warehouse_staff: notifyStaff
  });
  return response.data;
}

// ============================================================================
// NOTIFICATION API
// ============================================================================

export async function fetchNotifications(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.unread_only) queryParams.append('unread_only', params.unread_only);
  if (params.type) queryParams.append('type', params.type);
  if (params.priority) queryParams.append('priority', params.priority);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.offset) queryParams.append('offset', params.offset);

  const response = await api.get(`/notifications?${queryParams.toString()}`);
  return response.data;
}

export async function fetchUnreadNotificationCount() {
  const response = await api.get('/notifications/unread/count');
  return response.data;
}

export async function markNotificationRead(id) {
  const response = await api.put(`/notifications/${id}/read`);
  return response.data;
}

export async function markAllNotificationsRead() {
  const response = await api.put('/notifications/read-all');
  return response.data;
}

export async function deleteNotification(id) {
  const response = await api.delete(`/notifications/${id}`);
  return response.data;
}

// ============================================================================
// BATCH ACTIVITIES API
// ============================================================================

export async function fetchBatchActivities(batchId, params = {}) {
  const queryParams = new URLSearchParams();
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.offset) queryParams.append('offset', params.offset);

  const response = await api.get(`/batches/${batchId}/activities?${queryParams.toString()}`);
  return response.data;
}
