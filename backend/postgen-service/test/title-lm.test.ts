import { describe, expect, it } from 'vitest';
import { resolveTemplateTitleLayoutAsync } from '../src/templates/title-layout-service.js';
import { suggestTitleBreakCandidatesWithLlm } from '../src/templates/title-lm.js';

describe('title layout service', () => {
  it('falls back to rule mode when llm config is unavailable', async () => {
    const prevKey = process.env.OPENAI_API_KEY;
    const prevBase = process.env.OPENAI_API_BASE;
    const prevModel = process.env.LLM_MODEL;

    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_BASE;
    delete process.env.LLM_MODEL;

    try {
      const result = await resolveTemplateTitleLayoutAsync('xhs-note', {
        title: '好的标题排版不是让每一行都一样长而是形成自然节奏',
        titleLayoutMode: 'llm',
      });

      expect(result.lines.join('')).toBe('好的标题排版不是让每一行都一样长而是形成自然节奏');
      expect(result.lines.length).toBeGreaterThanOrEqual(1);
    } finally {
      process.env.OPENAI_API_KEY = prevKey;
      process.env.OPENAI_API_BASE = prevBase;
      process.env.LLM_MODEL = prevModel;
    }
  });

  it('returns no llm candidates when llm config is unavailable', async () => {
    const prevKey = process.env.OPENAI_API_KEY;
    const prevBase = process.env.OPENAI_API_BASE;
    const prevModel = process.env.LLM_MODEL;

    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_BASE;
    delete process.env.LLM_MODEL;

    try {
      const result = await suggestTitleBreakCandidatesWithLlm(
        'xhs-note-green',
        '当我给 openclaw 接上 llm 拆字之后，才发现语义断行和视觉排版根本不是一回事',
        {
          box: { width: 760, height: 420 },
          fontSize: 76,
          minFontSize: 60,
          fontSizeStep: 2,
          lineHeight: 1.08,
          letterSpacing: -2.2,
          maxLines: 4,
          preferredLines: 2,
          keepWords: true,
          avoidShortFirstLine: true,
          minFirstLineRatio: 0.44,
          avoidSingleCharLastLine: true,
        }
      );

      expect(result).toEqual([]);
    } finally {
      process.env.OPENAI_API_KEY = prevKey;
      process.env.OPENAI_API_BASE = prevBase;
      process.env.LLM_MODEL = prevModel;
    }
  });

  it('preserves manual line breaks in rule mode', async () => {
    const result = await resolveTemplateTitleLayoutAsync('xhs-note', {
      title: '第一行\n第二行\n第三行',
      titleLayoutMode: 'rule',
    });

    expect(result.lines).toEqual(['第一行', '第二行', '第三行']);
  });

  it('falls back to manual breaks when llm config is unavailable even if title already contains breaks', async () => {
    const prevKey = process.env.OPENAI_API_KEY;
    const prevBase = process.env.OPENAI_API_BASE;
    const prevModel = process.env.LLM_MODEL;

    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_BASE;
    delete process.env.LLM_MODEL;

    try {
      const result = await resolveTemplateTitleLayoutAsync('xhs-note', {
        title: '第一行\n第二行\n第三行',
        titleLayoutMode: 'llm',
      });

      expect(result.lines).toEqual(['第一行', '第二行', '第三行']);
    } finally {
      process.env.OPENAI_API_KEY = prevKey;
      process.env.OPENAI_API_BASE = prevBase;
      process.env.LLM_MODEL = prevModel;
    }
  });
});
