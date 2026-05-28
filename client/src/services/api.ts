import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
});

// Request interceptor — attach X-Guest-ID when a guest is stored
api.interceptors.request.use((config) => {
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
  (response) => response,
  (error) => {
    const message: string =
      error.response?.data?.message ||
      error.message ||
      'שגיאה בלתי צפויה';
    return Promise.reject(new Error(message));
  },
);

export default api;
