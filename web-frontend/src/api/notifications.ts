import client from './client';

export interface NotificationVO {
  id: number;
  userId: number;
  title: string;
  content: string;
  type: string;
  isRead: number;
  createdAt: string;
}

export const getNotifications = (params: { page: number; size: number }) =>
  client.get('/notifications', { params }).then(r => r.data.data);

export const markRead = (id: number) =>
  client.put(`/notifications/${id}/read`).then(r => r.data.data);

export const markAllRead = () =>
  client.put('/notifications/read-all').then(r => r.data.data);

export const getUnreadCount = () =>
  client.get('/notifications/unread-count').then(r => r.data.data as number);
