import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

console.log(`[API] baseURL = "${BASE_URL}"`);
console.log(`[API] VITE_API_URL env = "${import.meta.env.VITE_API_URL}"`);

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
});

// Request interceptor — attach X-Guest-ID when a guest is stored
api.interceptors.request.use((config) => {
  console.log(`[API] → ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  try {
    const raw = sessionStorage.getItem('wedding_guest');
    if (raw) {
      const guest = JSON.parse(raw) as { id: string };
      config.headers['X-Guest-ID'] = guest.id;
    }
  } catch {
    // ignore parse errors
  }
  return config;
});

// Response interceptor — surface .message as error
api.interceptors.response.use(
  (response) => {
    console.log(`[API] ✓ ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(`[API] ✗ ERROR:`, error.message);
    console.error(`[API]   status:`, error.response?.status);
    console.error(`[API]   url:`, error.config?.url);
    console.error(`[API]   full error:`, error);
    const message: string =
      error.response?.data?.message ||
      error.message ||
      'שגיאה בלתי צפויה';
    return Promise.reject(new Error(message));
  },
);

export default api;
