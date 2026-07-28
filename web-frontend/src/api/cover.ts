import client from './client';

export interface CoverGenParams {
  title: string;
  subtitle?: string;
  template?: string;
  theme?: string;
}

export const generateCover = (params: CoverGenParams) =>
  client.post('/cover/generate', params).then(r => r.data.data as { url: string });
