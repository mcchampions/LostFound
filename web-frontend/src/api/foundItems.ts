import client from './client';
import type { ApiResponse, CreateFoundItemDTO, UpdateFoundItemDTO, FoundItemPageParams, PageResult } from '../types';

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
  foundTimeEnd?: string;
  imageUrls: string[];
  status: string;
  resolvedBy?: number;
  resolvedByName?: string;
  resolvedType?: 'SELF' | 'USER' | 'OTHER';
  resolvedNote?: string;
  coverImage?: string;
  createdAt: string;
}

export const getFoundItems = (params: FoundItemPageParams) =>
  client.get<ApiResponse<PageResult<FoundItemVO>>>('/found-items', { params }).then(r => r.data.data);

export const getFoundItem = (id: number) =>
  client.get<ApiResponse<FoundItemVO>>(`/found-items/${id}`).then(r => r.data.data);

export const createFoundItem = (data: CreateFoundItemDTO) =>
  client.post<ApiResponse<FoundItemVO>>('/found-items', data).then(r => r.data.data);

export const updateFoundItem = (id: number, data: UpdateFoundItemDTO) =>
  client.put<ApiResponse<FoundItemVO>>(`/found-items/${id}`, data).then(r => r.data.data);

export const deleteFoundItem = (id: number) =>
  client.delete(`/found-items/${id}`).then(r => r.data.data);

export const updateFoundItemStatus = (id: number, status: string) =>
  client.put(`/found-items/${id}/status`, { status }).then(r => r.data.data);
