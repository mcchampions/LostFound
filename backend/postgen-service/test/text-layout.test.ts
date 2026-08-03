import { describe, expect, it } from 'vitest';
import { debugLayoutTitle, layoutTitle, segmentTextForLayout, splitTitleSmart, tokenizeMixedText } from '../src/templates/text-layout.js';

function blockHeight(result: ReturnType<typeof layoutTitle>) {
  return result.lines.length * result.fontSize * result.lineHeight;
}

describe('tokenizeMixedText', () => {
  it('keeps english word and emoji as whole tokens', () => {
    expect(tokenizeMixedText('当我给openclaw🦞接入了特斯拉数据后')).toEqual([
      '当',
      '我',
      '给',
      'openclaw',
      '🦞',
      '接',
      '入',
      '了',
      '特',
      '斯',
      '拉',
      '数',
      '据',
      '后',
    ]);
  });
});

describe('segmentTextForLayout', () => {
  it('keeps semantic chinese chunks instead of pure single-char splitting', () => {
    const segments = segmentTextForLayout('好的标题排版不是让每一行都一样长而是形成自然节奏');
    expect(segments.length).toBeLessThan(tokenizeMixedText('好的标题排版不是让每一行都一样长而是形成自然节奏').length);
    expect(segments).toContain('标题');
    expect(segments).toContain('排版');
  });
});

