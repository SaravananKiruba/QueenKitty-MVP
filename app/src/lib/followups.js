// Follow-up + customer API helpers. Wraps the shared `api` client.
import { api } from '@/lib/api';

export const followupsApi = {
  list:     (scope = 'today') => api.get(`/followups?scope=${encodeURIComponent(scope)}`),
  create:   (payload)         => api.post('/followups', payload),
  update:   (id, payload)     => api.patch(`/followups/${id}`, payload),
  done:     (id)              => api.post(`/followups/${id}/done`),
  snooze:   (id, days = 1)    => api.post(`/followups/${id}/snooze`, { days }),
  remove:   (id)              => api.delete(`/followups/${id}`),
};

export const customersApi = {
  list:     (q = '')      => api.get(`/customers${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  search:   (q = '')      => api.get(`/customers${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  get:      (id)          => api.get(`/customers/${id}`),
  timeline: (id)          => api.get(`/customers/${id}/timeline`),
  update:   (id, payload) => api.patch(`/customers/${id}`, payload),
  remove:   (id)          => api.delete(`/customers/${id}`),
};

export const ordersApi = {
  list:           (scope = 'all', q = '') => {
    const params = new URLSearchParams();
    if (scope) params.set('scope', scope);
    if (q)     params.set('q', q);
    const qs = params.toString();
    return api.get(`/orders${qs ? `?${qs}` : ''}`);
  },
  forCustomer:    (customerId) => api.get(`/orders?scope=customer&customer_id=${customerId}`),
  create:         (payload)         => api.post('/orders', payload),
  update:         (id, payload)     => api.patch(`/orders/${id}`, payload),
  recordPayment:  (id, payload)     => api.post(`/orders/${id}/payment`, payload),
  snooze:         (id, days = 3)    => api.post(`/orders/${id}/snooze`, { days }),
  remove:         (id)              => api.delete(`/orders/${id}`),
};

export const repeatsApi = {
  list:    (scope = 'due') => api.get(`/repeats?scope=${encodeURIComponent(scope)}`),
  snooze:  (id, days = 14) => api.post(`/repeats/${id}/snooze`, { days }),
  dismiss: (id)            => api.post(`/repeats/${id}/dismiss`),
};

export const settingsApi = {
  get:    ()         => api.get('/settings'),
  update: (payload)  => api.patch('/settings', payload),
};

// Builds a wa.me link with a prefilled message.
export function whatsappLink(phone, message = '') {
  const clean = String(phone || '').replace(/\D+/g, '');
  // Default to +91 if a 10-digit Indian number was entered without country code.
  const withCc = clean.length === 10 ? `91${clean}` : clean;
  const q = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${withCc}${q}`;
}

export function telLink(phone) {
  const clean = String(phone || '').replace(/[^\d+]/g, '');
  return `tel:${clean}`;
}

export function todayISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}

export function formatMoney(n) {
  return Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

export const PRODUCT_CATEGORIES = [
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bottle',  label: 'Water bottle' },
  { value: 'storage', label: 'Storage' },
  { value: 'other',   label: 'Other' },
];
