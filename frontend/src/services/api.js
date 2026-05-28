// frontend/src/services/api.js
import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Request interceptor: thêm token vào header
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: unwrap { data: { data: ... } } → response.data = data bên trong
// Đồng thời handle 401 tự động logout
API.interceptors.response.use(
  (response) => {
    // Nếu backend trả { data: ... } thì unwrap một tầng
    // Sau đó các page đọc res.data là đúng luôn
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