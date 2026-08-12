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

export interface AdminAnnouncement {
  id: number;
  title: string;
  content: string;
  isPinned: boolean;
  isActive: boolean;
  publisherId: number;
  createdAt: string;
}

export interface AnnouncementPayload {
  title: string;
  content: string;
  isPinned: boolean;
  isActive: boolean;
}

export const getAdminAnnouncements = (params: { page: number; size: number }) =>
  client.get('/admin/announcements', { params }).then(r => r.data.data);

export const createAnnouncement = (data: AnnouncementPayload) =>
  client.post('/admin/announcements', data).then(r => r.data.data);

export const updateAnnouncement = (id: number, data: AnnouncementPayload) =>
  client.put(`/admin/announcements/${id}`, data).then(r => r.data.data);

export const deleteAnnouncement = (id: number) =>
  client.delete(`/admin/announcements/${id}`).then(r => r.data.data);

export const exportLogs = async () => {
  const response = await client.get('/admin/export/logs', { responseType: 'blob' });
  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `operation-logs-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const deleteUser = (id: number) =>
  client.delete(`/admin/users/${id}`).then(r => r.data.data);

export const getTrashLostItems = (params: { page: number; size: number; keyword?: string }) =>
  client.get('/admin/trash/lost-items', { params }).then(r => r.data.data);

export const getTrashFoundItems = (params: { page: number; size: number; keyword?: string }) =>
  client.get('/admin/trash/found-items', { params }).then(r => r.data.data);

export const getTrashUsers = (params: { page: number; size: number; keyword?: string }) =>
  client.get('/admin/trash/users', { params }).then(r => r.data.data);

export const restoreLostItem = (id: number) =>
  client.put(`/admin/trash/lost-items/${id}/restore`).then(r => r.data.data);

export const purgeLostItem = (id: number) =>
  client.delete(`/admin/trash/lost-items/${id}`).then(r => r.data.data);

export const restoreFoundItem = (id: number) =>
  client.put(`/admin/trash/found-items/${id}/restore`).then(r => r.data.data);

export const purgeFoundItem = (id: number) =>
  client.delete(`/admin/trash/found-items/${id}`).then(r => r.data.data);

export const restoreUser = (id: number) =>
  client.put(`/admin/trash/users/${id}/restore`).then(r => r.data.data);
