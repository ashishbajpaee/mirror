const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
const WS_BASE = (
  import.meta.env.VITE_WS_BASE_URL || API_BASE.replace(/^http/i, 'ws')
).replace(/\/$/, '');

export function apiUrl(path) {
  const normalized = path.startsWith('/') ? path : '/' + path;
  return API_BASE + normalized;
}

export function wsUrl(path = '/ws') {
  const normalized = path.startsWith('/') ? path : '/' + path;
  return WS_BASE + normalized;
}

export { API_BASE, WS_BASE };