import client from './client';

export const uploadImage = (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  return client
    .post('/upload/image', formData, { timeout: 60000 })
    .then(r => r.data.data.url as string);
};
