// An explicitly empty VITE_API_BASE_URL uses the Vite same-origin proxy. This
// avoids HTTPS-to-HTTP mixed-content failures during secure LAN demos.
const configuredApiUrl = import.meta.env.VITE_API_BASE_URL;
export const API_BASE_URL = (
  configuredApiUrl === undefined ? 'http://localhost:8000' : configuredApiUrl
).replace(/\/$/, '');

export const apiUrl = (path) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