describe('layoutTitle', () => {
  it('produces a fit layout for current mixed-language note case', () => {
    const result = layoutTitle('当我给openclaw 🦞接入了特斯拉数据后', {
      box: { width: 760, height: 540 },
      fontSize: 84,
      minFontSize: 66,
      fontSizeStep: 2,
      lineHeight: 1.08,
      letterSpacing: -3.5,
      maxLines: 5,
      preferredLines: 3,
      minLastLineRatio: 0.45,
      keepWords: true,
    });

    expect(result.lines.join('')).toBe('当我给openclaw🦞接入了特斯拉数据后');
    expect(result.lineWidths.every((w) => w <= 760)).toBe(true);
    expect(result.lines.length).toBeLessThanOrEqual(5);
  });

  it('prefers fuller lines for quote-like layout', () => {
    const result = layoutTitle('当我给openclaw 🦞接入了特斯拉数据后', {
      box: { width: 760, height: 420 },
      fontSize: 104,
      minFontSize: 72,
      fontSizeStep: 2,
      lineHeight: 1.08,
      letterSpacing: -6,
      maxLines: 4,
      preferredLines: 2,
      minLastLineRatio: 0.55,
      keepWords: true,
    });

    expect(result.lines.join('')).toBe('当我给openclaw🦞接入了特斯拉数据后');
    expect(result.lineWidths.every((w) => w <= 760)).toBe(true);
    expect(result.lines.length).toBeLessThanOrEqual(3);
  });

  it('keeps manual line breaks stable', () => {
    expect(
      layoutTitle('停止追求\n信息密度\n开始追求\n记忆点', {
        box: { width: 760, height: 540 },
        fontSize: 84,
        minFontSize: 66,
        fontSizeStep: 2,
        lineHeight: 1.08,
        letterSpacing: -3.5,
        maxLines: 5,
        preferredLines: 3,
        keepWords: true,
      }).lines
    ).toEqual(['停止追求', '信息密度', '开始追求', '记忆点']);
  });

  it('keeps punctuation attached to previous phrase when wrapping', () => {
    const result = layoutTitle('做内容最省力的方法，就是先写结论再补证据。', {
      box: { width: 760, height: 420 },
      fontSize: 92,
      minFontSize: 72,
      fontSizeStep: 2,
      lineHeight: 1.1,
      letterSpacing: -2,
      maxLines: 4,
      preferredLines: 2,
      keepWords: true,
    });

    expect(result.lines.join('')).toBe('做内容最省力的方法，就是先写结论再补证据。');
    expect(result.lineWidths.every((w) => w <= 760)).toBe(true);
  });

  it('matches splitTitleSmart convenience wrapper', () => {
    expect(splitTitleSmart('当我给openclaw 🦞接入了特斯拉数据后', 9, 5)).toEqual(
      layoutTitle('当我给openclaw 🦞接入了特斯拉数据后', {
        box: { width: 900, height: 600 },
        fontSize: 100,
        minFontSize: 100,
        fontSizeStep: 1,
        lineHeight: 1.1,
        letterSpacing: 0,
        maxLines: 5,
        preferredLines: 3,
        keepWords: true,
      }).lines
    );
  });

  it('prefers larger font when multiple candidates fit', () => {
    const result = layoutTitle('信息的价值不在于更长，而在于更容易被记住', {
      box: { width: 900, height: 360 },
      fontSize: 96,
      minFontSize: 64,
      fontSizeStep: 2,
      lineHeight: 1.08,
      letterSpacing: -2,
      maxLines: 4,
      preferredLines: 2,
      minLastLineRatio: 0.45,
      keepWords: true,
    });

    expect(result.fontSize).toBeGreaterThanOrEqual(88);
    expect(result.lineWidths.every((w) => w <= 900)).toBe(true);
    expect(blockHeight(result)).toBeLessThanOrEqual(360);
  });

  it('respects height constraint by shrinking when needed', () => {
    const result = layoutTitle('把一个复杂系统讲明白，往往比把它做出来更难', {
      box: { width: 760, height: 180 },
      fontSize: 96,
      minFontSize: 60,
      fontSizeStep: 2,
      lineHeight: 1.1,
      letterSpacing: -2,
      maxLines: 3,
      preferredLines: 2,
      minLastLineRatio: 0.45,
      keepWords: true,
    });

    expect(blockHeight(result)).toBeLessThanOrEqual(180);
    expect(result.fontSize).toBeLessThan(96);
    expect(result.lineWidths.every((w) => w <= 760)).toBe(true);
  });

  it('keeps ascii word intact when keepWords is enabled', () => {
    const result = layoutTitle('这是一个 openclaw-dashboard 发布说明', {
      box: { width: 280, height: 400 },
      fontSize: 72,
      minFontSize: 40,
      fontSizeStep: 2,
      lineHeight: 1.1,
      letterSpacing: 0,
      maxLines: 5,
      preferredLines: 3,
      keepWords: true,
    });

    expect(result.lines.some((line) => line.includes('openclaw-dashboard'))).toBe(true);
    expect(result.lines.join('')).toContain('openclaw-dashboard');
  });

  it('avoids very short first line by rebalancing breakpoints', () => {
    const result = layoutTitle('高质量内容不是堆信息，而是提前设计记忆钩子', {
      box: { width: 360, height: 500 },
      fontSize: 68,
      minFontSize: 52,
      fontSizeStep: 2,
      lineHeight: 1.1,
      letterSpacing: 0,
      maxLines: 4,
      preferredLines: 3,
      keepWords: true,
      avoidShortFirstLine: true,
      minFirstLineRatio: 0.5,
    });

    const first = result.lineWidths[0] ?? 0;
    const max = Math.max(...result.lineWidths, 1);
    expect(first / max).toBeGreaterThanOrEqual(0.5);
  });

  it('avoids lonely last line when possible', () => {
    const result = layoutTitle('把复杂的系统讲清楚，比把它做出来还更难一点', {
      box: { width: 430, height: 500 },
      fontSize: 66,
      minFontSize: 50,
      fontSizeStep: 2,
      lineHeight: 1.1,
      letterSpacing: 0,
      maxLines: 4,
      preferredLines: 3,
      keepWords: true,
      avoidSingleCharLastLine: true,
    });

    const lastLine = result.lines[result.lines.length - 1] ?? '';
    expect(tokenizeMixedText(lastLine).length).toBeGreaterThan(1);
  });

  it('avoids mechanically uniform line widths', () => {
    const result = layoutTitle('好的标题排版不是让每一行都一样长而是形成自然节奏', {
      box: { width: 680, height: 330 },
      fontSize: 84,
      minFontSize: 46,
      fontSizeStep: 2,
      lineHeight: 1.04,
      letterSpacing: -1.8,
      maxLines: 4,
      preferredLines: 3,
      minLastLineRatio: 0.38,
      keepWords: true,
      avoidShortFirstLine: true,
      minFirstLineRatio: 0.38,
      avoidSingleCharLastLine: true,
    });

    const widths = result.lineWidths;
    const max = Math.max(...widths, 1);
    const min = Math.min(...widths, max);
    expect((max - min) / max).toBeGreaterThanOrEqual(0.12);
  });

  it('exposes debug candidates for tuning', () => {
    const debug = debugLayoutTitle('当我给openclaw 🦞接入了特斯拉数据后', {
      box: { width: 760, height: 420 },
      fontSize: 104,
      minFontSize: 72,
      fontSizeStep: 2,
      lineHeight: 1.08,
      letterSpacing: -6,
      maxLines: 4,
      preferredLines: 2,
      minLastLineRatio: 0.55,
      keepWords: true,
      debugCandidateLimit: 3,
    });

    expect(debug?.chosen).toBeDefined();
    expect(debug?.topCandidates.length).toBeLessThanOrEqual(3);
    expect(debug?.topCandidates[0]?.score).toBeTypeOf('number');
  });
});
