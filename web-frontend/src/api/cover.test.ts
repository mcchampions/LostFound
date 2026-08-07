import { beforeEach, describe, expect, it, vi } from 'vitest';
import client from './client';
import { generateCover } from './cover';

vi.mock('./client', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('generateCover', () => {
  const post = vi.mocked(client.post);

  beforeEach(() => {
    post.mockReset();
    post.mockResolvedValue({ data: { data: { url: '/uploads/cover.png' } } });
  });

  it('发送前静默截断标题和正文', async () => {
    await generateCover({
      title: '标'.repeat(250),
      content: '正'.repeat(700),
    });

    expect(post).toHaveBeenCalledWith('/cover/generate', expect.objectContaining({
      title: '标'.repeat(200),
      content: '正'.repeat(600),
    }));
  });

  it('不修改调用方传入的原对象', async () => {
    const params = {
      title: '标'.repeat(250),
      content: '正'.repeat(700),
    };

    await generateCover(params);

    expect(params.title).toHaveLength(250);
    expect(params.content).toHaveLength(700);
  });

  it('不会在截断位置留下半个代理字符', async () => {
    await generateCover({ title: `${'a'.repeat(199)}😀` });

    expect(post).toHaveBeenCalledWith('/cover/generate', expect.objectContaining({
      title: 'a'.repeat(199),
    }));
  });
});
