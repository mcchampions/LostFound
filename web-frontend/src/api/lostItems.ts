import client from './client';

export interface LostItemVO {
  id: number;
  userId: number;
  userName: string;
  title: string;
  description: string;
  categoryId: number;
  categoryName: string;
  location: string;
  lostTime: string;
  imageUrls: string[];
  status: string;
  coverImage?: string;
  createdAt: string;
}

export const getLostItems = (params: {
  page: number;
  size: number;
  keyword?: string;
  categoryId?: number;
  status?: string;
}) => client.get('/lost-items', { params }).then(r => r.data.data);

export const getLostItem = (id: number) =>
  client.get(`/lost-items/${id}`).then(r => r.data.data as LostItemVO);

export const createLostItem = (data: any) =>
  client.post('/lost-items', data).then(r => r.data.data);

export const updateLostItem = (id: number, data: any) =>
  client.put(`/lost-items/${id}`, data).then(r => r.data.data);

export const deleteLostItem = (id: number) =>
  client.delete(`/lost-items/${id}`).then(r => r.data.data);

export const updateLostItemStatus = (id: number, status: string) =>
  client.put(`/lost-items/${id}/status`, { status }).then(r => r.data.data);
