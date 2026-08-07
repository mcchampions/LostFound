// 后端 API 地址。
// 开发模式（yarn dev）默认直连本地后端；生产构建默认同源（由托管服务器反代），
// 需要独立后端地址时用 VITE_SERVER_BASE 覆盖。
export const SERVER_BASE = import.meta.env.VITE_SERVER_BASE ?? (import.meta.env.DEV ? 'http://localhost:8080' : '');

const API_PREFIX = '/api/v1';

export const API_BASE = SERVER_BASE + API_PREFIX;
export const SSE_ENDPOINT = API_BASE + '/chat/stream';

export function assetUrl(path: string): string {
  if (!path) return '';
  if (path.toLowerCase().startsWith('blob:')) {
    return path;
  }
  if (!path.startsWith('/uploads/')) return '';
  const relative = path.slice('/uploads/'.length);
  if (relative.split('/').some(segment => !segment || segment === '.' || segment === '..'
      || !/^[A-Za-z0-9._-]+$/.test(segment))) return '';
  return SERVER_BASE + path;
}
