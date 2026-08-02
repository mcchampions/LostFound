import client from './client';

export const getUsers = (params: { page: number; size: number; keyword?: string }) =>
  client.get('/admin/users', { params }).then(r => r.data.data);

export const updateUserStatus = (id: number, status: string) =>
  client.put(`/admin/users/${id}/status`, { status }).then(r => r.data.data);

export const createCategory = (name: string, sortOrder: number) =>
  client.post('/admin/categories', { name, sortOrder }).then(r => r.data.data);

export const updateCategory = (id: number, name: string, sortOrder: number) =>
  client.put(`/admin/categories/${id}`, { name, sortOrder }).then(r => r.data.data);

export const deleteCategory = (id: number) =>
  client.delete(`/admin/categories/${id}`).then(r => r.data.data);

export const getStats = () =>
  client.get('/admin/stats').then(r => r.data.data);

export const getTrend = (days: number) =>
  client.get('/admin/stats/trend', { params: { days } }).then(r => r.data.data);

export const getLogs = (params: {
  page: number;
  size: number;
  action?: string;
  userId?: number;
}) =>
  client.get('/admin/logs', { params }).then(r => r.data.data);
