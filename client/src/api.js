/**
 * Shared API fetch helper.
 * Automatically attaches the JWT Authorization header from localStorage.
 */

const BASE = '';  // same origin — Vite proxies /api to localhost:4000

function getToken() {
  try {
    const stored = localStorage.getItem('smartcity_auth');
    return stored ? JSON.parse(stored).token : null;
  } catch {
    return null;
  }
}

function authHeaders(extra = {}) {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

export async function api(path, options = {}) {
  const { body, method = 'GET', headers = {} } = options;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: authHeaders(headers),
    ...(body != null ? { body: JSON.stringify(body) } : {}),
  });

  // 204 No Content — nothing to parse
  if (res.status === 204) return null;

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }
  return data;
}

// Convenience shortcuts
export const apiGet    = (path)           => api(path);
export const apiPost   = (path, body)     => api(path, { method: 'POST',   body });
export const apiDelete = (path)           => api(path, { method: 'DELETE' });
