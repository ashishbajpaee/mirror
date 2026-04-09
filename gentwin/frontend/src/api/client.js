import axios from 'axios';

export const API_BASE_URL = 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

export function getWsBaseUrl() {
  return 'ws://localhost:8000';
}
