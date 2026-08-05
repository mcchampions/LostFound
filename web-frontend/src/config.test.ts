import { describe, it, expect } from 'vitest';
import { SERVER_BASE, API_BASE, SOCKJS_ENDPOINT, WS_ENDPOINT, assetUrl } from './config';

describe('Config', () => {
  describe('SERVER_BASE', () => {
    it('应该返回一个字符串值', () => {
      expect(typeof SERVER_BASE).toBe('string');
    });
  });

  describe('API_BASE', () => {
    it('应该包含 /api/v1 前缀', () => {
      expect(API_BASE).toContain('/api/v1');
    });
  });

  describe('SOCKJS_ENDPOINT 和 WS_ENDPOINT', () => {
    it('应该相等', () => {
      expect(SOCKJS_ENDPOINT).toBe(WS_ENDPOINT);
    });

    it('应该包含 /ws 路径', () => {
      expect(SOCKJS_ENDPOINT).toContain('/ws');
    });
  });

  describe('assetUrl', () => {
    it('空路径应返回空字符串', () => {
      expect(assetUrl('')).toBe('');
    });

    it('http 开头的路径应原样返回', () => {
      const url = 'http://example.com/image.png';
      expect(assetUrl(url)).toBe(url);
    });

    it('https 开头的路径应原样返回', () => {
      const url = 'https://example.com/image.png';
      expect(assetUrl(url)).toBe(url);
    });

    it('data: 开头的路径应原样返回', () => {
      const url = 'data:image/png;base64,abc';
      expect(assetUrl(url)).toBe(url);
    });

    it('blob: 开头的路径应原样返回', () => {
      const url = 'blob:http://localhost:5173/abc';
      expect(assetUrl(url)).toBe(url);
    });

    it('// 开头的路径应原样返回', () => {
      const url = '//cdn.example.com/image.png';
      expect(assetUrl(url)).toBe(url);
    });

    it('相对路径应拼接 SERVER_BASE', () => {
      const result = assetUrl('/uploads/image.png');
      expect(result).toContain('/uploads/image.png');
      expect(result.startsWith('http') || result.startsWith('/')).toBe(true);
    });
  });
});
