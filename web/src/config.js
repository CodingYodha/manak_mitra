// Leave VITE_API_BASE_URL empty for same-origin deployments. Vite proxies these
// paths to FastAPI during local development; set it only for a separate API host.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export const apiUrl = (path) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
