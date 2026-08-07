import client from './client';

export interface CoverGenParams {
  title: string;
  content?: string;
  category?: string;
  location?: string;
  date?: string;
  template?: string;
}

const COVER_LIMITS = {
  title: 200,
  content: 600,
  category: 100,
  location: 100,
  date: 50,
} as const;

const truncate = (value: string | undefined, maxLength: number) => {
  if (value === undefined || value.length <= maxLength) return value;
  const shortened = value.slice(0, maxLength);
  return /[\uD800-\uDBFF]$/.test(shortened) ? shortened.slice(0, -1) : shortened;
};

export const generateCover = (params: CoverGenParams) => {
  const payload: CoverGenParams = {
    ...params,
    title: truncate(params.title, COVER_LIMITS.title)!,
    content: truncate(params.content, COVER_LIMITS.content),
    category: truncate(params.category, COVER_LIMITS.category),
    location: truncate(params.location, COVER_LIMITS.location),
    date: truncate(params.date, COVER_LIMITS.date),
  };
  return client.post('/cover/generate', payload)
    .then(r => r.data.data as { url: string });
};
