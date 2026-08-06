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

    it('外部 http 地址应被拒绝', () => {
      const url = 'http://example.com/image.png';
      expect(assetUrl(url)).toBe('');
    });

    it('外部 https 地址应被拒绝', () => {
      const url = 'https://example.com/image.png';
      expect(assetUrl(url)).toBe('');
    });

    it('data 地址应被拒绝', () => {
      const url = 'data:image/png;base64,abc';
      expect(assetUrl(url)).toBe('');
    });

    it('blob 地址仅用于临时界面预览', () => {
      const url = 'blob:http://localhost:5173/abc';
      expect(assetUrl(url)).toBe(url);
    });

    it('协议相对地址应被拒绝', () => {
      const url = '//cdn.example.com/image.png';
      expect(assetUrl(url)).toBe('');
    });

    it('相对路径应拼接 SERVER_BASE', () => {
      const result = assetUrl('/uploads/image.png');
      expect(result).toContain('/uploads/image.png');
      expect(result.startsWith('http') || result.startsWith('/')).toBe(true);
    });

    it('路径遍历地址应被拒绝', () => {
      expect(assetUrl('/uploads/../secret.png')).toBe('');
    });
  });
});
