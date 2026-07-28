import client from './client';

export interface FoundItemVO {
  id: number;
  userId: number;
  userName: string;
  title: string;
  description: string;
  categoryId: number;
  categoryName: string;
  location: string;
  foundTime: string;
  imageUrls: string[];
  status: string;
  resolvedBy?: number;
  resolvedByName?: string;
  resolvedType?: 'SELF' | 'USER' | 'OTHER';
  resolvedNote?: string;
  coverImage?: string;
  createdAt: string;
}

export const getFoundItems = (params: {
  page: number;
  size: number;
  keyword?: string;
  categoryId?: number;
  status?: string;
}) => client.get('/found-items', { params }).then(r => r.data.data);

export const getFoundItem = (id: number) =>
  client.get(`/found-items/${id}`).then(r => r.data.data as FoundItemVO);

export const createFoundItem = (data: any) =>
  client.post('/found-items', data).then(r => r.data.data);

export const updateFoundItem = (id: number, data: any) =>
  client.put(`/found-items/${id}`, data).then(r => r.data.data);

export const deleteFoundItem = (id: number) =>
  client.delete(`/found-items/${id}`).then(r => r.data.data);

export const updateFoundItemStatus = (id: number, status: string) =>
  client.put(`/found-items/${id}/status`, { status }).then(r => r.data.data);
