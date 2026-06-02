import axios from 'axios';

const API = axios.create({
  baseURL:         import.meta.env.VITE_API_URL,
  withCredentials: true, // SEC-2: send httpOnly cookie on every request
});

// Keep Authorization header as fallback (for environments that block cookies)
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Unwrap { data: ... } → response.data, handle 401 auto-logout
API.interceptors.response.use(
  (response) => {
    if (
      response.data !== null &&
      typeof response.data === 'object' &&
      'data' in response.data
    ) {
      response.data = response.data.data;
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default API;