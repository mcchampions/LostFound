import axios from 'axios';
import { API_BASE } from '../config';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  withCredentials: true,
});

let isRedirecting = false;

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const isAuthProbe = err.config?.url?.endsWith('/users/me');
    if (err.response?.status === 401 && !isAuthProbe) {
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
