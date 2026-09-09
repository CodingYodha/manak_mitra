// Same-origin by default. Set VITE_API_BASE_URL only when FastAPI is deployed
// on a separate origin. The Vite development server proxies these routes.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export const apiUrl = (path) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
