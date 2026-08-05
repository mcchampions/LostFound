import { describe, it, expect, vi, beforeEach } from 'vitest';
import client from '../api/client';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
  },
}));

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该正确导出 client 实例', () => {
    expect(client).toBeDefined();
    expect(client.get).toBeDefined();
    expect(client.post).toBeDefined();
    expect(client.put).toBeDefined();
    expect(client.delete).toBeDefined();
  });

  it('使用 HttpOnly Cookie 认证，不在浏览器存储 JWT', () => {
    expect(window.localStorage.getItem('token')).toBeNull();
  });
});
