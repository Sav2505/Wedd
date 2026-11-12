import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
});

let getGuestId: () => string | undefined = () => undefined;

export function setGuestIdProvider(provider: () => string | undefined): void {
  getGuestId = provider;
}

api.interceptors.request.use((config) => {
  const guestId = getGuestId();
  if (guestId) config.headers['X-Guest-ID'] = guestId;
  return config;
});

// Response interceptor — surface .message as error
api.interceptors.response.use(
  (response) => {
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
    return Promise.reject(Object.assign(new Error(message), { status: error.response?.status }));
  },
);

export default api;
