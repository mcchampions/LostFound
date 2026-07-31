import client from './client';

export const login = (username: string, password: string) =>
  client.post('/auth/login', { username, password }).then(r => r.data.data);

export const adminLogin = (username: string, password: string) =>
  client.post('/auth/admin-login', { username, password }).then(r => r.data.data);

export const register = (data: {
  username: string;
  password: string;
  realName: string;
  role: string;
  email?: string;
  phone?: string;
}) => client.post('/auth/register', data).then(r => r.data.data);

export const forgotPassword = (email: string) =>
  client.post('/auth/forgot-password', { email }).then(r => r.data.data);

export const resetPassword = (data: { email: string; code: string; newPassword: string }) =>
  client.post('/auth/reset-password', data).then(r => r.data.data);
