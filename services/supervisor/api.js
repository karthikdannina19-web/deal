import axios from 'axios';
import authService from './auth.service';

const api = axios.create({
  baseURL: '/api/supervisor',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = authService.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      authService.logout();
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/supervisor/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
