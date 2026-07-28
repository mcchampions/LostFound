import client from './client';

export interface ClaimVO {
  id: number;
  itemType: string;
  itemId: number;
  itemTitle: string;
  applicantId: number;
  applicantName: string;
  publisherId: number;
  publisherName: string;
  message: string;
  imageUrls?: string;
  status: string;
  createdAt: string;
}

export const submitClaim = (itemType: string, itemId: number, message: string) =>
  client.post('/claims', { itemType, itemId, message }).then(r => r.data.data);

export const getReceivedClaims = (params: { page: number; size: number; status?: string }) =>
  client.get('/claims/received', { params }).then(r => r.data.data);

export const getSentClaims = (params: { page: number; size: number; status?: string }) =>
  client.get('/claims/sent', { params }).then(r => r.data.data);

export const processClaim = (id: number, status: string) =>
  client.put(`/claims/${id}`, { status }).then(r => r.data.data);
