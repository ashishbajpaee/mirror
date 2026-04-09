export const API_BASE = 'http://localhost:8000';
export const WS_BASE = 'ws://localhost:8000';

export function apiUrl(path) {
  const normalized = path.startsWith('/') ? path : '/' + path;
  return API_BASE + normalized;
}

export function wsUrl(path = '/ws') {
  const normalized = path.startsWith('/') ? path : '/' + path;
  return WS_BASE + normalized;
}