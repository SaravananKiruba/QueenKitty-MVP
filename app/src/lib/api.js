// Tiny fetch wrapper. Reads token from localStorage and attaches Authorization.
// All API responses follow { success, message, data } per CLAUDE.md.

const TOKEN_KEY = 'qk_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try { payload = await res.json(); } catch { /* non-JSON */ }

  if (!res.ok || !payload?.success) {
    const err = new Error(payload?.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.errors = payload?.errors || null;
    throw err;
  }

  return payload.data;
}

export const api = {
  get:    (p)        => request('GET', p),
  post:   (p, body)  => request('POST', p, body),
  put:    (p, body)  => request('PUT', p, body),
  patch:  (p, body)  => request('PATCH', p, body),
  delete: (p)        => request('DELETE', p),
};
