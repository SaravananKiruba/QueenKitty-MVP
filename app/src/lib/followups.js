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
