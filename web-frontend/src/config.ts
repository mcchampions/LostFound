// 后端 API 地址 — 本地开发用 localhost:8080
// Docker 构建: docker build --build-arg VITE_SERVER_BASE=http://你的后端:8080
export const SERVER_BASE = import.meta.env.VITE_SERVER_BASE ?? 'http://localhost:8080';

const API_PREFIX = '/api/v1';

export const API_BASE = SERVER_BASE + API_PREFIX;
export const SOCKJS_ENDPOINT = SERVER_BASE + '/ws';
export const WS_ENDPOINT = SOCKJS_ENDPOINT;

export function assetUrl(path: string): string {
  if (!path) return '';
  const lower = path.toLowerCase();
  if (lower.startsWith('http://') || lower.startsWith('https://')
      || lower.startsWith('data:') || lower.startsWith('blob:')
      || lower.startsWith('//')) {
    return path;
  }
  return SERVER_BASE + path;
}
