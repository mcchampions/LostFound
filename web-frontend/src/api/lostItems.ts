import client from './client';
import type { CreateLostItemDTO, UpdateLostItemDTO, LostItemPageParams, PageResult } from '../types';

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
  lostTimeEnd?: string;
  imageUrls: string[];
  status: string;
  resolvedBy?: number;
  resolvedByName?: string;
  resolvedType?: 'SELF' | 'USER' | 'OTHER';
  resolvedNote?: string;
  coverImage?: string;
  createdAt: string;
}

export const getLostItems = (params: LostItemPageParams) =>
  client.get<PageResult<LostItemVO>>('/lost-items', { params }).then(r => r.data.data);

export const getLostItem = (id: number) =>
  client.get<LostItemVO>(`/lost-items/${id}`).then(r => r.data.data);

export const createLostItem = (data: CreateLostItemDTO) =>
  client.post<LostItemVO>('/lost-items', data).then(r => r.data.data);

export const updateLostItem = (id: number, data: UpdateLostItemDTO) =>
  client.put<LostItemVO>(`/lost-items/${id}`, data).then(r => r.data.data);

export const deleteLostItem = (id: number) =>
  client.delete(`/lost-items/${id}`).then(r => r.data.data);

export const updateLostItemStatus = (id: number, status: string) =>
  client.put(`/lost-items/${id}/status`, { status }).then(r => r.data.data);
