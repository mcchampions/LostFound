import client from './client';

export interface CoverGenParams {
  title: string;
  content?: string;
  category?: string;
  location?: string;
  date?: string;
  template?: string;
}

export const generateCover = (params: CoverGenParams) =>
  client.post('/cover/generate', params).then(r => r.data.data as { url: string });
