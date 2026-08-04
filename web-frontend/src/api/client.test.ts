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
    localStorage.clear();
  });

  it('应该正确导出 client 实例', () => {
    expect(client).toBeDefined();
    expect(client.get).toBeDefined();
    expect(client.post).toBeDefined();
    expect(client.put).toBeDefined();
    expect(client.delete).toBeDefined();
  });

  it('应该支持在 localStorage 中设置和获取 token', () => {
    const token = 'test-jwt-token';
    localStorage.setItem('token', token);
    expect(localStorage.getItem('token')).toBe(token);
  });

  it('应该支持清除 token', () => {
    localStorage.setItem('token', 'test-token');
    localStorage.removeItem('token');
    expect(localStorage.getItem('token')).toBeNull();
  });
});
