// Empty in local development: Vite proxies are unnecessary when the API is on
// the same host. Set VITE_API_BASE_URL for a deployed FastAPI service.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

export const apiUrl = (path) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
