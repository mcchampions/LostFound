import client from './client';

export interface Category {
  id: number;
  name: string;
  sortOrder: number;
}

export const getCategories = () =>
  client.get('/categories').then(r => r.data.data as Category[]);
