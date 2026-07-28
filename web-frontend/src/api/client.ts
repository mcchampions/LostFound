import axios from 'axios';
import { API_BASE } from '../config';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRedirecting = false;

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      if (!isRedirecting) {
        isRedirecting = true;
        setTimeout(() => { isRedirecting = false; }, 2000);
        window.dispatchEvent(new CustomEvent('auth:logout'));
        if (window.location.pathname !== '/login' && window.location.pathname !== '/login/admin') {
          window.location.replace('/login');
        }
      }
    }
    return Promise.reject(err);
  }
);

export default client;
